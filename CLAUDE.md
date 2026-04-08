# CLAUDE.md — Living Documentation

> **Usage**: This file is the entry point for any task on this project. It contains the critical rules and context needed before making changes.
> To understand the _why_ behind a decision, glob `documentation/adrs/` and read only each ADR's frontmatter `description` and `tags` to identify the relevant one — then load the full file.
> **Memory**: At the start of each session, read `memory/MEMORY.md` and load the relevant memory files listed there.
> **Library docs**: Use the **context7 MCP** (installed globally) to fetch up-to-date library documentation instead of scraping/downloading raw bundles. Example: query context7 for `vis-network` to get accurate API docs without token-heavy file fetches.

## Project overview

CLI tool (`living-documentation`) that serves a local Markdown documentation viewer via Express.
Ships pre-compiled; users run it with `npx living-documentation ./path/to/docs`.

## Architecture

```
bin/cli.ts                  → CLI entry (Commander), validates args, calls startServer()
src/server.ts               → Express app, mounts API routes + serves static frontend
src/routes/documents.ts     → /api/documents  (list, search, read, write)
src/routes/config.ts        → /api/config     (read, write)
src/routes/browse.ts        → /api/browse     (filesystem navigator, dirs + .md files)
src/routes/images.ts        → /api/images     (image upload from clipboard paste)
src/routes/wordcloud.ts     → /api/wordcloud  (recursive file reader, returns raw text)
src/lib/parser.ts           → filename parsing logic (dynamic, driven by filenamePattern)
src/lib/config.ts           → .living-doc.json read/write with defaults
src/frontend/index.html     → single-page viewer (Tailwind CDN, hljs CDN, vanilla JS)
src/frontend/wordcloud.js   → word cloud logic: stop words, browser, rendering (loaded by index.html)
src/frontend/admin.html     → admin panel (config editor + extra files browser)
scripts/copy-assets.ts      → copies src/frontend/ → dist/src/frontend/ after tsc
```

## Build

```bash
npm run build   # tsc + copy HTML assets to dist/ + chmod +x dist/bin/cli.js
```

TypeScript compiles to `dist/` with the same sub-tree (`dist/bin/`, `dist/src/`).
HTML files are **not** compiled by tsc — `scripts/copy-assets.js` copies them.
The server looks for frontend files at `path.join(__dirname, 'frontend')`, i.e. `dist/src/frontend/`.

## Filename pattern

Default: `YYYY_MM_DD_HH_mm_[Category]_title_words.md`

The pattern is **configurable** via `filenamePattern` in `.living-doc.json`. `parser.ts` builds regex dynamically from the configured pattern at runtime — token order is respected (e.g. `[Category]_YYYY_MM_DD_HH_mm_title` works).

Recognized tokens: `YYYY`, `MM`, `DD`, `HH`, `mm` (date+time group), `[Category]` (category group). Everything else is treated as the title placeholder.

Constraints on `filenamePattern`:
- Must contain `[Category]` **exactly once** — validated on write (server 400 + client error).

Parser tries three strategies in order:

1. Full pattern (date + category present) → extracts date, category, title
2. Date-only fallback → extracts date and title, category = "General"
3. Fallback → filename as title, category = "General", date = null

Documents are sorted by **full filename** (ascending `localeCompare`) within each category.

## Config

Persisted as `.living-doc.json` inside the docs folder.
Editable fields via `PUT /api/config`: `title`, `theme`, `filenamePattern`, `extraFiles`, `showDiagramDebug`.
`docsFolder` and `port` are write-once from CLI and are informational only in the API.

`showDiagramDebug` (bool, default `false`) — when `true`, a "dbg" button appears in the diagram editor top bar that toggles a DOM debug overlay showing each node's position and dimensions. Toggled from the Admin panel.

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
- Article header is `sticky top-0` — title and action buttons remain visible while scrolling.

### Inline editing

- **Edit button** on each document switches to a `<textarea>` with the raw markdown.
- **Save** → `PUT /api/documents/:id` → re-renders HTML in place without page reload.
- **Cancel** → reverts to read view; switching document also exits edit mode.
- Scroll position of `content-area` is saved on enter and restored on exit (Cancel or Save).

