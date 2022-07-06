const {copySync} = require("fs-extra");
const {copyFileSync} = require("fs");

copySync('projects/swagger-schematics/schematics', 'dist/swagger-schematics', {
    overwrite: true
});
copyFileSync('projects/swagger-schematics/package.json', 'dist/swagger-schematics/package.json');
copyFileSync('.npmignore', 'dist/swagger-schematics/.npmignore');
