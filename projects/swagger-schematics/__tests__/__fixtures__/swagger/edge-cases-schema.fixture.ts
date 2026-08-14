import { ISwaggerSchema } from '../../../interfaces/version_3_1/swagger.interface';
import { createSwaggerSchema, createGetOperation } from '../../helpers/factories';

export type TEdgeCasesMockApiPath =
  | '/api/EdgeCase/download'
  | '/api/EdgeCase/report'
  | '/api/EdgeCase/referenced';

/**
 * Edge-case shapes fixed in 1.2.0, kept in one document so the generated
 * output is snapshot-visible:
 * - enums without x-enum-varnames (string values needing sanitization,
 *   numeric values), a too-short x-enum-varnames, values needing escaping
 * - arrays of unions / nullable refs (parenthesization)
 * - allOf with a nullable ref member (parenthesization)
 * - allOf with sibling own properties (inline object literal)
 * - a nullable Record of nullable values (outer | null not suppressed)
 * - response resolution: bodyless 200 next to a binary 2XX (type and
 *   responseType: 'blob' must agree), an xml-only response, and a
 *   response-level $ref
 */
const BASE_SCHEMA = createSwaggerSchema<TEdgeCasesMockApiPath>({
  paths: {
    '/api/EdgeCase/download': createGetOperation({
      tags: ['EdgeCase'],
      summary: 'Bodyless 200 next to a binary 2XX',
      responses: {
        '200': { description: 'no content' },
        '2XX': {
          description: 'the file',
          content: { 'application/octet-stream': {} }
        }
      }
    }),
    '/api/EdgeCase/report': createGetOperation({
      tags: ['EdgeCase'],
      summary: 'Response declared only as application/xml',
      responses: {
        '200': {
          description: 'xml report',
          content: {
            'application/xml': { schema: { $ref: '#/components/schemas/ModelA' } }
          }
        }
      }
    }),
    '/api/EdgeCase/referenced': createGetOperation({
      tags: ['EdgeCase'],
      summary: 'Response-level $ref',
      responses: {
        '200': { $ref: '#/components/responses/OkModel' }
      }
    })
  } as never,
  schemas: {
    StatusWithoutNames: {
      type: 'string',
      enum: ['in progress', 'not-started', 'Done']
    },
    NumericCodes: {
      type: 'integer',
      enum: [1, 2, 99]
    },
    PartialNames: {
      type: 'integer',
      enum: [1, 2, 3],
      'x-enum-varnames': ['One', 'Two']
    },
    TrickyValues: {
      type: 'string',
      enum: ["it's", 'back\\slash'],
      'x-enum-varnames': ['Apostrophe', 'Backslash']
    },
    ModelA: {
      type: 'object',
      properties: {
        a: { type: 'string' }
      }
    },
    ModelB: {
      type: 'object',
      properties: {
        b: { type: 'number' }
      }
    },
    NullableExtra: {
      type: 'object',
      nullable: true,
      properties: {
        x: { type: 'string' }
      }
    },
    NullableString: {
      type: 'string',
      nullable: true
    },
    MixedListDto: {
      type: 'object',
      properties: {
        unionList: {
          type: 'array',
          items: {
            oneOf: [
              { $ref: '#/components/schemas/ModelA' },
              { $ref: '#/components/schemas/ModelB' }
            ]
          }
        },
        nullableRefList: {
          type: 'array',
          items: { $ref: '#/components/schemas/NullableExtra' }
        }
      }
    },
    NullableMapDto: {
      type: 'object',
      properties: {
        map: {
          type: 'object',
          nullable: true,
          additionalProperties: { $ref: '#/components/schemas/NullableString' }
        }
      }
    },
    DerivedDto: {
      allOf: [{ $ref: '#/components/schemas/ModelA' }],
      properties: {
        extra: { type: 'string' },
        other: { $ref: '#/components/schemas/ModelB' }
      }
    },
    IntersectNullableDto: {
      allOf: [
        { $ref: '#/components/schemas/ModelA' },
        { $ref: '#/components/schemas/NullableExtra' }
      ]
    }
  } as never
});

export const EDGE_CASES_SWAGGER_SCHEMA: ISwaggerSchema<TEdgeCasesMockApiPath> = {
  ...BASE_SCHEMA,
  components: {
    ...BASE_SCHEMA.components,
    responses: {
      OkModel: {
        description: 'referenced ok',
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/ModelB' } }
        }
      }
    }
  }
};
