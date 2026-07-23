# Swagger Schematics

Generate TypeScript types and API services from OpenAPI/Swagger schemas using Angular Schematics.

Supports:
- **Angular** (HttpClient services)
- **React RTK Query** (API slices)

Supported OpenAPI versions:
- **OpenAPI 3.0.x** - full support, including `nullable`, `format: binary`, and multipart uploads
- **OpenAPI 3.1.x** - full support, including type arrays (`type: ["string", "null"]`), `contentMediaType` binary content, and schema-less `application/octet-stream` responses
- Newer 3.x versions are treated as 3.1 with a warning; **Swagger 2.0 is not supported** (a warning is logged and generation is attempted best-effort)


## How to use?

1. Install package

```bash
npm i -D swagger-schematics
```

2. Run schematic

```bash
schematics swagger-schematics:api swaggerUrl --path=/src/app/core
```

```bash
schematics swagger-schematics:types swaggerUrl --path=/src/app/core
```

3. Enjoy!


## Configuration

You can create an `openapi-schematics.json` file in the root of your project to configure default options for the schematics. Options passed via CLI arguments will override the config file values.

### Example configuration (Angular)

```json
{
  "swaggerSchemaUrl": "https://api.example.com/swagger/v1/swagger.json",
  "path": "/src/app/core",
  "baseApiServicesPath": "/src/app/core/api",
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

If your backend uses custom types that should map to TypeScript primitives (e.g., `SuperDuperInt32` → `number`), you can configure type mappings:

```json
{
  "swaggerSchemaUrl": "https://api.example.com/swagger/v1/swagger.json",
  "path": "/src/app/core",
  "typeMapping": {
    "SuperDuperInt32": "number",
    "CustomGuid": "string",
    "Int64": "number",
    "Decimal": "number"
  }
}
```

### Available options

| Name                     | Type    | Schematics | Description                                                                                                                                                      |
|--------------------------|---------|------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `swaggerSchemaUrl`       | string  | api, types | URL of the Swagger/OpenAPI schema (required)                                                                                                                     |
| `path`                   | string  | api, types | Path where generated files will be created, relative to the workspace root                                                                                       |
| `baseApiPath`            | string  | api        | Path for base API file. For Angular: defaults to `path`. For RTK: defaults to `th-common/store/api-base.ts`. Supports tsconfig path alias resolution for imports |
| `project`                | string  | types      | Generate in a specific Angular CLI workspace project                                                                                                             |
| `apiPathKey`             | string  | api        | Filter API paths by a specific key/prefix                                                                                                                        |
| `apiServiceTemplatePath` | string  | api        | Custom template path for API service generation                                                                                                                  |
| `baseApiTemplatePath`    | string  | api        | Custom template path for base API generation                                                                                                                     |
| `framework`              | string  | api        | Target framework: `"angular"` (default) or `"react-rtk"`                                                                                                         |
| `scopeEndpointsWithTags` | boolean | api        | Prefix endpoint names with tag name (e.g., `claimGetById` instead of `getById`). Recommended for multi-controller APIs                                           |
| `typeMapping`            | object  | api, types | Map custom backend types to TypeScript primitives (e.g., `{ "SuperDuperInt32": "number" }`)                                                                      |
| `eslintFix`              | boolean | api, types | Run your project's ESLint with autofix on generated files, applying your own config (import sorting, quotes, commas). Defaults to `false`. Never blocks generation: if ESLint is missing or fails, a warning is logged and files keep their generated content |

All configuration options can also be passed as CLI arguments using `--optionName=value` syntax.


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
| `classify`                | function           | Convert string to PascalCase (e.g., "claim-status" → "ClaimStatus")                                 |
| `dasherize`               | function           | Convert string to kebab-case (e.g., "ClaimStatus" → "claim-status")                                 |
| `camelize`                | function           | Convert string to camelCase (e.g., "claim-status" → "claimStatus")                                  |

### IParsedApiItem Properties

Each item in `apiList` has the following properties:

| Property                 | Type     | Description                                                                                          |
|--------------------------|----------|------------------------------------------------------------------------------------------------------|
| `apiMethodName`          | string   | Generated method name (e.g., "getById")                                                              |
| `scopedApiMethodName`    | string   | Method name prefixed with tag (e.g., "claimGetById")                                                 |
| `apiMethodParams`        | string   | Method parameters as string (e.g., "id: number, body: IRequest")                                     |
| `apiMethodParamNames`    | string[] | Array of parameter names (e.g., ["id", "body"])                                                      |
| `apiMethodRequestType`   | string   | Combined request type (e.g., "{ id: number; body: IRequest }")                                       |
| `apiMethodType`          | string   | HTTP method lowercase (e.g., "get", "post")                                                          |
| `httpMethod`             | string   | HTTP method uppercase (e.g., "GET", "POST")                                                          |
| `apiUrl`                 | string   | URL path with interpolation (e.g., "${id}/notes")                                                    |
| `apiUrlFormatted`        | string   | URL formatted for code (e.g., `` `/${id}/notes` ``)                                                  |
| `isQuery`                | boolean  | True for GET/HEAD methods                                                                            |
| `requestMethod`          | string   | HTTP method for httpClient (e.g., "get", "post")                                                     |
| `responseTypeSymbol`     | string   | Response type (e.g., "IClaimDetailDTO", "void")                                                      |
| `bodyParam`              | object   | Parsed body parameter or null                                                                        |
| `bodyFormatted`          | string   | Body parameter name or empty string                                                                  |
| `queryParams`            | array    | Array of parsed query parameters                                                                     |
| `queryParamsFormatted`   | string   | Query params formatted for HTTP options                                                              |
| `pathParams`             | array    | Array of parsed path parameters                                                                      |
| `deprecated`             | boolean  | Whether the operation is deprecated                                                                  |
| `summary`                | string   | Operation summary from OpenAPI spec                                                                  |
| `description`            | string   | Operation description from OpenAPI spec                                                              |
| `operationId`            | string   | Original operationId from OpenAPI spec                                                               |

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
