import '@helpers/matchers';
import { UnitTestTree } from '@angular-devkit/schematics/testing';
import { resetFetchMocks, runFullSchematics, ANGULAR_SCHEMATIC_OPTIONS } from '@helpers/setup';
import { AGGREGATABLE_SWAGGER_SCHEMA } from '@fixtures/swagger/aggregatable-schema.fixture';

/**
 * `x-aggregatable` (Trailhead API framework story 36355) is the server's declaration of which
 * result columns a paged search may aggregate. The generator surfaces it twice: a JSDoc line on the
 * property naming the admitted operations, and a string-literal union of the column names so an
 * `aggregates` request gets a compile-time check. A type that declares nothing must render exactly
 * as it did before — that is the control that makes the other assertions discriminating.
 */
describe('x-aggregatable in generated interfaces', () => {
  let tree: UnitTestTree;
  let journal: string;
  let plain: string;

  beforeAll(async () => {
    resetFetchMocks();
    tree = await runFullSchematics(AGGREGATABLE_SWAGGER_SCHEMA, ANGULAR_SCHEMATIC_OPTIONS);
    journal = tree.readContent(`${ANGULAR_SCHEMATIC_OPTIONS.path}/interfaces/journal-dto.interface.ts`);
    plain = tree.readContent(`${ANGULAR_SCHEMATIC_OPTIONS.path}/interfaces/plain-dto.interface.ts`);
  });

  afterAll(() => {
    resetFetchMocks();
  });

  it('documents each declared property with the operations it admits, in the server\'s order', () => {
    expect(journal).toContain('/** @aggregatable Sum, Avg, Min, Max, CountDistinct */\n  hours: number;');
    expect(journal).toContain('/** @aggregatable Min, Max, CountDistinct */\n  date: string;');
  });

  it('leaves an undeclared property undocumented', () => {
    expect(journal).not.toMatch(/@aggregatable[^\n]*\n\s*notes\??:/);
    expect(journal).not.toMatch(/@aggregatable[^\n]*\n\s*id:/);
  });

  it('emits a string-literal union of the aggregatable column names', () => {
    expect(journal).toContain("export type IJournalDtoAggregatableColumn = 'hours' | 'date';");
  });

  it('renders a type that declares nothing exactly as before — no JSDoc, no union', () => {
    expect(plain).not.toContain('@aggregatable');
    expect(plain).not.toContain('AggregatableColumn');
    expect(plain).toMatchSnapshot();
  });
});
