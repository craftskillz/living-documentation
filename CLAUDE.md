# CLAUDE.md — Living Documentation

> **Usage**: This file is the entry point for any task on this project. It contains the critical rules and context needed before making changes.
> To understand the _why_ behind a decision, refer to the relevant ADR in `documentation/adrs/` — load those files only when working on the related domain.
> **Memory**: At the start of each session, read `memory/MEMORY.md` and load the relevant memory files listed there.

## Project overview

CLI tool (`living-documentation`) that serves a local Markdown documentation viewer via Express.
Ships pre-compiled; users run it with `npx living-documentation ./path/to/docs`.

## Architecture

```
bin/cli.ts                  → CLI entry (Commander), validates args, calls startServer()
src/server.ts               → Express app, mounts API routes + serves static frontend
src/routes/documents.ts     → /api/documents  (list, search, read, write)
src/routes/config.ts        → /api/config     (read, write)
src/routes/browse.ts        → /api/browse     (filesystem navigator, .md files only)
src/routes/images.ts        → /api/images     (image upload from clipboard paste)
src/lib/parser.ts           → filename parsing logic (dynamic, driven by filenamePattern)
src/lib/config.ts           → .living-doc.json read/write with defaults
src/frontend/index.html     → single-page viewer (Tailwind CDN, hljs CDN, vanilla JS)
src/frontend/admin.html     → admin panel (config editor + extra files browser)
scripts/copy-assets.js      → copies src/frontend/ → dist/src/frontend/ after tsc
```

## Build

```bash
npm run build   # tsc + copy HTML assets to dist/ + chmod +x dist/bin/cli.js
```

TypeScript compiles to `dist/` with the same sub-tree (`dist/bin/`, `dist/src/`).
HTML files are **not** compiled by tsc — `scripts/copy-assets.js` copies them.
The server looks for frontend files at `path.join(__dirname, 'frontend')`, i.e. `dist/src/frontend/`.

## Filename pattern

Default: `YYYY_MM_DD_[Category]_title_words.md`

The pattern is **configurable** via `filenamePattern` in `.living-doc.json`. `parser.ts` builds regex dynamically from the configured pattern at runtime — token order is respected (e.g. `[Category]_YYYY_MM_DD_title` works).

Recognized tokens: `YYYY`, `MM`, `DD` (date group), `[Category]` (category group). Everything else is treated as the title placeholder.

Constraints on `filenamePattern`:
- Must contain `[Category]` **exactly once** — validated on write (server 400 + client error).

Parser tries three strategies in order:

1. Full pattern (date + category present) → extracts date, category, title
2. Date-only fallback → extracts date and title, category = "General"
3. Fallback → filename as title, category = "General", date = null

Documents are sorted by **full filename** (ascending `localeCompare`) within each category.

## Config

Persisted as `.living-doc.json` inside the docs folder.
Editable fields via `PUT /api/config`: `title`, `theme`, `filenamePattern`, `extraFiles`.
`docsFolder` and `port` are write-once from CLI and are informational only in the API.

### extraFiles

An ordered array of absolute paths to `.md` files outside the docs folder.
These files are always shown under the **General** category, before regular General documents.
Validated on write: must be absolute paths ending in `.md`.

## Frontend

- No build step — Tailwind via CDN (`?plugins=typography`), highlight.js via cdnjs CDN.
- Dark mode: `class` strategy, persisted in `localStorage` key `ld-dark`.
- Syntax highlighting: always uses `github-dark` theme regardless of light/dark mode.
- Search: instant client-side filter (title/category) + debounced (350 ms) server-side full-text.
- PDF export: `window.print()` + `@media print` CSS hides sidebar/header.
- Deep links: `?doc=<encodedId>` query param; `history.pushState` for back/forward.
- Sidebar: **General** category always first and expanded on load; all others collapsed.
- Auto-open: first doc in General is opened automatically when no `?doc=` param is present.
- Welcome screen pattern hint reads `filenamePattern` from config (not hardcoded).

### Inline editing

- **Edit button** on each document switches to a `<textarea>` with the raw markdown.
- **Save** → `PUT /api/documents/:id` → re-renders HTML in place without page reload.
- **Cancel** → reverts to read view; switching document also exits edit mode.

### Image paste

- In edit mode, `Cmd/Ctrl+V` with an image in the clipboard is intercepted on the textarea.
- A placeholder `![image](uploading...)` is inserted at cursor position immediately.
- The image is uploaded as base64 JSON to `POST /api/images/upload`.
- Server saves it to `DOCS_FOLDER/images/` (directory created if absent) with a timestamped filename.
- Placeholder is replaced by `![image](./images/<filename>)`.
- Images are served statically by Express at `/images/*` → `DOCS_FOLDER/images/`.

## Security notes

- Path traversal guard in `documents.ts`: resolved path must start with `path.resolve(docsPath)`.
- Extra files bypass the docsPath guard but are validated against the `extraFiles` whitelist in config.
- `GET /api/browse` is read-only and returns only directories and `.md` filenames — no file contents.
- Config `PUT` only allows a whitelist of safe fields; `extraFiles` entries are validated individually.
- `PUT /api/documents/:id` applies the same path traversal guard as the GET. Extra files require whitelist match.
- `POST /api/images/upload` saves only to `DOCS_FOLDER/images/` — no path parameter accepted.
- Image filenames are server-generated (timestamp + random suffix) — client cannot control the path.
- Express body limit raised to `20mb` to accommodate base64-encoded image uploads.

## Key commands

```bash
npm run dev              # nodemon + ts-node (auto-restarts on .ts/.html changes)
npm run build            # compile + copy assets
node dist/bin/cli.js ./docs --port 4321 --open
npx living-documentation ./docs
```

---

## npm package

Published on npm as `living-documentation`.

- Users install/run it with `npx living-documentation ./path/to/docs`
- The published artifact is `dist/` only (`files` field in `package.json`)
- `prepublishOnly` runs `npm run build` automatically before each publish
- Default port: **4321**

## ADR Index

> Load an ADR only when working on the related domain.

| Domain                              | ADR                                                                                                                                                            |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Extra files outside docs folder     | [2026*03_20*[CONFIGURATION]\_link_extra_files_as_documentation.md](documentation/adrs/2026_03_20_[CONFIGURATION]_link_extra_files_as_documentation.md)         |
| General category & sidebar collapse | [2026*03_21*[CONFIGURATION]\_general_category_and_sidebar_defaults.md](documentation/adrs/2026_03_21_[CONFIGURATION]_general_category_and_sidebar_defaults.md) |
| Always-dark syntax highlighting     | [2026*03_22*[STYLE]\_always_dark_syntax_highlighting.md](documentation/adrs/2026_03_22_[STYLE]_always_dark_syntax_highlighting.md)                             |
