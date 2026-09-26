import { renderJsDoc } from '@lib/types/utils/js-doc';
import { interfacePropertyLine } from '@lib/types/helpers/template.helper';

describe('renderJsDoc', () => {
  it('renders nothing when there is nothing to document', () => {
    expect(renderJsDoc(undefined)).toBe('');
    expect(renderJsDoc({})).toBe('');
    expect(renderJsDoc({ summary: '  ', description: '\n' })).toBe('');
  });

  it('renders one line of content on a single line, indented', () => {
    expect(renderJsDoc({ summary: 'Get order by id' }, '  ')).toBe('  /** Get order by id */\n');
    expect(renderJsDoc({ deprecated: true })).toBe('/** @deprecated */\n');
    expect(renderJsDoc({}, '  ', ['@aggregatable Sum, Avg'])).toBe('  /** @aggregatable Sum, Avg */\n');
  });

  it('renders summary, description and tags as a block', () => {
    expect(renderJsDoc({ summary: 'Get order', description: 'Returns 404 when missing.', deprecated: true }, '  ')).toBe([
      '  /**',
      '   * Get order',
      '   *',
      '   * Returns 404 when missing.',
      '   * @deprecated',
      '   */',
      ''
    ].join('\n'));
  });

  it('skips a description that repeats the summary', () => {
    expect(renderJsDoc({ summary: 'Get order', description: 'Get order' })).toBe('/** Get order */\n');
  });

  it('keeps paragraphs of multi-line text, collapsing blank runs and trimming lines', () => {
    expect(renderJsDoc({ description: '\r\n  First line.\r\n  Second line.\r\n\r\n\r\n  New paragraph.\r\n\r\n' })).toBe([
      '/**',
      ' * First line.',
      ' * Second line.',
      ' *',
      ' * New paragraph.',
      ' */',
      ''
    ].join('\n'));
  });

  it("can't be closed early by '*/' in the text", () => {
    const doc = renderJsDoc({ summary: 'Matches /* and */ literally' });
    expect(doc).toBe('/** Matches /* and *\\/ literally */\n');
    expect(doc.indexOf('*/')).toBe(doc.lastIndexOf('*/'));
  });

  describe('JSDoc tags carry schema data, so they are escaped like text', () => {
    it("neutralizes '*/' and newlines in extra tags", () => {
      const doc = renderJsDoc({}, '', ['@aggregatable Sum*/ export const x = 1; /*', 'Avg\nMax']);

      expect(doc.indexOf('*/')).toBe(doc.lastIndexOf('*/'));
      expect(doc).toContain('@aggregatable Sum*\\/ export const x = 1; /*');
      expect(doc).toContain(' * Avg Max\n');
    });

    it('keeps an x-aggregatable value from breaking out of the property comment', () => {
      const lines = interfacePropertyLine([['total?', 'number']], '2', [['total', ['Sum */ injected()', 'Avg']]]);

      expect(lines).toBe('  /** @aggregatable Sum *\\/ injected(), Avg */\n  total?: number;');
    });
  });
});
