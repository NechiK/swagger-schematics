import * as fs from 'fs';

const openApiConfigFilePath = 'openapi-schematics.json';

type swaggerSchemaKeys = keyof SwaggerApiSchema;

/** Default configuration values */
const DEFAULT_CONFIG: Partial<SwaggerApiSchema> = {
    framework: 'angular',
    scopeEndpointsWithTags: false,
};

export const getOpenapiSchematicsConfig = (options: SwaggerApiSchema): SwaggerApiSchema => {
    const optionKeys = Object.keys(options) as swaggerSchemaKeys[];
    const filteredOptions = optionKeys.reduce((acc, key) => {
        if (options[key] !== undefined && options[key] !== null) {
            (acc as Record<string, unknown>)[key] = options[key];
        }
        return acc;
    }, {} as SwaggerApiSchema);

    const config = fs.existsSync(openApiConfigFilePath) ? fs.readFileSync(openApiConfigFilePath, 'utf-8') : '{}';
    
    const openApiSchematicsConfig: SwaggerApiSchema = {
        ...DEFAULT_CONFIG,
        ...JSON.parse(config),
        ...filteredOptions
    };
    
    if (!openApiSchematicsConfig.swaggerSchemaUrl) {
        throw new Error(`Swagger schema URL wasn't provided`);
    }

    // Validate RTK-specific requirements
    if (openApiSchematicsConfig.framework === 'react-rtk' && !openApiSchematicsConfig.rtkBaseApiPath) {
        throw new Error(`RTK base API path (rtkBaseApiPath) is required when using react-rtk framework`);
    }
    
    // Normalize path to be absolute within the virtual tree
    let path = openApiSchematicsConfig.path || '';
    // Remove leading ./ if present
    if (path.startsWith('./')) {
        path = path.slice(2);
    }
    // Ensure path starts with /
    if (path && !path.startsWith('/')) {
        path = '/' + path;
    }
    openApiSchematicsConfig.path = path;
    
    return openApiSchematicsConfig;
};