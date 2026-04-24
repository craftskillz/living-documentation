# CLAUDE.md — Living Documentation

> **Usage**: This file is the entry point for any task on this project. It contains the critical rules and context needed before making changes.
> To understand the _why_ behind a decision, glob `documentation/adrs/` and read only each ADR's frontmatter `description` and `tags` to identify the relevant one — then load the full file.
> **Memory**: At the start of each session, read `memory/MEMORY.md` and load the relevant memory files listed there.
> **Library docs**: Use the **context7 MCP** (installed globally) to fetch up-to-date library documentation instead of scraping/downloading raw bundles. Example: query context7 for `vis-network` to get accurate API docs without token-heavy file fetches.

> **⚠️ Internationalization — mandatory rule**: Every user-visible string (button text, label, placeholder, tooltip/title, any text rendered in the UI) **must** be added to both `src/frontend/i18n/en.json` **and** `src/frontend/i18n/fr.json`. HTML elements must use the appropriate attribute: `data-i18n` (textContent), `data-i18n-title` (title), `data-i18n-placeholder` (placeholder), `data-i18n-html` (innerHTML). Dynamic strings built in JS must use `window.t('key')`. No hardcoded English string is acceptable in any of the three pages (index.html, admin.html, diagram.html).

## Project overview

CLI tool (`living-documentation`) that serves a local Markdown documentation viewer via Express.
Ships pre-compiled; users run it with `npx living-documentation ./path/to/docs`.

## Architecture

```
bin/cli.ts                  → CLI entry (Commander), validates args, calls startServer()
src/server.ts               → Express app, mounts API routes + serves static frontend
src/routes/documents.ts     → /api/documents    (list, search, read, write, create, delete)
src/routes/config.ts        → /api/config       (read, write)
src/routes/browse.ts        → /api/browse       (filesystem navigator, dirs + .md files, mkdir)
src/routes/images.ts        → /api/images       (image upload from clipboard paste)
src/routes/files.ts         → /api/files        (arbitrary file upload, blocked-extension filter)
src/routes/wordcloud.ts     → /api/wordcloud    (recursive file reader, returns raw text)
src/routes/diagrams.ts      → /api/diagrams     (CRUD of vis-network diagrams as JSON)
src/routes/annotations.ts   → /api/annotations  (per-doc highlight markers)
src/routes/metadata.ts      → /api/metadata     (per-doc source-file bindings + reliability report)
src/routes/browse-source.ts → /api/browse-source (navigate sourceRoot tree for metadata picker)
src/routes/export.ts        → /api/export       (HTML export, Notion + Confluence zip modes)
src/mcp/server.ts           → /mcp              (Model Context Protocol, Streamable HTTP)
src/mcp/tools/documents.ts  → MCP tools: list_documents, read_document, create_document
src/mcp/tools/diagrams.ts   → MCP tools: list_diagrams, read_diagram, create_diagram
src/mcp/tools/source.ts     → MCP tools: list_source_files, read_source_file, search_source
src/mcp/tools/metadata.ts   → MCP tools: list_metadata, get_accuracy, add_metadata, refresh_metadata
src/lib/parser.ts           → filename parsing logic (dynamic, driven by filenamePattern)
src/lib/config.ts           → .living-doc.json read/write with defaults
src/lib/metadata.ts         → .metadata.json store + reliability report (unchanged / total)
src/lib/hash.ts             → sha256File helper
src/frontend/index.html     → viewer shell (Tailwind CDN, hljs CDN) — logic in sibling .js modules
src/frontend/admin.html     → admin panel (config editor + extra files browser)
src/frontend/diagram.html   → diagram editor shell — logic in src/frontend/diagram/*.js
src/frontend/i18n.js        → IIFE loader for /i18n/{en,fr}.json; exposes window.t / data-i18n
src/frontend/i18n/{en,fr}.json → translation catalogs (mandatory for every user-visible string)
src/frontend/vendor/wordcloud2.js → vendored wordcloud2.js (no CDN)
src/frontend/wordcloud.js   → word cloud logic: stop words, browser, rendering
scripts/copy-assets.ts      → copies src/frontend/ + starting-doc/ → dist/ after tsc
starting-doc/               → sample docs bundled in the npm package (copied to dist/)
```

### Viewer frontend modules (loaded by `index.html` via `defer` script tags)

