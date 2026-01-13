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

Create an `openapi-schematics.json` file in your project root:

### Angular

```json
{
  "swaggerSchemaUrl": "https://api.example.com/swagger/v1/swagger.json",
  "path": "/src/app/core",
  "framework": "angular"
}
```

### React RTK Query

```json
{
  "swaggerSchemaUrl": "https://api.example.com/swagger/v1/swagger.json",
  "path": "/src/store/api",
  "framework": "react-rtk",
  "rtkBaseApiPath": "@/store/api/baseApi",
  "scopeEndpointsWithTags": true
}
```

### Type Mapping

Map custom backend types to TypeScript primitives:

```json
{
  "typeMapping": {
    "SuperDuperInt32": "number",
    "CustomGuid": "string"
  }
}
```


## Options

| Name                     | Type    | Description                                                                              |
|--------------------------|---------|------------------------------------------------------------------------------------------|
| `swaggerSchemaUrl`       | string  | URL of the Swagger/OpenAPI schema                                                        |
| `path`                   | string  | Path where generated files will be created                                               |
| `framework`              | string  | Target framework: `"angular"` or `"react-rtk"`                                           |
| `rtkBaseApiPath`         | string  | Import path for RTK base API (required for `react-rtk`)                                  |
| `scopeEndpointsWithTags` | boolean | Prefix endpoint names with tag name                                                      |
| `typeMapping`            | object  | Map custom types to primitives (e.g., `{ "CustomInt": "number" }`)                       |

See [projects/swagger-schematics/README.md](projects/swagger-schematics/README.md) for full documentation.
