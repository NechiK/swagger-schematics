# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [2.1.0] - 2026-10-03

### ✨ Added
- **Angular 15 and 22 checked in CI** - the generated Angular output for every test fixture is compiled with `tsc` against Angular 15 (the lowest supported version, TypeScript 4.8) and Angular 22 (TypeScript 6.0), with the `ng new` strict settings plus `noUnusedLocals`, `noUnusedParameters` and `exactOptionalPropertyTypes`. Angular 22 needed no changes; the README's requirements now name both versions

### 🐛 Fixed
- **A path parameter with no placeholder in the path is left out** - a document that declares a path parameter its path doesn't use (`GET /api/Claim/serviceactions` with a `serviceActionId` path parameter) generated a required argument that was never sent: `getClaimServiceactions(serviceActionId)` in Angular, `{ serviceActionId: number }` in RTK, and an unused parameter that fails to compile under `noUnusedParameters`. Such a parameter is now left out of the generated method, with a warning naming the parameter and the endpoint so the document can be fixed. This is the counterpart of 2.0.0's undeclared placeholders, which become a required `string` parameter
  - A call that passes the argument stops compiling (TS2554 in Angular, an excess property in RTK); drop the argument, since the value was never sent
  - A placeholder matched only by case (`{ID}` declared as `id`) still uses that parameter

## [2.0.0] - 2026-09-28

A major release: regenerating can require changes at call sites and in custom templates. The list below says what to do; each item is described in full under ♻️ Changed, marked ⚠️ **BREAKING**.

### ⚠️ Upgrading from 1.x
- **Required nullable query/header params must be passed** - pass the value (`null` is fine and still leaves it out of the request), or set `legacyOptionalProperties: true` to keep the old rule
- **Required header, path-level and `$ref` params are now in the method signature** - pass them at the call sites that stop compiling
- **GET, HEAD and TRACE methods no longer take a request body** - drop the body argument; if the server needs it, the operation has to accept POST
- **PUT/POST with an undeclared path placeholder** take it as its own argument (`update(id, body)` instead of reading `body.id`); better, declare the parameter in the OpenAPI document
- **Array, tuple and record components are type aliases** - `ITags` from `tags.interface.ts` is now `TTags` from `tags.type.ts`; update the imports
- **A schema mapped with `typeMapping` generates no file** - import the mapped type instead of the schema's own symbol (`string` instead of `IMoney`)
- **Types are more precise** - nullability inside arrays, records, tuples and unions (`(string | null)[]`), OpenAPI 3.1 `const`, `prefixItems` and `type: "null"`, and index signatures on interfaces with `additionalProperties`. Handle `null` where the compiler asks for it; a class that `implements` such an interface needs the same index signature
- **Custom template paths are relative to the project root** - `apiServiceTemplatePath` and `baseApiTemplatePath` used to resolve from the installed package's `api/` folder; a path written for that (e.g. `../../../templates/api`) must now be relative to the project root, or absolute
- **Custom templates**: replace `buildHttpCallArgs` with `buildHttpCall(item)`; use `objectSymbol` for a param's variable (`originalParam.name` is now the declared name, e.g. `page_size`); code that builds `IParsedParam` objects must set `isOptional` and `isNullable`
- **Commit** `.swagger-schematics-manifest.json` (since 1.4.0) and, if you set `schemaSnapshotPath`, the schema snapshot with the generated code

### ✨ Added
- **Filtering APIs** - `includeApis`, `excludeApis` (controller names, case-insensitive, `*` wildcard, PascalCase form accepted; comma-separated on the CLI) and `excludeDeprecated`. Every API is generated unless a filter is set:
  - An API that becomes excluded has its service deleted on the next run, including when the filters exclude every API (the empty-schema safety net applies only when the document itself declares no operations); the API change summary applies the same filters
  - A filter entry matching no API is reported as a warning; an API emptied by `excludeDeprecated` is skipped quietly. When an `includeApis` entry matching no API (a typo like `Oders`) leaves nothing to generate, the existing services are kept, not deleted, and the warning names the entry
  - Filtering applies to API services only; the types schematic still generates every schema
- **`provideApi()` for standalone Angular apps** - `_provide-api.ts` is generated next to the base API files: `provideApi({ baseUrl })` provides the `API_BASE_URL` token, with `baseUrl` a string or a function run in an injection context (e.g. `() => inject(AppConfig).apiUrl`). Regenerated every run; skipped when `_api-base-url.token.ts` doesn't exist (a custom base template without the token), and a provider generated on an earlier run is then removed, since it would import the missing token
- **RTK cache tags** (`rtkCacheTags`, React RTK only, off by default) - lists refetch by themselves after a create, update or delete in the same slice, instead of every team adding tags by hand:
  - A generated `TApiTag` enum (`api-tag.enum.ts` in `path`) with one member per slice; each slice registers its tag with `enhanceEndpoints({ addTagTypes })`, so the base API file needs no changes
  - GET and HEAD endpoints `providesTags` their slice's tag; POST, PUT, PATCH and DELETE `invalidatesTags` it; OPTIONS and TRACE get no tag
  - Cross-slice tags are added with `enhanceEndpoints` using the same enum (README shows replacing and adding); turning the option off removes the tags, and the enum with `removeStaleFiles` on (the default)
  - Slices whose names give the same member (`v1.0` and `v10` are both `V10`, and names with no ASCII letters or digits) get a numeric suffix (`V10_2`), so the enum compiles
  - Checked against `@reduxjs/toolkit` 2.x types: generated slices, overrides and `util.invalidateTags` compile under `strict` with no casts beyond the documented `providesTags` spread
- **JSDoc from the schema's documentation** - descriptions written on the server now reach the consumer's editor as hover text instead of stopping at the OpenAPI document:
  - Service methods (Angular) and endpoints (RTK): the operation's `summary`, its `description` as a separate paragraph (skipped when it repeats the summary), and `@deprecated`
  - Interfaces, enums and type aliases: the schema's `description` and `deprecated`
  - Interface properties: `description` and `deprecated`, merged into one comment with `@aggregatable`
  - Multi-line descriptions (e.g. .NET `<remarks>`) keep their paragraphs; a literal `*/` in the text can't end the comment early
  - Undocumented code renders exactly as before; existing output gains only comment lines
  - `renderJsDoc(source, indent)` is available to custom API templates, and `transformProperties()` also returns `docs`