```
utils.js                    → shared helpers (slug, escape, etc.)
state.js                    → shared mutable state (current doc, edit mode flags)
sidebar-helpers.js          → sidebar DOM builders (folder/category groups)
sidebar.js                  → sidebar rendering + collapse/expand
config.js                   → fetch/update /api/config from the UI
dark-mode.js                → `ld-dark` localStorage toggle
search.js                   → instant client filter + debounced server-side search
documents.js                → load/render/save document content
image-paste.js              → Cmd/Ctrl+V image upload in the editor
file-attach.js              → paperclip attachments: drag-drop, paste, file picker (non-image)
annotations.js              → highlight-marker creation, persistence, DOM anchor traversal
metadata.js                 → source-file metadata modal + sourceRoot browser (add/remove/refresh)
accuracy-gauge.js           → red→green gradient reliability bar in the doc header (hidden when doc has no entries)
export.js                   → PDF print + HTML/Notion/Confluence export dialog
snippets.js                 → snippet inserter panel (entry point)
snippet-detect.js           → detect an existing snippet under the caret
snippet-table.js            → table-editor snippet (dynamic rows/columns)
snippet-tree.js             → tree-editor snippet (ASCII connectors)
new-doc-modal.js            → "New document" modal with folder browser
new-folder-modal.js         → "New folder" modal
files-modal.js              → "Metadata Files" popup (list/replace/delete DOCS_FOLDER/files/)
confirm-modal.js            → Generic showConfirm() Promise-based confirmation modal (z-[60])
diagram-link-modal.js       → link-to-diagram snippet picker
misc.js                     → small UI glue (welcome screen, etc.)
boot.js                     → entry point: wires modules, initial fetch, URL deep-link
```

## Build

```bash
npm run build   # tsc + copy HTML assets to dist/ + chmod +x dist/bin/cli.js
```

TypeScript compiles to `dist/` with the same sub-tree (`dist/bin/`, `dist/src/`).
Non-TypeScript assets (HTML, plain `.js` frontend modules, `i18n/*.json`, `vendor/`) are **not** compiled by tsc — `scripts/copy-assets.ts` recursively copies `src/frontend/` → `dist/src/frontend/` and `starting-doc/` → `dist/starting-doc/`.
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

Persisted as `.living-doc.json` inside the docs folder. **All stored paths are relative to the docs folder** (POSIX slashes) so the file can be checked into git and shared across machines. Absolute paths are rejected by the CLI, by `PUT /api/config`, and by the Admin panel. Legacy configs with absolute paths are silently migrated to relative on first read (one-time `[living-doc]` console warnings are printed).

`src/lib/config.ts` exposes two shapes:
- `StoredConfig` — what is serialised to disk (relative paths; no `docsFolder` field).
- `LivingDocConfig` — what `readConfig()` returns to the rest of the app (absolute `sourceRoot`, `extraFiles`, and `docsFolder`, all resolved at runtime from the storage form).

Editable fields via `PUT /api/config`: `title`, `theme`, `language`, `filenamePattern`, `extraFiles`, `showDiagramDebug`, `sourceRoot`, `diagramNodePalette`, `diagramEdgePalette`, `blockedFileExtensions`, `exclusiveFolderExpansion`, `exclusiveCategoryExpansion`, `codeBlockMaxHeight`, `markdownSoftBreaks`.
`port` is write-once from CLI and is informational only. `docsFolder` is runtime-only (resolved from the CLI argument) and never persisted — the CLI requires a relative folder argument (e.g. `npx living-documentation ./mydocs`); absolute or `~`-prefixed paths are rejected at startup.

`sourceRoot` (stored: `string|null` relative to docs folder, default `null` → runtime resolves to `..`) — once resolved to an absolute path, this is used by the MCP source tools (`list_source_files`, `read_source_file`, `search_source`) and the metadata picker. Keeps the MCP server able to read the project source when the docs folder sits inside a larger repo.

`showDiagramDebug` (bool, default `false`) — when `true`, a "dbg" button appears in the diagram editor top bar that toggles a DOM debug overlay showing each node's position and dimensions. Toggled from the Admin panel.

### extraFiles

An ordered array of **paths relative to the docs folder** pointing to `.md` files outside it (e.g. `"../README.md"`).
These files are always shown under the **General** category, before regular General documents.
Validated on write: entries must be relative paths ending in `.md`; absolute or `~`-prefixed paths return HTTP 400. At runtime `readConfig()` resolves each entry to an absolute path so downstream code (routes, MCP tools, export) keeps manipulating absolute paths.

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

### File attachments (paperclip)

Non-image files are handled by `file-attach.js` alongside image paste. Three entry points in the editor:
- Drag & drop any non-image file onto the `#doc-editor` textarea.
- `Cmd/Ctrl+V` on the textarea when the clipboard holds a non-image file (via `clipboardData.files`).
- **Snippets → 📎 File attachment** → **Insert** opens the OS file picker.

