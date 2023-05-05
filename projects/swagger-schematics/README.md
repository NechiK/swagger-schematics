# Swagger Schematics

Generate TS types and API via swagger scheme using Schematics.

Currently, it supports only Angular 14+.
Going to support React templates soon.

Documentation in progress...


## How to use?

1. Install package

```bash
npm i -D swagger-schematics
```

2. Run schematic

```bash
schematics swagger-schematics:api swaggerUrl --path=/src/app/core
```

```bash
schematics swagger-schematics:types swaggerUrl --path=/src/app/core
```

3. Enjoy!
