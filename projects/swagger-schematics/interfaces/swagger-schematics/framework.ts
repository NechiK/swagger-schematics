/**
 * Supported framework types for API generation
 */
export type TFrameworkType = 'angular' | 'react-rtk';

/**
 * Framework-specific configuration options
 */
export interface IFrameworkConfig {
    /** The framework type */
    type: TFrameworkType;
    /** Display name for the framework */
    displayName: string;
    /** Default template paths for this framework */
    templates: {
        apiService: string;
        baseApi: string;
    };
    /** File extension for generated files */
    fileExtension: string;
    /** Whether the framework uses injectable services */
    usesInjectable: boolean;
}

/**
 * Framework configurations
 */
export const FRAMEWORK_CONFIGS: Record<TFrameworkType, IFrameworkConfig> = {
    angular: {
        type: 'angular',
        displayName: 'Angular',
        templates: {
            apiService: './templates/angular/api-service',
            baseApi: './templates/angular/base-api',
        },
        fileExtension: '.service.ts',
        usesInjectable: true,
    },
    'react-rtk': {
        type: 'react-rtk',
        displayName: 'React RTK Query',
        templates: {
            apiService: './templates/react-rtk/api',
            baseApi: './templates/react-rtk/base-api',
        },
        fileExtension: '.api.ts',
        usesInjectable: false,
    },
};

/**
 * Get framework config by type
 */
export function getFrameworkConfig(type: TFrameworkType): IFrameworkConfig {
    const config = FRAMEWORK_CONFIGS[type];
    if (!config) {
        throw new Error(`Unknown framework type: ${type}. Supported: ${Object.keys(FRAMEWORK_CONFIGS).join(', ')}`);
    }
    return config;
}

/**
 * Check if a framework type is valid
 */
export function isValidFrameworkType(type: string): type is TFrameworkType {
    return type in FRAMEWORK_CONFIGS;
}

/**
 * Validates a configured `framework` and returns it typed. Required with no
 * default: an Angular fallback would silently emit Angular services into a
 * React project. Callers use this instead of schema.json 'required'/'enum',
 * because schema validation runs before openapi-schematics.json is merged in
 * and never sees its values.
 */
export function resolveFramework(framework: unknown): TFrameworkType {
    const supported = Object.keys(FRAMEWORK_CONFIGS).map(name => `'${name}'`).join(' or ');
    if (!framework) {
        throw new Error(`Framework is not defined in the configuration. Please set 'framework' to ${supported}.`);
    }
    if (typeof framework !== 'string' || !Object.prototype.hasOwnProperty.call(FRAMEWORK_CONFIGS, framework)) {
        throw new Error(`Framework '${String(framework)}' is not supported. Please set 'framework' to ${supported}.`);
    }
    return framework as TFrameworkType;
}
