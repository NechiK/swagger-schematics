import { resolveFramework } from '@lib/interfaces/swagger-schematics/framework';

describe('resolveFramework', () => {
  it.each(['angular', 'react-rtk'])('accepts %s', framework => {
    expect(resolveFramework(framework)).toBe(framework);
  });

  it.each([undefined, null, ''])('rejects a missing framework (%p)', framework => {
    expect(() => resolveFramework(framework)).toThrow(
      "Framework is not defined in the configuration. Please set 'framework' to 'angular' or 'react-rtk'."
    );
  });

  it.each(['react', 'Angular', 'toString', 42])('rejects an unsupported framework (%p)', framework => {
    expect(() => resolveFramework(framework)).toThrow(
      `Framework '${framework}' is not supported. Please set 'framework' to 'angular' or 'react-rtk'.`
    );
  });
});
