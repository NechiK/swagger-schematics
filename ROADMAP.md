# Roadmap

Known issues and follow-ups that aren't fixed yet, sorted by priority. Most were found in a review of PR #36 (2.0.0) that tried to predict the next Copilot findings; each was reproduced unless marked *(reasoned)*. "Since 2.0.0" means the 2.0.0 changes introduced or exposed it; "pre-existing" means it was already on `develop`.

Remove an entry when its fix lands, and add a CHANGELOG entry for it as usual.

[Feature ideas](#feature-ideas) at the end are candidates, not commitments: things other generators offer, kept here so they aren't lost.

## Medium

### `x-` extensions on a path item crash generation
- **Where:** `api/helpers/api.helper.ts`, `getPathOperations()`
- **Problem:** every path-item key that isn't a known field (`parameters`, `summary`, ...) is treated as an HTTP operation.
- **Example:** `'/api/Orders': { 'x-controller': 'OrdersController', get: {...} }` fails with `TypeError: Cannot read properties of undefined (reading '200')` in `resolveSuccessResponse`. `documentDeclaresOperations()` also counts such keys as operations.
- **Fix:** accept only `get`, `put`, `post`, `delete`, `options`, `head`, `patch` and `trace`.
- **Status:** pre-existing, in a function 2.0.0 changed.

### Component schemas that are arrays, tuples or records generate empty interfaces
- **Where:** `types/utils/schema-kind.ts`, `getGeneratedSchemaKind()`, with `isPrimitiveWrapper()`
- **Problem:** an array or record component falls through to `'interface'`.
- **Example:** `Position: { type: array, prefixItems: [number, number], minItems: 2, items: false }` gives `export interface IPosition {}`, so `p[0]` doesn't compile. `Tags: { type: array, items: string }` gives `ITags {}` and `Dict: { type: object, additionalProperties: integer }` gives `IDict {}`.
- **Fix:** return `'type-alias'` for array components and for records without `properties`, render them with `transformTypeWithAllImports()`, and make `getRefImportType()` return `'type'` for them.
- **Status:** pre-existing; since 2.0.0 for tuples.

### Nullability is dropped in nested positions
- **Where:** `types/utils/transform-type.ts`, tuple positions, array `items`, `additionalProperties` and union members
- **Problem:** `| null` is only added at the property or parameter level (`withNullability()`).
- **Example:** `prefixItems: [{ type: ['string', 'null'] }], minItems: 1` gives `[string, ...unknown[]]`. `items: { type: ['string', 'null'] }` gives `string[]`. `additionalProperties: { type: 'integer', nullable: true }` gives `Record<string, number>`. A `$ref` to a nullable schema is already correct: `(IX | null)[]`.
- **Fix:** apply `withNullability()` to each element, rest, item, record value and union member before wrapping.
- **Status:** pre-existing; since 2.0.0 for tuples.

## Low

### Angular
- **TRACE doesn't compile:** a TRACE operation generates `this.httpClient.trace<...>()`, and `HttpClient` has no `trace` method. Use `this.httpClient.request('TRACE', url, options)` or skip the operation with a warning. *Pre-existing.* (`api/helpers/angular-template.helper.ts`)
- **Request body dropped for OPTIONS, GET and HEAD:** an operation with a `requestBody` takes `body` but never sends it (e.g. `opt(body)` returns `this.httpClient.options(url)`). Use `this.httpClient.request(method, url, { body, params, headers })` when a body is present outside POST/PUT/PATCH/DELETE. *Pre-existing.*
- **Optional-only query params still need an argument:** `getItems({ page }: { page?: number })` has no `= {}` default, so `getItems()` doesn't compile. The trailing headers object already defaults to `{}`. Adding the default is the Angular counterpart of the RTK `| void` fix in 2.0.0. *Pre-existing.* (`transformParamsToApiMethodParams()`)

### Parameters and headers
- **Query parameter names are renamed on the wire:** `page_size` is sent as `?pageSize=` by Angular and RTK. Keep `originalParam.name` as the key (`'page_size': pageSize`). *Pre-existing.* (`transformOperationParams()`)
- **Reserved-word query and path names produce invalid code:** a query parameter named `default` generates `({ pageSize, default }: ...)`. Header names already go through `toHeaderParamSymbol()`, which rejects reserved words; query and path names need the same guard, or a rename. *Pre-existing.*

### Types
- **Boolean schemas crash:** `prefixItems: [true]` or `items: true` throws `Cannot use 'in' operator to search for '$ref' in true`. Map `true` to `unknown` and `false` to `never` in `transformType()` and `isRef()`. *Pre-existing; since 2.0.0 for tuples.*
- **Property names that aren't identifiers aren't quoted:** `first-name` or `@odata.type` produce `first-name?: string`, a syntax error (also inside inline `allOf` object literals). *Pre-existing.*
- **An enum containing `null` generates `null = null`** (TS18033), e.g. `type: ['string', 'null'], enum: ['red', null]`. Skip `null` values; nullability already comes from the reference. *Pre-existing.*
- **Enum member names can collide:** `'a-b'` and `'a b'` both become `AB`. *Pre-existing.*

### API change summary and CLI
- **A failed `--change-report` write still exits 0:** `runChangeSummary()` errors only log a warning. A CI step that then reads the report finds it missing or stale. Consider `process.exitCode = 1` when `--change-report` was requested and the write failed. *Since 2.0.0; currently deliberate.* (`bin/swagger-schematics.ts`)

## Feature ideas

Features other OpenAPI generators have and this one doesn't, from a comparison with openapi-generator, NSwag, ng-openapi-gen, orval, hey-api, kubb, openapi-typescript and the official RTK codegen. None is planned yet; each lists what it would take. Header parameters, RTK cache tags, JSDoc, API filtering and `provideApi()` came from the same comparison and shipped in 2.0.0.

Sizes: **S** is a day or less, **M** a few days, **L** a week or more.

### Angular `httpResource` / signals output (M)
- **What:** generate signal-based resource functions next to the Observable services, e.g. `ordersResource(() => ({ id: id() }))` returning an `HttpResourceRef<IOrderDto>`.
- **Why:** Angular 19.2+ moves reads to signals; today every call site wraps the service in `toSignal()` or `rxResource()` by hand.
- **Who has it:** orval (`override.angular.retrievalClient: 'httpResource'`), hey-api (`@angular/common` plugin), ng-openapi.
- **Notes:** GET only; mutations stay on the services. Opt-in, as `rtkCacheTags` is.

### `readOnly` / `writeOnly` in request and response types (M)
- **What:** leave `readOnly` properties (`id`, `createdAt`) out of request bodies, and `writeOnly` ones (`password`) out of responses. Either separate request/response types or a `Omit<>`-based request type per DTO.
- **Why:** when the backend uses one DTO for GET and POST/PUT, the generated create call demands server-owned fields, so callers pass dummy values or cast.
- **Who has it:** openapi-typescript (`--read-write-markers`).
- **Open questions:** does the backend reuse the same DTO for reads and writes, and does its Swagger JSON contain `"readOnly": true` (Swashbuckle emits it for get-only properties)?

### `oneOf` discriminators (M)
- **What:** use `discriminator.propertyName`/`mapping` to generate narrowable unions, e.g. `TShape = (ICircle & { $type: 'circle' }) | (ISquare & { $type: 'square' })`.
- **Why:** .NET 7+ `[JsonPolymorphic]`/`[JsonDerivedType]` emits `$type` discriminators; without them a consumer can't narrow the union safely. OpenAPI 3.1 `const` (supported since 2.0.0) covers documents that already put a `const` on the property.
- **Who has it:** NSwag, openapi-generator.

### Change summary: request vs response DTOs (M)
- **What:** know which DTOs are used in request bodies and parameters, so the summary can judge changes by direction: a new required property on a request DTO breaks callers, a removed property on a response DTO breaks readers, and a new optional request property is harmless.
- **Why:** makes the breaking/added split in the PR description more accurate for the regen pipeline. Today any property change is judged the same way wherever the DTO is used.

### Dates as `Date` (M)
- **What:** type `format: date-time`/`date` as `Date` and convert response strings at runtime (an HttpClient interceptor or a generated transformer for Angular, `transformResponse` for RTK). Opt-in.
- **Why:** .NET `DateTime`/`DateTimeOffset` arrive as strings typed `string`, so parsing is scattered across components.
- **Who has it:** NSwag (`DateTimeType`: Date, MomentJS, DayJS or string), hey-api (transformers plugin).
- **Notes:** request bodies need the reverse conversion; keep it opt-in because it changes every date type.

### More filters, and only the DTOs that are used (S–M)
- **What:** filter by OpenAPI tag, path pattern or `operationId` in addition to the controller name (`includeApis`/`excludeApis` today), and optionally generate only the schemas the selected APIs reference (following `$ref` chains).
- **Why:** with a filtered API list, the types schematic still generates every DTO, including ones only excluded controllers use.
- **Who has it:** ng-openapi-gen (`includeTags`/`excludeTags`), RTK codegen (`filterEndpoints`), hey-api (`parser.filters`).

### YAML input (S)
- **What:** accept `.yaml`/`.yml` files and YAML responses (by extension or content type, falling back to YAML when JSON parsing fails).
- **Why:** spec-first teams usually commit YAML. Low value for ASP.NET backends, which serve JSON by default.
- **Cost:** a runtime dependency (`yaml`, about 100 KB, no dependencies of its own).

### Zod schemas for runtime validation (L)
- **What:** generate a Zod schema per DTO and optionally validate responses.
- **Why:** catches backend contract drift at runtime, and request schemas can be reused for form validation.
- **Who has it:** kubb (`plugin-zod`), orval (`client: 'zod'`), hey-api.

### MSW handlers and Faker mocks (M–L)
- **What:** generate Mock Service Worker handlers with Faker data per endpoint.
- **Why:** the frontend can build, run Storybook and run tests before the .NET endpoint is deployed.
- **Who has it:** orval, kubb (`plugin-msw`, `plugin-faker`).

### Authenticated schema download (S)
- **What:** headers (e.g. a bearer token from an environment variable) for fetching `swaggerSchemaUrl`.
- **Status:** parked; not needed so far.

### Publish workflow: one run at a time (S, CI)
- **What:** a `concurrency` group in `.github/workflows/npm-publish.yml`, so a second run for the same merge waits and then skips the already-published version instead of failing.
- **Why:** the merge of #34 started the workflow twice and the second run failed trying to republish 1.3.1.