Pipeline:
- A placeholder `[📎 uploading…](…)` is inserted at cursor position.
- Payload: base64 JSON → `POST /api/files/upload` (no multer dependency; shares the 20 MB body limit with images, server caps at 19 MB with an explicit `File too large` error).
- Server saves under `DOCS_FOLDER/files/` with a slugified `<timestamp>_<random>_<base>.<ext>` filename. Client cannot choose the path — prevents traversal.
- Extensions listed in `blockedFileExtensions` are rejected server-side (default: `exe sh bat cmd com scr ps1 msi`, editable in Admin).
- Placeholder is replaced by `[📎 <originalName>](./files/<filename>)`.
- Files are served statically by Express at `/files/*` → `DOCS_FOLDER/files/`.
- `documents.ts` post-processes rendered HTML: every `<a href="./files/...">` is decorated with `class="ld-file-attachment"`, `target="_blank"`, `rel="noopener"`, and a prepended `<i class="fa-solid fa-paperclip ld-file-icon"></i>` when the label does not already contain a paperclip glyph — produces the purple pill look in the reader.

### Source-file metadata & reliability gauge

**This is a cornerstone feature of Living Documentation.** A doc without a way to detect drift from the code it describes is just a stale text file. Every document can be bound to the source files it covers; each binding stores the file's SHA-256 hash so drift is visible at a glance.

- **Storage**: single `.metadata.json` file at the docs folder root, shape `{ [docId]: MetadataEntry[] }`. `MetadataEntry = { path: string; hash: string }` where `path` is relative to `sourceRoot`.
- **Reliability formula** (UI label: "Reliability" / "Fiabilité", historical key name `accuracy.*`): `reliability = unchanged / total`, in `[0, 1]`. Empty doc = `1`. Every entry is an assertion "this doc is in sync with this source file" — `modified` and `missing` both break the assertion and count the same in the numerator. The per-status counts are still exposed so the UI can distinguish severity visually.
- **REST** (`src/routes/metadata.ts`): `GET /api/metadata/:docId` (report), `POST /api/metadata/:docId` (add/replace entry), `DELETE /api/metadata/:docId` (remove), `POST /api/metadata/:docId/refresh` (re-hash all → re-baseline). All operations validate paths are under `sourceRoot`.
- **Source browser** (`src/routes/browse-source.ts`): `GET /api/browse-source?path=<rel>` returns `dirs + files` under `sourceRoot`, skipping heavy folders (`node_modules`, `dist`, `.git`, `build`, `target`, `.venv`, …) and dotfiles except `.github`.
- **Frontend**: `metadata-btn` in the doc header opens a modal (`metadata.js`) with add/remove/refresh actions and an inline `sourceRoot` file picker. `accuracy-gauge.js` renders a **red→orange→yellow→green gradient bar** in the sticky header — the bar's width reflects the reliability ratio, and only the left portion of the full-track gradient is visible (so a 30 % doc shows red/orange, a 100 % doc shows the whole gradient). The numeric `%` beside the bar uses threshold colours (green >80 %, yellow ≥60 %, orange ≥40 %, red <40 %). Hidden when the doc has zero entries. Clicking the gauge opens the metadata modal.
- **Metadata Files popup** (top bar `📁 Metadata Files` / `📁 Fichiers Métadonnées` before Admin): lists every file under `DOCS_FOLDER/files/` (`files-modal.js`), sorted chronologically via their `YYYYMMDDHHmmss_<rand4>_<slug>.<ext>` prefix. Actions **Replace** (`PUT /api/files/:filename`, overwrites in place, no history) and **Delete** (`DELETE /api/files/:filename`). After either op the popup closes and `window.runSearchImmediate('metadata://<filename>')` pre-fills the search to surface affected docs.
- **`metadata://` search prefix**: `GET /api/documents/search?q=metadata://<basename>` reads `.metadata.json` and returns docs whose entries' `path.basename()` matches. Critical subtlety: parser-produced doc IDs are URL-encoded, metadata store keys are decoded — use `decodeURIComponent(d.id)` on the filter side. Frontend (`search.js`) detects the prefix, skips the local title/category filter, and the in-doc search notice banner is hidden for metadata queries (not useful there).
- **MCP tools** (`src/mcp/tools/metadata.ts`): `list_metadata`, `get_accuracy`, `add_metadata`, `refresh_metadata`. Intended workflow for an MCP client: `get_accuracy` to detect drift → `read_document` + `read_source_file` on modified entries → `create_document` to overwrite → `refresh_metadata` to re-baseline.

### Reusable confirmation modal

