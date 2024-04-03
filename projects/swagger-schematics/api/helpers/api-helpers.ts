import { camelize } from "@angular-devkit/core/src/utils/strings";
import { TOperation, TPathOperationKey } from "../../interfaces/version_3_1/operation.interface";
import { TParam } from "../../interfaces/version_3_1/params.interface";
import { IRef } from "../../interfaces/version_3_1/ref.interface";
import { IPath, IPathBase, ISwaggerSchema, PATH_KEYS } from "../../interfaces/version_3_1/swagger.interface";
import { getApiMethodName, getApiResponseSymbol, parseRequestBody } from "../../types/utils/api";
import { IParsedApiSchema, TTypeSymbol, isRef, transformPrimitives } from "../../types/utils/interface";

export const getPathOperations = (path: IPath): [TPathOperationKey, TOperation][] => {
    return Object.keys(path).map((pathKey: string) => {
        if (!PATH_KEYS.includes(pathKey as keyof IPathBase)) {
            const operationKey = pathKey as TPathOperationKey;
            const operation = path[operationKey];
            if (operation) {
                return [
                    operationKey,
                    operation
                ] as [TPathOperationKey, TOperation];
            }
        }
    }).filter(operation => !!operation) as [TPathOperationKey, TOperation][];
}

export const transformSwaggerSchema = (swaggerSchema: ISwaggerSchema): IParsedApiSchema => {
    const defaultApiPathKey = '/api/';

    const apiPaths = swaggerSchema.paths;
    const apiPathKeys = Object.keys(apiPaths);

    return apiPathKeys.reduce((apiParsedSchema, apiPathKey) => {
        if (!apiPathKey.match(/^\/api\//)) {
            console.warn(`Path ${apiPathKey} doesn't match ${defaultApiPathKey} pattern. Skipping...`);
            return apiParsedSchema;
        }
        const [nameSegment, ...segments]: string[] = apiPathKey.slice(defaultApiPathKey.length).split('/');
        const swagerPath: IPath = apiPaths[apiPathKey];
        const apiPrefix: string = nameSegment;
        if (!apiParsedSchema.hasOwnProperty(apiPrefix)) {
            apiParsedSchema[apiPrefix] = {
                name: apiPrefix,
                apiList: [],
                importRefs: []
            };
        }

        const apiOperations = getPathOperations(swagerPath);

        apiParsedSchema[apiPrefix].apiList = apiParsedSchema[apiPrefix].apiList.concat(apiOperations.map((
            [operationKey, operation]
        ) => {
            const apiUrl = segments.map(urlSegment => urlSegment.match(/\{.*}/) ? `$${urlSegment}` : urlSegment).join('/');
            const apiMethodName = getApiMethodName(operation, operationKey, apiPathKey);
            const queryParams: string[] = [];
            const methodParams: string[] = [];
            if (operation.parameters) {
                operation.parameters.forEach(apiParam => {
                    if (apiParam.in === 'query') {
                        queryParams.push(apiParam.name);
                    } else {
                        methodParams.push(`${apiParam.name}: ${transformPrimitives(apiParam.schema).propertySymbol}`)
                    }
                });
            }

            let bodyParam: TTypeSymbol | null = null;
            const responseType: TTypeSymbol | null = getApiResponseSymbol(operation, swaggerSchema);

            const apiCallParams = [`this.getUrl(\`${apiUrl}\`)`];

            if (['post', 'put', 'patch', 'delete'].includes(operationKey)) {
                bodyParam = parseRequestBody(operation, swaggerSchema);

                if (bodyParam) {
                    if ('propertySymbol' in bodyParam) {
                        const property = 'body';
                        methodParams.push(`${property}: ${bodyParam.propertySymbol}`);

                        if (operationKey === 'delete') {
                            apiCallParams.push(`{ ${property} }`);
                        } else {
                            apiCallParams.push(property);
                        }
                    } else {
                        const camelizeProperty = camelize(bodyParam.refPropertyKey);
                        methodParams.push(`${camelizeProperty}: ${bodyParam.propertyRefSymbol}`);
                        apiCallParams.push(camelizeProperty);
                        apiParsedSchema[apiPrefix].importRefs.push(bodyParam);
                    }
                } else {
                    apiCallParams.push('{}');
                }
            }

            let returnTypeSymbol: string;
            // Add response type import
            if (responseType) {
                if ('propertyRefSymbol' in responseType) {
                    if (responseType.importSymbol) {
                        apiParsedSchema[apiPrefix].importRefs.push(responseType);
                    }
                    returnTypeSymbol = responseType.propertyRefSymbol;
                } else {
                    returnTypeSymbol = responseType.propertySymbol;
                }
            } else {
                returnTypeSymbol = 'void';
            }

            // Add query params to API call body and method params (as object)
            if (queryParams.length > 0) {
                apiCallParams.push(`{params: queryParams}`);
                methodParams.push(`queryParams: {${queryParams.map(queryParam => `${queryParam}?: string`).join(';')}} = {}`);
            }

            return {
                apiUrl,
                apiMethodName,
                requestMethod: operationKey,
                methodParams: methodParams.join(', '),
                bodyParam,
                returnTypeSymbol,
                apiCallParams: apiCallParams.join(', '),
                response: operation.responses['200']
            }
        }));

        return apiParsedSchema;
    }, {} as IParsedApiSchema);
};