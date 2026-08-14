import * as path from 'path';
import { readFileSync } from 'fs';
import { parseConfigFileTextToJson } from 'typescript';
import { Tree } from '@angular-devkit/schematics';

export interface TsConfigResult {
  baseUrl: string;
  paths: Record<string, string[]>;
}

/**
 * Read file content from tree or filesystem
 */
function readFileContent(filePath: string, tree?: Tree): string {
  if (tree) {
    const treeContent = tree.read(filePath);
    if (treeContent) {
      return treeContent.toString();
    }
  }
  return readFileSync(filePath, 'utf-8');
}

/** The subset of a parsed tsconfig this helper reads. */
interface IParsedTsConfig {
  extends?: string;
  compilerOptions?: {
    baseUrl?: string;
    paths?: Record<string, string[]>;
  };
}

/**
 * Parse tsconfig JSON content with error handling
 */
function parseTsConfig(filePath: string, content: string): IParsedTsConfig {
  const result = parseConfigFileTextToJson(filePath, content);
  
  if (result.error) {
    const errorMessage = result.error.messageText;
    const message = typeof errorMessage === 'string' 
      ? errorMessage 
      : errorMessage.messageText;
    throw new Error(`Invalid tsconfig at '${filePath}': ${message}`);
  }
  
  if (!result.config) {
    throw new Error(`Failed to parse tsconfig at '${filePath}': No configuration found`);
  }
  
  return result.config;
}

/**
 * Load tsconfig.json and parse path aliases
 * @param tsConfigPath - Path to tsconfig.json
 * @param tree - Optional schematic tree for reading from virtual filesystem
 */
export function loadTsConfig(tsConfigPath: string, tree?: Tree): TsConfigResult {
  const configFileContent = readFileContent(tsConfigPath, tree);
  let configJson = parseTsConfig(tsConfigPath, configFileContent);

  if (configJson.extends) {
    const extendsPath = path.resolve(path.dirname(tsConfigPath), configJson.extends);
    const extendsConfigContent = readFileContent(extendsPath, tree);
    const extendsConfigJson = parseTsConfig(extendsPath, extendsConfigContent);
    
    // Deep merge compilerOptions to preserve options from both configs
    configJson = {
      ...extendsConfigJson,
      ...configJson,
      compilerOptions: {
        ...extendsConfigJson.compilerOptions,
        ...configJson.compilerOptions,
      },
    };
  }

  return {
    baseUrl: path.resolve(path.dirname(tsConfigPath), configJson.compilerOptions?.baseUrl || '.'),
    paths: configJson.compilerOptions?.paths || {},
  };
}

/**
 * Resolve file path to alias path if possible
 * @param filePath - The file path to resolve (e.g., "src/stores/test-user/slice")
 * @param paths - Path mappings from tsconfig (e.g., { "@/*": ["src/*"] })
 * @returns Alias path if matched, null otherwise
 */
export function resolvePathToAlias(filePath: string, paths: Record<string, string[]>): string | null {
  for (const [aliasPattern, targetPaths] of Object.entries(paths)) {
    // Iterate through all target paths (tsconfig supports multiple fallback paths)
    for (const targetPath of targetPaths) {
      // Get the target directory (e.g., "src/*" -> "src/")
      const targetPrefix = targetPath.replace('*', '');
      
      // Check if the file path starts with the target prefix
      if (filePath.startsWith(targetPrefix)) {
        // Replace the target prefix with the alias (e.g., "src/stores/..." -> "@/stores/...")
        const aliasPrefix = aliasPattern.replace('*', '');
        return aliasPrefix + filePath.substring(targetPrefix.length);
      }
    }
  }

  return null;
}

/**
 * Normalize a path by removing leading slash
 */
export function normalizePath(filePath: string): string {
  return filePath.startsWith('/') ? filePath.substring(1) : filePath;
}
