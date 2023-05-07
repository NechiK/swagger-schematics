import {ISwaggerApi, ISwaggerSchema} from '../../interfaces/swagger.interface';
import {camelize, capitalize} from '@angular-devkit/core/src/utils/strings';
import {ISwaggerSymbolEnumInterface, parseRefToSymbol, transformType, TSwaggerSymbol} from './interface';

export function getApiMethodName(apiMethod: ISwaggerApi,apiMethodKey: string, apiPathKey: string) {
    let parsedMethodName = '';
    switch (apiMethodKey) {
        case 'get':
            parsedMethodName = parseGetRequestName(apiMethod, apiMethodKey, apiPathKey);
            break;
        case 'post':
            parsedMethodName = parsePostRequestName(apiMethod, apiMethodKey, apiPathKey);
            break
        case 'put':
            parsedMethodName = parsePutRequestName(apiMethod, apiMethodKey, apiPathKey);
            break;
        default:
            parsedMethodName = parseUnrecognizedApiPathPatterns(apiMethodKey, apiPathKey);
    }

    return camelize(parsedMethodName);
}

export function getApiResponseSymbol(apiMethod: ISwaggerApi, swaggerData: ISwaggerSchema): TSwaggerSymbol | null {
    const api200Content = apiMethod.responses['200'].content;
    const api200ContentJson = api200Content && api200Content['application/json'];
    if (api200ContentJson) {
        if (api200ContentJson.schema) {
            return transformType(api200ContentJson.schema, swaggerData);
        } else {
            return null;
        }
    } else {
        return null;
    }
}

export function parseRequestBody(apiMethod: ISwaggerApi, swaggerData: ISwaggerSchema): ISwaggerSymbolEnumInterface | null {
    const apiRequestBody = apiMethod.requestBody;
    const applicationJSON = apiRequestBody && apiRequestBody.content['application/json'];
    const multipartFormData = apiRequestBody && apiRequestBody.content['multipart/form-data'];

    if (applicationJSON && applicationJSON.schema.$ref) {
        if (applicationJSON.schema.$ref) {
            return parseRefToSymbol(apiMethod.requestBody.content['application/json'].schema, swaggerData);
        } else {
            return null;
        }
    } else if (multipartFormData) {
        return null;
    } else {
        return null;
    }
}

function parseGetRequestName(apiMethod: ISwaggerApi, apiMethodKey: string, apiPathKey: string) {
    const getModelByParamNameMatch = /(^\/api\/)([a-zA-Z]+)\/{(\w+)}$/.exec(apiPathKey);
    const getGetModelDataParamNameMatch = /(^\/api\/)([a-zA-Z]+)\/{(\w+)}\/([a-zA-Z]+)$/.exec(apiPathKey);
    if (getModelByParamNameMatch) {
        const paramName = capitalize(getModelByParamNameMatch[3]);
        return `${apiMethodKey}By${paramName}`;
    } else if (getGetModelDataParamNameMatch) {
        const modelName = capitalize(getGetModelDataParamNameMatch[2]);
        const paramName = capitalize(getGetModelDataParamNameMatch[3]);
        const dataName = capitalize(getGetModelDataParamNameMatch[4]);
        return `${apiMethodKey}${dataName}By${paramName.toLowerCase().includes(modelName.toLowerCase()) ? '' : modelName}${paramName}`;
    } else {
        return parseUnrecognizedApiPathPatterns(apiMethodKey, apiPathKey);
    }
}

function parsePostRequestName(apiMethod: ISwaggerApi, apiMethodKey: string, apiPathKey: string) {
    const predictCreate = apiMethod.summary.toLowerCase().includes('create');
    const predictAdd = apiMethod.summary.toLowerCase().includes('add');
    const predictSearch = apiMethod.summary.toLowerCase().includes('search');
    if (predictCreate) {
        return parseDefaultMethodName('create', apiPathKey);
    } else if (predictAdd) {
        return parseDefaultMethodName('add', apiPathKey);
    } else if (predictSearch) {
        return parseDefaultMethodName('search', apiPathKey);
    } else {
        return parseDefaultMethodName(apiMethodKey, apiPathKey);
    }
}

function parsePutRequestName(apiMethod: ISwaggerApi, apiMethodKey: string, apiPathKey: string) {
    return parseDefaultMethodName('update', apiPathKey);
}

function parseUnrecognizedApiPathPatterns(apiMethodKey: string, apiPathKey: string) {
    console.warn('Unexpected API path pattern: ', apiPathKey);
    return parseDefaultMethodName(apiMethodKey, apiPathKey);
}

function parseDefaultMethodName(methodPrefix: string, apiPathKey: string) {
    const segments = apiPathKey.match(/^\/api\/(.*)/)![0].split('/');
    return [methodPrefix, ...segments.filter(urlSegment => !urlSegment.match(/\{.*}/) && !urlSegment.match(/^api/))].join(' ');
}
