import { EOL } from "os";

import path = require("path");

// TODO: change name

// eslint-disable-next-line @typescript-eslint/interface-name-prefix
export default interface IGenerationOptions {
    resultsPath: string;
    pluralizeNames: boolean;
    noConfigs: boolean;
    convertCaseFile: "pascal" | "param" | "camel" | "none";
    convertCaseEntity: "pascal" | "camel" | "none";
    convertCaseProperty: "pascal" | "camel" | "snake" | "none";
    convertEol: "LF" | "CRLF";
    propertyVisibility: "public" | "protected" | "private" | "none";
    lazy: boolean;
    activeRecord: boolean;
    generateConstructor: boolean;
    customNamingStrategyPath: string;
    relationIds: boolean;
    strictMode: "none" | "?" | "!";
    skipSchema: boolean;
    indexFile: boolean;
    exportType: "named" | "default";
}

export const eolConverter = {
    LF: "\n",
    CRLF: "\r\n",
};

export function getDefaultGenerationOptions(): IGenerationOptions {
    const generationOptions: IGenerationOptions = {
        resultsPath: path.resolve(
            process.cwd(),
            "../allbry-be-nestjs/src/modules"
        ),
        pluralizeNames: true,
        noConfigs: false,
        convertCaseFile: "param",
        convertCaseEntity: "pascal",
        convertCaseProperty: "camel",
        convertEol: EOL === "\n" ? "LF" : "CRLF",
        propertyVisibility: "none",
        lazy: false,
        activeRecord: false,
        generateConstructor: false,
        customNamingStrategyPath: "",
        relationIds: false,
        strictMode: "none",
        skipSchema: false,
        indexFile: false,
        exportType: "named",
    };
    return generationOptions;
}
