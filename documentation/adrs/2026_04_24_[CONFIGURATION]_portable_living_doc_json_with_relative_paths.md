---
`🗄️ ADR : 2026_04_24_[CONFIGURATION]_portable_living_doc_json_with_relative_paths.md`
**date:** 2026-04-24
**status:** Accepted
**description:** Store docsFolder, sourceRoot and extraFiles as paths relative to the docs folder in .living-doc.json (instead of absolute), so the file can be checked into git and shared across machines. Includes silent migration of legacy configs, three-layer validation (CLI, API, Admin UI), and preserves the extraFiles feature introduced in the superseded ADR.
**tags:** configuration, extraFiles, sourceRoot, docsFolder, relative-paths, git-portability, silent-migration, cli-validation, admin-ui, sidebar, security, api, browse, path-traversal, document-id, windows-paths, posix
---

## Context

### Why this ADR supersedes `2026_03_20_10_15_[CONFIGURATION]_link_extra_files_as_documentation.md`

The superseded ADR introduced the `extraFiles` feature — an ordered list of Markdown files outside the docs folder (e.g. repository-root `README.md` or `CLAUDE.md`) surfaced in the sidebar under **General**. It explicitly noted in its CONS section that *"absolute paths in config are not portable between machines or users"*, but shipped absolute paths anyway because at the time the config was not considered a file that users would check into git.

Practice proved otherwise: users who version their docs folder (e.g. the `starting-doc` sample shipped with this project, any team using living-documentation in a shared repo) found that `.living-doc.json` contained the author's machine-specific paths (`/Users/…/living-documentation/…`) and was therefore unusable anywhere else. The `sourceRoot` field, initialised at server startup to the absolute parent directory of the docs folder, had the same problem. Every collaborator had to either manually rewrite the file or add it to `.gitignore`, which defeated the purpose of a shared, discoverable config.

The feature itself (whitelist-based security, admin filesystem browser, order preservation, document-id scheme for extra files, General-category placement) remains sound. **Only the path-storage format was wrong.** This ADR replaces that format with relative paths and extends the same reasoning to `sourceRoot` and to the removal of the redundant `docsFolder` field, without touching the rest of the feature surface.

### What the feature does (preserved from superseded ADR)

- Projects often have important Markdown files at the repository root (`README.md`, `CLAUDE.md`, `CONTRIBUTING.md`) that should be surfaced in the viewer without moving them into the docs folder.
- The admin panel provides a filesystem browser to add/remove/reorder these files without hand-editing JSON.
- `GET /api/browse?path=...` returns directories and `.md` files at a given path, backing the admin browser.
- Extra files are placed under the **General** category, before regular General documents, in user-defined config order (not date-sorted).
- The server-side whitelist restricts reads to paths explicitly present in `extraFiles`; only `.md` files are accepted both at browse time and at config-write time.
- The document-id scheme uses `encodeURIComponent(absolutePathWithoutExtension)` for extra files (vs `encodeURIComponent(relativeFilename)` for regular docs); the `/:id` route detects extra files by checking `path.isAbsolute(decodedId)`. This scheme is unchanged — at runtime `readConfig()` still resolves extra-file entries to absolute paths, so downstream code does not care that storage is relative.

## Decision

### Two-shape config module

`src/lib/config.ts` now exposes two TypeScript shapes:

- **`StoredConfig`** — what is actually serialised to `.living-doc.json`. Paths are POSIX-style (forward slashes) and relative to the docs folder. The `docsFolder` field is removed entirely (it is redundant — the JSON file lives *inside* the docs folder, so its absolute location is always derivable from where the file was read).
- **`LivingDocConfig`** — what `readConfig()` returns to the rest of the application. `sourceRoot`, `extraFiles` and `docsFolder` are resolved to absolute paths at runtime. Downstream consumers (routes, MCP tools, export, `resolveSourceRoot` helpers) continue to receive and manipulate absolute paths — no refactor was needed in the 20+ call sites.

### Storage rules

- `sourceRoot`: stored as `string | null`, relative to the docs folder (e.g. `".."`, `"../src"`). `null` means "default to the parent directory", resolved to `path.dirname(docsPath)` at runtime.
- `extraFiles`: stored as `string[]`, each entry relative to the docs folder and ending in `.md` (e.g. `"../README.md"`, `"../../monorepo-docs/intro.md"`).
- `docsFolder`: no longer stored. Present in `LivingDocConfig` only as a runtime field resolved from the CLI argument.
- All stored paths are normalised to POSIX slashes on write, so the JSON diff is stable across macOS/Linux/Windows contributors.

### Three-layer validation (defence in depth)

