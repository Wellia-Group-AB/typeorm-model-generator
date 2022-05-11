import * as Handlebars from "handlebars";
import * as Prettier from "prettier";
import * as changeCase from "change-case";
import * as fs from "fs";
import * as path from "path";
import { EOL } from "os";
import IConnectionOptions from "./IConnectionOptions";
import IGenerationOptions, { eolConverter } from "./IGenerationOptions";
import { Entity } from "./models/Entity";
import { Relation } from "./models/Relation";
import { createModuleResolutionCache } from "typescript";

const prettierOptions: Prettier.Options = {
    parser: "typescript",
    endOfLine: "auto",
};

export default function modelGenerationPhase(
    connectionOptions: IConnectionOptions,
    generationOptions: IGenerationOptions,
    databaseModel: Entity[]
): void {
    createHandlebarsHelpers(generationOptions);

    const resultPath = generationOptions.resultsPath;
    if (!fs.existsSync(resultPath)) {
        fs.mkdirSync(resultPath);
    }

    // let entitiesPath = resultPath;
    if (!generationOptions.noConfigs) {
        const tsconfigPath = path.resolve(resultPath, "tsconfig.json");
        const typeormConfigPath = path.resolve(resultPath, "ormconfig.json");
        /*
        createTsConfigFile(tsconfigPath);
        createTypeOrmConfig(typeormConfigPath, connectionOptions);
        entitiesPath = path.resolve(resultPath, "./entities");
        if (!fs.existsSync(entitiesPath)) {
            fs.mkdirSync(entitiesPath);
        }
        */
    }
    if (generationOptions.indexFile) {
        // createIndexFile(databaseModel, generationOptions, entitiesPath);
    }
    // generateModels(databaseModel, generationOptions, entitiesPath);
    generateResource(databaseModel, generationOptions, resultPath);
}

function generateResource(
    databaseModel: Entity[],
    generationOptions: IGenerationOptions,
    resultPath: string
) {
    const capitalizeFirstLetter = ([first, ...rest], locale = "sv") =>
        first.toLocaleUpperCase(locale) + rest.join("");

    databaseModel.forEach((element) => {
        const resourcePath = getResourcePath(
            resultPath,
            element,
            generationOptions
        );

        createEntities(resourcePath, element, generationOptions);
        createDtos(resourcePath, element, generationOptions);

        const repositoryPath = path.resolve(resourcePath, "./repository");
        createFolder(repositoryPath);
        createResource(
            repositoryPath,
            element,
            generationOptions,
            "repository"
        );

        createResource(resourcePath, element, generationOptions, "resolver");
        createResource(
            resourcePath,
            element,
            generationOptions,
            "resolver.spec"
        );
        createResource(resourcePath, element, generationOptions, "service");
        createResource(
            resourcePath,
            element,
            generationOptions,
            "service.spec"
        );
        createResource(resourcePath, element, generationOptions, "module");

        createResource(resourcePath, element, generationOptions, "controller"); // make optional

        createResource(resourcePath, element, generationOptions, "module");

        /*
        console.log(
            `import { ${capitalizeFirstLetter(
                element.tscName
            )}Module } from './${element.tscName}/${element.tscName}.module';`
        );
        */
    });
    databaseModel.forEach((element) => {
        console.log(`${element.tscName}Module`);
    });
}

function createResource(
    resourcePath: string,
    element,
    generationOptions: IGenerationOptions,
    resource: string
) {
    const compliedTemplate = getCompliedTemplate(resource);
    const rendered = compliedTemplate(element);
    const formatted = prettify(rendered, element);

    const fileName = getFileName(element, generationOptions);
    const filePath = path.resolve(resourcePath, `${fileName}.${resource}.ts`);
    writeFile(filePath, formatted);
}

