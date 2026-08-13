import { ISwaggerSchema } from '../../../interfaces/version_3_1/swagger.interface';
import { createSwaggerSchema, createGetOperation, createPathParam } from '../../helpers/factories';

export type TOpenApi31MockApiPath =
  | '/api/Report'
  | '/api/Report/{reportId}/download';

/**
 * OpenAPI 3.1 style document: version 3.1.0, nullability via type arrays
 * (no nullable keyword), binary via contentMediaType / schema-less
 * application/octet-stream content.
 */
export const OPENAPI_31_SWAGGER_SCHEMA: ISwaggerSchema<TOpenApi31MockApiPath> = {
  ...createSwaggerSchema<TOpenApi31MockApiPath>({
    paths: {
      '/api/Report': createGetOperation({
        tags: ['Report'],
        summary: 'List reports',
        parameters: [
          {
            name: 'filter',
            in: 'query',
            required: false,
            schema: { type: ['string', 'null'] } as any
          }
        ],
        responses: {
          '200': {
            description: 'ok',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/ReportDto' } }
              }
            }
          } as any
        }
      }),
      '/api/Report/{reportId}/download': createGetOperation({
        tags: ['Report'],
        summary: 'Download a report',
        parameters: [createPathParam('reportId')],
        responses: {
          '200': {
            description: 'The raw report file',
            content: {
              'application/octet-stream': {}
            }
          } as any
        }
      })
    },
    schemas: {
      ReportStatus: {
        type: ['string', 'null'],
        enum: ['Draft', 'Published']
      } as any,
      // Strongly-typed primitive wrapper (.NET style): inlined at references.
      GuidIdentifier: {
        type: 'string',
        format: 'uuid'
      } as any,
      OwnerDto: {
        type: 'object',
        properties: {
          displayName: { type: ['string', 'null'] }
        }
      } as any,
      ReportDto: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'reference'],
        properties: {
          id: { type: 'integer', format: 'int32' },
          name: { type: ['string', 'null'] },
          reference: { type: ['string', 'integer'] },
          status: { $ref: '#/components/schemas/ReportStatus' },
          attachment: { type: 'string', contentMediaType: 'application/octet-stream' },
          signature: { type: 'string', contentEncoding: 'base64', contentMediaType: 'application/octet-stream' },
          // 3.1 nullable-ref idiom: oneOf: [{type:null}, {$ref}]
          ownerId: { oneOf: [{ type: 'null' }, { $ref: '#/components/schemas/GuidIdentifier' }] },
          owner: { oneOf: [{ type: 'null' }, { $ref: '#/components/schemas/OwnerDto' }] }
        }
      } as any
    }
  }),
  openapi: '3.1.0'
};
