# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [1.2.0] - 2026-08-14

### 🐛 Fixed
- **Union types are parenthesized when composed** - an array of a union or nullable ref now generates `(IA | null)[]` instead of `IA | null[]`, and an allOf member that renders as a union generates `IBase & (IExtra | null)` instead of `IBase & IExtra | null`. Both previously compiled to silently wrong types
- **Inline `allOf` with sibling `properties` no longer drops the own properties** - a schema combining `allOf: [Base]` with its own `properties` (the inheritance shape) now renders an intersection with a real object literal, e.g. `IBase & { extra?: string }`, everywhere; previously only named type-alias files kept the properties while inline occurrences (property types, array items) silently lost them
- **tsconfig `extends` arrays are supported** - a host project using TypeScript 5.0+ `"extends": ["./a.json", "./b.json"]` no longer crashes path-alias resolution (which silently fell back to relative imports); entries merge with later ones overriding earlier, and the config's own values overriding all
- **Custom Angular `baseApiPath` works** - previously the base-service writer treated the value as a directory while the import computation treated it as a file path, so any explicitly-set value produced broken imports or files under a directory literally named `_api-base.service.ts`. Both forms are now accepted (the `_api-base.service.ts` file path or its directory) and the writer and imports always agree
- **`apiPathKey` option is implemented** - it was documented and declared in the schema but never read; the `/api/` prefix was hardcoded. The configured prefix now drives path filtering, controller grouping, and method naming (default `/api/` unchanged)
- **CLI: bare boolean flags no longer swallow the next argument** - `swagger-schematics types --eslint-fix ./schema.json` previously made `./schema.json` the value of `eslintFix` and lost the schema source; boolean options (detected from the schematic schemas) now stay flags, while `--flag true`/`--flag false` is still accepted
- **The response type and the binary check now derive from the same response** - a new single success-response resolver (200 → 201 → 202 → 204 → 2XX → default, first content-bearing wins) feeds both `responseTypeSymbol` and `isBinaryResponse`; previously two divergent walks could type a method `Blob` from a binary 2XX while the binary check looked at a bodyless 200, generating an Angular client typed `Observable<Blob>` without `responseType: 'blob'` (runtime JSON-parse of binary data). `isBinaryResponse()` now takes the swagger document as a second argument
- **Responses declared with any media type now generate a real type** - response extraction uses the same content-type priority (and first-available fallback) as request bodies, so an `application/xml`- or `text/csv`-only response no longer silently degrades to `void`
- **Response-level `$ref`s are resolved** - `responses: { '200': { $ref: '#/components/responses/Ok' } }` now generates the referenced response's type instead of `void`, and `IParsedApiItem.response` holds the resolved response object (the published `TResponse` type also admits `IRef` values now, matching the spec)
- **Interface properties with inline union types now import every referenced schema** - a property like `items: { oneOf: [A, B] }` (or a `Record` whose values are a union) previously imported only the first referenced type, generating a file that didn't compile; imports are now collected through array items and `additionalProperties`
- **Outer nullability is no longer suppressed by a nested `| null`** - a nullable schema rendering e.g. `Record<string, string | null>` now correctly gets its own trailing `| null` (the guard checked for `| null` anywhere in the symbol instead of at the end); the same fix stops a required parameter of such a type being wrongly marked optional
- **Dangling `$ref`s no longer crash generation** - a ref into a missing document section (e.g. a Swagger 2.0-style `#/definitions/...` in a 3.x document, or `#/components/requestBodies/...` when that section is absent) previously threw an uncaught TypeError and aborted the run; it now falls back to the unresolved-ref handling
- **Enum members are always valid TypeScript identifiers**:
  - String enums without `x-enum-varnames` sanitize their values into PascalCase member names (`in progress` → `InProgress`, `not-started` → `NotStarted`); values that are already valid identifiers are kept as-is
  - Numeric enums without `x-enum-varnames` generate `_1 = 1` instead of the invalid `1 = 1`
  - An `x-enum-varnames` array shorter than `enum` falls back to the value-derived name for the missing entries instead of emitting a member literally named `undefined`
  - Backslashes, newlines, and carriage returns in string enum values are escaped (previously only single quotes were)

