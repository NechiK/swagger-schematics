// The schematic sources import generated schema type declarations
// (`./schema` -> `api/schema.d.ts` / `types/schema.d.ts`). Those are gitignored
// build artifacts normally produced by the `prebuild` (json2ts) step, which only
// runs before `build`. Generating them here makes every `jest` invocation
// self-sufficient, so tests don't depend on a prior build (or on build order in CI).
const fs = require('fs');
const path = require('path');
const { compileFromFile } = require('json-schema-to-typescript');

module.exports = async () => {
  const root = __dirname;
  const targets = [
    ['api/schema.json', 'api/schema.d.ts'],
    ['types/schema.json', 'types/schema.d.ts'],
  ];

  for (const [input, output] of targets) {
    const declaration = await compileFromFile(path.join(root, input), {
      additionalProperties: false,
      cwd: root,
    });
    fs.writeFileSync(path.join(root, output), declaration);
  }
};