Absolute and `~`-prefixed paths are rejected at every boundary:

1. **CLI** (`bin/cli.ts`): `npx living-documentation /abs/path` or `~/foo` exits with an explicit error ("The docs folder must be a relative path"). Only relative arguments resolve against `process.cwd()` and start the server.
2. **API** (`src/routes/config.ts`): `PUT /api/config` with `sourceRoot` or any `extraFiles[]` entry that is absolute returns **HTTP 400** with `"must be a relative path or null"` / `"extraFiles entries must be relative paths"`.
3. **Admin UI** (`src/frontend/admin.html`): an `isAbsolutePath()` helper rejects the Source Root input client-side before PUT, surfacing a localised error message (`admin.msg.source_root_absolute`). Extra-file entries added via the filesystem browser are converted from the absolute paths returned by `/api/browse` to relative paths before being sent to the API (a new `pathRelative(from, to)` helper, POSIX-style).

### Silent migration of legacy configs

On the first `readConfig()` call for a docs folder, `readAndMigrate()` rewrites the on-disk JSON when it detects legacy shapes:

- A `docsFolder` field → silently removed.
- An absolute `sourceRoot` → converted via `path.relative(docsPath, sourceRoot)`. If the conversion is impossible (different Windows drive letters), it falls back to `null` (default).
- Absolute `extraFiles[]` entries → each converted the same way; entries that cannot be made relative are dropped with a console warning.

Each migration prints a one-time `[living-doc] Migrating …` message to the console so users can trace what happened, but nothing fails and no user interaction is needed. Subsequent reads are no-ops (migration is idempotent). If the docs folder is read-only, the write-back is swallowed silently so the runtime view still works.

### Runtime semantics

`readConfig()` always returns a `LivingDocConfig` with absolute `sourceRoot` and `extraFiles`. The helpers `resolveSourceRoot()` in `src/lib/metadata.ts` and `src/mcp/tools/source.ts` — previously duplicated fallback logic for the case where `sourceRoot` was missing or non-absolute — were simplified to one line each, since `readConfig()` now guarantees the invariant. The `sourceRoot` field in `LivingDocConfig` is typed as `string` (never `null`) to reflect this guarantee.

## Consequences

### PROS

- `.living-doc.json` is now **portable** — a team can check it into git and every collaborator sees the same effective config. This unlocks the original goal of a shared, discoverable project configuration.
- **Zero breakage for existing users**: legacy configs with absolute paths auto-migrate on first read, with clear console warnings. No manual intervention, no failure modes that block startup.
- **Clean storage shape**: removing the redundant `docsFolder` field eliminates the most confusing source of drift (people would manually copy configs between folders and the stored `docsFolder` would point to the *original* location, silently masking bugs).
- **Three independent layers of validation** make it impossible to accidentally reintroduce absolute paths through any UI or API path. Even a direct JSON edit with an absolute path is caught on the next read via silent migration.
- **Downstream code is unchanged**: the `LivingDocConfig` runtime shape still exposes absolute paths, so routes, MCP tools, the export pipeline, and the admin's filesystem browser continue to receive the forms they expect. The refactor touched `~6` files (config lib, route, CLI, server init, admin JS, i18n) — not the 20+ consumers of absolute paths.
- **Windows-friendly**: POSIX slash normalisation on write keeps the git diff identical across macOS/Linux/Windows, and `path.isAbsolute` handles Windows drive letters during CLI/API validation.
- **All feature characteristics from the superseded ADR are preserved**: whitelist security, `.md`-only filter, filesystem browser, user-defined ordering, General-category placement, document-id scheme for extra files.

### CONS

- **Conceptual split between storage shape and runtime shape** (`StoredConfig` vs `LivingDocConfig`) adds a small amount of cognitive load for future maintainers. Mitigated by explicit TypeScript types and inline comments in `src/lib/config.ts`.
- **Migration writes to disk on first read** when a legacy config is detected. If the docs folder is read-only (rare but possible in CI/Docker contexts), the runtime view still works but the file stays in its legacy form — subsequent runs will re-migrate in memory each time. The try/catch around the write makes this graceful, not fatal.
- **Shared `sourceRoot`-per-repository** is now much more useful, but this also means a team with divergent repo layouts (e.g. one contributor with the source in `../src`, another with source in `../../monorepo/services/foo`) cannot share `.living-doc.json` cleanly. The admin UI is the escape hatch — each contributor can override `sourceRoot` locally and commit separately — but there is no per-user override file yet.
- **The path-traversal CON from the superseded ADR remains**: extra files bypass the `docsPath` guard intentionally (they live outside it), and are only gated by the whitelist match. This was a conscious trade-off originally and is unchanged here.
