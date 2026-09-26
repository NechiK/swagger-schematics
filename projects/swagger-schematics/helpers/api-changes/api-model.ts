import { strings } from '@angular-devkit/core';
import { ISwaggerSchema, TSchemaByType } from '../../interfaces/version_3_1/swagger.interface';
import { TFrameworkType } from '../../interfaces/swagger-schematics/framework';
import { getGeneratedSchemaKind, TGeneratedSchemaKind } from '../../types/utils/schema-kind';
import { transformProperties } from '../../types/utils/transform-type';
import { transformCompositionSchema } from '../../types/helpers/template.helper';
import { toEnumMemberName } from '../../types/utils/enum';
import { transformSwaggerSchema } from '../../api/helpers/api.helper';

export interface IApiModelOptions {
    framework: TFrameworkType;
    typeMapping?: Record<string, string>;
    legacyOptionalProperties?: boolean;
    apiPathKey?: string;
    scopeEndpointsWithTags?: boolean;
    includeApis?: string[];
    excludeApis?: string[];
    excludeDeprecated?: boolean;
}

export type TTypeModel =
    /** Property name -> its generated declaration, e.g. `total?: number | null` */
    | { kind: 'interface'; properties: Record<string, string> }
    /** Member name -> its value as it appears in the enum */
    | { kind: 'enum'; members: Record<string, string> }
    | { kind: 'type-alias'; expression: string };

export interface IEndpointModel {
    /** e.g. `GET /api/Users/{id}` */
    label: string;
    /** Where it lives in the generated code, e.g. `UsersApiService.getById()` */
    symbol: string;
    /** Parameters and result, e.g. `(id: number) => IUserDto` */
    signature: string;
}

/**
 * The API as the generated code exposes it: the TypeScript symbols the types
 * schematic emits and the endpoints the api schematic emits, keyed by the name
 * a developer sees. Built with the generator's own naming and type rendering,
 * so a change summary speaks in the names and types found in the generated files.
 */
export interface IApiModel {
    /** Keyed by symbol, e.g. `IUserDto`, `TOrderStatus` */
    types: Record<string, TTypeModel>;
    /** Keyed by `METHOD path` */
    endpoints: Record<string, IEndpointModel>;
}

const SYMBOL_PREFIX: Record<TGeneratedSchemaKind, string> = {
    'interface': 'I',
    'enum': 'T',
    'type-alias': 'T'
};

export function buildApiModel(swagger: ISwaggerSchema, options: IApiModelOptions): IApiModel {
    return {
        types: buildTypes(swagger, options),
        endpoints: buildEndpoints(swagger, options)
    };
}

function buildTypes(swagger: ISwaggerSchema, options: IApiModelOptions): IApiModel['types'] {
    const transformOptions = { typeMapping: options.typeMapping, legacyOptionalProperties: options.legacyOptionalProperties };
    const schemas = swagger.components?.schemas ?? {};
    const types: IApiModel['types'] = {};

    Object.keys(schemas).forEach(schemaKey => {
        const kind = getGeneratedSchemaKind(schemas[schemaKey]);
        if (!kind) {
            return;
        }

        // Same naming as the templates: parseName() keeps the last path segment, then classify
        const symbol = SYMBOL_PREFIX[kind] + strings.classify(schemaKey.split('/').pop() as string);
        const schema = schemas[schemaKey] as TSchemaByType;

        if (kind === 'enum') {
            const values = (schema as { enum: Array<string | number> }).enum;
            const names = (schema as { 'x-enum-varnames'?: string[] })['x-enum-varnames'];
            const members: Record<string, string> = {};
            values.forEach((value, index) => {
                members[toEnumMemberName(names?.[index] ?? value, index)] = JSON.stringify(value);
            });
            types[symbol] = { kind, members };
        } else if (kind === 'type-alias') {
            types[symbol] = { kind, expression: transformCompositionSchema(schema, swagger, transformOptions).typeExpression };
        } else {
            const { propertiesContent } = transformProperties(
                (schema as { properties?: Parameters<typeof transformProperties>[0] }).properties ?? {},
                swagger,
                transformOptions,
                (schema as { required?: string[] }).required ?? []
            );
            const properties: Record<string, string> = {};
            propertiesContent.forEach(([name, type]) => {
                properties[name.replace(/\?$/, '')] = `${name}: ${type}`;
            });
            types[symbol] = { kind, properties };
        }
    });

    return types;
}

function buildEndpoints(swagger: ISwaggerSchema, options: IApiModelOptions): IApiModel['endpoints'] {
    const groups = transformSwaggerSchema(swagger, {
        typeMapping: options.typeMapping,
        apiPathKey: options.apiPathKey,
        includeApis: options.includeApis,
        excludeApis: options.excludeApis,
        excludeDeprecated: options.excludeDeprecated,
        silent: true
    });
    const endpoints: IApiModel['endpoints'] = {};

    Object.keys(groups).forEach(groupKey => {
        groups[groupKey].apiList.forEach(item => {
            // Same naming as the Angular service and RTK slice templates
            const symbol = options.framework === 'react-rtk'
                ? `${strings.camelize(groupKey)}Api.${options.scopeEndpointsWithTags ? item.scopedApiMethodName : item.apiMethodName}`
                : `${strings.classify(groupKey)}ApiService.${item.apiMethodName}()`;
            const label = `${item.httpMethod} ${item.apiPath}`;
            endpoints[label] = {
                label,
                symbol,
                // What callers pass: Angular methods take positional parameters, RTK endpoints one request object
                signature: options.framework === 'react-rtk'
                    ? `(${item.apiMethodRequestType}) => ${item.responseTypeSymbol}`
                    : `(${item.apiMethodParams}) => ${item.responseTypeSymbol}`
            };
        });
    });

    return endpoints;
}