- **API change summary** - with the new `schemaSnapshotPath` option, every `swagger-schematics all` run compares the schema with the snapshot the previous run saved and prints what changed, in the names found in the generated code (`IUserDto.email`, `UsersApiService.getById()`, `usersApi.getById`); endpoint signatures show what callers pass (positional parameters for Angular, the request object for RTK):
  - **Breaking**: a removed interface, enum, type, property, enum member or endpoint, a new required property (object literals of the interface must now set it), a changed property declaration (type, optionality, nullability), enum member value, type alias or endpoint signature, or an interface's index signature (`[key: string]: ...`) that appears, goes or changes type (not the order of its union, which follows the properties)
  - **Added**: new interfaces, optional properties, enum members and endpoints, and new optional endpoint parameters that existing calls can leave out (an optional header, or an optional query param next to existing ones)
  - Query and header params that only change order are no change, since calls pass them by name (path params are positional in Angular, so their order still counts)
  - Angular's first query param stays breaking when a body or a headers object follows it, since it shifts their position, and so does a new optional param that takes an existing param's variable (`page_size` declared before `pageSize` gets `pageSize`, so existing calls fill the new one)
  - Names, types and signatures come from the generator's own naming and type rendering, so they match the generated files
  - Parameters are matched by location and declared name; header names compare case-insensitively, as in HTTP, so re-casing one (`X-Tenant` -> `x-tenant`) isn't a change
  - The snapshot is the schema as fetched, in the document's own key order: the generated code depends on that order (the first `content` media type, the order of properties in an intersection), so an unchanged schema always reads back as no changes. Commit it with the generated code; the first run only creates it
  - `--dry-run` prints the summary and writes neither the snapshot nor the report
  - Runs with `all` only: a single `types` or `api` run would update the snapshot for half the API
