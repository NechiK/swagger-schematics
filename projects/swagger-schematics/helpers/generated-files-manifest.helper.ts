import { join, normalize, Path, relative } from '@angular-devkit/core';
import { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';

/**
 * Lives in the output `path` and lists, per schematic, the files the previous
 * run generated. It is what makes stale-file removal safe: only a file this
 * package wrote itself is ever deleted, never a hand-written file that
 * happens to sit in the same directory.
 */
export const MANIFEST_FILE_NAME = '.swagger-schematics-manifest.json';

const MANIFEST_NOTE = 'Maintained by swagger-schematics: the files it generated, so the ones for schemas/endpoints ' +
    'removed from the API are deleted on the next run. Commit this file; do not edit it by hand.';

export type TManifestSection = 'types' | 'api';

type TManifest = Partial<Record<TManifestSection, string[]>>;

/** A directory the schematic owns and the file suffixes it generates there. */
export interface IOwnedFilePattern {
    dir: string;
    suffixes: string[];
    /** Files in `dir` that match a suffix but are never generated output (e.g. the base API file). */
    exclude?: string[];
}

export interface IStaleFilesOptions {
    section: TManifestSection;
    /** The schematic's output `path` (the manifest lives here). */
    outputPath: string;
    /** Every file this run generated, filled in by `recordGeneratedFiles`. */
    generatedFiles: Set<string>;
    /** `removeStaleFiles` option: false keeps stale files and only reports them. */
    remove: boolean;
    /**
     * The run generating nothing is intended (the document has content, but options such as
     * API filters left nothing to generate), so stale files are removed as usual instead of
     * being kept by the empty-schema safety net.
     */
    emptyIsIntended?: boolean;
    /** Replaces "Check that the schema source is correct." when the safety net keeps the files. */
    emptyHint?: string;
    /**
     * Where this schematic's files usually live. Used only on the first run
     * (no manifest yet) to point at probable leftovers - they are listed, never deleted.
     */
    ownedFilePatterns: IOwnedFilePattern[];
}

/**
 * Rule for a template source's `apply()` chain, placed after `move()`: adds
 * every file the source produced to `target`, so the manifest records exactly
 * what the templates emitted (custom templates included).
 */
export function recordGeneratedFiles(target: Set<string>): Rule {
    return (tree: Tree) => {
        tree.visit(filePath => {
            target.add(filePath);
        });
        return tree;
    };
}

function readManifest(tree: Tree, manifestPath: Path, context: SchematicContext): TManifest | null {
    const buffer = tree.read(manifestPath);
    if (!buffer) {
        return null;
    }

    try {
        const parsed = JSON.parse(buffer.toString()) as Record<string, unknown>;
        const manifest: TManifest = {};
        (['types', 'api'] as TManifestSection[]).forEach(section => {
            const entries = parsed[section];
            if (Array.isArray(entries)) {
                manifest[section] = entries.filter((entry): entry is string => typeof entry === 'string');
            }
        });
        return manifest;
    } catch (error) {
        context.logger.warn(`${manifestPath} is not valid JSON (${(error as Error).message}); ` +
            `no stale files are removed this run and the file is rewritten.`);
        return {};
    }
}

function serializeManifest(manifest: TManifest): string {
    const content: Record<string, unknown> = { '//': MANIFEST_NOTE };
    (['api', 'types'] as TManifestSection[]).forEach(section => {
        if (manifest[section]) {
            content[section] = manifest[section];
        }
    });
    return JSON.stringify(content, null, 2) + '\n';
}

/**
 * Manifest entries are relative to the output directory. An entry that
 * escapes it (absolute, or containing '..') is ignored rather than trusted.
 */
function isInsideOutputDir(entry: string): boolean {
    return !entry.startsWith('/') && !entry.split('/').includes('..');
}

function findProbableLeftovers(tree: Tree, patterns: IOwnedFilePattern[], generated: Set<string>): string[] {
    return patterns.flatMap(({ dir, suffixes, exclude = [] }) => {
        const dirPath = normalize(dir);
        const excluded = new Set(exclude.map(filePath => normalize('/' + filePath) as string));
        return tree.getDir(dirPath).subfiles
            .filter(fileName => suffixes.some(suffix => fileName.endsWith(suffix)))
            .map(fileName => join(dirPath, fileName) as string)
            .filter(filePath => !generated.has(filePath) && !excluded.has(filePath));
    }).sort();
}

/**
 * Deletes the files the previous run of this schematic generated that this run
 * did not (their schema or endpoint group was removed from the API, or an option such as
 * an API filter no longer generates it), then
 * records this run's files in the manifest.
 *
 * Safety nets:
 * - only files listed in the manifest are candidates, so hand-written files are never touched;
 * - a run that generated nothing at all (an empty or broken schema) removes nothing, unless
 *   `emptyIsIntended` says the options chose that (e.g. API filters that exclude every API);
 * - on the first run there is no manifest, so nothing is removed - probable
 *   leftovers from earlier versions are listed for manual cleanup instead.
 */
export function createStaleFilesRule(options: IStaleFilesOptions): Rule {
    return (tree: Tree, context: SchematicContext) => {
        const outputDir = normalize(options.outputPath || '/');
        const manifestPath = join(outputDir, MANIFEST_FILE_NAME);
        const previous = readManifest(tree, manifestPath, context);
        const toEntry = (filePath: string): string => relative(outputDir, normalize(filePath));

        const current = Array.from(options.generatedFiles)
            .map(toEntry)
            .filter(isInsideOutputDir);
        const currentSet = new Set(current);
        // Types and api share one manifest per path: a section is on its first
        // run when the manifest does not have it yet, even if the file exists.
        const previousEntries = previous?.[options.section];
        let next = current;

        if (previousEntries === undefined) {
            const leftovers = findProbableLeftovers(tree, options.ownedFilePatterns, options.generatedFiles);
            if (leftovers.length) {
                context.logger.warn(`${options.section}: ${MANIFEST_FILE_NAME} does not list these files yet, so none were removed. ` +
                    `They were not generated from the current schema and look like leftovers from earlier runs - ` +
                    `delete them if they are generated:\n${leftovers.map(file => `  ${file}`).join('\n')}`);
            }
        } else {
            const stale = previousEntries
                .filter(entry => !currentSet.has(entry) && isInsideOutputDir(entry))
                .filter(entry => tree.exists(join(outputDir, entry)));

            if (stale.length && !current.length && !options.emptyIsIntended) {
                context.logger.warn(`${options.section}: the schema produced no files, so the ${stale.length} ` +
                    `previously generated file(s) were kept. ${options.emptyHint ?? 'Check that the schema source is correct.'}`);
                next = previousEntries;
            } else if (stale.length && options.remove) {
                stale.forEach(entry => {
                    tree.delete(join(outputDir, entry));
                    context.logger.info(`${options.section}: ${join(outputDir, entry)} is no longer generated, deleting it`);
                });
            } else if (stale.length) {
                context.logger.warn(`${options.section}: removeStaleFiles is off, keeping files that are no longer ` +
                    `generated:\n${stale.map(entry => `  ${join(outputDir, entry)}`).join('\n')}`);
                // Keep tracking them so a later run with removal on still cleans them up
                next = [...current, ...stale];
            }
        }

        const nextEntries = Array.from(new Set(next)).sort();
        if (previousEntries === undefined && !nextEntries.length) {
            return;
        }

        const content = serializeManifest({ ...previous, [options.section]: nextEntries });
        const existing = tree.read(manifestPath);
        if (!existing) {
            tree.create(manifestPath, content);
        } else if (existing.toString() !== content) {
            tree.overwrite(manifestPath, content);
        }
    };
}
