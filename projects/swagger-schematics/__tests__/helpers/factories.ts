import { IPathOperations, IOperationBase, IPostOperation, IPutOperation, IDeleteOperation } from '../../interfaces/version_3_1/operation.interface';
import { TParam, IPathParam, IQueryParam } from '../../interfaces/version_3_1/params.interface';
import { IRequestBody } from '../../interfaces/version_3_1/request.interface';
import { IResponse, TResponse } from '../../interfaces/version_3_1/response.interface';
import { 
  TSchemaByType, 
  ISwaggerSchema, 
  IPath, 
  TSchema,
  ISchemaInteger,
  ISchemaString,
  ISchemaObject,
  ISchemaArray,
  ISchemaBoolean,
  ISchemaNumber,
  ISchemaProperties
} from '../../interfaces/version_3_1/swagger.interface';
import { IRef } from '../../interfaces/version_3_1/ref.interface';

// ============================================================================
// Parameter Factories
// ============================================================================

export interface ParameterConfig {
  name: string;
  type: 'integer' | 'string' | 'boolean' | 'number';
  format?: 'int32' | 'int64';
  required?: boolean;
  description?: string;
  defaultValue?: unknown;
  schema?: TSchema;
}

export const createPathParam = (
  name: string,
  type: 'integer' | 'string' = 'integer',
  options: Partial<ParameterConfig> = {}
): IPathParam => ({
  name,
  in: 'path',
  description: options.description,
  required: true,
  schema: options.schema ?? (type === 'integer' 
    ? { type: 'integer', format: options.format ?? 'int32' } as ISchemaInteger
    : { type: 'string' } as ISchemaString)
});

export const createQueryParam = (
  name: string,
  type: 'integer' | 'string' | 'boolean' = 'string',
  options: Partial<ParameterConfig> = {}
): IQueryParam => ({
  name,
  in: 'query',
  description: options.description,
  required: options.required ?? false,
  schema: options.schema ?? (type === 'integer' 
    ? { type: 'integer', format: options.format ?? 'int32', default: options.defaultValue } as ISchemaInteger
    : type === 'boolean'
      ? { type: 'boolean' } as ISchemaBoolean
      : { type: 'string' } as ISchemaString)
});

export const createRefParam = (
  name: string,
  refName: string,
  inLocation: 'path' | 'query' = 'query',
  required = false
): TParam => ({
  name,
  in: inLocation,
  description: '',
  required: inLocation === 'path' ? true : required,
  schema: { $ref: `#/components/schemas/${refName}` }
} as TParam);

// ============================================================================
// Request Body Factories
// ============================================================================

export interface RequestBodyConfig {
  refName?: string;
  type?: 'object' | 'array' | 'integer' | 'string' | 'boolean';
  itemsType?: 'integer' | 'string';
  itemsRef?: string;
  description?: string;
  required?: boolean;
  contentType?: 'application/json' | 'multipart/form-data';
  properties?: Record<string, unknown>;
}

export const createJsonRequestBody = (config: RequestBodyConfig = {}): IRequestBody => {
  let schema: TSchema;
  
  if (config.refName) {
    schema = { $ref: `#/components/schemas/${config.refName}` };
  } else if (config.type === 'array') {
    if (config.itemsRef) {
      schema = { 
        type: 'array', 
        items: { $ref: `#/components/schemas/${config.itemsRef}` } 
      } as ISchemaArray;
    } else {
      schema = { 
        type: 'array', 
        items: { type: config.itemsType ?? 'integer', format: config.itemsType === 'integer' ? 'int32' : undefined } as TSchema
      } as ISchemaArray;
    }
  } else if (config.type === 'integer') {
    schema = { type: 'integer', format: 'int32' } as ISchemaInteger;
  } else {
    schema = { type: config.type ?? 'object' } as TSchemaByType;
  }

  return {
    description: config.description ?? '',
    required: config.required ?? true,
    content: {
      'application/json': { schema }
    }
  };
};

export const createFormDataRequestBody = (
  properties: Record<string, unknown>,
  encoding?: Record<string, { style?: 'form' }>
): IRequestBody => ({
  content: {
    'multipart/form-data': {
      schema: {
        type: 'object',
        properties: properties as ISchemaProperties
      } as ISchemaObject,
      ...(encoding ? { encoding } : {})
    }
  }
});

// ============================================================================
// Response Factories
// ============================================================================

