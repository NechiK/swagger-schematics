# Swagger Schematics

Generate TS types and API via swagger scheme using Schematics.

Currently, it supports only Angular 14+.
Going to support React templates soon.

Documentation in progress...


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
schematics swagger-schematics:types https://api-dev.tsi.trailheadtechnology.com/swagger/v1/swagger.json --path=/src/app/core
schematics swagger-schematics:types https://apidev.montagefs.com/swagger/v1/swagger.json --path=/src/app/core
3. Enjoy!


## Docs

### Config

File: `openapi-schematics.json`

| Property         | Type | Description                                                    |
|------------------| --- |-----------------------------------------------------------------|
| `swaggerSchemaUrl` | string | OpenAPI JSON URL |
| `framework` | angular, react-redux | Framework templates |
| `path`           | string | Path to folder where to generate files |
| `baseApiServicesPath` | string | Path to folder where to generate base api services |


### Options

| Name             | Type | Description                                                     |
|------------------| --- |-----------------------------------------------------------------|
| `usePredictions` | string | Analyze method summary and try to predict method name or prefix |
| `path`           | string | Path to folder where to generate files                          |
