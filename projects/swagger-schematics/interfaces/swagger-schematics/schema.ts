import { ISchemaProperties } from "../version_3_1/swagger.interface";

export interface ISwaggerSchematicsBaseSchema {
    name: string;
}

export interface ISwaggerSchematicsEnumSchema extends ISwaggerSchematicsBaseSchema {
    type: 'enum';
    enum: Array<string | number>;
    data: {
        enum: Array<string | number>;
        'x-enum-varnames'?: string[];
    }
}

export interface ISwaggerSchematicsInterfaceSchema extends ISwaggerSchematicsBaseSchema {
    name: string;
    type: 'interface';
    data: {
        properties : ISchemaProperties;
    };
}

export type TSwaggerSchematicsSchema = ISwaggerSchematicsEnumSchema | ISwaggerSchematicsInterfaceSchema;