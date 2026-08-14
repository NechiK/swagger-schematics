import { getApiResponseSymbol, isBinaryResponse, resolveSuccessResponse } from '../../types/utils/api';
import { ISwaggerSchema } from '../../interfaces/version_3_1/swagger.interface';
import { TOperation } from '../../interfaces/version_3_1/operation.interface';
import { TResponse } from '../../interfaces/version_3_1/response.interface';

describe('Success response resolution', () => {
  const swagger = {
    openapi: '3.0.1',
    info: { title: 'Test API', version: '1.0.0' },
    paths: {},
    components: {
      schemas: {
        ReportDto: { type: 'object', properties: { id: { type: 'integer' } } }
      },
      responses: {
        Ok: {
          description: 'referenced ok',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ReportDto' } }
          }
        }
      }
    }
  } as unknown as ISwaggerSchema;

  const operation = (responses: TResponse): TOperation => ({ responses } as TOperation);

  it('types and binary-flags the SAME response: bodyless 200 + binary 2XX', () => {
    const op = operation({
      '200': { description: 'no content' },
      '2XX': {
        description: 'binary',
        content: { 'application/octet-stream': {} }
      }
    } as TResponse);

    // Before the fix these disagreed: symbol Blob (from 2XX) but
    // isBinaryResponse false (from the bodyless 200) - a generated client
    // typed Observable<Blob> without responseType: 'blob'.
    expect(getApiResponseSymbol(op, swagger)).toEqual(['Blob', []]);
    expect(isBinaryResponse(op, swagger)).toBe(true);
  });

  it('keeps 204 No Content as void even when later keys have content', () => {
    const op = operation({
      '204': { description: 'no content' },
      '2XX': {
        description: 'json',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ReportDto' } } }
      }
    } as TResponse);

    expect(getApiResponseSymbol(op, swagger)[0]).toBe('void');
    expect(isBinaryResponse(op, swagger)).toBe(false);
  });

  it('types responses declared only with an unlisted media type', () => {
    const op = operation({
      '200': {
        description: 'xml only',
        content: { 'application/xml': { schema: { $ref: '#/components/schemas/ReportDto' } } }
      }
    } as TResponse);

    // Previously fell through to void because application/xml was not in the
    // hardcoded response content-type list.
    expect(getApiResponseSymbol(op, swagger)[0]).toBe('IReportDto');
  });

  it('resolves a response-level $ref', () => {
    const op = operation({
      '200': { $ref: '#/components/responses/Ok' }
    } as TResponse);

    expect(getApiResponseSymbol(op, swagger)[0]).toBe('IReportDto');

    const resolved = resolveSuccessResponse(op.responses, swagger);
    expect(resolved?.response.description).toBe('referenced ok');
  });

  it('falls back to the first existing response when none has content', () => {
    const resolved = resolveSuccessResponse({
      '201': { description: 'created, bodyless' }
    } as TResponse, swagger);

    expect(resolved?.key).toBe('201');
    expect(resolved?.response.description).toBe('created, bodyless');
  });
});
