import { IResponse } from '../../../interfaces/version_3_1/response.interface';
import {
  createSwaggerSchema,
  createGetOperation,
  createPostOperation,
  createPathParam,
  createQueryParam,
  createFormDataRequestBody,
  createResponse
} from '../../helpers/factories';

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

export type TBinaryMockApiPath =
  | '/api/Document'
  | '/api/Document/{documentId}/download'
  | '/api/Document/{documentId}/upload';

export const BINARY_SWAGGER_SCHEMA = createSwaggerSchema<TBinaryMockApiPath>({
  paths: {
    '/api/Document': createGetOperation({
      tags: ['Document'],
      summary: 'List documents',
      parameters: [
        createQueryParam('page', 'integer'),
        createQueryParam('force', 'boolean', { required: true })
      ],
      responses: createResponse({ type: 'boolean' })
    }),
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
    }),
    '/api/Document/{documentId}/upload': createPostOperation({
      tags: ['Document'],
      summary: 'Upload document files',
      parameters: [createPathParam('documentId')],
      requestBody: createFormDataRequestBody({
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' }
        }
      }),
      responses: createResponse({ type: 'boolean' })
    })
  },
  schemas: {}
});