function createDtos(
    resourcePath: string,
    element,
    generationOptions: IGenerationOptions
) {
    const { tscName } = element;

    element.createName = `Create ${tscName}Input`;

    const folderPath = path.resolve(resourcePath, "./dto");
    createFolder(folderPath);

    let compliedTemplate = getCompliedTemplate("dto_create");
    let rendered = compliedTemplate(element);

    let formatted = prettify(rendered, element);

    let fileName = getFileName(element, generationOptions);
    const dtoCFilePath = path.resolve(
        folderPath,
        `create-${fileName}.input.ts`
    );
    writeFile(dtoCFilePath, formatted);

    element.updateName = `Update ${tscName}Input`;
    element.createPath = `./create-${fileName}.input`;
    compliedTemplate = getCompliedTemplate("dto_update");
    rendered = compliedTemplate(element);

    formatted = prettify(rendered, element);

    fileName = getFileName(element, generationOptions);

    const dtoUFilePath = path.resolve(
        folderPath,
        `update-${fileName}.input.ts`
    );
    writeFile(dtoUFilePath, formatted);
}

function createEntities(
    resourcePath: string,
    element,
    generationOptions: IGenerationOptions
) {
    const folderPath = path.resolve(resourcePath, "./entities");
    createFolder(folderPath);

    const compliedTemplate = getCompliedTemplate("entity");

    const rendered = compliedTemplate(element);
    const withImportStatements = removeUnusedImports(
        EOL !== eolConverter[generationOptions.convertEol]
            ? rendered.replace(
                  /(\r\n|\n|\r)/gm,
                  eolConverter[generationOptions.convertEol]
              )
            : rendered
    );
    const formatted = prettify(withImportStatements, element);

    const fileName = getFileName(element, generationOptions);
    const filePath = path.resolve(folderPath, `${fileName}.entity.ts`);
    writeFile(filePath, formatted);
}

function createFolder(folderPath: string) {
    const entitiesPath = path.resolve(folderPath);
    if (!fs.existsSync(entitiesPath)) {
        fs.mkdirSync(entitiesPath);
    }
}

function writeFile(filePath, formatted) {
    fs.writeFileSync(filePath, formatted, {
        encoding: "utf-8",
        flag: "w",
    });
}
function prettify(rendered, element) {
    let formatted = "";
    try {
        formatted = Prettier.format(rendered, prettierOptions);
    } catch (error) {
        console.error(
            "There were some problems with model generation for table: ",
            element.sqlName
        );
        console.error(error);
        formatted = rendered;
    }
    return formatted;
}

function getCompliedTemplate(templateName: string) {
    const templatePath = path.resolve(
        __dirname,
        "templates",
        `${templateName}.mst`
    );
    const template = fs.readFileSync(templatePath, "utf-8");
    return Handlebars.compile(template, {
        noEscape: true,
    });
}

function getResourcePath(
    resultPath: string,
    element,
    generationOptions: IGenerationOptions
) {
    const fileName = getFileName(element, generationOptions);
    const resourcePath = path.resolve(resultPath, `./${fileName}`);
    if (!fs.existsSync(resourcePath)) {
        fs.mkdirSync(resourcePath);
    }
    return resourcePath;
}