- **`--change-report=<file>`** writes the same summary as markdown, e.g. for a pull request description from a CI pipeline. It stays under 4000 characters (the Azure DevOps limit) and ends with a count of the changes left out. Values containing backticks (a `const` or enum value) get a longer code-span fence, so they can't break the markdown. If the requested report can't be written, the run exits with code 1 so a CI step doesn't read a missing or stale file; the generated code is still written. A schema snapshot that can't be saved, or can't be compared with the schema, is only a warning, and one that can't be compared (or isn't valid JSON) is replaced, so later runs don't keep failing on it; the report then says the snapshot couldn't be used rather than that there was none, and a `--dry-run` leaves it as it is
- `apiPath` on each parsed API item (`IParsedApiItem`): the operation's path as written in the document (e.g. `/api/Users/{id}`), available to custom templates
- `buildHttpCall(item)` for custom Angular templates: the whole HttpClient call (`{ method, args }`, URL included), with the `request()` handling described under 🐛 Fixed. It replaces `buildHttpCallArgs` (see ♻️ Changed). Parsed query params also get `objectEntry`, the object entry keyed by the declared name (`'page_size': pageSize`)
- `transformSwaggerSchema()` accepts `silent: true` to skip its warnings (skipped paths and groups, unrecognized path patterns, skipped headers, unresolvable parameter references, unmatched filters); the change summary uses it, so its two extra parses print nothing
- `enableSwaggerSchemaCache()` is exported from `helpers/swagger-schema.helper` for programmatic callers that want the CLI's load-once behavior (see 🐛 Fixed); the cache is off unless turned on, so a long-lived process that regenerates after the API changed still loads the new document

### 🐛 Fixed
- **References to composition schemas compile** - a component written as `allOf`, `oneOf`, `anyOf` or `not` generates a type alias (`TAnyId` in `any-id.type.ts`), but a `$ref` to it (a property, parameter, body or response) was rendered as `IAnyId` imported from `./any-id.interface`, a file that doesn't exist, so the generated code didn't compile. References now use the alias and its file, and a recursive one (a tree node whose `children` refer back to it) doesn't import its own file. Common with .NET inheritance (`allOf` + `properties`) and 3.1 nullable references
- **Arrays and records inside `oneOf`/`anyOf` are imported** - only `$ref` members and nested compositions added imports, so a member that is an array, tuple or record whose element is a schema rendered it without importing it and the generated code didn't compile. E.g. `anyOf: [{ type: array, items: { $ref: Item } }, { type: 'null' }]` (the 3.1 way of writing a nullable list) rendered `IItem[] | null` without importing `IItem`, in interfaces, type aliases and Angular/RTK response types; `oneOf: [A, { type: array, items: B }]` missed `IB` the same way. The `type: ["array", "null"]` form ASP.NET Core writes was not affected
- **Specification extensions on a path item are ignored** - every path-item key other than `summary`, `description`, `parameters`, `servers` and `$ref` was treated as an operation, so an `x-` extension (e.g. `"x-controller": "OrdersController"`) failed the run with `Cannot read properties of undefined (reading '200')`. Only the HTTP methods (`get`, `put`, `post`, `delete`, `options`, `head`, `patch`, `trace`) are operations now
- **Query params are sent under their declared names** - path and query names were camelized for the variable and on the wire too, so `page_size` was sent as `?pageSize=` (Angular and RTK) and the server never saw it. The query string now uses the name as declared (`params: { 'page_size': pageSize }`); only the variable is camelized
- **Path and query params with any name compile** - a name that isn't a usable variable produced invalid code (`({ default }: ...)`, `filter[name]`). The variable is now adjusted and the request keeps the declared name: characters beyond letters, digits, `_` and `$` are dropped (`filter[name]` -> `filterName`), a leading digit gets `_`, a reserved word gets `Param` (`default` -> `defaultParam`), a capital that dropped characters bring to the front is lowercased (`[Object]` -> `object`, so it can't shadow a global the method calls), and a variable another param of the operation already has gets its location (query `id` next to path `id` -> `idQuery`). A query param named `__proto__` is sent with a computed key (`['__proto__']: proto`): a quoted `'__proto__'` key would set the params object's prototype, and the param would never be sent
- **Path segments with text around a parameter** - `/api/Files/{name}.{ext}` without an `operationId` generated the method name `getFilesByName}{ext`, which didn't compile, and a URL that dropped the dot and sent `{ext}` as literal text (`${name}{ext}`); `/api/Items/{id}.json` dropped the `.json`. Every parameter in a segment is now interpolated, the text around it kept (`${name}.${ext}`, `${id}.json`), and each one named in the default method name (`getFilesByNameExt`)
- **Quotes in a path's literal text** - `/api/Items/it's` generated the URL `'/it's'`, an unterminated string; a backslash, `'` or `` ` `` in the path is now escaped (`'/it\'s'`). Method names also keep only characters a name can hold: without an `operationId`, `it's` gave `getItemsIt's`, and an `operationId` like `items:list` (the Google API style) gave `items:list()`. They are now `getItemsItS` and `itemsList`; a leading digit gets `_`, and letters beyond ASCII are kept
- **Components referenced by the name their file declares** - a file declares its component's name classified (`TThingKind` for `thing_kind`, `IMyItem` for `my-item`, `IShopOrderDto` for the .NET full name `Shop.OrderDto`), but a `$ref` used the key as written (`Tthing_kind`, `Imy-item`, `IShop.OrderDto`), so specs with snake_case (FastAPI), kebab-case, camelCase or full-name schema ids didn't compile. References, imports and a recursive component's reference to itself now use the declared name; PascalCase names are unchanged
- **Components that are only a `$ref`** - `ItemAlias: { $ref: Item }` generates no file of its own, but a reference to it imported `IItemAlias` from `./item-alias.interface`, which doesn't exist. A reference now resolves to the component it points to (`IItem`), through any number of such components, with that component's nullability and header serialization; a circular chain of them renders `unknown`
- **Inline objects with `properties` and `additionalProperties`** - `{ type: object, properties: { x: string }, additionalProperties: { type: integer } }` rendered `Record<string, number>`, which dropped `x` and rejected valid values like `{ x: 'a' }`. It now renders both, `{ x?: string; [key: string]: number | string | undefined }` (see ♻️ Changed for the index signature's type)
- **`typeMapping` to an inlined component** - a mapping to a component that generates no file, like a primitive wrapper (`{ "Price": "Decimal" }` with `Decimal: { type: string, format: decimal }`), imported `IDecimal` from a file that doesn't exist; it now renders the component's primitive (`string`). A mapping to a component that is only a `$ref` (`{ "Old": "PriceAlias" }` with `PriceAlias: { $ref: Price }`) imported `IPriceAlias` from a file that doesn't exist either; it now resolves to the component the chain ends at (`IPrice`), as an unmapped reference does. Mapping lookups also ignore keys inherited from `Object.prototype`, so with any `typeMapping` set, a `$ref` to a component named `constructor` or `toString` no longer fails the run with `value.toLowerCase is not a function`
- **Angular TRACE operations compile, and OPTIONS sends a declared body** - `HttpClient` has no `trace()`, and its `options()` takes no body, so a TRACE method didn't compile and an OPTIONS request body was taken as a parameter but never sent. These now call `this.httpClient.request('TRACE', url, { params, headers })` and `request('OPTIONS', url, { body, params, headers })`. A GET, HEAD or TRACE body is left out (see ♻️ Changed)
- **Property names that aren't identifiers are quoted** - `first-name` or `@odata.type` rendered `first-name?: string`, a syntax error, in interfaces and inline object types. They now render `'first-name'?: string`; JSDoc and `@aggregatable` still attach, and the change summary lists them by name (a new optional one is added, not a new required property)
- **Boolean schemas don't crash** - JSON Schema allows `true` and `false` as schemas (`items: true`, `prefixItems: [true]`, a `true` property), which failed with `Cannot use 'in' operator to search for '$ref' in true`. `true` renders `unknown`, `false` `never` (`items: false` -> `never[]`). A boolean component (`"Anything": true`) generates no file and is inlined the same way at every reference. A response whose schema is a `false` component is typed `void`, like an inline `false`: no value matches it, and RTK rejects `never` as a query's result type
- **Records without `type: object`** - `{ additionalProperties: { $ref: Item } }` with no `type` rendered `any`; it now renders `Record<string, IItem>` (as a component, see ♻️ Changed). `additionalProperties: false` only closes an object, so an untyped `{ properties, additionalProperties: false }` still renders `any`
- **Enums compile with `null` and with names that collide** - a `null` value generated `null = null` (TS18033); it is left out, and references to a nullable enum are `TColor | null` (nullable through `nullable: true`, a `null` in `type`, or, with no `type`, the `null` value itself: `{ enum: ['red', null] }`). Values whose member names collide (`'a-b'` and `'a b'` are both `AB`, or repeated `x-enum-varnames`) get a numeric suffix (`AB_2`). A boolean enum (`{ type: boolean, enum: [true, false] }`, or `[true]` for a constant, with or without `type`) generated `true = true` (TS18033); it generates no enum now and is inlined as `boolean` at every reference, keeping its nullability. A `__proto__` value gets the member name `Proto`: `__proto__ = '__proto__'` compiled, but set the enum object's prototype, so the member was missing at runtime
- **OpenAPI 3.1 nullable `oneOf`/`anyOf` counts as nullable** - `{ "oneOf": [{ "type": "null" }, { "$ref": "..." }] }` (and `anyOf`) already rendered `IDto | null`, but optionality checks didn't see it as nullable: with `legacyOptionalProperties` such properties and parameters were required, and a required query parameter of that shape was put in the Angular `params` as is instead of being left out when `null`. It is now nullable like `nullable: true` (3.0) and `type: [..., "null"]` (3.1). So are:
  - a union with a nullable member (`oneOf: [{ type: ['string', 'null'] }, { type: integer }]`, which renders `string | number | null`), at any depth
  - a `$ref` to such a union: a required query or header param of type `TU` is left out when `null` instead of being sent as `null`
  - an `allOf` whose members all allow null (`allOf: [{ $ref: NColor }]`, the way NSwag and Swashbuckle wrap a reference)
  - a `$ref` that `typeMapping` maps to a nullable component
  - A member allows null however it renders it: `{ type: 'null' }`, `{ const: null }`, `default: null`, a nullable type, or a `$ref` (mapped or not) to a nullable component. Rendered types are unchanged, except for `typeMapping` (see ♻️ Changed)
- **Angular PATCH requests send their body** - `HttpClient.patch()` takes `(url, body, options)` like POST and PUT, but PATCH was generated like GET: the options object (query params, headers) was passed as the body and the real body was never sent, and a PATCH without a body didn't compile (the body argument is required). PATCH now follows POST/PUT, and a body-less PATCH passes `{}`
- **Path-level parameters are applied to every operation** - OpenAPI allows `parameters` on the path item, shared by all its operations, but only each operation's own `parameters` were read. A path-level `{id}` generated a method interpolating an undefined `${id}`, and path-level query and header parameters were dropped. They are now merged into each operation, and an operation's own parameter with the same name and location overrides the path-level one (header names compare case-insensitively, as in HTTP: `x-tenant` overrides `X-Tenant`)
- **Every path placeholder is a real parameter** - OpenAPI requires each `{placeholder}` in a path to be declared as a path parameter. When a document left one out, GET, DELETE and the other methods interpolated a variable nothing declared (`${id}`, TS2304), and PUT and POST read it from the body instead (`${body.orderId}`), which didn't compile when the body has no such property and sent `undefined` when it was optional. Such a placeholder is now a required `string` parameter, logged as a warning naming the placeholder and the endpoint so the document can be fixed (see ♻️ Changed). A placeholder whose declared parameter differs only in case (`{ID}` declared as `id`) uses that parameter, with a warning too
- **`$ref` parameters are resolved** - a parameter written as `{ "$ref": "#/components/parameters/TenantId" }`, at path or operation level, was dropped; it is now resolved against the document:
  - Any local JSON Pointer works (`#/components/parameters/Id`, `#/paths/~1api~1Orders/parameters/0`), decoded per spec (`~1` is `/`, `~0` is `~`, `%`-escapes decoded), and a reference to another reference is followed
  - A reference that can't be resolved (dangling, circular or to another file) is dropped with a warning naming the reference and the endpoint, since the generated method won't take the parameter
- **`@aggregatable` values can't break out of the property comment** - the operation names from `x-aggregatable` went into the JSDoc unescaped, so a `*/` or a newline in them ended the comment early. JSDoc tags now get the same escaping as descriptions
- **Angular services with optional query params compile under `strict`** - `params: omitBy({ page }, isNil)` returns lodash's `Dictionary<T | undefined>`, which HttpClient's `params` type rejects under `strict` with `@types/lodash-es` installed. Each optional or nullable query param is now added only when it has a value, `params: { status, ...(page != null ? { page } : {}) }`:
  - Same query string as before, checked against Angular's `HttpParams`: `null`/`undefined` are left out (so no `?page=undefined`), while `0`, `false`, `''` and arrays are kept
  - Angular services and RTK slices no longer import `lodash-es`: RTK slices build `params` the same way, so a query param named `isNil` or `omitBy` no longer shadows the import (`omitBy({ isNil, omitBy }, isNil)` called the caller's values instead of lodash)
  - `queryParamsFormatted` changes accordingly for custom templates
- **Header parameters are sent** - operations declaring `in: header` parameters (e.g. .NET `[FromHeader]` for `X-Tenant-Id`, `If-Match`, `Idempotency-Key`) generated methods without them, so the header was silently never sent. They are now part of the generated method and the request:
  - Angular: a trailing object parameter, `{ ifMatch }: { ifMatch?: string }`, sent in the HttpClient options as `headers`. When every header is optional the object defaults to `{}`, so existing calls keep compiling; a required header makes it required, nullable or not (`required: true` with a nullable schema is `xTenantId: string | null`: it must be passed, and `null` leaves the header out)
  - RTK: added to the query argument and sent as `headers` in the query definition. When every field of the argument is optional (optional headers and query params only), it is typed `{ ... } | void` and defaults to `{}`, so `useOrdersListQuery()` keeps compiling; this also lets endpoints with only optional query params be called without an argument
  - Header names are sent exactly as declared; the variable is the name in camelCase (`X-Tenant-Id` -> `xTenantId`)
  - A header name with anything beyond letters, digits, `-` and `_` (valid in HTTP but not seen in real APIs, e.g. `X-Odd'Name`), one that becomes a reserved or strict-mode-illegal name (`delete`, `eval`, `arguments`), or one whose variable clashes with another parameter of the operation (query `xTenantId` next to header `X-Tenant-Id`, or `X-Foo` next to `x_foo`), is skipped with a warning naming the header, the endpoint and the reason, rather than renamed or failing the run
  - Values are sent as strings in OpenAPI `simple` style:
    - primitives and arrays as `String(value)` (`1,2`)
    - objects (including a `oneOf`/`anyOf` of objects) as `role,admin,id,1` (`role=admin,id=1` with `explode: true`, unset properties left out)
    - `content: application/json` parameters as JSON. `simple` style doesn't define arrays of objects, so they (and tuples holding an object) are sent as JSON too
    - a `oneOf`/`anyOf` mixing objects and primitives picks the form at runtime, and so does one with an array of objects among its members (an array holding an object as JSON, a primitive array comma-separated)
    - the schema's own `type: object` wins over `oneOf` members that only list `required` properties, and an `allOf` is an object only when a member is one (an `allOf` around a string enum `$ref`, as NSwag and Swashbuckle write it, is sent with `String()`); an `allOf` around an array of objects or a union is sent like the schema it wraps
    - a `$ref` that `typeMapping` maps to another component (`{ "Old": "Ctx" }`) is sent like that component, not with `String()`, which sent an object as `[object Object]`
    - an optional or nullable header is added only when it has a value (HttpClient throws on an `undefined` header value, and `null` would be sent as the string "null")
  - `Accept`, `Content-Type` and `Authorization` header parameters are ignored, as the OpenAPI spec requires. Cookie parameters stay out of the generated method: browsers attach cookies themselves and do not let scripts set the `Cookie` header
  - New template fields `headerParamsFormatted` and `isApiMethodRequestOptional` on each parsed API item, and `headerSerialization` on parsed header params; `transformParamsToApiMethodParams()`, `extractApiMethodParamNames()` and `buildApiMethodRequestType()` accept `headerParams`
- **Custom template paths are read from the project root, and a wrong one fails the run** - `apiServiceTemplatePath` and `baseApiTemplatePath` were resolved from the installed package's `api/` folder, so the documented `"./templates/custom-api-service"` found nothing, and a directory that doesn't exist rendered nothing without an error. Together with API filtering, a run that generated no services counted as intended, so it **deleted the services of the previous run** and exited with code 0 (1.4.0 kept them, with a warning blaming the schema). Now:
  - Both options resolve from the project root, like `swaggerSchemaUrl` and `templateHelpersPath`; absolute paths work as before
  - A directory that doesn't exist or holds no `.template` file fails with an error naming the resolved path. `swagger-schematics all` checks both before generating anything, like `framework`
  - Generating no services deletes the previous ones only when the API filters left no API to render. When there were APIs to render and no file came out, the services are kept and the warning says the templates rendered nothing (it no longer says "the schema produced no files" for every cause)
- **CLI errors are printed once, without `Error: Error:`** - the report put an `Error:` label in front of the stack, which already starts with the error type, so every failure read `Error: Error: <message>` (`Error: TypeError: fetch failed`). A failure inside a schematic was also printed a second time under `'cli' schematic failed`. The report now starts with the error's own `TypeError: fetch failed`, causes still follow as `Caused by: ...`, a schematic failure is printed once, and a failure of the CLI itself (e.g. an unsupported `framework`) is headed `[swagger-schematics] failed:`
- **`swagger-schematics all` loads the schema once** - `types` and `api` each fetched the document, so every run made two requests (or two file reads), and a backend deploy landing between them could generate types and services from different versions of the API. The CLI now loads the schema once per run and gives each schematic its own copy of it
  - A failed load is not reused, and the legacy `npx schematics swagger-schematics:…` commands (one process per schematic) are unaffected

### ♻️ Changed
- ⚠️ **BREAKING**: **PUT and POST no longer read an undeclared path placeholder from the body** - `PUT /api/Orders/{id}` with no `id` path parameter generated `update(body)` and requested `/orders/${body.id}`. It now generates `update(id: string, body)` (see 🐛 Fixed): pass the id as its own argument. Better, declare the parameter in the OpenAPI document, which also gives it its real type
- ⚠️ **BREAKING**: **Interfaces that allow more properties get an index signature** - a component with `properties` and `additionalProperties` (a schema or `true`, e.g. .NET `[JsonExtensionData]`) generated an interface of its properties only, so an object literal with an extra key failed the excess property check and reading one didn't compile. It now ends with `[key: string]: ...`. TypeScript checks every property against it (TS2411), so its type also admits each property's type, and `undefined` when one is optional: `{ id: number; note?: string | null; [key: string]: ITag | number | string | null | undefined }`; `true` gives `[key: string]: any`, and `additionalProperties: false` or none adds nothing. `keyof` such an interface is now `string | number`, and a class that `implements` it needs the same index signature
- ⚠️ **BREAKING**: **Required nullable parameters are required** - parameter optionality now follows `required` like interface properties have since 1.1.0. A query or header parameter with `required: true` and a nullable schema was optional (`page?: number | null`), so a call could leave out a value the server requires and only find out from a 400. It is now `page: number | null`: the caller has to pass it, and `null` still leaves it out of the request (never `?page=null`). Parameters that aren't `required` stay optional
  - Calls that leave such a parameter out stop compiling after regeneration: pass the value (`null` is fine), or set `legacyOptionalProperties: true` to keep the old rule. The option now covers parameters as well as interface properties (Angular and RTK, and the change summary's signatures)
- ⚠️ **BREAKING**: **OpenAPI 3.1 schema keywords generate precise types** - these rendered `any`/`any[]`; code that relied on that looseness (e.g. assigning another string to a `const` field) stops compiling. Checked against Angular 20 and RTK 2 under `strict`:
  - `const` generates a literal type (`kind: 'dog'`, `42`, `false`, `null`), including in unions (`oneOf: [{ const: 'cat' }, { const: 'dog' }]` -> `'cat' | 'dog'`, and as an array element `('>' | '<')[]`: brackets inside a literal don't count when deciding where parentheses go). A component that is only a scalar `const` (with or without a `type`) is inlined as its literal at every reference instead of generating an empty interface. An object or array `const` still renders from its `type`
  - `prefixItems` generates a tuple, following JSON Schema 2020-12: positions from `minItems` on are optional, and further elements are allowed unless `items: false` (or `maxItems`) closes it. An intersection in an optional position or as the element type is parenthesized (`[(IA & IB)?]`, `(IA & IB)[]`). `{ prefixItems: [number, number], minItems: 2, items: false }` -> `[number, number]`; with `items: { type: string }` -> `[IDto, ...string[]]`; with no `minItems` or `items` -> `[number?, number?, ...unknown[]]`
  - `type: "null"` generates `null`; a component that is only `type: "null"` (or `["null"]`) is inlined as `null` instead of generating an empty interface. A component whose type array lists only primitives, like `{ "type": ["string", "null"], "format": "uuid" }` (the 3.1 spelling of a nullable GUID), is inlined as `string | null` like its 3.0 `nullable: true` form, instead of an empty `IGuid` interface
  - A `$ref` to a component written as `oneOf: [{ "type": "null" }, ...]` counts as nullable: optional with `legacyOptionalProperties`, and as a required query or header parameter it is left out of the request when `null`. Its type is the component's alias, which already includes `null`, so no extra `| null` is added
- ⚠️ **BREAKING**: **Array, tuple and record components generate type aliases** - a component schema that is an array, a tuple or a record (`additionalProperties` and no `properties`, with or without `type: object`) generated an empty interface, so its values couldn't be used (`p[0]` on `IPosition {}` didn't compile). It now generates a type alias in `x.type.ts`, used at every reference:
  - `{ type: array, items: { type: string } }` -> `export type TTags = string[]`; `{ type: array, prefixItems: [number, number], minItems: 2, items: false }` -> `TPosition = [number, number]`; `{ type: object, additionalProperties: { type: integer } }` -> `TCounts = { [key: string]: number }`. A record alias is an index signature rather than `Record<...>` so it can refer back to itself: the common `JsonValue`/`JsonObject` pair (`TJsonObject = { [key: string]: TJsonValue }`) would otherwise be a circular alias error. So is a record written inline as a member of a `oneOf`/`anyOf`/`allOf` alias (`TJsonValue = string | TJsonValue[] | { [key: string]: TJsonValue } | null`), which failed with TS2456 before
  - A nullable one (`type: ["array", "null"]`, `nullable: true`) is nullable where it is referenced, like an interface: `items?: TItems | null`
  - The old `x.interface.ts` is deleted as stale. Code that imported `ITags` should use `TTags`; a free-form `{ type: object }` without `additionalProperties` still generates an interface
- ⚠️ **BREAKING**: **Nullability is kept inside arrays, tuples, records and unions** - `| null` was only added at the property or parameter level, so a nullable element lost it: `items: { type: ['string', 'null'] }` rendered `string[]`, `additionalProperties: { type: integer, nullable: true }` rendered `Record<string, number>`, and a nullable tuple position or union member dropped `null` too. They now render `(string | null)[]`, `Record<string, number | null>`, `[string | null]` and `string | number | null` (`null` once, at the end of a union). Code that read such elements as non-null stops compiling under `strictNullChecks` until it handles `null`; references to nullable components were already right (`(IDto | null)[]`)
  - Query parameter arrays are the exception: HttpClient's `params` takes no null elements, so `List<int?>` (`items: { type: integer, nullable: true }`) stays `number[]`:
    - whatever makes the elements nullable (the items' own schema, a `$ref` to a nullable component, or a nullable union member)
    - also when the param itself is nullable through a union member (`oneOf: [{ type: array, items: { type: ['integer', 'null'] } }, { type: 'null' }]`, pydantic's `Optional[List[Optional[int]]]`), which renders `number[] | null`
    - an element whose null only its component's alias shows (`items: { $ref: NullableId }` with `NullableId: { oneOf: [{ type: 'null' }, { type: string }] }`) renders `NonNullable<TNullableId>[]`
    - a `$ref` to an array component with nullable items is written out (`number[]`) instead of its alias
  - A component written as a nullable `oneOf`/`anyOf` and replaced with `typeMapping` keeps its `| null`: `{ "NullableId": "string" }` renders `string | null`, not `string`
- ⚠️ **BREAKING**: **Generated methods take the parameters the spec declares** - header parameters, path-level parameters and `$ref` parameters were dropped before (see 🐛 Fixed). Operations declaring them now take them, so a call to an operation with a **required** one stops compiling until it passes the value. Optional headers keep existing calls compiling (Angular's headers object defaults to `{}`; an RTK argument with only optional fields can be left out)
- ⚠️ **BREAKING**: **GET, HEAD and TRACE request bodies are left out** - a browser can't send a body with GET or HEAD (`fetch` throws `Request with GET/HEAD method cannot have body`, XHR drops it), and a TRACE request must not have one (RFC 9110); OpenAPI 3.0 says to ignore such a body, 3.1 to avoid it. Angular methods took a `body` argument that was never sent, and RTK sent it, so `fetchBaseQuery` threw. The generated method no longer takes it, and the run warns, naming the operation. Calls that pass the body must drop it; if the server needs it, the operation has to accept POST (or take the values as query parameters)
- ⚠️ **BREAKING**: **Custom template paths resolve from the project root** - `apiServiceTemplatePath` and `baseApiTemplatePath` were resolved from the installed package's `api/` folder (see 🐛 Fixed). A relative path written for that folder must be rewritten relative to the project root; absolute paths are unaffected
- ⚠️ **BREAKING**: **Custom templates and helpers only** - the `buildHttpCallArgs` template helper is removed: it returned only the arguments after the URL for `item.requestMethod`, which can't express the `request('TRACE', url, ...)` calls TRACE and a body-carrying OPTIONS need. Use `buildHttpCall(item)`, which returns the method and every argument: `this.httpClient.<%= call.method %><T>(<%= call.args.join(', ') %>)`. `originalParam.name` of path and query params is the name as declared (`page_size`), no longer camelized; use `objectSymbol` for the variable. `IImportRef.type` can be `'type'` (a composition's type alias in `x.type.ts`), and `IParsedParam` has two required fields, `isOptional` and `isNullable`, which the parameter helpers now read instead of inspecting the type string. Code that builds `IParsedParam` objects by hand must set them
- ⚠️ **BREAKING**: **A schema mapped with `typeMapping` generates no file of its own** - every reference to it already renders as the mapped type, so its file (e.g. `money.interface.ts` for `{ "Money": "string" }`, `nullable-of-status.enum.ts` for `{ "NullableOfStatus": "Status" }`) was dead code. It is no longer generated, a file from an earlier run is deleted as stale, and the change summary doesn't list it. A schema that a mapping points to (`Status`) is still generated. Code that imported the mapped schema's own symbol (`IMoney`) should use the mapped type instead
- **Angular methods whose query params are all optional can be called without them** - the query object defaults to `{}` (`getItems({ page }: { page?: number } = {})`), like the headers object, so `getItems()` compiles. Not when a body or a required header follows it, since callers pass that anyway; the change summary counts such a query object as optional
- The types schematic and the change summary share `getGeneratedSchemaKind()` (`types/utils/schema-kind.ts`) to decide what each component schema generates; generated output is unchanged

## [1.4.0] - 2026-09-26

### ✨ Added
- `removeStaleFiles` option (`types`, `api`; default `true`) - set `false` to keep files that are no longer in the schema; they are listed as warnings and stay tracked in the manifest, so a later run with the option on still cleans them up

### 🐛 Fixed
- **Files for removed schemas and endpoints are deleted on regeneration** - when the back-end removed a DTO, an enum or a whole controller, the previously generated file stayed on disk. The app kept compiling against code the API no longer has, so the breaking change surfaced only at runtime. Each run now deletes the files the previous run generated that the current schema no longer produces:
  - Ownership comes from a new `.swagger-schematics-manifest.json` in `path` (one per output path, with a `types` and an `api` section). Only files listed there are deleted, so hand-written files in the same folders are never touched, and the base API files are never listed
  - First run without a manifest deletes nothing; files in the generated folders that the current schema doesn't produce are listed as a warning for one-time manual cleanup
  - A schema that produces no files at all (empty or wrong document) deletes nothing and logs a warning, so a broken schema source can't wipe the generated code
  - Manifest entries that point outside `path` are ignored; an unreadable manifest deletes nothing and is rewritten
  - Deletions go through the schematic tree, so `--dry-run` reports them as `DELETE` lines
- **No empty service for an endpoint group without operations** - a path item with no operations (e.g. `"/api/Legacy": {}` or only path-level `parameters`) created a group that rendered as a service class with no methods. Such groups are now skipped with a warning, so a controller whose endpoints were all removed has its file deleted instead of emptied. A document without `paths` no longer throws

### ♻️ Changed
- Generation now writes `.swagger-schematics-manifest.json` to `path`. Commit it with the generated code; without it the next run can't tell which files it generated

## [1.3.1] - 2026-09-26

### 🐛 Fixed
- **An unsupported `framework` fails with a clear error** - a value from `openapi-schematics.json` that isn't `angular` or `react-rtk` (e.g. `"react"`) crashed with `TypeError: Cannot read properties of undefined (reading 'templates')`: the schema's `enum` only validates CLI options, and config-file values are merged in after that validation. It now fails with `Framework 'react' is not supported. Please set 'framework' to 'angular' or 'react-rtk'.`
- **`swagger-schematics all` checks `framework` before generating anything** - `all` runs `types` before `api`, so a missing or unsupported `framework` used to fail only after the types were written, leaving generated types without their services. The CLI now validates it (from `--framework` or `openapi-schematics.json`) up front and writes nothing on failure
- **README: `framework` is required for `api`** - the options table documented `angular` as the default and the CLI examples omitted `--framework`, but the api schematic has required it since React RTK support was added, so the documented commands failed with "Framework is not defined". The docs now match the behavior; there is intentionally no default, so a React project that forgets the option gets an error instead of Angular services

## [1.3.0] - 2026-09-07

### ✨ Added
- **`x-aggregatable` on a schema property is surfaced in the generated interface** - a server that declares which result columns a paged search may aggregate now reaches the consumer's editor, instead of the declaration stopping at the OpenAPI document:
  - The property gets a JSDoc line naming the operations it admits, e.g. `/** @aggregatable Sum, Avg, Min, Max, CountDistinct */`, in the order the server listed them
  - A string-literal union of the declared column names is exported beside the interface as `export type I<Name>AggregatableColumn = 'a' | 'b';`, so code building an aggregate request gets a compile-time check on the column name
  - The extension is read from the property schema and must be a non-empty array of strings; anything else is ignored
  - A type that declares nothing renders **exactly** as before - no JSDoc, no union (snapshot-pinned), so the change is inert for documents that do not use the extension
  - `ISchemaBase` gains the optional `'x-aggregatable'?: string[]` field, and `transformProperties()` returns a third member, `aggregatable`, alongside `propertiesContent` and `refs`

## [1.2.1] - 2026-08-19

### ✨ Added
- **`x-enum-descriptions` are emitted as JSDoc on generated enum members** - the generator already read `x-enum-varnames` to *name* members; it now reads the sibling extension for the *description*, so per-member documentation written on the server reaches the consumer's editor as hover text instead of stopping at the OpenAPI document:
  - The extension is **positional** against `enum` / `x-enum-varnames`, so an undocumented member legitimately carries `''` — empty is treated as absent rather than emitting a bare `/**  */`
  - Newlines are collapsed so a multi-line summary stays on one comment line
  - A literal `*/` inside a description is neutralized, so it cannot terminate the comment early and break the generated file

### 🐛 Fixed
- **Optional query parameters are omitted instead of serialized as the string `undefined`** - the guard deciding whether to wrap params in `omitBy(params, isNil)` tested whether a parameter was *nullable*, but the property that matters is whether its value can be **absent**. An optional parameter is usually not nullable — `required: false` with schema `{"type":"boolean"}` — so the guard returned `false`, nothing was stripped, and a caller who left the value out produced `?excludeInactive=undefined` in the URL (Angular's `HttpParams` stringifies `undefined`). Servers reject that during model binding, so the caller saw a **server error** for what was a serialization bug in generated code. Per the OpenAPI spec `required` defaults to `false` for query parameters, so an absent `required` is treated as optional; a required, non-nullable parameter still emits a plain `params: { ... }`

### ♻️ Changed
- ⚠️ **BREAKING**: `IParsedApiItem.hasNullableQueryParams` is renamed to `hasOmittableQueryParams` - it now reports whether any query parameter's value can be absent (optional **or** nullable), not just whether one is nullable. Keeping the old name would leave a field that returns `true` for a non-nullable parameter, which is how the next reader is misled; its own doc comment already described the broader intent ("strip null/undefined values"). Template authors referencing `item.hasNullableQueryParams` must rename

## [1.2.0] - 2026-08-14

### ✨ Added
- **`swagger-schematics` CLI** - the package now ships its own binary, running the schematics directly through `NodeWorkflow` (no generic `schematics` command needed):
  - `swagger-schematics types [source]`, `swagger-schematics api [source]`, and `swagger-schematics all [source]` (types then api - replaces the two-script setup)
  - Any schematic option can be passed as `--option=value`; kebab-case accepted (`--swagger-schema-url`); `--dry-run`, `--help`, `--version` supported
  - Reports created/updated files, exits 1 on failure with the full error report
  - Avoids the `npx schematics` name-collision trap: the npm package literally named `schematics` is an unrelated abandoned library that npx downloads when `@angular-devkit/schematics-cli` isn't installed locally

### 🐛 Fixed
- **Union types are parenthesized when composed** - an array of a union or nullable ref now generates `(IA | null)[]` instead of `IA | null[]`, and an allOf member that renders as a union generates `IBase & (IExtra | null)` instead of `IBase & IExtra | null`. Both previously compiled to silently wrong types
- **Inline `allOf` with sibling `properties` no longer drops the own properties** - a schema combining `allOf: [Base]` with its own `properties` (the inheritance shape) now renders an intersection with a real object literal, e.g. `IBase & { extra?: string }`, everywhere; previously only named type-alias files kept the properties while inline occurrences (property types, array items) silently lost them
- **Boolean options in `openapi-schematics.json` are honored** - `legacyOptionalProperties`, `eslintFix`, and `scopeEndpointsWithTags` set in the config file were silently overridden back to `false`: the schematic schemas declared `default: false`, which schema validation injected as if the user had passed the option explicitly, beating the config file in the merge. Defaults now live only in the config loader (which runs after the config file is read), so the precedence is truly CLI flag → config file → default
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

### ✨ Added
- A `Fetching swagger schema from '<url>'` console line at the start of generation, so CI logs show how far generation got

### 🐛 Fixed
- **Failures are no longer silent** - both schematics now print a full error report to the console (message and stack for the whole `cause` chain) before failing. Previously a crash in CI (e.g. Azure Pipelines) could abort generation with no output at all
- **Network errors now show the real reason** - Node's `fetch` reports failures as a bare `fetch failed`, hiding the underlying cause (DNS resolution, proxy, TLS) in `error.cause`; the schema download now surfaces the whole chain, e.g. `Failed to fetch swagger schema from '<url>': fetch failed -> getaddrinfo ENOTFOUND host`
- Invalid JSON in `openapi-schematics.json` or in the downloaded schema now fails with a clear message naming the file/URL instead of a bare `SyntaxError`

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

### ✨ Added
- Jest configuration in `package.json` - the test suite now runs out of the box (`npm test`); previously the jest config was not committed
- Tests for string enum generation: quoted values, `x-enum-varnames` with string values, and a guard that integer enums stay unquoted
- Tests for `ApiBaseService.getUrl` covering all URL variants - the generated service is compiled and executed:
  - Relative URLs when `apiBaseUrl` is empty, nested segments, repeated-slash normalization
  - Base URLs with/without trailing slash, ending in `/api` (any case), and with extra path segments
  - A guard that the generated file compiles without TypeScript diagnostics
- Changelog writing skill (`.agents/skills/changelog/SKILL.md`) to guide CHANGELOG.md updates

### 🐛 Fixed
- **String enum generation** - enum members now get quoted string values:
  - Previously `{ enum: ["Email", "PhoneCall"], type: "string" }` generated invalid TypeScript (`Email = Email`); now generates `Email = 'Email'`
  - Works with `x-enum-varnames` when the member name differs from the value (`PhoneCall = 'phone-call'`)
  - Single quotes inside values are escaped; integer enum values remain unquoted
- **RTK endpoint URLs now include the controller segment** - `url` was previously generated without the controller path (e.g. `` url: `/${id}` ``); now the dasherized controller name is prefixed (e.g. `` url: `/claim/${id}` ``)
- **`ApiBaseService.getUrl` strips a trailing `/api` segment from `apiBaseUrl`** (case-insensitive, with or without trailing slash) so a configured base URL like `https://host/api` no longer produces `/api/api/...` in request URLs

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
- ⚠️ **BREAKING**: `baseApiServicesPath` is renamed to `baseApiPath`, and `apiCrudServiceTemplatePath` to `baseApiTemplatePath`
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

### ✨ Added
- New test fixtures and cases for DELETE operations:
  - DELETE by ID (no body)
  - DELETE with query params (verifies params as second arg)
- `parseDeleteRequestName` function for proper DELETE method naming

### 🐛 Fixed
- DELETE method query params are now correctly placed as second argument (options object) instead of third
- Added proper `delete` case handler for API method name generation (was falling through to default with warning)
- Extended GET request name parsing to handle `/api/Model/subresource` and `/api/Model/subresource/{param}` patterns
- Build no longer fails due to test files - excluded `__tests__` from `tsconfig.schematics.json`
- Removed overly strict `"format": "path"` validation from schema.json files
- Path normalization now properly handles relative paths for schematic execution

### ♻️ Changed
- Path segments are now properly capitalized in default method name generation

## [1.0.0-alpha.13] - 2026-01-09

### ✨ Added
- New test cases for enum parameter imports and multiple query parameters

### 🐛 Fixed
- Enum types used in API parameters are now properly imported in generated services
- Object destructuring in method parameters now uses commas instead of semicolons (`{ id, status }` instead of `{ id;status }`)
- PUT/POST methods with path parameters but no separate path param definition now correctly use `body.paramName` in the URL (e.g., `${body.id}` instead of `${id}`)

### ♻️ Changed
- Migrated test framework from Jasmine to Jest
- Parameter schema interface now supports `$ref` types (aligned with OpenAPI spec)

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


[2.1.0]: https://github.com/NechiK/swagger-schematics/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/NechiK/swagger-schematics/compare/v1.4.0...v2.0.0
[1.4.0]: https://github.com/NechiK/swagger-schematics/compare/v1.3.1...v1.4.0
[1.3.1]: https://github.com/NechiK/swagger-schematics/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/NechiK/swagger-schematics/compare/v1.2.1...v1.3.0
[1.2.1]: https://github.com/NechiK/swagger-schematics/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/NechiK/swagger-schematics/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/NechiK/swagger-schematics/compare/v1.0.2...v1.1.0
[1.0.2]: https://github.com/NechiK/swagger-schematics/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/NechiK/swagger-schematics/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/NechiK/swagger-schematics/compare/v1.0.0-beta.1...v1.0.0
[1.0.0-beta.1]: https://github.com/NechiK/swagger-schematics/compare/v1.0.0-alpha.31...v1.0.0-beta.1
[1.0.0-alpha.31]: https://github.com/NechiK/swagger-schematics/compare/v1.0.0-alpha.30...v1.0.0-alpha.31
[1.0.0-alpha.30]: https://github.com/NechiK/swagger-schematics/compare/v1.0.0-alpha.20...v1.0.0-alpha.30
[1.0.0-alpha.20]: https://github.com/NechiK/swagger-schematics/compare/v1.0.0-alpha.14...v1.0.0-alpha.20
[1.0.0-alpha.14]: https://github.com/NechiK/swagger-schematics/compare/v1.0.0-alpha.13...v1.0.0-alpha.14
[1.0.0-alpha.13]: https://github.com/NechiK/swagger-schematics/tree/v1.0.0-alpha.13
