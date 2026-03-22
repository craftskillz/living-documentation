# CLAUDE.md — Living Documentation

> **Usage**: This file is the entry point for any task on this project. It contains the critical rules and context needed before making changes.
> To understand the *why* behind a decision, refer to the relevant ADR in `documentation/adrs/` — load those files only when working on the related domain.

## Project overview

CLI tool (`living-documentation`) that serves a local Markdown documentation viewer via Express.
Ships pre-compiled; users run it with `npx living-documentation ./path/to/docs`.

## Architecture

```
bin/cli.ts                  → CLI entry (Commander), validates args, calls startServer()
src/server.ts               → Express app, mounts API routes + serves static frontend
src/routes/documents.ts     → /api/documents  (list, search, read)
src/routes/config.ts        → /api/config     (read, write)
src/lib/parser.ts           → filename parsing logic
src/lib/config.ts           → .living-doc.json read/write with defaults
src/frontend/index.html     → single-page viewer (Tailwind CDN, hljs CDN, vanilla JS)
src/frontend/admin.html     → admin panel (config editor)
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

Parser (`src/lib/parser.ts`) tries three strategies in order:
1. Full pattern → extracts date, category, title
2. Date-only    → extracts date and title, category = "Uncategorized"
3. Fallback     → filename as title, category = "Uncategorized", date = null

## Config

Persisted as `.living-doc.json` inside the docs folder.
Editable fields via `PUT /api/config`: `title`, `theme`, `filenamePattern`.
`docsFolder` and `port` are write-once from CLI and are informational only in the API.

## Frontend

- No build step — Tailwind via CDN (`?plugins=typography`), highlight.js via cdnjs CDN.
- Dark mode: `class` strategy, persisted in `localStorage` key `ld-dark`.
- Search: instant client-side filter (title/category) + debounced (350 ms) server-side full-text.
- PDF export: `window.print()` + `@media print` CSS hides sidebar/header.
- Deep links: `?doc=<encodedId>` query param; `history.pushState` for back/forward.

## Security notes

- Path traversal guard in `documents.ts`: resolved path must start with `path.resolve(docsPath)`.
- Config `PUT` only allows a whitelist of safe fields.

## Key commands

```bash
npm run dev              # ts-node bin/cli.ts (no build needed)
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

| Domain                                                | ADR                                                                   |
| ----------------------------------------------------- | --------------------------------------------------------------------- |