export interface ResponseConfig {
  refName?: string;
  type?: 'object' | 'array' | 'boolean' | 'integer' | 'string';
  itemsType?: 'integer' | 'string';
  itemsRef?: string;
  description?: string;
}

export const createResponse = (config: ResponseConfig = {}): TResponse => {
  const response: IResponse = {
    description: config.description ?? 'Success'
  };

  if (config.refName) {
    response.content = {
      'application/json': {
        schema: { $ref: `#/components/schemas/${config.refName}` }
      }
    };
  } else if (config.type) {
    let schema: TSchema;
    
    if (config.type === 'array') {
      if (config.itemsRef) {
        schema = { 
          type: 'array', 
          items: { $ref: `#/components/schemas/${config.itemsRef}` } 
        } as ISchemaArray;
      } else {
        schema = { 
          type: 'array', 
          items: { type: config.itemsType ?? 'integer', format: 'int32' } as ISchemaInteger
        } as ISchemaArray;
      }
    } else if (config.type === 'boolean') {
      schema = { type: 'boolean' } as ISchemaBoolean;
    } else if (config.type === 'integer') {
      schema = { type: 'integer', format: 'int32' } as ISchemaInteger;
    } else {
      schema = { type: config.type } as TSchemaByType;
    }

    response.content = {
      'application/json': { schema }
    };
  }

  return { '200': response };
};

export const createEmptyResponse = (): TResponse => ({
  '200': { description: 'Success' }
});

// ============================================================================
// Operation Factories
// ============================================================================

export interface OperationConfig {
  tags?: string[];
  summary?: string;
  parameters?: TParam[];
  requestBody?: IRequestBody | IRef;
  responses?: TResponse;
}

const createBaseOperation = (config: OperationConfig = {}): IOperationBase => ({
  ...(config.tags ? { tags: config.tags } : {}),
  ...(config.summary ? { summary: config.summary } : {}),
  ...(config.parameters?.length ? { parameters: config.parameters } : {}),
  responses: config.responses ?? createEmptyResponse()
});

export const createGetOperation = (config: OperationConfig = {}): IPathOperations => ({
  get: createBaseOperation(config)
});

export const createPostOperation = (config: OperationConfig & { requestBody?: IRequestBody | IRef } = {}): IPathOperations => ({
  post: {
    ...createBaseOperation(config),
    requestBody: config.requestBody!
  } as IPostOperation
});

export const createPutOperation = (config: OperationConfig & { requestBody?: IRequestBody | IRef } = {}): IPathOperations => ({
  put: {
    ...createBaseOperation(config),
    ...(config.requestBody ? { requestBody: config.requestBody } : {})
  } as IPutOperation
});

export const createDeleteOperation = (config: OperationConfig & { requestBody?: IRequestBody | IRef } = {}): IPathOperations => ({
  delete: {
    ...createBaseOperation(config),
    ...(config.requestBody ? { requestBody: config.requestBody } : {})
  } as IDeleteOperation
});

// ============================================================================
// Preset Operation Factories (Common Patterns)
// ============================================================================

export const createGetByIdOperation = (
  modelName: string,
  responseRef: string,
  idParamName = 'id'
): IPathOperations =>
  createGetOperation({
    tags: [modelName],
    summary: `Gets ${modelName}`,
    parameters: [createPathParam(idParamName)],
    responses: createResponse({ refName: responseRef })
  });

export const createGetWithQueryParamsOperation = (
  modelName: string,
  responseRef: string,
  queryParams: TParam[]
): IPathOperations =>
  createGetOperation({
    tags: [modelName],
    summary: `Gets ${modelName} list`,
    parameters: queryParams,
    responses: createResponse({ type: 'array', itemsRef: responseRef })
  });

export const createPostWithBodyOperation = (
  modelName: string,
  requestRef: string,
  responseRef: string,
  pathParams: TParam[] = []
): IPathOperations =>
  createPostOperation({
    tags: [modelName],
    summary: `Creates ${modelName}`,
    parameters: pathParams,
    requestBody: createJsonRequestBody({ refName: requestRef }),
    responses: createResponse({ refName: responseRef })
  });

export const createPutByIdOperation = (
  modelName: string,
  requestRef: string,
  responseRef: string,
  idParamName = 'id'
): IPathOperations =>
  createPutOperation({
    tags: [modelName],
    summary: `Updates ${modelName}`,
    parameters: [createPathParam(idParamName)],
    requestBody: createJsonRequestBody({ refName: requestRef }),
    responses: createResponse({ refName: responseRef })
  });