`src/frontend/confirm-modal.js` exposes `window.showConfirm({ title, message, detail, confirmLabel, cancelLabel, danger })` → `Promise<boolean>`. Replaces native `window.confirm()` for consistent Tailwind styling. Keyboard: `Escape` = false, `Enter` = true; backdrop click = cancel; auto-focuses the OK button. `danger: true` gives the OK button red styling; otherwise blue. The modal sits at `z-[60]` so it stacks above application modals at `z-50`. Use it for any destructive confirmation rather than rolling a new dialog.

## Diagram editor

`src/frontend/diagram.html` — standalone vis-network 9.1.9 canvas editor, served at `/diagram`.

Deep-link to a specific diagram: `/diagram?id=<diagramId>` — `loadDiagramList()` reads the `id` query param and opens the matching diagram on load.

The **← Back** button calls `history.back()` — returns to the referring page (e.g. a document that linked to the diagram via a clickable image).

JavaScript extracted into ES modules under `src/frontend/diagram/` (copied to `dist/` by `copy-assets.ts`):

```
diagram/constants.js        → NODE_COLORS, NODE_L_RATIOS, TOOL_BTN_MAP, GRID_SIZE, color palettes
diagram/state.js            → shared mutable state object `st` + markDirty()
diagram/node-rendering.js   → actor renderer, visNodeProps, computeVadjust, getActualNodeHeight
diagram/edge-rendering.js   → visEdgeProps
diagram/label-editor.js     → floating textarea for node/edge label editing
diagram/selection-overlay.js → selection box + corner resize handles
diagram/node-panel.js       → node formatting panel (color, font, alignment, z-order, lock, stamp)
diagram/edge-panel.js       → edge formatting panel (arrow, dashes, font, color, width, lock)
diagram/link-panel.js       → linked-diagram picker for node drill-down
diagram/grid.js             → grid drawing (DPR), snap-to-grid, physics toggle
diagram/alignment.js        → alignment guides + center-snap against closest node
diagram/ports.js            → port-anchored edge endpoints on node sides
diagram/groups.js           → group / ungroup selection
diagram/debug.js            → debug overlay (node coords/dimensions)
diagram/zoom.js             → zoom controls
diagram/network.js          → initNetwork, _drawNodes patch, image nodes, all vis.js event handlers
diagram/persistence.js      → CRUD /api/diagrams, diagram list rendering
diagram/clipboard.js        → copy/paste with ID remapping, copy/save selection as PNG
diagram/history.js          → snapshot-based undo/redo
diagram/image-upload.js     → POST /api/images/upload wrapper
diagram/image-name-modal.js → modal to name an uploaded image before insertion
diagram/unlock-hold.js      → hold-to-unlock gesture on locked nodes
diagram/toast.js            → in-editor toast notifications
diagram/t.js                → i18n shortcut bound to window.t for diagram strings
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

## MCP server

`src/mcp/server.ts` exposes the project over the Model Context Protocol at `POST /mcp` (Streamable HTTP, stateless — one `Server`+`Transport` per request). `GET /mcp` returns a JSON summary for quick inspection.

Tools (see `src/mcp/tools/`):
- `list_documents`, `read_document`, `create_document` — documents are the source of truth.
- `list_diagrams`, `read_diagram`, `create_diagram` — diagrams are derived views; `create_diagram` enforces `diagramType` + `userRequestedExplicitly` guardrails for non-context types.
- `list_source_files`, `read_source_file`, `search_source` — read-only source code access rooted at `config.sourceRoot`; fallback only when docs don't carry the needed detail (e.g., screen-guide diagrams).
- `list_metadata`, `get_accuracy`, `add_metadata`, `refresh_metadata` — bind source files to a doc and measure drift via SHA-256 hashes. `get_accuracy` returns a weighted accuracy in `[0, 1]`; `refresh_metadata` re-baselines after the doc has been updated.
- `get_server_guide` — returns the `SERVER_GUIDE` (also sent as `instructions` on initialize).

Prompts (`generate-context-diagram`, `generate-container-diagram`, `generate-uml-diagram`, `update-diagram-from-docs`, `generate-screen-guide`, `flow`, `erd`) build diagram-creation templates client-side — zero tokens consumed by the server.

## Security notes

- Path traversal guard in `documents.ts`: resolved path must start with `path.resolve(docsPath)`.
- Extra files bypass the docsPath guard but are validated against the `extraFiles` whitelist in config.
- `GET /api/browse` is read-only and returns only directories and `.md` filenames — no file contents. `POST /api/browse/mkdir` is restricted under `docsPath`.
- Config `PUT` only allows a whitelist of safe fields; `extraFiles` entries are validated individually.
- `PUT /api/documents/:id` and `DELETE /api/documents/:id` apply the same path traversal guard as the GET. Extra files require whitelist match.
- `POST /api/documents` creates files only under `docsPath` (optionally in a sub-folder under it).
- `POST /api/images/upload` saves only to `DOCS_FOLDER/images/` — no path parameter accepted.
- Image filenames are server-generated (timestamp + random suffix) — client cannot control the path.
- `POST /api/files/upload` saves only to `DOCS_FOLDER/files/` — server-generated filenames; extensions in `blockedFileExtensions` are rejected; 19 MB payload cap enforced before the Express 20 MB body limit kicks in.
- Express body limit raised to `20mb` to accommodate base64-encoded image and file uploads.
- `GET /api/wordcloud` reads arbitrary paths on disk — intentionally unrestricted since the server is local-only.
- MCP source tools (`read_source_file`, `search_source`, `list_source_files`) are rooted at `config.sourceRoot` and reject paths that escape it; common heavy folders (`node_modules`, `dist`, `.git`, `build`, `target`) are skipped.
- `/api/metadata/*` and `/api/browse-source` resolve every user-supplied path against `config.sourceRoot` via `assertUnderSourceRoot` and reject any path that escapes it. `browse-source` additionally filters heavy folders (`node_modules`, `dist`, `build`, `target`, `.venv`, …) and dotfiles.

## Key commands

```bash
npm run dev              # nodemon + ts-node (auto-restarts on .ts/.html changes)
npm run build            # compile + copy assets
node dist/bin/cli.js ./docs --port 4321 --open
npx living-documentation ./docs
npm run test:e2e         # build + Playwright E2E tests (headless chromium)
npm run test:e2e:ui      # Playwright UI mode (interactive runner, traces, replay)
npm run test:coverage    # full suite + c8 report (text, HTML at coverage/index.html, lcov)
```

---

## Tests (Playwright E2E)

End-to-end suite lives under `tests/`. Each test spawns a **real CLI child process** against a copy of a fixture directory in `os.tmpdir()`, on a **random free port**, so tests run in parallel without state leakage. Fixtures are standalone directory trees under `tests/fixtures/<name>/testdocs/` (plus optional sibling folders like `src/` for metadata fixtures).

- `tests/helpers/fixture.ts` — copies a fixture to a temp dir; `__FRESH__` in `.metadata.json` triggers on-the-fly SHA-256 re-baselining against the current source file so metadata tests don't depend on build artefacts.
- `tests/helpers/server.ts` — spawns `node dist/bin/cli.js ./testdocs --port <free>`, waits for the boot banner, returns a killable `ChildProcess`.
- `tests/helpers/ld-fixture.ts` — Playwright `test.extend` that wires fixture + server + teardown. Override the fixture per describe with `test.use({ fixtureName: 'with-metadata' })`.
- `tests/helpers/coverage.ts` — injects `NODE_V8_COVERAGE=coverage/tmp` into spawned processes when `COVERAGE=1`. Gated so normal runs don't pay any cost.
- **CLI tests** (`tests/api/cli.spec.ts`) don't spawn a server — they invoke the CLI directly with `spawnSync` to assert rejection of absolute paths and help output.
- CI runs the suite on PRs via `.github/workflows/e2e.yml` (Chromium only, cached browsers, report uploaded on failure).

### Coverage (c8)

`npm run test:coverage` runs the full suite with `COVERAGE=1` set. Each spawned Node process (server + CLI tests) writes V8 coverage JSON to `coverage/tmp/` via the `NODE_V8_COVERAGE` env var; `c8 report` aggregates them into `coverage/` (text + HTML + lcov). Config in `.c8rc.json` covers `dist/src/**` and `dist/bin/**`, excluding `dist/src/frontend/**` and `.d.ts`.

**Critical**: `bin/cli.ts` installs a `process.once("SIGTERM", () => process.exit(0))` handler so V8 flushes coverage on graceful shutdown when the test fixture kills the server (without it, V8 drops the coverage JSON and numbers are wildly under-reported).

When adding tests that need a specific pre-state, create a new folder under `tests/fixtures/` rather than mutating an existing one — fixtures are meant to be reusable across multiple tests.

---

## npm package

Published on npm as `living-documentation`.

- Users install/run it with `npx living-documentation ./path/to/docs`
- The published artifact is `dist/` only (`files` field in `package.json`)
- `prepublishOnly` runs `npm run build` automatically before each publish
- Default port: **4321**

## ADRs

ADRs are in `documentation/adrs/`. To find relevant ones, glob that directory and read only the frontmatter `description` and `tags` of each file — load the full ADR only when working on the related domain.