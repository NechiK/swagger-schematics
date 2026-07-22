import { IResponse } from '../../../interfaces/version_3_1/response.interface';
import { createSwaggerSchema, createGetOperation, createPathParam, createQueryParam } from '../../helpers/factories';

const createBinaryResponse = (): Record<string, IResponse> => ({
  '200': {
    description: 'The file content, streamed with its original file name',
    content: {
      'application/json': {
        schema: { type: 'string', format: 'binary' }
      }
    }
  } as IResponse
});

export type TBinaryMockApiPath = '/api/Document/{documentId}/download';

export const BINARY_SWAGGER_SCHEMA = createSwaggerSchema<TBinaryMockApiPath>({
  paths: {
    '/api/Document/{documentId}/download': createGetOperation({
      tags: ['Document'],
      summary: 'Download a document',
      parameters: [
        createPathParam('documentId'),
        createQueryParam('thumbnail', 'boolean', {
          schema: { type: 'boolean', nullable: true }
        })
      ],
      responses: createBinaryResponse()
    })
  },
  schemas: {}
});
