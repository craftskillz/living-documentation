---
`🗄️ ADR : 2026_04_15_[EXPORT]_html_export_with_notion_and_confluence_zip_modes.md`
**date:** 2026-04-15
**status:** Validated
**description:** Add a server-side HTML export feature that converts selected first-level folders to a downloadable ZIP containing standalone HTML pages and their referenced images, with two modes: Notion (flat per group) and Confluence (HTML at group root, media in per-page subfolders).
**tags:** export, html, zip, notion, confluence, archiver, marked, frontmatter, images, modal, i18n, express, router, processHtml, sanitizeFilename, docGroup, wrapHtml
---

## Context

Users need to publish their Living Documentation content into tools like Notion or Confluence. Both platforms support importing HTML content from ZIP archives, but with different folder structures. The export had to be self-contained (no external CDN dependency), generated server-side, and streamed directly as a ZIP download.

## Decision

### Backend — `src/routes/export.ts`

A new Express router is mounted at `POST /api/export/html`. It accepts `{ folders: string[], mode: 'notion' | 'confluence' }` and streams a ZIP response via the `archiver` npm package.

**Document grouping** (`docGroup`): uses `doc.folder?.[0] ?? doc.category ?? 'General'` to place each document in the correct group folder.

**HTML generation pipeline per document:**

1. Read raw markdown from disk.
2. Strip frontmatter (`stripFrontmatter`, re-used from `documents.ts`).
3. Convert to HTML with `marked`.
4. `processHtml(html, mediaSubfolder?)`:
   - Removes `<a href="…/diagram…">` wrappers (keeps inner `<img>`).
   - Rewrites `src="./images/name.png"` → `src="./{mediaSubfolder}/name.png"` (or `./name.png` for Notion).
   - Collects referenced image basenames.
5. Wrap in a minimal self-contained HTML shell (`wrapHtml`) with embedded CSS (no external dependencies).

**ZIP structure:**

| Mode       | HTML path         | Image path             |
| ---------- | ----------------- | ---------------------- |
| Notion     | `group/page.html` | `group/image.png`      |
| Confluence | `group/page.html` | `group/page/image.png` |

Confluence follows the official import specification: the HTML filename becomes the Confluence page name, and supplemental media must live in a folder with the same name as the page (without `.html`).

Image deduplication is tracked per `imageDir/imageName` key to avoid adding the same file twice when multiple documents in the same group share an image.

### Frontend — `src/frontend/index.html`

- A new **HTML** button is added before the existing **PDF** button in the left drawer.
- Clicking it opens a modal listing all first-level folder/category names as unchecked checkboxes.
- Two export buttons: **Export Notion** and **Export Confluence**, each POSTing `{ folders, mode }` to `/api/export/html` and downloading the resulting blob as `export-notion.zip` or `export-confluence.zip`.
- All strings are fully internationalized via `en.json` / `fr.json` (`nav.export_html`, `modal.export_html.*`).

## Consequences

### PROS

- Zero client-side dependencies — no JSZip CDN, no client-side ZIP generation.
- Works for any document set size since the ZIP is streamed.
- Self-contained HTML output (embedded CSS) — no linked stylesheets needed.
- Same endpoint supports both Notion and Confluence with a single `mode` parameter.
- Reuses existing `listDocs`, `safeFilePath`, and `stripFrontmatter` from `documents.ts`.

### CONS

- Export is one-shot and not resumable — large exports could time out on very slow connections.
- Diagram images are only included if already saved as PNG in `DOCS_FOLDER/images/`; live diagram renders are not exported.
- Image deduplication is per mode/group pair; the same physical image used across groups will appear multiple times in the ZIP.
