# Swagger Schematics

[![npm version](https://img.shields.io/npm/v/swagger-schematics)](https://www.npmjs.com/package/swagger-schematics)
[![CI](https://github.com/NechiK/swagger-schematics/actions/workflows/ci.yml/badge.svg)](https://github.com/NechiK/swagger-schematics/actions/workflows/ci.yml)

Generate TypeScript types and API services from OpenAPI/Swagger schemas using Angular Schematics.

Supports:
- **Angular** (HttpClient services)
- **React RTK Query** (API slices)

Supported OpenAPI versions:
- **OpenAPI 3.0.x** - full support, including `nullable`, `format: binary`, and multipart uploads
- **OpenAPI 3.1.x** - full support, including type arrays (`type: ["string", "null"]`), nullable `oneOf`/`anyOf` with a `{ "type": "null" }` member, `const` (literal types, e.g. `kind: 'dog'`), `prefixItems` tuples (`[number, number]`), `type: "null"`, `contentMediaType` binary content, and schema-less `application/octet-stream` responses
- Newer 3.x versions are treated as 3.1 with a warning; **Swagger 2.0 is not supported** (a warning is logged and generation is attempted best-effort)


## How to use?

1. Install package

```bash
npm i -D swagger-schematics
```

2. Run the CLI

```bash
npx swagger-schematics all swaggerUrl --path=/src/app/core --framework=angular
```

`all` generates types and then API services from a single load of the schema, so both always come from the same version of the document.

Or run the schematics individually:

```bash
npx swagger-schematics types swaggerUrl --path=/src/app/core
npx swagger-schematics api swaggerUrl --path=/src/app/core --framework=angular
```

Useful flags: `--dry-run` (report files without writing), `--help`, `--version`.
Any schematic option can be passed as `--option=value` (kebab-case accepted, e.g. `--swagger-schema-url`).

<details>
<summary>Legacy invocation via the Angular devkit CLI</summary>

The previous invocation keeps working:

```bash
npx schematics swagger-schematics:types swaggerUrl --path=/src/app/core
npx schematics swagger-schematics:api swaggerUrl --path=/src/app/core --framework=angular
```

Note: the `schematics` binary comes from `@angular-devkit/schematics-cli` in your
`node_modules` — don't run `npx schematics` outside a project that has it
installed, or npx will fetch an unrelated npm package that happens to own that name.
</details>

3. Enjoy!

### Run via npm scripts (recommended)

Wrap the CLI in an npm script and always run it through `npm run`:

```json
{
  "scripts": {
    "openapi": "swagger-schematics all"
  }
}
```

npm always sets the working directory to the project root before running a script, and several things in the schematics resolve against the working directory:

- relative schema paths in `swaggerSchemaUrl` (e.g. `./openapi-swagger.json`)
- discovery of the `openapi-schematics.json` config file
- resolution of your project's ESLint for the `eslintFix` option

Running `npx schematics` directly from a subdirectory shifts all of these at once (config silently not found, schema path not resolving, wrong lint setup). With `npm run openapi`, behavior is identical for every developer and in CI.


## Configuration

You can create an `openapi-schematics.json` file in the root of your project to configure default options for the schematics. Options passed via CLI arguments will override the config file values.

### Example configuration (Angular)

```json
{
  "swaggerSchemaUrl": "https://api.example.com/swagger/v1/swagger.json",
  "path": "/src/app/core",
  "baseApiPath": "/src/app/core/api/_api-base.service.ts",
  "framework": "angular"
}
```

### Example configuration (React RTK Query)

```json
{
  "swaggerSchemaUrl": "https://api.example.com/swagger/v1/swagger.json",
  "path": "/src/store/api",
  "framework": "react-rtk",
  "baseApiPath": "th-common/store/api-base.ts",
  "scopeEndpointsWithTags": true
}
```

The `baseApiPath` is resolved using tsconfig path aliases when available. For example, if your tsconfig has:
```json
{
  "compilerOptions": {
    "paths": {
      "@th-common/*": ["th-common/*"]
    }
  }
}
```
The generated import will be: `import { api as baseApi } from '@th-common/store/api-base'`

### Example with type mapping

If your backend uses custom types that should map to TypeScript primitives (e.g., `Int32` → `number`, `Guid` → `string`), you can configure type mappings:

```json
{
  "swaggerSchemaUrl": "https://api.example.com/swagger/v1/swagger.json",
  "path": "/src/app/core",
  "typeMapping": {
    "Int32": "number",
    "Int64": "number",
    "Decimal": "number",
    "Guid": "string"
  }
}
```

You can also map nullable wrapper types to their base types. This is useful when your backend generates separate schemas for nullable versions (e.g., `NullableOfDistributionType` alongside `DistributionType`):

```json
{
  "typeMapping": {
    "NullableOfDistributionType": "DistributionType",
    "NullableOfUserDTO": "UserDTO"
  }
}
```

When mapping to another schema, the `nullable` property from the original type is preserved, so `NullableOfDistributionType` becomes `TDistributionType | null` with the proper import.

A mapped schema generates no file of its own, since nothing references it by its own name (`nullable-of-distribution-type.enum.ts` above is not generated; a file from an earlier run is deleted as stale). A schema that a mapping points to, like `DistributionType`, is still generated.

### Available options

| Name                     | Type    | Schematics | Description                                                                                                                                                      |
|--------------------------|---------|------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `swaggerSchemaUrl`       | string  | api, types | Source of the Swagger/OpenAPI schema (required): an http(s) URL, or a path to a local JSON file (absolute, relative to the project root, or a `file://` URL). A local file is handy for CI pipelines without network access to the API - commit the schema and point to it |
| `path`                   | string  | api, types | Path where generated files will be created, relative to the workspace root                                                                                       |
| `baseApiPath`            | string  | api        | Location of the base API file. For Angular: the `_api-base.service.ts` file path or its directory (both accepted); defaults to `path`. For RTK: the base api file path; defaults to `th-common/store/api-base.ts`. Supports tsconfig path alias resolution for imports |
| `project`                | string  | types      | Generate in a specific Angular CLI workspace project                                                                                                             |
| `apiPathKey`             | string  | api        | Path prefix that selects which API paths are generated; stripped before grouping and method naming. Defaults to `/api/`                                          |
| `apiServiceTemplatePath` | string  | api        | Custom template path for API service generation                                                                                                                  |
| `baseApiTemplatePath`    | string  | api        | Custom template path for base API generation                                                                                                                     |
| `framework`              | string  | api        | Target framework: `"angular"` or `"react-rtk"`. **Required** for `api` (no default) - set it in `openapi-schematics.json` or pass `--framework`                |
| `scopeEndpointsWithTags` | boolean | api        | Prefix endpoint names with tag name (e.g., `claimGetById` instead of `getById`). Recommended for multi-controller APIs                                           |
| `typeMapping`            | object  | api, types | Map custom backend types to primitives or other schemas. Preserves `nullable` from original type (e.g., `{ "Guid": "string", "NullableOfStatus": "Status" }`). A mapped schema generates no file of its own   |
| `eslintFix`              | boolean | api, types | Run your project's ESLint with autofix on generated files, applying your own config (import sorting, quotes, commas). Defaults to `false`. Never blocks generation: if ESLint is missing or fails, a warning is logged and files keep their generated content |
| `legacyOptionalProperties` | boolean | api, types | Legacy optionality for back-ends that don't emit a `required` array yet, and for code written before parameters followed `required`. When `true`, a property is optional (`?`) if it is **nullable** instead of if it is absent from `required` — so non-nullable fields become required — and a query or header parameter that is `required` but nullable is optional. `\| null` typing is unaffected. Defaults to `false` (spec behavior: optionality follows `required`; a required nullable parameter must be passed, and `null` leaves it out of the request) |
| `includeApis`            | string[] | api       | Generate only these APIs: controller names as in the path (`Orders` for `/api/Orders/...`), case-insensitive, `*` as a wildcard. On the CLI, comma-separated. Unset: every API (see [Filtering APIs](#filtering-apis)) |
| `excludeApis`            | string[] | api       | Skip these APIs, same matching as `includeApis`, e.g. `["Admin", "Internal*"]` |
| `excludeDeprecated`      | boolean | api        | Skip operations marked `deprecated` (e.g. .NET `[Obsolete]`). Defaults to `false` |
| `rtkCacheTags`           | boolean | api        | React RTK only: generate [cache tags](#rtk-cache-tags) so queries refetch after a mutation in the same slice. Defaults to `false` |
| `schemaSnapshotPath`     | string  | `all` (CLI) | Where to keep a copy of the schema, relative to the project root, e.g. `/src/app/core/openapi.snapshot.json`. Turns on the [API change summary](#api-change-summary): each `swagger-schematics all` run compares the new schema with it, prints what changed, and updates it. Commit it with the generated code |
| `removeStaleFiles`       | boolean | api, types | Delete previously generated files that are no longer generated: their schema or endpoint group left the document, or a filter excludes it (see [Removed schemas and endpoints](#removed-schemas-and-endpoints)). Defaults to `true`; `false` keeps them and lists them as warnings |
| `templateHelpersPath`    | string  | api        | Path to a JavaScript file exporting custom helper functions for use in templates                                                                                 |

All configuration options can also be passed as CLI arguments using `--optionName=value` syntax.

### Removed schemas and endpoints

When the back-end removes a schema or a whole controller, the next run deletes the file generated for it, so the removal shows up as a compile error in your code instead of leaving a stale service or interface behind.

To know which files it owns, the generator keeps a `.swagger-schematics-manifest.json` in `path`, listing the files each schematic generated. **Commit it** alongside the generated code. Only files listed there are ever deleted, so hand-written files in the same folders are never touched, and the base API files (`_api-base.service.ts`, `api-base.ts`) are never listed.

- **First run after upgrading:** there is no manifest yet, so nothing is deleted. Files in the generated folders that don't match the current schema are listed as a warning; delete the ones that are leftovers. From then on cleanup is automatic.
- **Schema that produces nothing** (e.g. an empty or wrong document): nothing is deleted and a warning is logged.
- **`--dry-run`** reports the deletions as `DELETE` lines without touching the files.
- An endpoint group whose paths declare no operations no longer generates an empty service.


### API change summary

Set `schemaSnapshotPath` and every `swagger-schematics all` run tells you what the back-end changed, in the names you use in code:

```
API changes since the last snapshot: 3 breaking, 2 added
  ⚠ Property changed  IOrderDto.total  total?: number → total?: string
  ⚠ Property removed  IUserDto.middleName
  ⚠ Endpoint removed  DELETE /api/Orders/{id}  OrdersApiService.deleteOrdersById()
  + Interface added   IRoleDto
  + Endpoint added    GET /api/Users/{id}/roles  UsersApiService.getRolesByUsersId()
```

- The run compares the schema with the snapshot the previous run saved, then saves the new one. **Commit the snapshot** with the generated code; the first run only creates it.
- **Breaking** means code written against the previous generation may stop compiling or behave differently: a removed interface, property, enum member or endpoint, a new required property (object literals of that interface must now set it), or a changed property type, optionality, nullability or endpoint signature. **Added** is new surface that leaves existing code alone: new interfaces, enum members, endpoints and optional properties, and new optional endpoint parameters that existing calls can leave out (e.g. an optional header, or an optional query param next to existing ones; Angular's first query param is breaking when a body or a headers object follows it, since it shifts their position).
- Names, types and signatures come from the generator itself, so they match the generated files (`IUserDto`, `UsersApiService.getById()`, or `usersApi.getById` for RTK).
- A renamed property or endpoint shows as removed plus added.
- `--dry-run` prints the summary without writing anything, which is a quick way to see what the back-end changed before regenerating.
- Only the `swagger-schematics all` command runs it: a single `types` or `api` run would update the snapshot for half the API.

For a CI pipeline, add `--change-report=<file>` to also write the summary as markdown, e.g. to use as a pull request description. It stays under 4000 characters (the Azure DevOps limit) and ends with a count of the rest when the list is longer:

```bash
npx swagger-schematics all --change-report=api-changes.md
```

If the report can't be written, the run exits with code 1 so the pipeline doesn't pick up a missing or stale file. The generated code is still written, and other summary problems are only warnings: a snapshot that can't be saved, or one that can't be compared with the schema (it is then replaced, the report says so, and changes are listed from the next run; a `--dry-run` leaves it as it is).

### Filtering APIs

Every API in the document is generated unless you narrow it down, e.g. when one back-end serves several front-ends:

```json
{
  "includeApis": ["Orders", "Users", "Catalog"],
  "excludeApis": ["Admin", "Internal*"],
  "excludeDeprecated": true
}
```

- Names are the controller segment of the path (`Orders` for `/api/Orders/{id}`), matched case-insensitively; `*` matches anything, and the PascalCase form works too (`ReplacementQueue` for `/api/replacement-queue`)
- `includeApis` keeps only the listed APIs; `excludeApis` then drops from what is left
- `excludeDeprecated` skips deprecated operations; an API left with none is skipped entirely
- An entry that matches no API is reported as a warning, to catch typos. If such an `includeApis` entry leaves nothing to generate (`includeApis: ['Oders']`), the existing services are kept rather than deleted
- The service of an API that becomes excluded is deleted on the next run (see [Removed schemas and endpoints](#removed-schemas-and-endpoints)), also when the filters exclude every API, and the [API change summary](#api-change-summary) applies the same filters
- Filtering applies to API services only: the `types` schematic still generates every schema in the document

### Angular: `provideApi()`

Next to the base API files, the api schematic generates `_provide-api.ts`, so a standalone app configures the generated services in one line:

```ts
bootstrapApplication(AppComponent, {
  providers: [provideHttpClient(), provideApi({ baseUrl: environment.apiUrl })],
});

// Or resolve the URL at runtime: the function runs in an injection context
provideApi({ baseUrl: () => inject(AppConfig).apiUrl });
```

It provides the `API_BASE_URL` token the generated services read, and is regenerated on every run. It is generated only when `_api-base-url.token.ts` exists, so a custom base template without that token gets no provider (and one generated earlier is removed).

### RTK cache tags

With `rtkCacheTags: true` (React RTK only), a list refetches by itself after a create, update or delete in the same slice. Your components don't change:

```ts
// api-tag.enum.ts (generated): one member per slice
export enum TApiTag {
  Orders = 'Orders',
  Users = 'Users'
}

// orders.api.ts (generated; the enum is imported under an alias so it can never
// clash with a schema type of the same name)
import { TApiTag as CacheTag } from './api-tag.enum';

export const ordersApi = baseApi.enhanceEndpoints({ addTagTypes: [CacheTag.Orders] }).injectEndpoints({
  endpoints: (builder) => ({
    getOrders: builder.query<IOrderDto[], void>({
      query: () => ({ url: '/orders', method: 'GET' }),
      providesTags: [CacheTag.Orders],
    }),
    putOrdersById: builder.mutation<void, { id: number; body: IOrderDto }>({
      query: ({ id, body }) => ({ url: `/orders/${id}`, method: 'PUT', body }),
      invalidatesTags: [CacheTag.Orders],
    }),
  }),
});
```

- GET and HEAD endpoints provide their slice's tag; POST, PUT, PATCH and DELETE invalidate it; OPTIONS and TRACE get no tag
- Tags are per slice: updating order 5 also refetches an `Orders` query for order 7 if one is on screen, and a change in one slice doesn't refresh another
- Tag types are registered by each slice (`enhanceEndpoints({ addTagTypes })`), so the base API file needs no changes
- Turning the option off again removes the tags, and the enum file with the default `removeStaleFiles: true` (with `false` it is kept and listed as a warning)
- Slices whose names give the same member (`v1.0` and `v10` are both `V10`) get a numeric suffix (`V10_2`)

To tag across slices, override with `enhanceEndpoints` using the same enum. The object form replaces the generated tags, so repeat the slice's own tag; the function form adds to them:

```ts
// Replace
ordersApi.enhanceEndpoints({
  addTagTypes: [TApiTag.Users],
  endpoints: { getOrders: { providesTags: [TApiTag.Orders, TApiTag.Users] } },
});

// Add
ordersApi.enhanceEndpoints({
  addTagTypes: [TApiTag.Users],
  endpoints: {
    getOrders: (definition) => {
      definition.providesTags = [...(definition.providesTags as TApiTag[]), TApiTag.Users];
    },
  },
});

// Refresh by hand, e.g. after a websocket event
dispatch(ordersApi.util.invalidateTags([TApiTag.Orders]));
```

### Documentation comments

Descriptions from the schema become JSDoc in the generated code, so they show up as hover text in the editor:

- **Service methods and RTK endpoints**: the operation's `summary`, `description` (on its own paragraph, unless it repeats the summary) and `@deprecated`
- **Interfaces, enums and type aliases**: the schema's `description` and `deprecated`
- **Interface properties**: the property's `description` and `deprecated`, in the same comment as `@aggregatable` (see [OpenAPI Vendor Extensions](#openapi-vendor-extensions))

With ASP.NET, XML doc comments (`<summary>`, `<remarks>`) reach the schema through Swashbuckle's `IncludeXmlComments`, and `[Obsolete]` becomes `deprecated`, which editors show as strikethrough. Anything undocumented renders exactly as before.

## OpenAPI Vendor Extensions

Some `x-` extensions in the source document are read and reflected in the generated code. All of them are optional: a document that omits an extension generates exactly what it generated before, so none of this is opt-in configuration - it follows the schema.

| Extension | Where | What is generated |
|---|---|---|
| `x-enum-varnames` | on an enum schema | Names the generated enum members instead of deriving them from the values. Positional against `enum`; an entry missing from the array falls back to the value-derived name |
| `x-enum-descriptions` | on an enum schema | A JSDoc line above the member it documents, so the description written on the server becomes hover text in the consumer's editor. Positional against `enum`; an empty string is treated as undocumented rather than emitting an empty comment |
| `x-aggregatable` | on a schema **property** | The operations the server admits for that column, as `/** @aggregatable Sum, Avg */` on the property, plus a string-literal union of the declared column names exported beside the interface |

### `x-aggregatable`

For an API whose paged search endpoints can return aggregates, the server can declare which result columns each operation is allowed on:

```json
{
  "JournalDto": {
    "type": "object",
    "required": ["hours"],
    "properties": {
      "hours": { "type": "number", "x-aggregatable": ["Sum", "Avg", "Min", "Max", "CountDistinct"] },
      "notes": { "type": "string" }
    }
  }
}
```

generates:

```typescript
export interface IJournalDto {
  /** @aggregatable Sum, Avg, Min, Max, CountDistinct */
  hours: number;
  notes?: string;
}

/** Columns of IJournalDto a paged search can aggregate (see each property's @aggregatable). */
export type IJournalDtoAggregatableColumn = 'hours';
```

The union is emitted only when at least one property declares the extension, so an interface with no aggregatable columns is generated as it always was. The value must be a non-empty array of strings; anything else is ignored.

Note that this describes only *which* columns may be aggregated. Building the request and reading the result is the API's own contract - if your API publishes its aggregate request/result schemas, the generator turns those into types like any other.


## Custom Templates

You can provide your own EJS templates to fully customize the generated code. Use the `apiServiceTemplatePath` and `baseApiTemplatePath` options to specify paths to your custom templates.

### Example configuration with custom templates

```json
{
  "swaggerSchemaUrl": "https://api.example.com/swagger/v1/swagger.json",
  "path": "/src/app/core",
  "framework": "angular",
  "apiServiceTemplatePath": "./templates/custom-api-service",
  "baseApiTemplatePath": "./templates/custom-base-api"
}
```

### Template Variables

The following variables are available in API service templates:

| Variable                  | Type               | Description                                                                                         |
|---------------------------|--------------------|-----------------------------------------------------------------------------------------------------|
| `name`                    | string             | The API tag/controller name (e.g., "Claim")                                                         |
| `path`                    | string             | Output path for generated files                                                                     |
| `apiList`                 | IParsedApiItem[]   | Array of parsed API operations                                                                      |
| `importRefs`              | IImportRef[]       | Array of import references for types                                                                |
| `transformRefsToImport`   | function           | Helper to generate import statements from refs                                                      |
| `cacheTag`                | string \| null     | RTK: the slice's `TApiTag` member (e.g., "Orders") when `rtkCacheTags` is on, otherwise `null`       |
| `renderJsDoc`             | function           | `renderJsDoc(item, '  ')` renders the operation's `summary`, `description` and `@deprecated` as a JSDoc comment at the given indent (empty string when there is nothing to document) |
| `classify`                | function           | Convert string to PascalCase (e.g., "claim-status" → "ClaimStatus")                                 |
| `dasherize`               | function           | Convert string to kebab-case (e.g., "ClaimStatus" → "claim-status")                                 |
| `camelize`                | function           | Convert string to camelCase (e.g., "claim-status" → "claimStatus")                                  |
| `buildHttpCall`           | function           | Angular: `buildHttpCall(item)` returns `{ method, args }`, the whole HttpClient call with the URL among the arguments. TRACE (HttpClient has no `trace()`) and OPTIONS with a request body go through `request(method, url, { ... })`; a GET, HEAD or TRACE request body is left out, since a browser can't send it |

### IParsedApiItem Properties

Each item in `apiList` has the following properties:

| Property                 | Type     | Description                                                                                          |
|--------------------------|----------|------------------------------------------------------------------------------------------------------|
| `apiMethodName`          | string   | Generated method name (e.g., "getById")                                                              |
| `scopedApiMethodName`    | string   | Method name prefixed with tag (e.g., "claimGetById")                                                 |
| `apiMethodParams`        | string   | Method parameters as string (e.g., "id: number, body: IRequest")                                     |
| `apiMethodParamNames`    | string[] | Array of parameter names (e.g., ["id", "body"])                                                      |
| `apiMethodRequestType`   | string   | Combined request type (e.g., "{ id: number; body: IRequest }")                                       |
| `isApiMethodRequestOptional` | boolean | `true` when every field of `apiMethodRequestType` is optional (only optional query/header params); the RTK template then types the argument `{ ... } \| void` and defaults it to `{}`, so the endpoint can be called without one |
| `apiMethodType`          | string   | HTTP method lowercase (e.g., "get", "post")                                                          |
| `httpMethod`             | string   | HTTP method uppercase (e.g., "GET", "POST")                                                          |
| `apiUrl`                 | string   | URL path with interpolation (e.g., "${id}/notes")                                                    |
| `apiPath`                | string   | The operation's path as written in the document (e.g., "/api/Users/{id}")                          |
| `apiUrlFormatted`        | string   | URL formatted for code (e.g., `` `/${id}/notes` ``)                                                  |
| `isQuery`                | boolean  | True for GET/HEAD methods                                                                            |
| `requestMethod`          | string   | HTTP method for httpClient (e.g., "get", "post")                                                     |
| `responseTypeSymbol`     | string   | Response type (e.g., "IClaimDetailDTO", "void")                                                      |
| `response`               | object   | Raw OpenAPI success response object, or undefined if the operation has none                          |
| `bodyParam`              | object   | Parsed body parameter or null                                                                        |
| `bodyFormatted`          | string   | Body parameter name or empty string                                                                  |
| `queryParams`            | array    | Parsed query params; `originalParam.name` is the name sent in the query string, `objectSymbol` its variable (`page_size` → "pageSize", `default` → "defaultParam"), `objectEntry` the object entry that maps one to the other (`'page_size': pageSize`) |
| `queryParamsFormatted`   | string   | Query params formatted for HTTP options                                                              |
| `headerParamsFormatted`  | string   | Header params formatted for HTTP options, under their exact names (e.g., "headers: { 'If-Match': String(ifMatch) }"); objects (and `oneOf`/`anyOf` of objects) are sent in OpenAPI `simple` style, arrays and tuples of objects and `application/json` content params as JSON (a `oneOf`/`anyOf` with an array of objects among its members decides at runtime: only an array holding an object is sent as JSON); empty when none |
| `headerParams`           | array    | Parsed header params; `originalParam.name` is the header name, `objectSymbol` its variable (e.g., "ifMatch") |
| `pathParams`             | array    | Parsed path params, one per `{placeholder}` in the path (a placeholder the operation doesn't declare gets a required `string` param); `originalParam.name` is the declared name, `objectSymbol` its variable |
| `deprecated`             | boolean  | Whether the operation is deprecated                                                                  |
| `summary`                | string   | Operation summary from OpenAPI spec                                                                  |
| `description`            | string   | Operation description from OpenAPI spec                                                              |
| `operationId`            | string   | Original operationId from OpenAPI spec                                                               |

### Custom Template Helpers

If your custom templates need additional helper functions or constants, you can provide them via the `templateHelpersPath` option. This should point to a JavaScript file that exports functions and values.

#### Configuration

```json
{
  "swaggerSchemaUrl": "https://api.example.com/swagger/v1/swagger.json",
  "path": "/src/app/core",
  "framework": "angular",
  "apiServiceTemplatePath": "./templates/custom-api-service",
  "templateHelpersPath": "./templates/helpers.js"
}
```

#### Helper File Example

```js
// templates/helpers.js
module.exports = {
  // Constants
  API_VERSION: 'v2',
  BASE_URL: '/api',

  // Helper functions
  formatEndpointName: (name) => `custom_${name}`,
  
  buildJsDoc: (item) => {
    const lines = ['/**'];
    if (item.summary) lines.push(` * ${item.summary}`);
    if (item.description) lines.push(` * ${item.description}`);
    if (item.deprecated) lines.push(' * @deprecated');
    lines.push(' */');
    return lines.join('\n');
  },

  // Custom type formatting
  wrapResponseType: (type) => `ApiResponse<${type}>`,
};
```

#### Using Helpers in Templates

```ejs
import { Injectable } from "@angular/core";
import { ApiResponse } from "./api-response";

@Injectable({ providedIn: 'root' })
export class <%= classify(name) %>ApiService {
  private baseUrl = '<%= BASE_URL %>/<%= API_VERSION %>/<%= name %>';

<% for (let item of apiList) { %>
<%= buildJsDoc(item) %>
  <%= formatEndpointName(item.apiMethodName) %>(): Observable<<%= wrapResponseType(item.responseTypeSymbol) %>> {
    return this.http.<%= item.requestMethod %>>(`${this.baseUrl}/<%= item.apiUrl %>`);
  }
<% } %>
}
```

> **Note:** The helpers file must be a CommonJS module (using `module.exports`). ES modules with `export default` are also supported.

### Example Custom Template (Angular)

```ejs
import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

<%= transformRefsToImport(importRefs, path, `${path}/${dasherize(name)}-api.service`) %>

@Injectable({ providedIn: 'root' })
export class <%= classify(name) %>ApiService {
  private baseUrl = '/api/<%= name %>';

  constructor(private http: HttpClient) {}

<% for (let item of apiList) { %>
  /**
   * <%= item.summary || item.apiMethodName %>
   */
  <%= item.apiMethodName %>(<%= item.apiMethodParams %>): Observable<<%= item.responseTypeSymbol %>> {
    return this.http.<%= item.requestMethod %><<%= item.responseTypeSymbol %>>(`${this.baseUrl}/<%= item.apiUrl %>`);
  }
<% } %>
}
```
