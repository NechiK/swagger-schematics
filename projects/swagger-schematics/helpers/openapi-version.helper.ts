export type TOpenApiVersionFamily = '2.0' | '3.0' | '3.1' | 'unknown';

export interface IOpenApiVersionInfo {
    /** The raw version string from the document (openapi or swagger field) */
    raw?: string;
    /** The version family the document is treated as */
    family: TOpenApiVersionFamily;
    /** Whether this version is officially supported by the schematics */
    supported: boolean;
    /** Human-readable warning to log when the version is not fully supported */
    warning?: string;
}

/**
 * Detects the OpenAPI version of a schema document.
 * Never throws: unknown or unsupported versions come back with a warning,
 * and generation is expected to continue best-effort.
 */
export function detectOpenApiVersion(schema: { openapi?: string; swagger?: string }): IOpenApiVersionInfo {
    const openapi = typeof schema.openapi === 'string' ? schema.openapi.trim() : undefined;
    const swagger = typeof schema.swagger === 'string' ? schema.swagger.trim() : undefined;

    if (openapi) {
        if (/^3\.0(\.|$)/.test(openapi)) {
            return { raw: openapi, family: '3.0', supported: true };
        }
        if (/^3\.1(\.|$)/.test(openapi)) {
            return { raw: openapi, family: '3.1', supported: true };
        }
        if (/^3\./.test(openapi)) {
            return {
                raw: openapi,
                family: '3.1',
                supported: false,
                warning: `OpenAPI ${openapi} is not officially supported yet - treating the document as OpenAPI 3.1. Generation will continue, but please verify the output.`
            };
        }
        return {
            raw: openapi,
            family: 'unknown',
            supported: false,
            warning: `Unrecognized OpenAPI version '${openapi}' - assuming OpenAPI 3.0. Generation will continue, but please verify the output.`
        };
    }

    if (swagger) {
        return {
            raw: swagger,
            family: '2.0',
            supported: false,
            warning: `Swagger ${swagger} is not supported (schemas under 'definitions' are not read) - attempting best-effort generation. Please migrate the document to OpenAPI 3.x.`
        };
    }

    return {
        family: 'unknown',
        supported: false,
        warning: `Could not detect the OpenAPI version (no 'openapi' or 'swagger' field) - assuming OpenAPI 3.0. Generation will continue, but please verify the output.`
    };
}
