import * as Yargs from "yargs";
import { createDriver, createModelFromDatabase } from "./Engine";
import * as TomgUtils from "./Utils";
import AbstractDriver from "./drivers/AbstractDriver";
import IConnectionOptions from "./IConnectionOptions";
import IGenerationOptions from "./IGenerationOptions";

import fs = require("fs-extra");
import inquirer = require("inquirer");
import path = require("path");

// eslint-disable-next-line @typescript-eslint/no-floating-promises
CliLogic();

async function CliLogic() {
    console.log(TomgUtils.packageVersion());
    let driver: AbstractDriver;
    let connectionOptions: IConnectionOptions;
    let generationOptions: IGenerationOptions;
    if (process.argv.length > 2) {
        const retVal = GetUtilParametersByArgs();
        connectionOptions = retVal.connectionOptions;
        generationOptions = retVal.generationOptions;
        driver = retVal.driver;
    } else if (fs.existsSync(path.resolve(process.cwd(), ".tomg-config"))) {
        console.log(
            `[${new Date().toLocaleTimeString()}] Using configuration file. [${path.resolve(
                process.cwd(),
                ".tomg-config"
            )}]`
        );
        const retVal = await fs.readJson(
            path.resolve(process.cwd(), ".tomg-config")
        );
        [connectionOptions, generationOptions] = retVal;
        driver = createDriver(connectionOptions.databaseType);
    } else {
        const retVal = await GetUtilParametersByInquirer();
        driver = retVal.driver;
        connectionOptions = retVal.connectionOptions;
        generationOptions = retVal.generationOptions;
    }
    console.log(
        `[${new Date().toLocaleTimeString()}] Starting creation of model classes.`
    );
    await createModelFromDatabase(driver, connectionOptions, generationOptions);
    console.info(
        `[${new Date().toLocaleTimeString()}] Typeorm model classes created.`
    );
}

function GetUtilParametersByArgs() {
    const { argv } = Yargs.usage(
        "Usage: typeorm-model-generator -h <host> -d <database> -p [port] -u <user> -x [password] -e [engine]\nYou can also run program without specifying any parameters."
    ).options({
        h: {
            alias: "host",
            string: true,
            default: "127.0.0.1",
            describe: "IP address/Hostname for database server"
        },
        d: {
            alias: "database",
            string: true,
            demand: true,
            describe:
                "Database name(or path for sqlite). You can pass multiple values separated by comma."
        },
        u: {
            alias: "user",
            string: true,
            describe: "Username for database server"
        },
        x: {
            alias: "pass",
            string: true,
            default: "",
            describe: "Password for database server"
        },
        p: {
            number: true,
            alias: "port",
            describe: "Port number for database server"
        },
        e: {
            alias: "engine",
            choices: [
                "mssql",
                "postgres",
                "mysql",
                "mariadb",
                "oracle",
                "sqlite"
            ],
            demand: true,
            describe: "Database engine"
        },
        o: {
            alias: "output",
            default: path.resolve(process.cwd(), "output"),
            describe: "Where to place generated models"
        },
        s: {
            alias: "schema",
            string: true,
            describe:
                "Schema name to create model from. Only for mssql and postgres. You can pass multiple values separated by comma eg. -s scheme1,scheme2,scheme3"
        },
        ssl: {
            boolean: true,
            default: false
        },
        noConfig: {
            boolean: true,
            default: false,
            describe: `Doesn't create tsconfig.json and ormconfig.json`
        },
        cf: {
            alias: "case-file",
            choices: ["pascal", "param", "camel", "none"],
            default: "pascal",
            describe: "Convert file names to specified case"
        },
        ce: {
            alias: "case-entity",
            choices: ["pascal", "camel", "none"],
            default: "pascal",
            describe: "Convert class names to specified case"
        },
        cp: {
            alias: "case-property",
            choices: ["pascal", "camel", "none"],
            default: "camel",
            describe: "Convert property names to specified case"
        },
        pv: {
            alias: "property-visibility",
            choices: ["public", "protected", "private", "none"],
            default: "none",
            describe:
                "Defines which visibility should have the generated property"
        },
        lazy: {
            boolean: true,
            default: false,
            describe: "Generate lazy relations"
        },
        a: {
            alias: "active-record",
            boolean: true,
            default: false,
            describe: "Use ActiveRecord syntax for generated models"
        },
        namingStrategy: {
            describe: "Use custom naming strategy",
            string: true
        },
        relationIds: {
            boolean: true,
            default: false,
            describe: "Generate RelationId fields"
        },
        skipSchema: {
            boolean: true,
            default: false,
            describe: "Omits schema identifier in generated entities"
        },
        generateConstructor: {
            boolean: true,
            default: false,
            describe: "Generate constructor allowing partial initialization"
        },
        strictMode: {
            choices: ["none", "?", "!"],
            default: "none",
            describe: "Mark fields as optional(?) or non-null(!)"
        },
        timeout: {
            describe: "SQL Query timeout(ms)",
            number: true
        }
    });

    const driver = createDriver(argv.e);
    const { standardPort, standardSchema, standardUser } = driver;
    let namingStrategyPath: string;
    if (argv.namingStrategy && argv.namingStrategy !== "") {
        namingStrategyPath = argv.namingStrategy;
    } else {
        namingStrategyPath = "";
    }
    const connectionOptions: IConnectionOptions = new IConnectionOptions();
    connectionOptions.databaseName = argv.d;
    connectionOptions.databaseType = argv.e;
    connectionOptions.host = argv.h;
    connectionOptions.password = argv.x;
    connectionOptions.port = argv.p || standardPort;
    connectionOptions.schemaName = argv.s ? argv.s.toString() : standardSchema;
    connectionOptions.ssl = argv.ssl;
    connectionOptions.timeout = argv.timeout;
    connectionOptions.user = argv.u ? argv.u.toString() : standardUser;
    const generationOptions: IGenerationOptions = new IGenerationOptions();
    generationOptions.activeRecord = argv.a;
    generationOptions.generateConstructor = argv.generateConstructor;
    generationOptions.convertCaseEntity = argv.ce as IGenerationOptions["convertCaseEntity"];
    generationOptions.convertCaseFile = argv.cf as IGenerationOptions["convertCaseFile"];
    generationOptions.convertCaseProperty = argv.cp as IGenerationOptions["convertCaseProperty"];
    generationOptions.lazy = argv.lazy;
    generationOptions.customNamingStrategyPath = namingStrategyPath;
    generationOptions.noConfigs = argv.noConfig;
    generationOptions.propertyVisibility = argv.pv as IGenerationOptions["propertyVisibility"];
    generationOptions.relationIds = argv.relationIds;
    generationOptions.skipSchema = argv.skipSchema;
    generationOptions.resultsPath = argv.o;
    generationOptions.strictMode =
        argv.strictMode === "none"
            ? false
            : (argv.strictMode as IGenerationOptions["strictMode"]);

    return { driver, connectionOptions, generationOptions };
}

