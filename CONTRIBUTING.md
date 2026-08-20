# Contributing to swagger-schematics

Thanks for contributing! This guide covers everything you need to get a change from your fork into a published npm release.

## TL;DR

1. Fork the repo and create a branch.
2. Make your change in `projects/swagger-schematics/`, add tests.
3. Run `npm run lint`, `npm test`, and `npm run build` from the repo root.
4. Open a PR against `develop` with a [conventional-commit](https://www.conventionalcommits.org/) title (e.g. `fix: handle empty response schema`).
5. **Don't bump the version or edit the CHANGELOG** — after your PR is merged, CI bumps the version, adds a changelog entry from your PR title, and publishes to npm automatically.

## Project layout

- The published package lives in `projects/swagger-schematics/` — all source code, tests, and its `package.json` (the source of truth for the version).
- The root `package.json` is only a dev-workspace wrapper; its scripts delegate into the package directory.
- There is exactly one README: the root `README.md`. The copy at `projects/swagger-schematics/README.md` is gitignored and generated at `npm pack`/`npm publish` time — never create or edit it by hand.

## Development setup

The required Node.js version is in `.nvmrc` (the package supports `^20.19.0 || ^22.12.0 || >=24.0.0`, and CI tests all three lines).

```bash
nvm use                                        # or install the version from .nvmrc
npm ci --prefix projects/swagger-schematics    # install dependencies
```

Common commands (run from the repo root — they delegate into the package):

```bash
npm run build     # compile the schematics
npm run lint      # eslint
npm test          # jest test suite
```

To try your build against a real project, `npm run build:debug` builds and `npm link`s the package.

## Pull requests

- Target branch: `develop`.
- CI must pass: lint, tests (with coverage) and build across the supported Node versions.
- One approving review is required before merge.
- Add or update tests for behavior you change — new tests are also how reviewers understand what was fixed.

### PR titles are release metadata

PRs are squash-merged, and the PR title becomes the commit that drives the automated release, so give it a conventional-commit prefix:

| Title prefix | Effect after merge |
|---|---|
| `feat: …` | **minor** version bump + publish |
| `fix: …`, `perf: …`, `refactor: …`, anything else | **patch** version bump + publish |
| `feat!: …` (or `BREAKING CHANGE` in the body) | **major** version bump + publish |
| `docs: …`, `chore: …`, `ci: …`, `test: …`, `style: …` | no release |

A scope is fine (`fix(cli): …`), and a title without any prefix falls back to a patch release.

## Versioning and changelog — handled by CI

You do **not** need to touch `package.json`'s version or `CHANGELOG.md`. After a PR merges into `develop`:

1. CI checks whether the version in `projects/swagger-schematics/package.json` is already on npm.
2. If it is (the normal case), CI bumps it according to the PR title, inserts a `CHANGELOG.md` entry generated from the PR title, commits `chore(release): vX.Y.Z` back to `develop`, and publishes to npm.
3. If it isn't — i.e. the PR bumped the version by hand — CI publishes exactly that version and skips the auto-bump. This is how maintainers take manual control (pre-releases, promoting a beta to stable, richer hand-written changelog entries).

So: write a clear PR title and a good PR description; the description is where reviewers (and the maintainer, when refining changelog entries) get the details.

## Releases (maintainers)

- Publishing to npm happens automatically on merge to `develop` via Trusted Publishing (OIDC, no tokens); the dist-tag is derived from the version (`-beta.x` → `beta`, stable → `latest`). Already-published versions are skipped.
- For a manual release (pre-release lines, major version planning), bump the version and write the CHANGELOG entry in the PR itself — CI will respect it.
- A GitHub release is created by pushing a tag: `git tag v<version> && git push origin v<version>` — release notes are extracted from the CHANGELOG.