### ✨ Added
- **`swagger-schematics` CLI** - the package now ships its own binary, running the schematics directly through `NodeWorkflow` (no generic `schematics` command needed):
  - `swagger-schematics types [source]`, `swagger-schematics api [source]`, and `swagger-schematics all [source]` (types then api - replaces the two-script setup)
  - Any schematic option can be passed as `--option=value`; kebab-case accepted (`--swagger-schema-url`); `--dry-run`, `--help`, `--version` supported
  - Reports created/updated files, exits 1 on failure with the full error report
  - Avoids the `npx schematics` name-collision trap: the npm package literally named `schematics` is an unrelated abandoned library that npx downloads when `@angular-devkit/schematics-cli` isn't installed locally

### ♻️ Changed
- README recommends the new CLI; the `schematics swagger-schematics:*` invocation remains supported (documented as legacy)
- ⚠️ **Published types tightened - the package is now `any`-free** (no runtime behavior change):
  - Free-form OpenAPI spec fields (`example`, `default`, `examples` items, `IExample.value`, `ILink.requestBody`/`parameters`) are `unknown` instead of `any`; `IEncoding.headers` and response `IHeader.examples` gained proper object types. Consumers reading these fields must narrow or cast before use
  - `IParsedApiItem.bodyParam` is typed via the new exported `TParsedBodyParam` alias (`IParsedParam<IRequestBody | IRef>`) and `IParsedApiItem.response` is `IResponse | undefined` (previously both `any`)
  - The duplicate (and drifted) `IHeader`/`ILink` declarations are unified: `response.interface.ts` owns the single spec-correct versions (with `content` and `$ref`-able `examples`); `swagger.interface.ts` re-exports them, so existing imports keep working

### ⚡ Performance
- Generated files are linted concurrently by `eslintFix` (previously one file at a time), custom template helpers load once per run instead of once per controller, and rule composition / import deduplication no longer do quadratic work on large documents

### 📦 Dependencies
- Updated @angular-devkit packages to 20.3.34 (latest v20 LTS patch) - pulls in the fixed ajv 8.18.0 and picomatch 4.0.4, clearing the last npm audit advisories; `npm audit` now reports 0 vulnerabilities
- Updated dev dependencies: @types/node to 26.2.0, ts-jest to 29.4.12, eslint to 10.8.1, fs-extra to 11.4.0, @typescript-eslint/parser to 8.67.0
- `npm audit fix` refreshed vulnerable transitive dev dependencies (@babel/core, brace-expansion, diff) in the lockfile


## [1.1.0] - 2026-08-13

### ✨ Added
- **OpenAPI version detection** - the schematics now read the document's `openapi`/`swagger` field:
  - 3.0.x and 3.1.x are fully supported and generate silently
  - Newer 3.x versions log a warning and are treated as 3.1; Swagger 2.0 logs a warning explaining it is unsupported
  - Generation always continues best-effort - an unknown version never blocks it
- **`legacyOptionalProperties` option** - opt back in to the pre-spec optionality rule for back-ends that do not emit a `required` array yet. When `true`, a property is optional (`?`) if it is nullable rather than if it is absent from `required`, so non-nullable fields become required. Nullability (`| null` in the type) is unaffected. Defaults to `false` (spec behavior)
- **OpenAPI 3.1 support**:
  - Type arrays: `type: ["string", "null"]` generates `string` with proper nullability; multi-type arrays become unions (`type: ["string", "integer"]` → `string | number`)
  - Nullable refs written the 3.1 way, `oneOf: [{ "type": "null" }, { $ref }]`, generate `IX | null` (or `string | null` when the ref inlines to a primitive) - previously the `null` member leaked in as `any | IX`, erasing the type. `anyOf` behaves the same
  - Binary via `contentMediaType` (e.g. `application/octet-stream`, `image/*`) maps to `Blob`; `contentEncoding: base64` content stays `string`
  - Schema-less `application/octet-stream` responses generate `Blob` downloads (Angular `responseType: 'blob'`, RTK `responseHandler`)
  - Refs to 3.1 nullable enum schemas generate `TEnum | null`
  - `not` schemas generate `export type TX = unknown` with a JSDoc comment naming the excluded type (e.g. "Any value except string"), instead of being skipped - so a `$ref` pointing at them no longer dangles
  - Numeric `exclusiveMinimum`/`exclusiveMaximum` and `examples` parse without errors

