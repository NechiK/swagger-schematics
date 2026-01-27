# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [1.0.0-alpha.20] - 2026-01-27

### ✨ Added
- `isNullable()` helper function that resolves `$ref` to check nullability of referenced schemas
- **React RTK Query support** - New framework option to generate RTK Query API slices
- `framework` config option to select between `angular` and `react-rtk`
- `scopeEndpointsWithTags` option for RTK to prefix endpoint names with tag (e.g., `claimGetById`)
- `typeMapping` option to map custom backend types to TypeScript primitives or other schemas (e.g., `{ "Guid": "string", "NullableOfDistributionType": "DistributionType" }`). When mapping to another schema, `nullable` from the original type is preserved
- RTK base API template generation with skip-if-exists logic
- `baseApiPath` config option for customizing base API file location
- tsconfig path alias resolution for RTK base API imports
- New `IParsedApiItem` properties for templates:
  - `scopedApiMethodName` - Method name prefixed with tag
  - `apiMethodParamNames` - Array of parameter names for destructuring
  - `apiMethodRequestType` - Combined request type for all parameters
  - `isQuery` - Boolean for GET/HEAD vs mutation methods
  - `httpMethod` - Uppercase HTTP method
  - `apiUrlFormatted` - URL with proper quoting
  - `queryParamsFormatted` - Pre-formatted query params string
  - `bodyFormatted` - Body parameter name
- 📚 Custom templates documentation in README with complete variable reference
- `loadFixture()` and `loadJsonFixture()` test helpers
- New test file `types-schematics.spec.ts` with snapshots for types generation
- Tests for primitive wrapper type inlining

### 🐛 Fixed
- Primitive wrapper types (e.g., `NullableOfDistributionType: { type: "integer", nullable: true }`) are now inlined as `number | null` instead of generating a non-existent interface
- `$ref` pointing to object/enum schemas with `nullable: true` now correctly generates `IType | null` or `TType | null`
- Property optionality (`?`) now works for `$ref` pointing to nullable schemas (previously only worked for inline schemas)

### ♻️ Changed
- ⚠️ **BREAKING**: `framework` config option is now required (no default value)
- Renamed `crud-api` template folders to `base-api` for both Angular and RTK
- Simplified Angular API service template using `buildAngularHttpCallArgs` helper
- Enhanced Swagger schema transformation with new request type and parameter handling
- Refactored `api/index.ts` - moved helpers to separate files:
  - `angular-template.helper.ts` - Angular-specific template helpers
  - `import-path.helper.ts` - Import path resolution helpers
  - `base-api-rules.ts` - Base API generation rules
- Renamed test options: `DEFAULT_SCHEMATIC_OPTIONS` → `ANGULAR_SCHEMATIC_OPTIONS`
- Renamed `schematics.spec.ts` → `angular-schematics.spec.ts` for consistency
- Test fixtures now loaded from JSON files instead of hardcoded constants
- Improved utility functions for formatting API URLs and parameters

### 🗑️ Removed
- `rtkBaseApiPath` config option (replaced by `baseApiPath`)
- Default value for `framework` config option
- Old template helper functions and snapshot tests for API methods

### 📦 Dependencies
- Updated @angular-devkit packages to 20.3.14
- Updated axios to 1.13.2
- Updated editorconfig to 3.0.1
- Updated @types/node to 18.19.130
- Updated fs-extra to 11.3.3
- Updated typescript to 5.9.3


## [1.0.0-alpha.14] - 2026-01-12

### 🐛 Fixed
- DELETE method query params are now correctly placed as second argument (options object) instead of third
- Added proper `delete` case handler for API method name generation (was falling through to default with warning)
- Extended GET request name parsing to handle `/api/Model/subresource` and `/api/Model/subresource/{param}` patterns
- Build no longer fails due to test files - excluded `__tests__` from `tsconfig.schematics.json`
- Removed overly strict `"format": "path"` validation from schema.json files
- Path normalization now properly handles relative paths for schematic execution

### ✨ Added
- New test fixtures and cases for DELETE operations:
  - DELETE by ID (no body)
  - DELETE with query params (verifies params as second arg)
- `parseDeleteRequestName` function for proper DELETE method naming

### ♻️ Changed
- Path segments are now properly capitalized in default method name generation

## [1.0.0-alpha.13] - 2026-01-09

### 🐛 Fixed
- Enum types used in API parameters are now properly imported in generated services
- Object destructuring in method parameters now uses commas instead of semicolons (`{ id, status }` instead of `{ id;status }`)
- PUT/POST methods with path parameters but no separate path param definition now correctly use `body.paramName` in the URL (e.g., `${body.id}` instead of `${id}`)

### ♻️ Changed
- Migrated test framework from Jasmine to Jest
- Parameter schema interface now supports `$ref` types (aligned with OpenAPI spec)

### ✨ Added
- New test cases for enum parameter imports and multiple query parameters

## [1.0.0-alpha.12] - 2026-01-09

### ✨ Added
- Configuration file support via `openapi-schematics.json` in project root
- New configuration options:
  - `swaggerSchemaUrl` - URL of the Swagger/OpenAPI schema
  - `path` - output path for generated files
  - `baseApiServicesPath` - separate path for base API files
  - `project` - Angular CLI workspace project name
  - `apiPathKey` - filter API paths by prefix
  - `apiServiceTemplatePath` - custom template for API services
  - `apiCrudServiceTemplatePath` - custom template for CRUD services

### ♻️ Changed
- Updated README with comprehensive documentation for configuration options
- CLI arguments now override config file values

### 📦 Dependencies
- Updated @angular-devkit packages to 19.2.15
- Updated axios to 1.10.0
