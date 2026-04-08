---
name: living-documentation project overview
description: CLI tool that serves a local Markdown documentation viewer via Express — key architecture, build, and conventions
type: project
---

CLI tool (`living-documentation`) published on npm. Users run it with `npx living-documentation ./path/to/docs`.

**Why:** Serves pre-compiled; ships as `dist/` only.

**Architecture:**
- `bin/cli.ts` → CLI entry (Commander), validates args, calls `startServer()`
- `src/server.ts` → Express app, mounts API routes + serves static frontend
- `src/routes/documents.ts` → `/api/documents` (list, search, read, write)
- `src/routes/config.ts` → `/api/config` (read, write)
- `src/routes/browse.ts` → `/api/browse` (filesystem navigator, .md files only)
- `src/routes/images.ts` → `/api/images` (image upload from clipboard paste)
- `src/lib/parser.ts` → filename parsing logic (dynamic, driven by `filenamePattern`)
- `src/lib/config.ts` → `.living-doc.json` read/write with defaults
- `src/frontend/index.html` → single-page viewer (Tailwind CDN, hljs CDN, vanilla JS)
- `src/frontend/admin.html` → admin panel (config editor + extra files browser)

**Build:** `npm run build` → tsc + `scripts/copy-assets.js` (HTML files copied separately)

**Dev:** `npm run dev` → nodemon + ts-node

**Default port:** 4321

**Filename pattern:** Default `YYYY_MM_DD_HH_mm_[Category]_title_words.md`, configurable via `filenamePattern` in `.living-doc.json`. Tokens: `YYYY`, `MM`, `DD`, `HH`, `mm`, `[Category]`. Must contain `[Category]` exactly once. Old `YYYY_MM_DD` files (without time) remain backward-compatible.

**Config:** Persisted as `.living-doc.json` inside docs folder. Editable: `title`, `theme`, `filenamePattern`, `extraFiles`.

**Frontend:** No build step. Tailwind via CDN, highlight.js via cdnjs. Dark mode via `class` strategy, persisted in `localStorage` key `ld-dark`. Always uses `github-dark` syntax theme.

**How to apply:** Use this context to understand any code change request — respect the no-build-step frontend constraint, path traversal guards, and filenamePattern conventions.