### 🐛 Fixed
- ⚠️ **BREAKING**: **Interface property optionality now follows the spec** - a property is optional (`?`) unless listed in the object schema's `required` array. Schemas that omit `required` (common for C#/ASP.NET-generated documents) now generate all-optional interfaces, matching NSwag and openapi-generator behavior. Previously only nullable properties were optional
- ⚠️ **BREAKING**: **Nullable properties now include `| null` in their type** (`crmRefId?: string | null`), so server-sent nulls are visible to the type checker
- **`allOf` inheritance no longer drops own properties** - a schema with `allOf` *and* its own `properties` (the base-class + extra-fields shape) now generates `Base & { ...own props... }`; previously the sibling `properties` were silently discarded. A `null` member in an intersection is lifted out to a trailing `| null` (`(A & B) | null`)
- **Composition schemas no longer drop imports** - `allOf`/`oneOf`/`anyOf` referencing multiple schemas now import every referenced type in generated services (previously only the first was imported)

### ♻️ Changed
- **Primitive-wrapper schemas are inlined, not emitted as files** - strongly-typed wrappers like `GuidIdentifier` (`{ type: "string", format: "uuid" }`), integer identifiers, and `Stream` (`{ type: "string", format: "binary" }`) are already inlined at every reference (`string`/`number`/`Blob`), so they no longer generate empty, unused `IGuidIdentifier`/`IIntIdentifier`/`IStream` interface files

### 🗑️ Removed
- Dead `interfaces/version_3_0` folder (never imported)


## [1.0.2] - 2026-07-24

### ✨ Added
- **Local schema file support** - `swaggerSchemaUrl` now also accepts a path to a local JSON file (absolute, relative to the project root, or a `file://` URL) in addition to http(s) URLs:
  - Useful for CI pipelines without network access to the API host - download the schema once, commit it, and point `swaggerSchemaUrl` at the file
  - Missing files, unreadable files, and invalid JSON fail with clear messages naming the resolved path


## [1.0.1] - 2026-07-23

### 🐛 Fixed
- **Failures are no longer silent** - both schematics now print a full error report to the console (message and stack for the whole `cause` chain) before failing. Previously a crash in CI (e.g. Azure Pipelines) could abort generation with no output at all
- **Network errors now show the real reason** - Node's `fetch` reports failures as a bare `fetch failed`, hiding the underlying cause (DNS resolution, proxy, TLS) in `error.cause`; the schema download now surfaces the whole chain, e.g. `Failed to fetch swagger schema from '<url>': fetch failed -> getaddrinfo ENOTFOUND host`
- Invalid JSON in `openapi-schematics.json` or in the downloaded schema now fails with a clear message naming the file/URL instead of a bare `SyntaxError`

### ✨ Added
- A `Fetching swagger schema from '<url>'` console line at the start of generation, so CI logs show how far generation got


## [1.0.0] - 2026-07-22

