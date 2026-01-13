# Swagger Schematics

Generate TypeScript types and API services from OpenAPI/Swagger schemas using Angular Schematics.

Supports:
- **Angular** (HttpClient services)
- **React RTK Query** (API slices)


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

All configuration options can also be passed as CLI arguments using `--optionName=value` syntax.
