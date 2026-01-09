# Swagger Schematics

Generate TS types and API via swagger scheme using Schematics.

Currently, it supports only Angular 14+.
Going to support React templates soon.


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

### Example configuration

```json
{
  "swaggerSchemaUrl": "https://api.example.com/swagger/v1/swagger.json",
  "path": "/src/app/core",
  "baseApiServicesPath": "/src/app/core/api",
  "project": "my-angular-app"
}
```

### Available options

| Name                       | Type   | Schematics   | Description                                                                              |
|----------------------------|--------|--------------|------------------------------------------------------------------------------------------|
| `swaggerSchemaUrl`         | string | api, types   | URL of the Swagger/OpenAPI schema (required)                                             |
| `path`                     | string | api, types   | Path where generated files will be created, relative to the workspace root              |
| `baseApiServicesPath`      | string | api          | Path for base API files (if not specified, `path` will be used)                          |
| `project`                  | string | types        | Generate in a specific Angular CLI workspace project                                     |
| `apiPathKey`               | string | api          | Filter API paths by a specific key/prefix                                                |
| `apiServiceTemplatePath`   | string | api          | Custom template path for API service generation                                          |
| `apiCrudServiceTemplatePath` | string | api        | Custom template path for CRUD API service generation                                     |


## CLI Options

| Name             | Type   | Description                                                     |
|------------------|--------|-----------------------------------------------------------------|
| `usePredictions` | string | Analyze method summary and try to predict method name or prefix |
| `path`           | string | Path to folder where to generate files                          |
