---
name: changelog
description: Write or update CHANGELOG.md entries for the swagger-schematics project. Use this skill whenever the user mentions the changelog, wants to document what changed, says something shipped or was fixed, asks about release notes, or says things like "update changelog", "add changelog entry", "document changes", "write release notes", "what should I log", or "we just shipped X". Also trigger when the user asks to prepare for a release or bump a version — the changelog is always part of that workflow.
---

# Changelog Writing Skill

Write and maintain CHANGELOG.md entries for `swagger-schematics` following the established format.

## Workflow

### Step 1: Gather what changed

Before writing anything, ask the user what to include. Offer these options:

1. **All changes in the current branch** — run `git log main..HEAD --oneline` (or `git log master..HEAD --oneline` if main doesn't exist) and read the relevant modified files to understand impact
2. **Changes since last tag** — run `git log $(git describe --tags --abbrev=0)..HEAD --oneline`
3. **Specific commits or files** — user tells you what to focus on
4. **User describes the changes directly** — they'll just tell you what happened

If the user already described the changes in their message, skip asking and proceed with what they gave you. If the context is ambiguous (e.g., "update the changelog"), ask.

### Step 2: Draft the entry

Read the top of `projects/swagger-schematics/CHANGELOG.md` to see the latest version and date. Use the format rules below.

### Step 3: Generate PR message

After writing the changelog entry, produce a pull request message (see **PR Message** section).

## Format Rules

**Version header:**
```markdown
## [1.0.0-alpha.XX] - YYYY-MM-DD
```
Always insert new versions at the **top** of the changelog (after the file header), above previous entries.

**Section order** (only include sections that have content):
1. `### ✨ Added`
2. `### 🐛 Fixed`
3. `### ♻️ Changed`
4. `### 🗑️ Removed`
5. `### 📦 Dependencies`

Each section uses its emoji prefix — never plain `### Added` etc.

**Breaking changes** go inside `### ♻️ Changed` with this marker:
```markdown
- ⚠️ **BREAKING**: description of the change
```

## Writing Style

**Be specific and developer-focused.** Readers are devs consuming generated code or maintaining the schematic — they care about what changed in the API, templates, generated output, config options, and test coverage.

**Good entry anatomy:**
- Lead with the *what* (feature/fix name in bold or backtick if it's a symbol)
- Follow with *why it matters* or *what the old behavior was*
- Use sub-bullets for multiple related items under one feature

**Examples from this project:**

✅ Good:
```markdown
- **Composition schema support** - `allOf`, `oneOf`, and `anyOf` schemas now generate TypeScript type aliases:
  - `allOf` → intersection type (`TMyType = TypeA & TypeB`)
  - `oneOf` / `anyOf` → union type (`TMyType = TypeA | TypeB`)
```

```markdown
- `scopeEndpointsWithTags` option for RTK to prefix endpoint names with tag (e.g., `claimGetById`)
```

```markdown
- Angular base API generation now correctly handles partial file existence:
  - Previously only skipped generation if BOTH files existed
  - Now generates only the missing file(s) when one exists and the other doesn't
```

❌ Avoid:
```markdown
- Fixed a bug
- Added new feature
- Updated code
```

## Gathering Content

Before writing, check what actually changed:
1. Look at recent git commits: `git log --oneline -20`
2. Read modified files to understand the impact
3. Check test changes — new tests often reveal what was fixed/added
4. Ask the user if intent is unclear from the diff

Group related changes under one bullet with sub-bullets rather than listing them separately.

## Version Numbering

This project follows semver with pre-release labels: `1.0.0-alpha.XX`, `1.0.0-beta.XX`, `1.0.0-rc.XX`, or plain `1.0.0`. The user manages version bumping — do not change version numbers unless explicitly asked.

## Dependency Updates

For `### 📦 Dependencies`, list each package with old → new version:
```markdown
- Updated @angular-devkit packages to 20.3.14
- Updated axios to 1.13.2
```

If multiple packages belong to the same suite (e.g., `@angular-devkit/*`), group them on one line.

## PR Message

After writing the changelog entry, generate a pull request message in this format:

```
<Title>

<Description>
```

- **Title**: one brief line summarizing the most important change (e.g., `feat: RTK URL controller segment fix` or `fix: Angular base API partial file existence`)
- **Description**: a short paragraph or bullet list of the important changes — drawn from what you just wrote in the changelog, but written for a reviewer rather than a user. Focus on *what* changed and *why*, not the formatting details.