function getFileName(element, generationOptions) {
    let fileName = "";
    switch (generationOptions.convertCaseFile) {
        case "camel":
            fileName = changeCase.camelCase(element.fileName);
            break;
        case "param":
            fileName = changeCase.paramCase(element.fileName);
            break;
        case "pascal":
            fileName = changeCase.pascalCase(element.fileName);
            break;
        case "none":
            fileName = element.fileName;
            break;
        default:
            throw new Error("Unknown case style");
    }
    return fileName;
}
/*
function generateModels(
    databaseModel: Entity[],
    generationOptions: IGenerationOptions,
    entitiesPath: string
) {
    const entityTemplatePath = path.resolve(
        __dirname,
        "templates",
        "entity.mst"
    );
    const entityTemplate = fs.readFileSync(entityTemplatePath, "utf-8");
    const entityCompliedTemplate = Handlebars.compile(entityTemplate, {
        noEscape: true,
    });
    databaseModel.forEach((element) => {
        let casedFileName = "";
        switch (generationOptions.convertCaseFile) {
            case "camel":
                casedFileName = changeCase.camelCase(element.fileName);
                break;
            case "param":
                casedFileName = changeCase.paramCase(element.fileName);
                break;
            case "pascal":
                casedFileName = changeCase.pascalCase(element.fileName);
                break;
            case "none":
                casedFileName = element.fileName;
                break;
            default:
                throw new Error("Unknown case style");
        }
        const resultFilePath = path.resolve(
            entitiesPath,
            `${casedFileName}.ts`
        );
        const rendered = entityCompliedTemplate(element);
        const withImportStatements = removeUnusedImports(
            EOL !== eolConverter[generationOptions.convertEol]
                ? rendered.replace(
                      /(\r\n|\n|\r)/gm,
                      eolConverter[generationOptions.convertEol]
                  )
                : rendered
        );
        let formatted = "";
        try {
            formatted = Prettier.format(withImportStatements, prettierOptions);
        } catch (error) {
            console.error(
                "There were some problems with model generation for table: ",
                element.sqlName
            );
            console.error(error);
            formatted = withImportStatements;
        }
        fs.writeFileSync(resultFilePath, formatted, {
            encoding: "utf-8",
            flag: "w",
        });
    });
}

function createIndexFile(
    databaseModel: Entity[],
    generationOptions: IGenerationOptions,
    entitiesPath: string
) {
    const templatePath = path.resolve(__dirname, "templates", "index.mst");
    const template = fs.readFileSync(templatePath, "utf-8");
    const compliedTemplate = Handlebars.compile(template, {
        noEscape: true,
    });
    const rendered = compliedTemplate({ entities: databaseModel });
    const formatted = Prettier.format(rendered, prettierOptions);
    let fileName = "index";
    switch (generationOptions.convertCaseFile) {
        case "camel":
            fileName = changeCase.camelCase(fileName);
            break;
        case "param":
            fileName = changeCase.paramCase(fileName);
            break;
        case "pascal":
            fileName = changeCase.pascalCase(fileName);
            break;
        default:
    }
    const resultFilePath = path.resolve(entitiesPath, `${fileName}.ts`);
    fs.writeFileSync(resultFilePath, formatted, {
        encoding: "utf-8",
        flag: "w",
    });
}
*/
function removeUnusedImports(rendered: string) {
    const openBracketIndex = rendered.indexOf("{") + 1;
    const closeBracketIndex = rendered.indexOf("}");
    const imports = rendered
        .substring(openBracketIndex, closeBracketIndex)
        .split(",");
    const restOfEntityDefinition = rendered.substring(closeBracketIndex);
    const distinctImports = imports.filter(
        (v) =>
            restOfEntityDefinition.indexOf(`@${v}(`) !== -1 ||
            (v === "BaseEntity" && restOfEntityDefinition.indexOf(v) !== -1)
    );
    return `${rendered.substring(0, openBracketIndex)}${distinctImports.join(
        ","
    )}${restOfEntityDefinition}`;
}

