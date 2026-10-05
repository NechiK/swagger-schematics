import { buildRelativePath, parseName } from '@lib/helpers/schematic-path.helper';

/**
 * Copied from @schematics/angular, whose output these cases were checked against;
 * the generated file locations and import paths depend on them.
 */
describe('schematic path helpers', () => {
  it.each([
    ['/test-output', 'ApiBase', { name: 'ApiBase', path: '/test-output' }],
    ['src/app/core', 'claim', { name: 'claim', path: '/src/app/core' }],
    ['/test-output/interfaces', 'orders/order-dto', { name: 'order-dto', path: '/test-output/interfaces/orders' }],
    ['/src/app/', 'a/b/c', { name: 'c', path: '/src/app/a/b' }],
  ])('parseName(%j, %j)', (path, name, expected) => {
    expect(parseName(path, name)).toEqual(expected);
  });

  it('parseName rejects a name that leaves the root', () => {
    expect(() => parseName('/', '../up')).toThrow(/is invalid/);
  });

  it.each([
    ['/out/interfaces/a.interface', '/out/interfaces/b.interface', './b.interface'],
    ['/out/interfaces/a.interface', '/out/enums/e.enum', '../enums/e.enum'],
    ['/out/a.service', '/out/interfaces/b.interface', './interfaces/b.interface'],
    ['/a/b/c/d/e.ts', '/z.ts', '../../../../z.ts'],
  ])('buildRelativePath(%j, %j)', (from, to, expected) => {
    expect(buildRelativePath(from, to)).toBe(expected);
  });
});