### Word Cloud

Accessible via the **☁ Word Cloud** button in the header. Opens a full-screen overlay.

- **Search root** — pre-filled from `docsFolder` config (or `localStorage` on subsequent visits).
- **Browse** — inline folder browser (uses `/api/browse`) to navigate and select any directory.
- **Extensions** — checkboxes grouped by family: docs (`.md`, `.txt`), JS/TS, JVM, systems, web, config.
- **Launch** — calls `GET /api/wordcloud?path=…&ext=…` which recursively reads matching files and returns concatenated text.
- Stop words: human (EN + FR) in `WC_STOP_WORDS`; language keywords per extension in `WC_LANG_STOP_WORDS` (activated dynamically). Import/package lines stripped before tokenisation.
- Root path and selected extensions persisted in `localStorage` (`wc-root`, `wc-exts`).
- All logic lives in `src/frontend/wordcloud.js` (plain script, global symbols — not an ES module).

### Image paste

- In edit mode, `Cmd/Ctrl+V` with an image in the clipboard is intercepted on the textarea.
- A placeholder `![image](uploading...)` is inserted at cursor position immediately.
- The image is uploaded as base64 JSON to `POST /api/images/upload`.
- Server saves it to `DOCS_FOLDER/images/` (directory created if absent) with a timestamped filename.
- Placeholder is replaced by `![image](./images/<filename>)`.
- Images are served statically by Express at `/images/*` → `DOCS_FOLDER/images/`.

## Diagram editor

`src/frontend/diagram.html` — standalone vis-network 9.1.9 canvas editor, served at `/diagram`.

Deep-link to a specific diagram: `/diagram?id=<diagramId>` — `loadDiagramList()` reads the `id` query param and opens the matching diagram on load.

The **← Back** button calls `history.back()` — returns to the referring page (e.g. a document that linked to the diagram via a clickable image).

JavaScript extracted into ES modules under `src/frontend/diagram/` (copied to `dist/` by `copy-assets.ts`):

```
diagram/constants.js        → NODE_COLORS, TOOL_BTN_MAP, GRID_SIZE
diagram/state.js            → shared mutable state object `st` + markDirty()
diagram/node-rendering.js   → actor renderer, visNodeProps, computeVadjust, getActualNodeHeight
diagram/edge-rendering.js   → visEdgeProps
diagram/label-editor.js     → floating textarea for node/edge label editing
diagram/selection-overlay.js → selection box + corner resize handles
diagram/node-panel.js       → node formatting panel (color, font, alignment, z-order)
diagram/edge-panel.js       → edge formatting panel (arrow, dashes, font)
diagram/grid.js             → grid drawing (DPR), snap-to-grid, physics toggle
diagram/debug.js            → debug overlay (node coords/dimensions)
diagram/zoom.js             → zoom controls
diagram/network.js          → initNetwork, _drawNodes patch, all vis.js event handlers
diagram/persistence.js      → CRUD /api/diagrams, diagram list rendering
diagram/clipboard.js        → copy/paste with ID remapping
diagram/main.js             → entry point: toolbar wiring, keyboard shortcuts, app init
```

All `onclick` attributes removed from HTML; buttons have explicit `id` or `data-color`; listeners wired in `main.js` via `addEventListener`. No globals added — `vis` remains the only CDN global.

### vis-network gotchas (read before touching diagram code)

- **`ctxRenderer` is cached** — vis-network instantiates `CustomShape` once and never re-reads `ctxRenderer` from the DataSet after `nodes.update()`. Rebuilding the closure on resize has zero effect. Fix: use a stable renderer that reads live state via `st.nodes.get(id)` on every draw call.
- **`getBoundingBox()` is wrong for custom shapes** — always returns a near-zero box for `shape: 'custom'`. Compute actor bounds manually from `bodyNode.x/y` + scaled geometry.
- **`refreshNeeded` must be forced for `database` shape** — `needsRefresh()` checks label/font state, not `widthConstraint`/`heightConstraint`. When only dimensions change, vis-network skips the resize pass. Fix: set `network.body.nodes[id].refreshNeeded = true` then `network.redraw()` after every `nodes.update()` during resize.
- **`drawExternalLabel` double-renders for `ctxRenderer`** — the `_drawNodes` patch must skip `drawExternalLabel` callbacks for `node.options.shape === 'custom'`, otherwise the label is drawn twice (once by the renderer, once externally).
- **`_drawNodes` patch** — replaces vis-network's 3-pass render (normal → selected → hovered) with a single pass in `canonicalOrder`. If vis-network is upgraded, re-verify the signature.