function createHandlebarsHelpers(generationOptions: IGenerationOptions): void {
    Handlebars.registerHelper("json", (context) => {
        const json = JSON.stringify(context);
        const withoutQuotes = json.replace(/"([^(")"]+)":/g, "$1:");
        return withoutQuotes.slice(1, withoutQuotes.length - 1);
    });
    Handlebars.registerHelper("toEntityName", (str) => {
        let retStr = "";
        switch (generationOptions.convertCaseEntity) {
            case "camel":
                retStr = changeCase.camelCase(str);
                break;
            case "pascal":
                retStr = changeCase.pascalCase(str);
                break;
            case "none":
                retStr = str;
                break;
            default:
                throw new Error("Unknown case style");
        }
        return retStr;
    });

    Handlebars.registerHelper("toFileName", (str) => {
        let retStr = "";
        switch (generationOptions.convertCaseFile) {
            case "camel":
                retStr = changeCase.camelCase(str);
                break;
            case "param":
                retStr = changeCase.paramCase(str);
                break;
            case "pascal":
                retStr = changeCase.pascalCase(str);
                break;
            case "none":
                retStr = str;
                break;
            default:
                throw new Error("Unknown case style");
        }
        return retStr;
    });
    Handlebars.registerHelper("printPropertyVisibility", () =>
        generationOptions.propertyVisibility !== "none"
            ? `${generationOptions.propertyVisibility} `
            : ""
    );
    Handlebars.registerHelper("toPropertyName", (str) => {
        let retStr = "";
        switch (generationOptions.convertCaseProperty) {
            case "camel":
                retStr = changeCase.camelCase(str);
                break;
            case "pascal":
                retStr = changeCase.pascalCase(str);
                break;
            case "none":
                retStr = str;
                break;
            case "snake":
                retStr = changeCase.snakeCase(str);
                break;
            default:
                throw new Error("Unknown case style");
        }
        return retStr;
    });

    Handlebars.registerHelper("toGrapqlType", (str) => {
        let retStr = "";
        switch (str) {
            case "number":
                retStr = "Int";
                break;
            case "float":
                retStr = "Float";
                break;
            default:
                retStr = "String";
                break;
        }
        return retStr;
    });

    Handlebars.registerHelper(
        "toGrapqlTypeToRelation",
        (entityType: string, relationType: Relation["relationType"]) => {
            let retVal = entityType;
            if (relationType === "ManyToMany" || relationType === "OneToMany") {
                retVal = `[${retVal}]`;
            }
            return retVal;
        }
    );

    Handlebars.registerHelper(
        "toRelation",
        (entityType: string, relationType: Relation["relationType"]) => {
            let retVal = entityType;
            if (relationType === "ManyToMany" || relationType === "OneToMany") {
                retVal = `${retVal}[]`;
            }
            if (generationOptions.lazy) {
                retVal = `Promise<${retVal}>`;
            }
            return retVal;
        }
    );
    Handlebars.registerHelper("defaultExport", () =>
        generationOptions.exportType === "default" ? "default" : ""
    );
    Handlebars.registerHelper("localImport", (entityName: string) =>
        generationOptions.exportType === "default"
            ? entityName
            : `{${entityName}}`
    );
    Handlebars.registerHelper("strictMode", () =>
        generationOptions.strictMode !== "none"
            ? generationOptions.strictMode
            : ""
    );
    Handlebars.registerHelper({
        and: (v1, v2) => v1 && v2,
        eq: (v1, v2) => v1 === v2,
        gt: (v1, v2) => v1 > v2,
        gte: (v1, v2) => v1 >= v2,
        lt: (v1, v2) => v1 < v2,
        lte: (v1, v2) => v1 <= v2,
        ne: (v1, v2) => v1 !== v2,
        or: (v1, v2) => v1 || v2,
    });
}

function createTsConfigFile(tsconfigPath: string): void {
    if (fs.existsSync(tsconfigPath)) {
        console.warn(
            `\x1b[33m[${new Date().toLocaleTimeString()}] WARNING: Skipping generation of tsconfig.json file. File already exists. \x1b[0m`
        );
        return;
    }
    const templatePath = path.resolve(__dirname, "templates", "tsconfig.mst");
    const template = fs.readFileSync(templatePath, "utf-8");
    const compliedTemplate = Handlebars.compile(template, {
        noEscape: true,
    });
    const rendered = compliedTemplate({});
    const formatted = Prettier.format(rendered, { parser: "json" });
    fs.writeFileSync(tsconfigPath, formatted, {
        encoding: "utf-8",
        flag: "w",
    });
}
function createTypeOrmConfig(
    typeormConfigPath: string,
    connectionOptions: IConnectionOptions
): void {
    if (fs.existsSync(typeormConfigPath)) {
        console.warn(
            `\x1b[33m[${new Date().toLocaleTimeString()}] WARNING: Skipping generation of ormconfig.json file. File already exists. \x1b[0m`
        );
        return;
    }
    const templatePath = path.resolve(__dirname, "templates", "ormconfig.mst");
    const template = fs.readFileSync(templatePath, "utf-8");
    const compiledTemplate = Handlebars.compile(template, {
        noEscape: true,
    });
    const rendered = compiledTemplate(connectionOptions);
    const formatted = Prettier.format(rendered, { parser: "json" });
    fs.writeFileSync(typeormConfigPath, formatted, {
        encoding: "utf-8",
        flag: "w",
    });
}
