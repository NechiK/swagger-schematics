import * as fs from 'fs';

const openApiConfigFilePath = 'openapi-schematics.json';

type swaggerSchemaKeys = keyof SwaggerApiSchema;

export const getOpenapiSchematicsConfig = (options: SwaggerApiSchema): SwaggerApiSchema => {
    const optionKeys = Object.keys(options) as swaggerSchemaKeys[];
    const filteredOptions = optionKeys.reduce((acc, key) => {
        if (options[key] !== undefined && options[key] !== null) {
            acc[key] = options[key];
        }
        return acc;
    }, {} as SwaggerApiSchema);

    const config = fs.existsSync(openApiConfigFilePath) ? fs.readFileSync(openApiConfigFilePath, 'utf-8') : '{}';
    
    const openApiSchematicsConfig: SwaggerApiSchema = {
        ...JSON.parse(config),
        ...filteredOptions
    };
    
    if (!openApiSchematicsConfig.swaggerSchemaUrl) {
        throw new Error(`Swagger schema URL wasn't provided`);
    }
    
    openApiSchematicsConfig.path = openApiSchematicsConfig.path || '';
    
    return openApiSchematicsConfig;
};