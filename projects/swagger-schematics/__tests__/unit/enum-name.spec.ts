import { toEnumMemberName, enumLine } from '../../types/utils/enum';

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