### ✨ Added
- **Binary response support** - endpoints returning `type: string, format: binary` (file downloads) now generate `Blob` instead of `string`:
  - Angular: methods return `Observable<Blob>` and the call adds `responseType: 'blob'` (using HttpClient's blob overload)
  - RTK: endpoints are typed `builder.query<Blob, ...>` and get `responseHandler: (response) => response.blob()`
- **Multipart upload support** - `multipart/form-data` request bodies are now typed as `FormData` (previously the schema collapsed to `object`); works out of the box with Angular HttpClient and RTK fetchBaseQuery
- **`eslintFix` option** - runs the consuming project's own ESLint with autofix on every generated file, applying your import sorting, quote, and comma rules:
  - Resolves ESLint from the host project and uses its config (flat or legacy) via real file paths, so folder-level overrides apply
  - Only touches files created or overwritten by the current run - pre-existing files in the same folders are left alone
  - Never blocks generation: missing ESLint logs an info, config or per-file failures log warnings and keep the generated content
- Tests for `operationId` priority - when the OpenAPI spec provides `operationId`, it is used (camelized) as the method name instead of path-based generation; this behavior existed but was untested

### 🐛 Fixed
- **Query parameter optionality now honors `required`** - parameters not marked `required: true` generate optional members (`page?: number`) in Angular method signatures; previously only nullable parameters were optional
- Nullable query parameters in RTK request types are now properly optional (`status?: string | null` instead of `status: string | null`)
- Removed a leftover token-auth `.npmrc` from the package (source of npm's `always-auth` deprecation warnings during publish)

### 📦 Dependencies
- Added eslint 10.7.0 and @typescript-eslint/parser 8.65.0 (dev-only, for the eslintFix end-to-end tests)


## [1.0.0-beta.1] - 2026-07-20

### 🐛 Fixed
- **String enum generation** - enum members now get quoted string values:
  - Previously `{ enum: ["Email", "PhoneCall"], type: "string" }` generated invalid TypeScript (`Email = Email`); now generates `Email = 'Email'`
  - Works with `x-enum-varnames` when the member name differs from the value (`PhoneCall = 'phone-call'`)
  - Single quotes inside values are escaped; integer enum values remain unquoted
- **RTK endpoint URLs now include the controller segment** - `url` was previously generated without the controller path (e.g. `` url: `/${id}` ``); now the dasherized controller name is prefixed (e.g. `` url: `/claim/${id}` ``)
- **`ApiBaseService.getUrl` strips a trailing `/api` segment from `apiBaseUrl`** (case-insensitive, with or without trailing slash) so a configured base URL like `https://host/api` no longer produces `/api/api/...` in request URLs

### ✨ Added
- Jest configuration in `package.json` - the test suite now runs out of the box (`npm test`); previously the jest config was not committed
- Tests for string enum generation: quoted values, `x-enum-varnames` with string values, and a guard that integer enums stay unquoted
- Tests for `ApiBaseService.getUrl` covering all URL variants - the generated service is compiled and executed:
  - Relative URLs when `apiBaseUrl` is empty, nested segments, repeated-slash normalization
  - Base URLs with/without trailing slash, ending in `/api` (any case), and with extra path segments
  - A guard that the generated file compiles without TypeScript diagnostics
- Changelog writing skill (`.agents/skills/changelog/SKILL.md`) to guide CHANGELOG.md updates

### ♻️ Changed
- **Swagger schema download now uses Node's built-in `fetch`** instead of `axios` - the schematic no longer has any third-party HTTP dependency; non-2xx responses throw an explicit error with the URL and status
- **Schema option types are now generated with `json-schema-to-typescript`** (replacing unmaintained `dtsgenerator`):
  - `SwaggerSchema` / `SwaggerApiSchema` are exported interfaces generated to `types/schema.d.ts` / `api/schema.d.ts` and imported explicitly (previously ambient globals from a root `schema.d.ts`)
- **npm publish workflow now uses npm Trusted Publishing (OIDC)** - no `NODE_AUTH_TOKEN` secret needed; provenance is generated automatically; runs on Node 24 (LTS) picked up from the new `.nvmrc`; installs with `npm ci` against committed lockfiles
- **TypeScript configs modernized** ahead of TypeScript 7 (all deprecated options removed):
  - Build uses `module: node18` (same CommonJS output) instead of `commonjs` + `moduleResolution: node`
  - Removed deprecated `baseUrl`, `downlevelIteration`, and `importHelpers`
  - Added package-level `tsconfig.json` so editors resolve jest types in spec files
- **Reproducible installs** - all dependency versions are exact-pinned (`save-exact=true` in `.npmrc`), lockfiles are committed, and `engines` declares supported Node (`^20.19.0 || ^22.12.0 || >=24.0.0`) and npm (`>=10`)

### 🗑️ Removed
- `axios` and `axios-mock-adapter` - tests now mock `globalThis.fetch` (test helper `resetAxiosMocks` renamed to `resetFetchMocks`)
- `dtsgenerator` - replaced by `json-schema-to-typescript`
- `jasmine` and `@types/jasmine` leftovers (tests run on Jest; the jasmine types conflicted with Jest's globals)
- `codelyzer`, `cpx`, and a dead `tslint.json` - TSLint-era tooling that was never invoked

### 📦 Dependencies
- Updated editorconfig to 3.0.2
- Updated @types/node to 26.1.1
- Updated fs-extra to 11.3.6
- Updated jest to 30.4.2 and ts-jest to 29.4.11
- Added json-schema-to-typescript 15.0.4 (dev)
- typescript stays at 5.9.3 - ts-jest does not yet support TypeScript 6/7


## [1.0.0-alpha.31] - 2026-03-05

### ✨ Added
- **Nullable query parameter support** in generated API methods (Angular and RTK):
  - Query params with `nullable: true` or `default: null` now get `| null` in their TypeScript type and are marked optional (`?`) in method signatures and destructured parameter objects
  - When an operation has nullable query params, the generated `params` object is wrapped in `omitBy({ ... }, isNil)` so `null`/`undefined` values are stripped before the request is sent
  - `import { omitBy, isNil } from 'lodash-es'` is added to generated Angular services and RTK API files only when at least one endpoint needs it
- `hasNullableQueryParams` property on `IParsedApiItem` for custom templates
- Tests for nullable query params: Angular/RTK integration tests, `transformType` unit tests, and a `GET_WITH_NULLABLE_QUERY_PARAMS` fixture

### ♻️ Changed
- `isNullable()` now also treats schemas with `default: null` as nullable (previously only `nullable: true`), including when resolved through `$ref`
- `formatQueryParams()` accepts a `hasNullable` flag to control `omitBy` wrapping


## [1.0.0-alpha.30] - 2026-01-27

### ✨ Added
- **Composition schema support** - `allOf`, `oneOf`, and `anyOf` schemas now generate TypeScript type aliases:
  - `allOf` → intersection type (`TMyType = TypeA & TypeB`)
  - `oneOf` / `anyOf` → union type (`TMyType = TypeA | TypeB`)
  - Type aliases use `T` prefix (consistent with enums), generated as `.type.ts` files
  - `not` schemas are skipped (no good TypeScript equivalent)
- New `transformCompositionSchema()` helper for transforming composition schemas
- Tests for composition schema generation
- Tests for partial base API file existence (Angular)
- Tests for interface/enum update behavior (verifying `MergeStrategy.Overwrite`)
- Tests for `buildScopedApiMethodName` function
- Tests for `typeMapping` primitive type validation

### 🐛 Fixed
- `framework` prompt no longer appears when `framework` is set in config file (removed `x-prompt` from schema since config is loaded after prompting phase)
- Improved `getUrl` method in Angular base service to handle all URL edge cases:
  - Normalizes multiple slashes in path
  - Supports empty `apiBaseUrl` for relative paths (Electron apps, same-origin APIs)
  - Handles base URLs with or without trailing slashes
  - Preserves path segments in base URL (e.g., `https://example.com/v1/internal`)
- `typeMapping` now works correctly in types schematic (interface generation) - mapping one enum/interface to another now updates both the type symbol and import
- **Angular base API generation** now correctly handles partial file existence:
  - Previously only skipped generation if BOTH files existed
  - Now generates only the missing file(s) when one exists and the other doesn't
  - Uses `filter` rule to exclude existing files from template source
- **`typeMapping` validation** - Primitive type names (`string`, `number`, `boolean`, etc.) are no longer accidentally resolved as schema references even if a schema with that name exists
- **`buildScopedApiMethodName`** - Fixed case-insensitive comparison consistency by extracting and comparing the same portion being sliced
- **`isPrimitiveWrapper`** - Now correctly excludes composition schemas (`allOf`, `oneOf`, `anyOf`, `not`) from being identified as primitive wrappers

### ♻️ Changed
- Removed `MergeStrategy.AllowCreationConflict` from base API generation (no longer needed with proper filtering)
- Added `ISwaggerSchematicsTypeAliasSchema` interface for type alias schemas


## [1.0.0-alpha.20] - 2026-01-27

### ✨ Added
- `isNullable()` helper function that resolves `$ref` to check nullability of referenced schemas
- **React RTK Query support** - New framework option to generate RTK Query API slices
- `framework` config option to select between `angular` and `react-rtk`
- `scopeEndpointsWithTags` option for RTK to prefix endpoint names with tag (e.g., `claimGetById`)
- `typeMapping` option to map custom backend types to TypeScript primitives or other schemas (e.g., `{ "Guid": "string", "NullableOfDistributionType": "DistributionType" }`). When mapping to another schema, `nullable` from the original type is preserved
- RTK base API template generation with skip-if-exists logic
- `baseApiPath` config option for customizing base API file location
- tsconfig path alias resolution for RTK base API imports
- New `IParsedApiItem` properties for templates:
  - `scopedApiMethodName` - Method name prefixed with tag
  - `apiMethodParamNames` - Array of parameter names for destructuring
  - `apiMethodRequestType` - Combined request type for all parameters
  - `isQuery` - Boolean for GET/HEAD vs mutation methods
  - `httpMethod` - Uppercase HTTP method
  - `apiUrlFormatted` - URL with proper quoting
  - `queryParamsFormatted` - Pre-formatted query params string
  - `bodyFormatted` - Body parameter name
- 📚 Custom templates documentation in README with complete variable reference
- `loadFixture()` and `loadJsonFixture()` test helpers
- New test file `types-schematics.spec.ts` with snapshots for types generation
- Tests for primitive wrapper type inlining

### 🐛 Fixed
- Primitive wrapper types (e.g., `NullableOfDistributionType: { type: "integer", nullable: true }`) are now inlined as `number | null` instead of generating a non-existent interface
- `$ref` pointing to object/enum schemas with `nullable: true` now correctly generates `IType | null` or `TType | null`
- Property optionality (`?`) now works for `$ref` pointing to nullable schemas (previously only worked for inline schemas)

### ♻️ Changed
- ⚠️ **BREAKING**: `framework` config option is now required (no default value)
- Renamed `crud-api` template folders to `base-api` for both Angular and RTK
- Simplified Angular API service template using `buildAngularHttpCallArgs` helper
- Enhanced Swagger schema transformation with new request type and parameter handling
- Refactored `api/index.ts` - moved helpers to separate files:
  - `angular-template.helper.ts` - Angular-specific template helpers
  - `import-path.helper.ts` - Import path resolution helpers
  - `base-api-rules.ts` - Base API generation rules
- Renamed test options: `DEFAULT_SCHEMATIC_OPTIONS` → `ANGULAR_SCHEMATIC_OPTIONS`
- Renamed `schematics.spec.ts` → `angular-schematics.spec.ts` for consistency
- Test fixtures now loaded from JSON files instead of hardcoded constants
- Improved utility functions for formatting API URLs and parameters

### 🗑️ Removed
- `rtkBaseApiPath` config option (replaced by `baseApiPath`)
- Default value for `framework` config option
- Old template helper functions and snapshot tests for API methods

### 📦 Dependencies
- Updated @angular-devkit packages to 20.3.14
- Updated axios to 1.13.2
- Updated editorconfig to 3.0.1
- Updated @types/node to 18.19.130
- Updated fs-extra to 11.3.3
- Updated typescript to 5.9.3


## [1.0.0-alpha.14] - 2026-01-12

### 🐛 Fixed
- DELETE method query params are now correctly placed as second argument (options object) instead of third
- Added proper `delete` case handler for API method name generation (was falling through to default with warning)
- Extended GET request name parsing to handle `/api/Model/subresource` and `/api/Model/subresource/{param}` patterns
- Build no longer fails due to test files - excluded `__tests__` from `tsconfig.schematics.json`
- Removed overly strict `"format": "path"` validation from schema.json files
- Path normalization now properly handles relative paths for schematic execution

### ✨ Added
- New test fixtures and cases for DELETE operations:
  - DELETE by ID (no body)
  - DELETE with query params (verifies params as second arg)
- `parseDeleteRequestName` function for proper DELETE method naming

### ♻️ Changed
- Path segments are now properly capitalized in default method name generation

## [1.0.0-alpha.13] - 2026-01-09

### 🐛 Fixed
- Enum types used in API parameters are now properly imported in generated services
- Object destructuring in method parameters now uses commas instead of semicolons (`{ id, status }` instead of `{ id;status }`)
- PUT/POST methods with path parameters but no separate path param definition now correctly use `body.paramName` in the URL (e.g., `${body.id}` instead of `${id}`)

### ♻️ Changed
- Migrated test framework from Jasmine to Jest
- Parameter schema interface now supports `$ref` types (aligned with OpenAPI spec)

### ✨ Added
- New test cases for enum parameter imports and multiple query parameters

## [1.0.0-alpha.12] - 2026-01-09

### ✨ Added
- Configuration file support via `openapi-schematics.json` in project root
- New configuration options:
  - `swaggerSchemaUrl` - URL of the Swagger/OpenAPI schema
  - `path` - output path for generated files
  - `baseApiServicesPath` - separate path for base API files
  - `project` - Angular CLI workspace project name
  - `apiPathKey` - filter API paths by prefix
  - `apiServiceTemplatePath` - custom template for API services
  - `apiCrudServiceTemplatePath` - custom template for CRUD services

### ♻️ Changed
- Updated README with comprehensive documentation for configuration options
- CLI arguments now override config file values

### 📦 Dependencies
- Updated @angular-devkit packages to 19.2.15
- Updated axios to 1.10.0
