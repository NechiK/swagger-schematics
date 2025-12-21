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
            break;
        case 'put':
            parsedMethodName = parsePutRequestName(apiMethod, apiMethodKey, apiPathKey);
            break;
        case 'delete':
            parsedMethodName = parseDeleteRequestName(apiMethod, apiMethodKey, apiPathKey);
            break;
        case 'patch':
            parsedMethodName = parsePatchRequestName(apiMethod, apiMethodKey, apiPathKey);
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
    // Pattern: /api/Model/{id} - get model by id
    const getModelByParamNameMatch = /(^\/api\/)([a-zA-Z]+)\/{(\w+)}$/.exec(apiPathKey);
    if (getModelByParamNameMatch) {
        const paramName = capitalize(getModelByParamNameMatch[3]);
        return `${apiMethodKey}By${paramName}`;
    }
    
    // Pattern: /api/Model/{id}/data - get model data by id
    const getModelDataByParamMatch = /(^\/api\/)([a-zA-Z]+)\/{(\w+)}\/([a-zA-Z]+)$/.exec(apiPathKey);
    if (getModelDataByParamMatch) {
        const modelName = capitalize(getModelDataByParamMatch[2]);
        const paramName = capitalize(getModelDataByParamMatch[3]);
        const dataName = capitalize(getModelDataByParamMatch[4]);
        return `${apiMethodKey}${dataName}By${paramName.toLowerCase().includes(modelName.toLowerCase()) ? '' : modelName}${paramName}`;
    }
    
    // Pattern: /api/Model/action - get model action (no param)
    const getModelActionMatch = /(^\/api\/)([a-zA-Z]+)\/([a-zA-Z]+)$/.exec(apiPathKey);
    if (getModelActionMatch) {
        const modelName = capitalize(getModelActionMatch[2]);
        const actionName = capitalize(getModelActionMatch[3]);
        return `${apiMethodKey}${modelName}${actionName}`;
    }
    
    // Pattern: /api/Model/action/{param} - get model action by param
    const getModelActionByParamMatch = /(^\/api\/)([a-zA-Z]+)\/([a-zA-Z]+)\/{(\w+)}$/.exec(apiPathKey);
    if (getModelActionByParamMatch) {
        const modelName = capitalize(getModelActionByParamMatch[2]);
        const actionName = capitalize(getModelActionByParamMatch[3]);
        const paramName = capitalize(getModelActionByParamMatch[4]);
        return `${apiMethodKey}${modelName}${actionName}By${paramName}`;
    }
    
    // Fallback - should rarely happen now
    return parseDefaultMethodName(apiMethodKey, apiPathKey);
}

function parsePostRequestName(apiMethod: TOperation, apiMethodKey: string, apiPathKey: string) {
    return parseMethodName(apiMethod, apiMethodKey, apiPathKey, ['create', 'add', 'search']);
}

function parsePutRequestName(apiMethod: TOperation, apiMethodKey: string, apiPathKey: string) {
    // First try to predict from summary/description
    const prediction = ['update', 'edit'].find(predictString => predictByString(apiMethod, predictString));
    if (prediction) {
        return parseDefaultMethodName(prediction, apiPathKey);
    }
    
    // Pattern: /api/Model/{id} - update model by id
    const updateModelByIdMatch = /(^\/api\/)([a-zA-Z]+)\/{(\w+)}$/.exec(apiPathKey);
    if (updateModelByIdMatch) {
        const paramName = capitalize(updateModelByIdMatch[3]);
        return `updateBy${paramName}`;
    }
    
    // Pattern: /api/Model/{id}/action - update model action by id
    const updateModelActionMatch = /(^\/api\/)([a-zA-Z]+)\/{(\w+)}\/([a-zA-Z]+)$/.exec(apiPathKey);
    if (updateModelActionMatch) {
        const modelName = capitalize(updateModelActionMatch[2]);
        const paramName = capitalize(updateModelActionMatch[3]);
        const actionName = capitalize(updateModelActionMatch[4]);
        return `update${modelName}By${paramName}${actionName}`;
    }
    
    // Pattern: /api/Model/action - update model action (no param)
    const updateActionMatch = /(^\/api\/)([a-zA-Z]+)\/([a-zA-Z]+)$/.exec(apiPathKey);
    if (updateActionMatch) {
        const modelName = capitalize(updateActionMatch[2]);
        const actionName = capitalize(updateActionMatch[3]);
        return `update${modelName}${actionName}`;
    }
    
    // Fallback to default with 'update' prefix
    return parseDefaultMethodName('update', apiPathKey);
}

function parseDeleteRequestName(apiMethod: TOperation, apiMethodKey: string, apiPathKey: string) {
    // First try to predict from summary/description
    const prediction = ['delete', 'remove'].find(predictString => predictByString(apiMethod, predictString));
    if (prediction) {
        return parseDefaultMethodName(prediction, apiPathKey);
    }
    
    // Pattern: /api/Model/{id} - delete model by id
    const deleteModelByIdMatch = /(^\/api\/)([a-zA-Z]+)\/{(\w+)}$/.exec(apiPathKey);
    if (deleteModelByIdMatch) {
        const modelName = capitalize(deleteModelByIdMatch[2]);
        const paramName = capitalize(deleteModelByIdMatch[3]);
        return `delete${modelName}By${paramName}`;
    }
    
    // Fallback to default with 'delete' prefix
    return parseDefaultMethodName('delete', apiPathKey);
}

function parsePatchRequestName(apiMethod: TOperation, apiMethodKey: string, apiPathKey: string) {
    // Pattern: /api/Model/{id} - patch model by id
    const patchModelByIdMatch = /(^\/api\/)([a-zA-Z]+)\/{(\w+)}$/.exec(apiPathKey);
    if (patchModelByIdMatch) {
        const modelName = capitalize(patchModelByIdMatch[2]);
        const paramName = capitalize(patchModelByIdMatch[3]);
        return `patch${modelName}By${paramName}`;
    }
    
    // Fallback to default with 'patch' prefix
    return parseDefaultMethodName('patch', apiPathKey);
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
