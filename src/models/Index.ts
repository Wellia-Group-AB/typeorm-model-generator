export type Index = {
    name: string;
    columns: string[];
    options: {
        unique?: boolean;
        fulltext?: boolean;
    };
    optionsDto: {
        unique?: boolean;
        fulltext?: boolean;
    };
    primary?: boolean;
};
