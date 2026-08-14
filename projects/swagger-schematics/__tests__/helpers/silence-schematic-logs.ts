// Quiet the schematic's own console output during tests. The generators log
// `[swagger-schematics] ...` info lines (schema fetch) and full error reports
// (error-path tests exercise these on purpose), which flood the test output.
//
// This installs a bottom-layer filter once per test file (before the file's code
// runs): messages starting with the schematic prefix are dropped, everything else
// passes through untouched. Tests that install their own console spy to assert on
// logging layer on top of this and keep working. Set SHOW_SCHEMATIC_LOGS=1 to see
// the logs when debugging.
const PREFIX = '[swagger-schematics]';
const METHODS = ['log', 'info', 'warn', 'error'] as const;

if (!process.env.SHOW_SCHEMATIC_LOGS) {
  for (const method of METHODS) {
    const original = console[method].bind(console);
    jest.spyOn(console, method).mockImplementation((...args: unknown[]) => {
      if (typeof args[0] === 'string' && args[0].includes(PREFIX)) {
        return;
      }
      original(...args);
    });
  }
}
