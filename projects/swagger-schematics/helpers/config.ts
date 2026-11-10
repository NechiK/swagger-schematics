import * as fs from 'fs';
import { SwaggerApiSchema } from '../api/schema';

const openApiConfigFilePath = 'openapi-schematics.json';

type swaggerSchemaKeys = keyof SwaggerApiSchema;

/** Default configuration values */
const DEFAULT_CONFIG: Partial<SwaggerApiSchema> = {
    scopeEndpointsWithTags: false,
    eslintFix: false,
    legacyOptionalProperties: false,
    removeStaleFiles: true,
    rtkCacheTags: false,
    excludeDeprecated: false,
};

/** The settings in openapi-schematics.json, or none when the project has no config file. */
export const readOpenapiSchematicsConfigFile = (): Partial<SwaggerApiSchema> => {
    const config = fs.existsSync(openApiConfigFilePath) ? fs.readFileSync(openApiConfigFilePath, 'utf-8') : '{}';

    try {
        return JSON.parse(config);
    } catch (error) {
        throw new Error(`Failed to parse '${openApiConfigFilePath}' as JSON: ${(error as Error).message}`);
    }
};

export const getOpenapiSchematicsConfig = (options: SwaggerApiSchema): SwaggerApiSchema => {
    const optionKeys = Object.keys(options) as swaggerSchemaKeys[];
    const filteredOptions = optionKeys.reduce((acc, key) => {
        if (options[key] !== undefined && options[key] !== null) {
            (acc as Record<string, unknown>)[key] = options[key];
        }
        return acc;
    }, {} as SwaggerApiSchema);

    const parsedConfigFile = readOpenapiSchematicsConfigFile();

    const openApiSchematicsConfig: SwaggerApiSchema = {
        ...DEFAULT_CONFIG,
        ...parsedConfigFile,
        ...filteredOptions
    };
    
    if (!openApiSchematicsConfig.swaggerSchemaUrl) {
        throw new Error(`Swagger schema URL wasn't provided`);
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