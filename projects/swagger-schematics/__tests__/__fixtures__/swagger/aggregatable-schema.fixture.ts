import { ISwaggerSchema } from '../../../interfaces/version_3_1/swagger.interface';
import { createSwaggerSchema, createGetOperation } from '../../helpers/factories';

export type TAggregatableMockApiPath = '/api/Journal' | '/api/Plain';

/**
 * A result type whose server declared two properties aggregatable via `x-aggregatable`, beside
 * one it did not — and a second type that declares nothing, so "renders exactly as before" is a
 * discriminating claim.
 */
export const AGGREGATABLE_SWAGGER_SCHEMA: ISwaggerSchema<TAggregatableMockApiPath> = createSwaggerSchema<TAggregatableMockApiPath>({
  paths: {
    '/api/Journal': createGetOperation({
      tags: ['Journal'],
      summary: 'Paged journal search',
      responses: {
        '200': {
          description: 'ok',
          content: {
            'application/json': {
              schema: { type: 'array', items: { $ref: '#/components/schemas/JournalDto' } }
            }
          }
        } as any
      }
    }),
    '/api/Plain': createGetOperation({
      tags: ['Plain'],
      summary: 'A type with no aggregatable columns',
      responses: {
        '200': {
          description: 'ok',
          content: {
            'application/json': {
              schema: { type: 'array', items: { $ref: '#/components/schemas/PlainDto' } }
            }
          }
        } as any
      }
    })
  },
  schemas: {
    JournalDto: {
      type: 'object',
      required: ['id', 'hours', 'date'],
      properties: {
        id: { type: 'integer', format: 'int32' },
        hours: { type: 'number', format: 'decimal', 'x-aggregatable': ['Sum', 'Avg', 'Min', 'Max', 'CountDistinct'] },
        date: { type: 'string', format: 'date', 'x-aggregatable': ['Min', 'Max', 'CountDistinct'] },
        notes: { type: 'string', nullable: true }
      }
    } as any,
    PlainDto: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'integer', format: 'int32' },
        name: { type: 'string', nullable: true }
      }
    } as any
  }
});
