import {ISwaggerSchema} from '../../interfaces/version_3_1/swagger.interface';
import {camelize, capitalize} from '@angular-devkit/core/src/utils/strings';
import { TOperation, TPathOperationKey } from '../../interfaces/version_3_1/operation.interface';
import { THttpStatusCode } from '../../interfaces/http-status-code.enum';
import { TTypeWithImport, transformType } from './transform-type';

export function getApiMethodName(apiMethod: TOperation, apiMethodKey: TPathOperationKey, apiPathKey: string) {
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

export function getApiResponseSymbol(apiMethod: TOperation, swaggerData: ISwaggerSchema): TTypeWithImport {
    const api200Content = apiMethod.responses[THttpStatusCode.OK]!.content!;
    const api200ContentJson = api200Content && api200Content['application/json'];
    if (api200ContentJson) {
        if (api200ContentJson.schema) {
            return transformType(api200ContentJson.schema, swaggerData);
        } else {
            return ['void'];
        }
    } else {
        return ['void'];
    }
}

type TOperationPredictionProperties = 'summary' | 'description';

function predictByString(apiMethod: TOperation, predictString: string) {
    const predictionProperties: TOperationPredictionProperties[] = ['summary', 'description'];
    return predictionProperties.some(property => {
        return apiMethod[property]?.toLowerCase().includes(predictString.toLowerCase());
    });
}

function parseMethodName(apiMethod: TOperation, apiMethodKey: string, apiPathKey: string, predictionStrings: string[]) {
    const prediction = predictionStrings.find(predictString => predictByString(apiMethod, predictString));
    if (prediction) {
        return parseDefaultMethodName(prediction, apiPathKey);
    } else {
        return parseDefaultMethodName(apiMethodKey, apiPathKey);
    }
}

function parseGetRequestName(apiMethod: TOperation, apiMethodKey: string, apiPathKey: string) {
    const getModelByParamNameMatch = /(^\/api\/)([a-zA-Z]+)\/{(\w+)}$/.exec(apiPathKey); // /api/modelName/{id}
    const getGetModelDataParamNameMatch = /(^\/api\/)([a-zA-Z]+)\/{(\w+)}\/([a-zA-Z]+)$/.exec(apiPathKey); // /api/modelName/{id}/dataName
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

function parsePostRequestName(apiMethod: TOperation, apiMethodKey: string, apiPathKey: string) {
    return parseMethodName(apiMethod, apiMethodKey, apiPathKey, ['create', 'add', 'search']);
}

function parsePutRequestName(apiMethod: TOperation, apiMethodKey: string, apiPathKey: string) {
    return parseMethodName(apiMethod, apiMethodKey, apiPathKey, ['update', 'edit']);
}

function parseUnrecognizedApiPathPatterns(apiMethodKey: string, apiPathKey: string) {
    console.warn('Unexpected API path pattern: ', apiPathKey);
    return parseDefaultMethodName(apiMethodKey, apiPathKey);
}

function parseDefaultMethodName(methodPrefix: string, apiPathKey: string) {
    const segments = apiPathKey.split('/');
    // model/submodel/{property}
    const segmentsWithParams = apiPathKey.match(/(([a-zA-Z]+\/)+{(\w+)})+/g);
    if (segmentsWithParams) {
        return [methodPrefix, ...segments.map(urlSegment => {
            const isParam = urlSegment.match(/\{(.*)}/);
            const isApi = urlSegment.match(/^api/);
            if (isApi) {
                return '';
            } else if (isParam) {
                return camelize(`By ${isParam[1]}`);
            } else {
                return urlSegment;
            }
        })].join(' ');
    } else {
        return [methodPrefix, ...segments.filter(urlSegment =>
            !urlSegment.match(/\{.*}/) && !urlSegment.match(/^api/))].join(' ');
    }
}
