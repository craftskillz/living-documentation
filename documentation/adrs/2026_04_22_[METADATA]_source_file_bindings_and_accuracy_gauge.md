---
date: 2026-04-22
status: Partially SuperSeeded (accuracy formula) — see 2026_04_22_[METADATA]_files_management_popup_with_metadata_search_and_accuracy_formula_fix.md
description: Bind source files to documents via SHA-256 hashes so the viewer (and MCP clients) can detect drift between docs and code. Exposes a REST API, four MCP tools, a modal with a sourceRoot browser, and an accuracy gauge in the doc header.
tags: metadata, accuracy, sha-256, hash, drift, documents, source-root, mcp, rest, modal, gauge, i18n, security
---

## Context

"Living documentation" only lives when someone keeps it aligned with the code. Today the tool has no way to signal that a doc has drifted away from the files it describes: a dev reads a doc, doesn't notice that the underlying class has been refactored, and the doc silently goes stale. Users asked for a way to:

1. Attach one or more source files to a doc (the files that the doc is actually explaining).
2. Detect when any of those source files has changed or been deleted since the doc was last validated.
3. Surface that signal both in the viewer (for humans) and over MCP (for agents regenerating the doc).

Constraints expressed by the user:

- Storage must be a plain JSON file at the docs folder root — no database, no extra install step.
- Paths must be restricted to the already-configured `sourceRoot` so an attacker can't bind `/etc/passwd` to a document.
- The MCP agent needs both a read path (detect drift) and a write path (re-baseline after regenerating the doc), with tools named plainly enough to appear in the server guide workflow.
- Every user-visible string must live in both `en.json` and `fr.json` (project-wide i18n rule).
- No new npm dependency — `crypto.createHash` from the Node standard library is enough.

## Decision

### Storage & accuracy model

- **`.metadata.json`** at `docsPath` root, shape `{ [docId]: MetadataEntry[] }` with `MetadataEntry = { path: string; hash: string }` where `path` is relative to `sourceRoot`.
- **Hash**: `sha256File(absPath)` in `src/lib/hash.ts` — reads the file synchronously (local server, files are small) and returns `hex | null`.
- **Weighted accuracy** in `src/lib/metadata.ts`: `unchanged = 0`, `modified = 1`, `missing = 3`. `accuracy = 1 − weight / (3·total)`, in `[0, 1]`. A deleted source file weighs 3× more than a modified one because it signals the doc is describing something that no longer exists. Empty doc returns `1` (no entries = nothing to drift from).

### Backend

- **`src/routes/metadata.ts`** — `GET /api/metadata/:docId` (report), `POST /api/metadata/:docId` (add/replace entry, re-hashes the file at attach time), `DELETE /api/metadata/:docId` (remove entry), `POST /api/metadata/:docId/refresh` (re-hash every attached file → re-baseline). Every input path is run through `assertUnderSourceRoot(…)` which normalises and rejects any absolute-or-relative path that escapes `sourceRoot`.
- **`src/routes/browse-source.ts`** — `GET /api/browse-source?path=<rel>` returns the directory listing under `sourceRoot`. Dotfiles (except `.github`) and heavy folders (`node_modules`, `dist`, `build`, `out`, `coverage`, `.git`, `.next`, `.nuxt`, `.cache`, `.turbo`, `.svelte-kit`, `target`, `bin`, `obj`, `__pycache__`, `.venv`, `venv`) are filtered out so the picker stays usable.
- **`src/server.ts`** mounts both routers under `/api/metadata` and `/api/browse-source`.
- **`src/mcp/tools/metadata.ts`** — `toolListMetadata`, `toolGetAccuracy`, `toolAddMetadata`, `toolRefreshMetadata` reuse the exact same `readMetadataStore` / `writeMetadataStore` helpers as the REST layer — single source of truth for the logic.
- **`src/mcp/server.ts`** — the four tools are registered in `TOOLS`, dispatched in the `CallToolRequestSchema` handler, and documented in the `SERVER_GUIDE` with the recommended workflow: `list_documents` → `get_accuracy` → `read_document` + `read_source_file` on modified entries → `create_document` to overwrite → `refresh_metadata` to re-baseline.

### Frontend