export const createDeleteByIdOperation = (
  modelName: string,
  idParamName = 'id'
): IPathOperations =>
  createDeleteOperation({
    tags: [modelName],
    summary: `Deletes ${modelName}`,
    parameters: [createPathParam(idParamName)],
    responses: createEmptyResponse()
  });

export const createDeleteManyOperation = (
  modelName: string
): IPathOperations =>
  createDeleteOperation({
    tags: [modelName],
    summary: 'Delete multiple entities',
    requestBody: createJsonRequestBody({ type: 'array', itemsType: 'integer', description: 'Ids of entities to delete' }),
    responses: createResponse({ type: 'boolean' })
  });

// ============================================================================
// Schema Factories
// ============================================================================

export interface SchemaPropertyConfig {
  type: 'integer' | 'string' | 'boolean' | 'number' | 'array' | 'object';
  format?: 'int32' | 'int64' | 'date' | 'date-time';
  nullable?: boolean;
  description?: string;
  ref?: string;
  items?: { type?: string; ref?: string };
  maxLength?: number;
}

export const createObjectSchema = (
  properties: Record<string, SchemaPropertyConfig | { $ref: string }>,
  options: { description?: string; required?: string[] } = {}
): ISchemaObject => {
  const schemaProperties: ISchemaProperties = {};
  
  for (const [key, value] of Object.entries(properties)) {
    if ('$ref' in value) {
      schemaProperties[key] = value as IRef;
    } else if (value.ref) {
      schemaProperties[key] = { $ref: `#/components/schemas/${value.ref}` };
    } else if (value.items?.ref) {
      schemaProperties[key] = {
        type: 'array',
        items: { $ref: `#/components/schemas/${value.items.ref}` },
        ...(value.nullable ? { nullable: true } : {})
      } as ISchemaArray;
    } else if (value.type === 'integer') {
      schemaProperties[key] = {
        type: 'integer',
        format: value.format ?? 'int32',
        ...(value.nullable ? { nullable: true } : {}),
        ...(value.description ? { description: value.description } : {})
      } as ISchemaInteger;
    } else if (value.type === 'string') {
      schemaProperties[key] = {
        type: 'string',
        ...(value.format ? { format: value.format as 'date' | 'date-time' } : {}),
        ...(value.nullable ? { nullable: true } : {}),
        ...(value.description ? { description: value.description } : {}),
        ...(value.maxLength ? { maxLength: value.maxLength } : {})
      } as ISchemaString;
    } else if (value.type === 'boolean') {
      schemaProperties[key] = {
        type: 'boolean',
        ...(value.nullable ? { nullable: true } : {}),
        ...(value.description ? { description: value.description } : {})
      } as ISchemaBoolean;
    } else if (value.type === 'array' && value.items?.type) {
      schemaProperties[key] = {
        type: 'array',
        items: { type: value.items.type } as TSchema,
        ...(value.nullable ? { nullable: true } : {}),
        ...(value.description ? { description: value.description } : {})
      } as ISchemaArray;
    } else {
      schemaProperties[key] = { type: value.type } as TSchemaByType;
    }
  }

  return {
    type: 'object',
    ...(options.description ? { description: options.description } : {}),
    ...(options.required?.length ? { required: options.required } : {}),
    properties: schemaProperties
  };
};

export const createEnumSchema = (
  values: (number | string)[],
  options: { varnames?: string[]; type?: 'integer' | 'string'; nullable?: boolean } = {}
): TSchemaByType => ({
  type: options.type ?? 'integer',
  ...(options.type !== 'string' ? { format: 'int32' } : {}),
  enum: values,
  ...(options.varnames ? { 'x-enum-varnames': options.varnames } : {}),
  ...(options.nullable ? { nullable: true } : {})
} as TSchemaByType);

// ============================================================================
// Full Swagger Schema Factory
// ============================================================================

export interface SwaggerSchemaConfig<T extends string = string> {
  title?: string;
  description?: string;
  version?: string;
  paths: Record<T, IPath>;
  schemas: Record<string, TSchema>;
  serverUrl?: string;
}

export const createSwaggerSchema = <T extends string>(
  config: SwaggerSchemaConfig<T>
): ISwaggerSchema<T> => ({
  openapi: '3.0.1',
  info: {
    title: config.title ?? 'Test API',
    description: config.description ?? 'Test API Documentation',
    version: config.version ?? 'v1'
  },
  paths: config.paths,
  components: {
    schemas: config.schemas
  },
  servers: [{ url: config.serverUrl ?? 'https://api.example.com' }]
});
