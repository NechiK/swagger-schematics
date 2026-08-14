import { ISwaggerSchema } from '../../../interfaces/version_3_1/swagger.interface';
import { createSwaggerSchema } from '../../helpers/factories';

export type TEdgeCasesMockApiPath = never;

/**
 * Edge-case shapes fixed in 1.2.0, kept in one document so the generated
 * output is snapshot-visible:
 * - enums without x-enum-varnames (string values needing sanitization,
 *   numeric values), a too-short x-enum-varnames, values needing escaping
 * - arrays of unions / nullable refs (parenthesization)
 * - allOf with a nullable ref member (parenthesization)
 * - allOf with sibling own properties (inline object literal)
 * - a nullable Record of nullable values (outer | null not suppressed)
 */
export const EDGE_CASES_SWAGGER_SCHEMA: ISwaggerSchema<TEdgeCasesMockApiPath> = createSwaggerSchema<TEdgeCasesMockApiPath>({
  paths: {} as never,
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