- **`src/frontend/metadata.js`** drives a modal opened from a `Metadata` button in the doc header (`openMetadataModal()`). Inside the modal: a summary line (`X% · unchanged/total · modified · missing`), a scrollable list with a coloured status pill per entry and a trash button, an inline `/api/browse-source` picker (Up / current path / dirs-then-files) to add new entries, and a global Refresh button.
- **`src/frontend/accuracy-gauge.js`** renders a thin coloured bar in the sticky doc header (green > 80 %, yellow ≥ 60 %, orange ≥ 40 %, red < 40 %). The gauge is hidden when the doc has zero entries. Clicking it opens the same modal. `loadMetadataReport(docId)` is called by `openDocument` in `documents.js` so the gauge is always fresh.
- **i18n** — 13 new keys under `metadata.*` + `accuracy.*` added to both `en.json` and `fr.json`. The accuracy tooltip uses placeholder substitution (`{unchanged}`, `{modified}`, `{missing}`, `{total}`) to keep the sentence natural in both languages.

### Security

- **`assertUnderSourceRoot`** is the single choke point. It accepts absolute or relative input, resolves to absolute, and refuses any path whose resolved form doesn't live under the normalised `sourceRoot + path.sep`.
- `POST /api/metadata/:docId` additionally checks `fs.existsSync` + `statSync.isFile()` before hashing, so a symlink pointing outside `sourceRoot` is blocked by the pre-resolution check.
- `browse-source` is read-only and never exposes file contents — only names and relative paths.
- The stored hash is computed server-side from the file on disk; the client never supplies hashes, so it cannot poison the store with forged values.

## Consequences

### PROS

- **Zero new dependencies** — `crypto.createHash` + `fs.readFileSync` are Node built-ins. No DB, no ORM, no watcher.
- **Unified logic** — REST and MCP paths share the exact same library functions (`buildReport`, `getDocEntries`, `setDocEntries`), so there's no risk of the two layers disagreeing on what "modified" means.
- **Actionable signal for both humans and agents** — humans see a coloured bar that turns orange or red at a glance; agents call `get_accuracy` and immediately know which files to re-read before regenerating the doc. `refresh_metadata` gives the agent a clean "doc is aligned again" signal after it updates the Markdown.
- **Security model mirrors source tools** — the same `sourceRoot` guard that protects `read_source_file` and `search_source` now also guards metadata. One mental model to reason about.
- **Weighted accuracy** (missing 3×) reflects the real-world cost: a deleted file almost always means the doc is describing a concept that no longer exists — a bigger problem than a simple modification that may only touch unrelated internals.
- **i18n end-to-end** — the status pills, the gauge label, the tooltip, and the modal strings are all translatable; the accuracy tooltip even interpolates the counts in the right grammatical order for FR.
- **Gauge is unobtrusive** — hidden when the doc has no entries, so legacy docs look exactly the same until someone opts in.

### CONS

- **Synchronous hashing** — `sha256File` uses `fs.readFileSync`. For a refresh on a doc bound to many large source files this blocks the event loop briefly. Acceptable today (local server, repo-sized files) but would need to move to streaming for very large binaries.
- **No watcher** — accuracy is computed on demand (on doc open, on Refresh, on MCP call). A source file that changes while the doc is open won't update the gauge until the doc is reopened. Adding `fs.watch` would require reference counting and cross-platform handling of the known chokepoints.
- **Single flat `.metadata.json`** — one file for the whole docs folder. On very large projects this will grow, and concurrent writes are serialised on a single `JSON.stringify` pass. Fine for the CLI's single-process model; would need splitting per-doc if we ever ran multi-process.
- **Hash-based drift only** — a whitespace-only edit to a source file still shows as "modified". This is conservative (better an occasional false positive than missing a real change) but might nag in churn-heavy areas.
- **Binding is manual** — nothing infers the source files automatically from the doc content. A future enhancement could parse the doc's code links or headings to suggest bindings.
- **`sourceRoot` default is the parent of `docsFolder`** — when the docs folder sits inside a larger monorepo the default may be too narrow or too wide; admins must adjust it explicitly. Documented in CLAUDE.md but still an easy-to-miss step for newcomers.
