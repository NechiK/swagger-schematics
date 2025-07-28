## How to debug?

1. Run `npm i`
2. Create file `openapi-schematics.json` file in root folder
```
{
    "swaggerSchemaUrl": "YOUR_OPENAPI_JSON_URL",
    "path": "/test/openapi",
    "baseApiServicesPath": "/test/openapi",
    "framework": "angular" // or "react-redux"
}
```
3. Run `npm publish:debug`
4. Run `npm i .\projects\swagger-schematics\swagger-schematics-1.0.0-alpha.11.tgz`.
5. Run `npx schematics swagger-schematics:api`
6. Repeat step 3-5 after any code changes
7. Cleanup `package.json` file before committing