### Z-order (`_canonicalOrder`)

vis.js renders nodes in three passes (normal → selected → hovered), always drawing hover/selected nodes on top. To preserve user-defined stacking, `network.renderer._drawNodes` is **monkey-patched** at network creation time to perform a single pass in `_canonicalOrder` — an app-managed array that holds node IDs in the desired draw order (first = bottom, last = top).

- `_canonicalOrder` is initialised from `network.body.nodeIndices` after `new vis.Network(...)`.
- `nodes.on('add')` / `nodes.on('remove')` keep it in sync when nodes are added or deleted.
- `changeZOrder(+1/-1)` mutates `_canonicalOrder` directly then calls `network.redraw()`.
- `saveDiagram` serialises nodes in `_canonicalOrder` order so z-order is restored on reload.
- **If vis-network is upgraded**, re-verify `_drawNodes`'s signature and internal logic before releasing.

### Snap to grid

Grid size: `GRID_SIZE = 40` world units. Snap targets the **visual top-left corner** of each shape, not the centre.

```js
const w  = bodyNode.shape.width;   // set by shape.resize() on every draw — correct for all shapes
const h  = bodyNode.shape.height;
const snappedLeft = Math.round((cx - w/2) / GRID_SIZE) * GRID_SIZE;
const snappedTop  = Math.round((cy - h/2) / GRID_SIZE) * GRID_SIZE;
network.moveNode(id, snappedLeft + w/2, snappedTop + h/2);
```

Do **not** use `network.getBoundingBox()` for snap: it inflates `box` shapes by `borderRadius` and returns wrong values for `actor` (custom shape).

### Grid drawing (DPR)

`drawGrid` resets to physical pixels with `ctx.setTransform(1,0,0,1,0,0)`. vis.js coordinates (`center.x`, `scale`) are in CSS pixels, so they must be multiplied by `window.devicePixelRatio` to match physical pixel space — otherwise the grid is misaligned on Retina displays.

### Debug overlay

Toggled by the `showDiagramDebug` config flag (Admin panel checkbox). Renders DOM `div` elements (selectable text) positioned with `network.canvasToDOM()`, showing `cx`, `cy`, `w`, `h`, `L = cx-w/2`, `T = cy-h/2` for each node. Updated on every `afterDrawing` event.

## Security notes

- Path traversal guard in `documents.ts`: resolved path must start with `path.resolve(docsPath)`.
- Extra files bypass the docsPath guard but are validated against the `extraFiles` whitelist in config.
- `GET /api/browse` is read-only and returns only directories and `.md` filenames — no file contents.
- Config `PUT` only allows a whitelist of safe fields; `extraFiles` entries are validated individually.
- `PUT /api/documents/:id` applies the same path traversal guard as the GET. Extra files require whitelist match.
- `POST /api/images/upload` saves only to `DOCS_FOLDER/images/` — no path parameter accepted.
- Image filenames are server-generated (timestamp + random suffix) — client cannot control the path.
- Express body limit raised to `20mb` to accommodate base64-encoded image uploads.
- `GET /api/wordcloud` reads arbitrary paths on disk — intentionally unrestricted since the server is local-only.

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

## ADRs

ADRs are in `documentation/adrs/`. To find relevant ones, glob that directory and read only the frontmatter `description` and `tags` of each file — load the full ADR only when working on the related domain.

```text
dossier/
├── fichier.md
└── toto/
    └── text.md
```

| En-tête 1 | En-tête 2 | En-tête 3 |
| --------- | --------- | --------- |
| a         | b         | v         |
| d         | f         | g         |