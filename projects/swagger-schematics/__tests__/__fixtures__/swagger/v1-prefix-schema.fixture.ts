import { ISwaggerSchema } from '../../../interfaces/version_3_1/swagger.interface';
import { createSwaggerSchema, createGetOperation, createPathParam } from '../../helpers/factories';

export type TV1PrefixMockApiPath =
  | '/v1/Widget'
  | '/v1/Widget/{id}';

/**
 * A document whose paths are rooted at /v1/ instead of /api/ - generation
 * from it requires the apiPathKey option (previously a documented no-op).
 */
export const V1_PREFIX_SWAGGER_SCHEMA: ISwaggerSchema<TV1PrefixMockApiPath> = createSwaggerSchema<TV1PrefixMockApiPath>({
  paths: {
    '/v1/Widget': createGetOperation({
      tags: ['Widget'],
      summary: 'List widgets',
      responses: {
        '200': {
          description: 'ok',
          content: {
            'application/json': {
              schema: { type: 'array', items: { $ref: '#/components/schemas/WidgetDto' } }
            }
          }
        }
      }
    }),
    '/v1/Widget/{id}': createGetOperation({
      tags: ['Widget'],
      summary: 'Get widget by id',
      parameters: [createPathParam('id', 'integer')],
      responses: {
        '200': {
          description: 'ok',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/WidgetDto' }
            }
          }
        }
      }
    })
  } as never,
  schemas: {
    WidgetDto: {
      type: 'object',
      properties: {
        id: { type: 'integer' },
        name: { type: 'string' }
      }
    }
  } as never
});
