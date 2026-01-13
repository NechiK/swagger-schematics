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
  "rtkBaseApiPath": "@/store/api/baseApi",
  "scopeEndpointsWithTags": true
}
```

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

| Name                        | Type    | Schematics | Description                                                                                                              |
|-----------------------------|---------|------------|--------------------------------------------------------------------------------------------------------------------------|
| `swaggerSchemaUrl`          | string  | api, types | URL of the Swagger/OpenAPI schema (required)                                                                             |
| `path`                      | string  | api, types | Path where generated files will be created, relative to the workspace root                                               |
| `baseApiServicesPath`       | string  | api        | Path for base API files (if not specified, `path` will be used)                                                          |
| `project`                   | string  | types      | Generate in a specific Angular CLI workspace project                                                                     |
| `apiPathKey`                | string  | api        | Filter API paths by a specific key/prefix                                                                                |
| `apiServiceTemplatePath`    | string  | api        | Custom template path for API service generation                                                                          |
| `apiCrudServiceTemplatePath`| string  | api        | Custom template path for CRUD API service generation                                                                     |
| `framework`                 | string  | api        | Target framework: `"angular"` (default) or `"react-rtk"`                                                                 |
| `rtkBaseApiPath`            | string  | api        | Import path for RTK base API (e.g., `"@/store/api/baseApi"`). Required for `react-rtk` framework                         |
| `scopeEndpointsWithTags`    | boolean | api        | Prefix endpoint names with tag name (e.g., `claimGetById` instead of `getById`). Recommended for multi-controller APIs   |
| `typeMapping`               | object  | api, types | Map custom backend types to TypeScript primitives (e.g., `{ "SuperDuperInt32": "number" }`)                              |


## CLI Options

| Name             | Type   | Description                                                     |
|------------------|--------|-----------------------------------------------------------------|
| `usePredictions` | string | Analyze method summary and try to predict method name or prefix |
| `path`           | string | Path to folder where to generate files                          |
