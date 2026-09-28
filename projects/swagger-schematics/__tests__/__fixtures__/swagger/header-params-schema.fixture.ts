import { ISwaggerSchema } from '../../../interfaces/version_3_1/swagger.interface';

const orderResponse = {
  '200': { description: 'ok', content: { 'application/json': { schema: { $ref: '#/components/schemas/OrderDto' } } } }
};

/**
 * Operations declaring header parameters: required and optional, a nullable
 * one, the spec-ignored Accept/Content-Type/Authorization, an unsupported name
 * (skipped with a warning), and a cookie parameter (which a browser client cannot send).
 */
export const HEADER_PARAMS_SWAGGER_SCHEMA = {
  openapi: '3.0.1',
  info: { title: 'Headers', version: 'v1' },
  paths: {
    '/api/Orders/{id}': {
      get: {
        tags: ['Orders'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'X-Tenant-Id', in: 'header', required: true, schema: { type: 'string' } },
          { name: 'If-None-Match', in: 'header', schema: { type: 'string' } },
          { name: 'Authorization', in: 'header', schema: { type: 'string' } },
          { name: 'accept', in: 'header', schema: { type: 'string' } },
          { name: 'Content-Type', in: 'header', schema: { type: 'string' } },
          { name: 'session', in: 'cookie', schema: { type: 'string' } }
        ],
        responses: orderResponse
      },
      put: {
        tags: ['Orders'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'If-Match', in: 'header', schema: { type: 'string' } },
          { name: 'X-Version', in: 'header', schema: { type: 'integer', nullable: true } }
        ],
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/OrderDto' } } } },
        responses: { '204': { description: 'ok' } }
      },
      delete: {
        tags: ['Orders'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'Idempotency-Key', in: 'header', required: true, schema: { type: 'string' } }
        ],
        responses: { '204': { description: 'ok' } }
      }
    },
    '/api/Orders': {
      get: {
        tags: ['Orders'],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'X-Trace', in: 'header', schema: { type: 'string' } },
          { name: "X-Odd'Name", in: 'header', schema: { type: 'string' } }
        ],
        responses: {
          '200': { description: 'ok', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/OrderDto' } } } } }
        }
      }
    }
  },
  components: {
    schemas: {
      OrderDto: { type: 'object', properties: { id: { type: 'integer' } } }
    }
  }
} as unknown as ISwaggerSchema;
