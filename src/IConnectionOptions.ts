// TODO: change name

// eslint-disable-next-line @typescript-eslint/interface-name-prefix
export default interface IConnectionOptions {
    host: string;
    port: number;
    databaseNames: string[];
    user: string;
    password: string;
    databaseType:
        | "mssql"
        | "postgres"
        | "mysql"
        | "mariadb"
        | "oracle"
        | "sqlite";
    schemaNames: string[];
    instanceName?: string;
    ssl: boolean;
    skipTables: string[];
    onlyTables: string[];
}

export function getDefaultConnectionOptions(): IConnectionOptions {
    const connectionOptions: IConnectionOptions = {
        host: "localhost",
        port: 5432,
        databaseNames: ["snaptive"],
        user: "postgres",
        password: "",
        databaseType: "postgres",
        schemaNames: ["public"],
        instanceName: undefined,
        ssl: false,
        skipTables: [],
        onlyTables: [],
    };
    return connectionOptions;
}
