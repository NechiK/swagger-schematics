import { TOperation, TPathOperationKey } from "../../interfaces/version_3_1/operation.interface";
import { IPath, IPathBase, ISwaggerSchema, PATH_KEYS } from "../../interfaces/version_3_1/swagger.interface";
import { getApiMethodName, getApiResponseSymbol } from "../../types/utils/api";
import { removeImportDuplicates } from "../../types/helpers/template.helper";
import { transformRequestBody } from "../../types/utils/request-body";
import { IParsedApiItem, transformOperationParams, transformParamsToApiMethodParams } from "../../types/utils/params";
import { IImportRef } from "../../types/utils/transform-type";
import { camelize } from "@angular-devkit/core/src/utils/strings";

export interface IParsedApiSchema {
    [key: string]: IParsedSchemaItem;
}

/**
 * Represents the structure of a parsed schema item.
 */
export interface IParsedSchemaItem {
    /** 
     * The name of the schema item. 
     */
    name: string;
    
    /** 
     * An array containing parsed API items associated with this schema item.
     * @type {IParsedApiItem[]}
     */
    apiList: IParsedApiItem[];
    
    /**
     * An array containing import references associated with this schema item.
     * @type {IImportRef[]}
     */
    importRefs: IImportRef[];
}

export const getPathOperations = (path: IPath): [TPathOperationKey, TOperation][] => {
    return Object.keys(path).map((pathKey: string) => {
        if (!PATH_KEYS.includes(pathKey as keyof IPathBase)) {
            const operationKey = pathKey as TPathOperationKey;
            const operation = path[operationKey];
            if (operation) {
                return [
                    operationKey,
                    {
                        ...operation,
                        parameters: (operation.parameters || []).map(param => ({
                            ...param,
                            name: camelize(param.name || '')
                        }))
                    }
                ] as [TPathOperationKey, TOperation];
            }
        }
    }).filter(operation => !!operation) as [TPathOperationKey, TOperation][];
}

export const transformSwaggerSchema = (swaggerSchema: ISwaggerSchema): IParsedApiSchema => {
    const defaultApiPathKey = '/api/';

    const apiPaths = swaggerSchema.paths;
    const apiPathKeys = Object.keys(apiPaths);

    const transformedSwaggerSchema = apiPathKeys.reduce((apiParsedSchema, apiPathKey: string) => {
        if (!apiPathKey.match(/^\/api\//)) {
            console.warn(`Path ${apiPathKey} doesn't match ${defaultApiPathKey} pattern. Skipping...`);
            return apiParsedSchema;
        }
        const [nameSegment, ...segments]: string[] = apiPathKey.slice(defaultApiPathKey.length).split('/');
        const swaggerPath: IPath = apiPaths[apiPathKey];
        const apiPrefix: string = nameSegment;
        if (!apiParsedSchema.hasOwnProperty(apiPrefix)) {
            apiParsedSchema[apiPrefix] = {
                name: apiPrefix,
                apiList: [],
                importRefs: []
            };
        }

        const apiOperations = getPathOperations(swaggerPath);

        apiParsedSchema[apiPrefix].apiList = apiParsedSchema[apiPrefix].apiList.concat(apiOperations.map((
            [operationKey, operation]
        ): IParsedApiItem => {
            const apiUrl = segments.map(urlSegment => urlSegment.match(/\{.*}/) ? `$${urlSegment}` : urlSegment).join('/');
            const apiMethodName = getApiMethodName(operation, operationKey, apiPathKey);
            const {
                queryParams,
                pathParams,
                headerParams,
                cookieParams
            } = transformOperationParams(operation, swaggerSchema);

            const [responseTypeSymbol, responseTypeImportRef] = getApiResponseSymbol(operation, swaggerSchema);
            if (responseTypeImportRef) {
                apiParsedSchema[apiPrefix].importRefs.push(responseTypeImportRef);
            }

            const [bodyParam, importRef] = transformRequestBody(operation, swaggerSchema);
            if (importRef) {
                apiParsedSchema[apiPrefix].importRefs.push(importRef);
            }

            return {
                apiUrl,
                queryParams,
                pathParams,
                headerParams,
                cookieParams,
                apiMethodName,
                apiMethodType: operationKey,
                apiMethodParams: transformParamsToApiMethodParams({
                    pathParams,
                    queryParams,
                    bodyParam,
                }),
                requestMethod: operationKey,
                bodyParam,
                responseTypeSymbol,
                response: operation.responses['200']
            };
        }));

        return apiParsedSchema;
    }, {} as IParsedApiSchema);

    // Remove import duplicates
    Object.keys(transformedSwaggerSchema).forEach(apiKey => {
        transformedSwaggerSchema[apiKey].importRefs = removeImportDuplicates(transformedSwaggerSchema[apiKey].importRefs);
    });

    return transformedSwaggerSchema;
};