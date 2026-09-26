import { IApiChange } from './api-diff';

export interface IFileCounts {
    created: number;
    updated: number;
    deleted: number;
}

/**
 * Azure DevOps rejects pull request descriptions over 4000 characters, the
 * tightest limit among the usual hosts. The markdown report stays under it so
 * a pipeline can pass the file straight through as the description.
 */
export const MAX_REPORT_LENGTH = 4000;

function countLine(changes: IApiChange[]): string {
    const breaking = changes.filter(change => change.severity === 'breaking').length;
    const added = changes.length - breaking;
    return `${breaking} breaking, ${added} added`;
}

function filesLine(files: IFileCounts): string {
    return `Files: ${files.created} created, ${files.updated} updated, ${files.deleted} deleted`;
}

/**
 * Plain-text summary for the CLI output. `changes` is null when there is no
 * previous snapshot to compare against.
 */
export function formatConsoleSummary(changes: IApiChange[] | null): string[] {
    if (changes === null) {
        return [];
    }
    if (!changes.length) {
        return ['API changes since the last snapshot: none'];
    }

    const kindWidth = Math.max(...changes.map(change => change.kind.length));
    return [
        `API changes since the last snapshot: ${countLine(changes)}`,
        ...changes.map(change => {
            const marker = change.severity === 'breaking' ? '⚠' : '+';
            const detail = [change.ref, change.from !== undefined ? `${change.from} → ${change.to}` : undefined]
                .filter(part => !!part)
                .join('  ');
            return `  ${marker} ${change.kind.padEnd(kindWidth)}  ${change.subject}${detail ? `  ${detail}` : ''}`;
        })
    ];
}

function markdownLine(change: IApiChange): string {
    const ref = change.ref ? ` (\`${change.ref}\`)` : '';
    const fromTo = change.from !== undefined ? `: \`${change.from}\` → \`${change.to}\`` : '';
    return `- ${change.kind}: \`${change.subject}\`${ref}${fromTo}`;
}

/**
 * Markdown report for a pull request description, cut to `maxLength` with a
 * "...and N more" line when the change list is long.
 */
export function formatMarkdownReport(
    changes: IApiChange[] | null,
    files: IFileCounts,
    maxLength = MAX_REPORT_LENGTH,
    snapshotConfigured = true
): string {
    const footer = `\n_${filesLine(files)}_\n`;

    if (changes === null) {
        return snapshotConfigured
            ? `## API changes\n\nNo previous schema snapshot to compare against, so the changes can't be listed yet. ` +
                `This run saved one; the next run lists what changed.\n${footer}`
            : `## API changes\n\nSet \`schemaSnapshotPath\` to list API changes; without a schema snapshot this report only counts files.\n${footer}`;
    }
    if (!changes.length) {
        return `## API changes: none\n\nNothing in the schema changed the generated types or endpoints.\n${footer}`;
    }

    const sections: Array<[string, IApiChange[]]> = [
        ['### ⚠️ Breaking', changes.filter(change => change.severity === 'breaking')],
        ['### ✨ Added', changes.filter(change => change.severity === 'added')]
    ];

    let body = `## API changes: ${countLine(changes)}\n`;
    let omitted = 0;
    // Room for the footer and the "...and N more" line (sized for the largest count possible here)
    const budget = maxLength - footer.length - omittedLine(changes.length).length;

    sections.forEach(([heading, sectionChanges]) => {
        if (!sectionChanges.length) {
            return;
        }
        const headingText = `\n${heading}\n`;
        if (omitted || body.length + headingText.length > budget) {
            omitted += sectionChanges.length;
            return;
        }
        body += headingText;
        sectionChanges.forEach(change => {
            const line = `${markdownLine(change)}\n`;
            if (omitted || body.length + line.length > budget) {
                omitted++;
            } else {
                body += line;
            }
        });
    });

    if (omitted) {
        body += omittedLine(omitted);
    }
    return body + footer;
}

function omittedLine(omitted: number): string {
    return `\n_...and ${omitted} more change${omitted === 1 ? '' : 's'} (run the generator locally to see all of them)._\n`;
}
