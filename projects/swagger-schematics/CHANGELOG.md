# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [1.0.0-alpha.12] - 2026-01-09

### Added
- Configuration file support via `openapi-schematics.json` in project root
- New configuration options:
  - `swaggerSchemaUrl` - URL of the Swagger/OpenAPI schema
  - `path` - output path for generated files
  - `baseApiServicesPath` - separate path for base API files
  - `project` - Angular CLI workspace project name
  - `apiPathKey` - filter API paths by prefix
  - `apiServiceTemplatePath` - custom template for API services
  - `apiCrudServiceTemplatePath` - custom template for CRUD services

### Changed
- Updated README with comprehensive documentation for configuration options
- CLI arguments now override config file values

### Dependencies
- Updated @angular-devkit packages to 19.2.15
- Updated axios to 1.10.0
