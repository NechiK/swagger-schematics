import { codeSpan, formatConsoleSummary, formatMarkdownReport, MAX_REPORT_LENGTH } from '@lib/helpers/api-changes/format';
import { IApiChange } from '@lib/helpers/api-changes/api-diff';

const FILES = { created: 1, updated: 3, deleted: 1 };
const CHANGES: IApiChange[] = [
  { severity: 'breaking', kind: 'Endpoint removed', subject: 'DELETE /api/Orders/{id}', ref: 'OrdersApiService.delete()' },
  { severity: 'breaking', kind: 'Property changed', subject: 'IOrderDto.total', from: 'total: number', to: 'total: string' },
  { severity: 'added', kind: 'Interface added', subject: 'IRoleDto' }
];

describe('formatConsoleSummary', () => {
  it('prints a count line and one aligned line per change', () => {
    expect(formatConsoleSummary(CHANGES)).toEqual([
      'API changes since the last snapshot: 2 breaking, 1 added',
      '  ⚠ Endpoint removed  DELETE /api/Orders/{id}  OrdersApiService.delete()',
      '  ⚠ Property changed  IOrderDto.total  total: number → total: string',
      '  + Interface added   IRoleDto'
    ]);
  });

  it('says none when nothing changed, and prints nothing without a baseline', () => {
    expect(formatConsoleSummary([])).toEqual(['API changes since the last snapshot: none']);
    expect(formatConsoleSummary(null)).toEqual([]);
  });
});

describe('formatMarkdownReport', () => {
  it('groups changes under Breaking and Added with a file count', () => {
    expect(formatMarkdownReport(CHANGES, FILES)).toBe([
      '## API changes: 2 breaking, 1 added',
      '',
      '### ⚠️ Breaking',
      '- Endpoint removed: `DELETE /api/Orders/{id}` (`OrdersApiService.delete()`)',
      '- Property changed: `IOrderDto.total`: `total: number` → `total: string`',
      '',
      '### ✨ Added',
      '- Interface added: `IRoleDto`',
      '',
      '_Files: 1 created, 3 updated, 1 deleted_',
      ''
    ].join('\n'));
  });

  it("doesn't claim a snapshot was saved when none is configured", () => {
    const report = formatMarkdownReport(null, FILES, undefined, 'not-configured');

    expect(report).toContain('Set `schemaSnapshotPath` to list API changes');
    expect(report).not.toContain('This run saved one');
  });

  it('explains a missing baseline and an unchanged schema', () => {
    expect(formatMarkdownReport(null, FILES)).toContain('No previous schema snapshot');
    expect(formatMarkdownReport([], FILES)).toContain('## API changes: none');
  });

  it("doesn't call a snapshot that couldn't be read or compared missing", () => {
    const report = formatMarkdownReport(null, FILES, undefined, 'unreadable');

    expect(report).toContain("The previous schema snapshot couldn't be read or compared with the schema");
    expect(report).not.toContain('No previous schema snapshot');
  });

  it('stays within the length limit and counts what it left out', () => {
    const many: IApiChange[] = Array.from({ length: 300 }, (_, index) => ({
      severity: index < 200 ? 'breaking' : 'added',
      kind: 'Property removed',
      subject: `ISomeFairlyLongDtoName${index}.someFairlyLongPropertyName`
    }));

    const report = formatMarkdownReport(many, FILES);
    const shown = report.split('\n').filter(line => line.startsWith('- ')).length;

    expect(report.length).toBeLessThanOrEqual(MAX_REPORT_LENGTH);
    expect(report).toContain(`_...and ${300 - shown} more changes`);
    expect(report).toContain('_Files: 1 created, 3 updated, 1 deleted_');
  });
});

describe('codeSpan', () => {
  it.each([
    ['IOrderDto.total', '`IOrderDto.total`'],
    ["kind: 'a`b'", "``kind: 'a`b'``"],
    ["x: 'a``b'", "```x: 'a``b'```"],
    ['`tick', '`` `tick ``']
  ])('renders %p as %p', (text, expected) => {
    expect(codeSpan(text)).toBe(expected);
  });

  it('keeps a backtick in a changed value from breaking the report', () => {
    const report = formatMarkdownReport([
      { severity: 'breaking', kind: 'Property changed', subject: 'IDto.kind', from: "kind: 'a'", to: "kind: 'a`b'" }
    ], FILES);

    expect(report).toContain("- Property changed: `IDto.kind`: `kind: 'a'` → ``kind: 'a`b'``");
  });
});
