import { toEnumMemberName, enumLine } from '@lib/types/utils/enum';

describe('toEnumMemberName', () => {
  it('keeps names that are already valid identifiers untouched', () => {
    expect(toEnumMemberName('Email', 0)).toBe('Email');
    expect(toEnumMemberName('PhoneCall', 0)).toBe('PhoneCall');
    expect(toEnumMemberName('snake_case', 0)).toBe('snake_case');
    expect(toEnumMemberName('$dollar', 0)).toBe('$dollar');
  });

  it('classifies values with spaces into PascalCase', () => {
    expect(toEnumMemberName('in progress', 0)).toBe('InProgress');
  });

  it('classifies kebab-case values into PascalCase', () => {
    expect(toEnumMemberName('not-started', 0)).toBe('NotStarted');
  });

  it('prefixes names that would start with a digit', () => {
    expect(toEnumMemberName(1, 0)).toBe('_1');
    expect(toEnumMemberName('2fast', 0)).toBe('_2fast');
  });

  it('falls back to an indexed name when nothing sanitizable remains', () => {
    expect(toEnumMemberName('***', 3)).toBe('Value3');
  });
});

describe('enumLine escaping', () => {
  const line = (name: string, value: string | number) =>
    enumLine([name, value], 0, [[name, value]], '4');

  it('escapes single quotes', () => {
    expect(line('A', "it's")).toBe("    A = 'it\\'s'");
  });

  it('escapes backslashes before quotes', () => {
    expect(line('A', 'x\\')).toBe("    A = 'x\\\\'");
  });

  it('escapes newlines and carriage returns', () => {
    expect(line('A', 'a\nb')).toBe("    A = 'a\\nb'");
    expect(line('A', 'a\r\nb')).toBe("    A = 'a\\r\\nb'");
  });

  it('leaves integer values unquoted', () => {
    expect(line('A', 3)).toBe('    A = 3');
  });
});

describe('enumLine x-enum-descriptions', () => {
  const line = (name: string, value: string | number, description?: string) =>
    enumLine([name, value, description], 0, [[name, value, description]], '2');

  it('emits a JSDoc block above the member when described', () => {
    expect(line('BillingReference', 1, 'Stores the line number on the work item.'))
      .toBe('  /** Stores the line number on the work item. */\n  BillingReference = 1');
  });

  it('emits nothing when the member has no description', () => {
    expect(line('A', 1)).toBe('  A = 1');
  });

  it('treats an empty description as absent', () => {
    // Undocumented members legitimately carry '' in the positional array, so an
    // empty entry must not produce a bare `/**  */`.
    expect(line('A', 1, '')).toBe('  A = 1');
  });

  it('collapses newlines so the comment stays on one line', () => {
    expect(line('A', 1, 'first\n   second'))
      .toBe('  /** first second */\n  A = 1');
  });

  it('neutralises a comment terminator inside the description', () => {
    expect(line('A', 1, 'ends */ here')).toBe('  /** ends *\\/ here */\n  A = 1');
  });
});
