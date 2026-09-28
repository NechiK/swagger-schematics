import { HostCreateTree, SchematicsException, Source } from '@angular-devkit/schematics';
import { normalize, virtualFs } from '@angular-devkit/core';
import { NodeJsSyncHost } from '@angular-devkit/core/node';
import { existsSync, readdirSync, statSync } from 'fs';
import * as path from 'path';

/**
 * Resolves a custom template directory option (`apiServiceTemplatePath`, `baseApiTemplatePath`)
 * from the project root (the working directory), like `swaggerSchemaUrl` and `templateHelpersPath`.
 * The devkit's `url()` resolves a relative path from this package's own `api/` folder instead,
 * and renders nothing for a folder that doesn't exist.
 *
 * Throws when the directory doesn't exist or holds no `.template` file, so a wrong path stops
 * the run instead of generating nothing (which would delete the services of the previous run).
 */
export function resolveTemplateDir(optionName: string, templatePath: string): string {
    const absolutePath = path.resolve(process.cwd(), templatePath);
    if (!existsSync(absolutePath) || !statSync(absolutePath).isDirectory()) {
        throw new SchematicsException(`${optionName}: template directory '${absolutePath}' not found. ` +
            `Relative paths are resolved from the project root ('${process.cwd()}').`);
    }

    const hasTemplate = readdirSync(absolutePath, { encoding: 'utf8', recursive: true })
        .some(entry => entry.endsWith('.template'));
    if (!hasTemplate) {
        throw new SchematicsException(`${optionName}: '${absolutePath}' contains no .template files. ` +
            `Point it to the folder that holds the templates, e.g. a copy of one of the folders in ` +
            `node_modules/swagger-schematics/api/templates.`);
    }

    return absolutePath;
}

/**
 * Template source for a directory on disk, given as an absolute path: what `url()` builds for
 * its own templates, without resolving the path against this package.
 */
export function templateDirSource(absolutePath: string): Source {
    return () => new HostCreateTree(new virtualFs.ScopedHost(new NodeJsSyncHost(), normalize(absolutePath)));
}