async function GetUtilParametersByInquirer() {
    const connectionOptions: IConnectionOptions = new IConnectionOptions();
    const generationOptions: IGenerationOptions = new IGenerationOptions();

    connectionOptions.databaseType = (await inquirer.prompt([
        {
            choices: [
                "mssql",
                "postgres",
                "mysql",
                "mariadb",
                "oracle",
                "sqlite"
            ],
            message: "Choose database engine",
            name: "engine",
            type: "list"
        }
    ])).engine;
    const driver = createDriver(connectionOptions.databaseType);
    if (connectionOptions.databaseType !== "sqlite") {
        const answ = await inquirer.prompt([
            {
                default: "localhost",
                message: "Database address:",
                name: "host",
                type: "input"
            },
            {
                message: "Database port:",
                name: "port",
                type: "input",
                default() {
                    return driver.standardPort;
                },
                validate(value) {
                    const valid = !Number.isNaN(parseInt(value, 10));
                    return valid || "Please enter a valid port number";
                }
            },
            {
                default: false,
                message: "Use SSL:",
                name: "ssl",
                type: "confirm"
            },
            {
                message: "Database user name:",
                name: "login",
                type: "input",
                default() {
                    return driver.standardUser;
                }
            },
            {
                message: "Database user password:",
                name: "password",
                type: "password"
            },
            {
                default: "",
                message:
                    "Database name: (You can pass multiple values separated by comma)",
                name: "dbName",
                type: "input"
            }
        ]);
        if (
            connectionOptions.databaseType === "mssql" ||
            connectionOptions.databaseType === "postgres"
        ) {
            connectionOptions.schemaName = (await inquirer.prompt([
                {
                    default: driver.standardSchema,
                    message:
                        "Database schema: (You can pass multiple values separated by comma)",
                    name: "schema",
                    type: "input"
                }
            ])).schema;
        }
        connectionOptions.port = answ.port;
        connectionOptions.host = answ.host;
        connectionOptions.user = answ.login;
        connectionOptions.password = answ.password;
        connectionOptions.databaseName = answ.dbName;
        connectionOptions.ssl = answ.ssl;
    } else {
        connectionOptions.databaseName = (await inquirer.prompt([
            {
                default: "",
                message: "Path to database file:",
                name: "dbName",
                type: "input"
            }
        ])).dbName;
    }
    generationOptions.resultsPath = (await inquirer.prompt([
        {
            default: path.resolve(process.cwd(), "output"),
            message: "Path where generated models should be stored:",
            name: "output",
            type: "input"
        }
    ])).output;

    if (
        connectionOptions.databaseType === "mssql" ||
        connectionOptions.databaseType === "postgres"
    ) {
        const { changeRequestTimeout } = await inquirer.prompt([
            {
                default: false,
                message: "Do you want to change default sql query timeout?",
                name: "changeRequestTimeout",
                type: "confirm"
            }
        ]);
        if (changeRequestTimeout) {
            const { timeout } = await inquirer.prompt({
                message: "Query timeout(ms):",
                name: "timeout",
                type: "input",
                validate(value) {
                    const valid = !Number.isNaN(parseInt(value, 10));
                    return valid || "Please enter a valid number";
                }
            });
            connectionOptions.timeout = timeout;
        }
    }
    const { customizeGeneration } = await inquirer.prompt([
        {
            default: false,
            message: "Do you want to customize generated model?",
            name: "customizeGeneration",
            type: "confirm"
        }
    ]);
    if (customizeGeneration) {
        const customizations: string[] = (await inquirer.prompt([
            {
                choices: [
                    {
                        checked: true,
                        name: "Generate config files",
                        value: "config"
                    },
                    {
                        name: "Generate lazy relations",
                        value: "lazy"
                    },
                    {
                        name: "Use ActiveRecord syntax for generated models",
                        value: "activeRecord"
                    },
                    {
                        name: "Use custom naming strategy",
                        value: "namingStrategy"
                    },
                    {
                        name: "Generate RelationId fields",
                        value: "relationId"
                    },
                    {
                        name: "Omits schema identifier in generated entities",
                        value: "skipSchema"
                    },
                    {
                        name:
                            "Generate constructor allowing partial initialization",
                        value: "constructor"
                    },
                    {
                        name: "Use specific naming convention",
                        value: "namingConvention"
                    }
                ],
                message: "Available customizations",
                name: "selected",
                type: "checkbox"
            }
        ])).selected;

        generationOptions.propertyVisibility = (await inquirer.prompt([
            {
                choices: ["public", "protected", "private", "none"],
                message:
                    "Defines which visibility should have the generated property",
                name: "propertyVisibility",
                default: "none",
                type: "list"
            }
        ])).propertyVisibility;

        const { strictModeRaw } = await inquirer.prompt([
            {
                choices: ["none", "?", "!"],
                message: "Mark fields as optional(?) or non-null(!)",
                name: "strictModeRaw",
                default: "none",
                type: "list"
            }
        ]);

        generationOptions.strictMode =
            strictModeRaw === "none" ? false : strictModeRaw;
        generationOptions.noConfigs = !customizations.includes("config");
        generationOptions.lazy = customizations.includes("lazy");
        generationOptions.activeRecord = customizations.includes(
            "activeRecord"
        );
        generationOptions.relationIds = customizations.includes("relationId");
        generationOptions.skipSchema = customizations.includes("skipSchema");
        generationOptions.generateConstructor = customizations.includes(
            "constructor"
        );

        if (customizations.includes("namingStrategy")) {
            const namingStrategyPath = (await inquirer.prompt([
                {
                    default: path.resolve(process.cwd()),
                    message: "Path to custom naming strategy file:",
                    name: "namingStrategy",
                    type: "input",
                    validate(value) {
                        const valid = value === "" || fs.existsSync(value);
                        return (
                            valid ||
                            "Please enter a a valid path to custom naming strategy file"
                        );
                    }
                }
            ])).namingStrategy;

            if (namingStrategyPath && namingStrategyPath !== "") {
                generationOptions.customNamingStrategyPath = namingStrategyPath;
            } else {
                generationOptions.customNamingStrategyPath = "";
            }
        }
        if (customizations.includes("namingConvention")) {
            const namingConventions = await inquirer.prompt([
                {
                    choices: ["pascal", "param", "camel", "none"],
                    default: "pascal",
                    message: "Convert file names to specified case:",
                    name: "fileCase",
                    type: "list"
                },
                {
                    choices: ["pascal", "camel", "none"],
                    default: "pascal",
                    message: "Convert class names to specified case:",
                    name: "entityCase",
                    type: "list"
                },
                {
                    choices: ["pascal", "camel", "none"],
                    default: "camel",
                    message: "Convert property names to specified case:",
                    name: "propertyCase",
                    type: "list"
                }
            ]);
            generationOptions.convertCaseFile = namingConventions.fileCase;
            generationOptions.convertCaseProperty =
                namingConventions.propertyCase;
            generationOptions.convertCaseEntity = namingConventions.entityCase;
        }
    }
    const { saveConfig } = await inquirer.prompt([
        {
            default: false,
            message: "Save configuration to config file?",
            name: "saveConfig",
            type: "confirm"
        }
    ]);
    if (saveConfig) {
        await fs.writeJson(
            path.resolve(process.cwd(), ".tomg-config"),
            [connectionOptions, generationOptions],
            { spaces: 2 }
        );
        console.log(`[${new Date().toLocaleTimeString()}] Config file saved.`);
        console.warn(
            `\x1b[33m[${new Date().toLocaleTimeString()}] WARNING: Password was saved as plain text.\x1b[0m`
        );
    }
    return { driver, connectionOptions, generationOptions };
}
