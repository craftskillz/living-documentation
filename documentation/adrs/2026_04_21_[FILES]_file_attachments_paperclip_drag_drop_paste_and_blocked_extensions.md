---
date: 2026-04-21
status: Accepted
description: Add a file attachment feature to the Markdown editor (non-image files) — base64 upload, drag-drop / paste / file-picker entry points, paperclip decoration at render time, configurable blocked extensions and 19 MB cap.
tags: files, attachments, upload, paperclip, drag-drop, paste, base64, blocked-extensions, admin-config, security, documents, rendering, i18n
---

## Context

The editor already supported pasting images from the clipboard (`image-paste.js` → `POST /api/images/upload` → `DOCS_FOLDER/images/`). Users asked to attach arbitrary **non-image** files (PDF, archives, office docs, binaries, …) to their Markdown documents so that the rendered article shows a clickable paperclip link that opens the file in a new tab.

Constraints expressed by the user:

- No new dependencies (no `multer`, no streaming layer). The existing base64 JSON pipeline used for images must be reused.
- The Express body limit (20 MB) is sufficient; if exceeded the user needs an **explicit** error message.
- Standard extensions (`exe`, `sh`, `bat`, `cmd`, `com`, `scr`, `ps1`, `msi`) should be blocked by default but the list must be **configurable from the Admin panel**.
- Attachment UX must match modern editors: drag & drop, clipboard paste, and a file picker.
- Internationalization is mandatory: every user-visible string must exist in both `en.json` and `fr.json`.

## Decision

### Backend

- **New route** `src/routes/files.ts` exposing `POST /api/files/upload`. Accepts a base64 JSON payload (`{ dataUrl, name }`), strips the data-URL prefix, enforces a hard 19 MB limit **before** the Express 20 MB body limit can trigger (so the user gets a clean `File too large` message), rejects any extension listed in `config.blockedFileExtensions`, slugifies the filename and writes it as `<timestamp>_<random>_<base>.<ext>` to `DOCS_FOLDER/files/` (directory auto-created). Returns `{ filename, url: "/files/<filename>", originalName, size }`.
- **Static serving** in `src/server.ts`: `app.use('/files', express.static(path.join(docsPath, 'files')))` mirrors the existing `/images` mount.
- **Config field** `blockedFileExtensions: string[]` added to `src/lib/config.ts` with default `["exe","sh","bat","cmd","com","scr","ps1","msi"]`, and whitelisted in `src/routes/config.ts` (`PUT /api/config`) with per-entry validation (lowercase alphanumeric, leading dots stripped).
- **Render-time decoration** in `src/routes/documents.ts`: after `marked.parse(...)`, a `decorateFileLinks(html)` helper regex-rewrites every `<a href="./files/...">` to add `class="ld-file-attachment"`, `target="_blank"`, `rel="noopener"`, and prepends `<i class="fa-solid fa-paperclip ld-file-icon"></i>` when the label does not already contain a paperclip glyph. This gives the reader the "purple pill" look without requiring authors to type any HTML.

### Frontend

- **New module** `src/frontend/file-attach.js` wiring three entry points on the `#doc-editor` textarea:
  1. Drag & drop of any non-image file.
  2. `Cmd/Ctrl+V` when `clipboardData.files` contains a non-image file (images continue to flow through `image-paste.js`).
  3. `openFilePicker()` invoked from the 📎 snippet — opens the OS file picker.
     The module inserts a `[📎 uploading…](…)` placeholder at the caret, uploads via `POST /api/files/upload`, then replaces the placeholder by `[📎 <originalName>](./files/<filename>)`. Size guard mirrors the server (19 MB).
- **Snippet integration** in `snippets.js` + `index.html`: a new `attachment` option in the snippet picker with a help panel; clicking **Insert** calls `openFilePicker()` and closes the modal (no preview needed).
- **Admin panel** (`admin.html`): a new "File Attachments" section with a `#field-blocked-extensions` textarea (space / comma / newline separated, leading dots stripped, `/^[a-z0-9]+$/` Accepted before `PUT /api/config`).
- **CSS** for `.ld-file-attachment` (purple pill, hover state, dark-mode variant) in `index.html`.
- **i18n keys** added to both `en.json` and `fr.json`: `doc.uploading_file`, `doc.file_upload_failed`, `doc.file_too_large`, `snippet.attachment`, `snippet.attachment_help`, `snippet.attachment_alt`, `admin.files.title`, `admin.files.description`, `admin.files.blocked_label`, `admin.files.hint`.

### Security model

The server is the source of truth for filenames and extensions. The client **cannot** choose the destination path nor bypass the blocked-extensions list. Path traversal is impossible because the route never reads a client-provided path — only `DOCS_FOLDER/files/` + server-generated name. The 19 MB guard rejects oversized payloads with an explicit error instead of relying on Express's generic 413.

## Consequences

### PROS

- **Zero new dependencies** — reuses the existing base64 JSON pipeline proven by image paste. No `multer`, no streaming layer, no multi-part parsing.
- **Consistent UX** with image paste: same placeholder-then-replace flow, same localized error messages, same admin surface.
- **Configurable security posture** — admins can widen or tighten the blocked-extensions list without a rebuild. Defaults cover common Windows/Unix executables.
- **Render-time decoration** keeps authored Markdown simple: authors write `[Filename](./files/x.pdf)` (or let the upload flow generate it), and the reader sees a paperclip pill with `target="_blank"` and `rel="noopener"` for free. No author-side HTML.
- **Three-entry-point UX** (drag-drop, paste, picker) matches modern editors; the same module handles all three so behavior is consistent.
- **Localized** end-to-end — the i18n mandatory rule is respected for all new strings.
- **Separation from images** — filtering images out of the paste/drop handler avoids conflict with the existing image flow and keeps `DOCS_FOLDER/images/` vs `DOCS_FOLDER/files/` semantically clean.

### CONS

- **19 MB cap** — base64 inflates payloads by ~33 %, so the effective file size ceiling sits around 14 MB of original binary. Fine for docs and PDFs, problematic for large archives or videos. A streamed multipart upload would lift this, but at the cost of a new dependency.
- **Blocked-extensions list is extension-based only** — no MIME sniffing, no content inspection. A renamed `.exe → .pdf` would still pass. The server is local-only, so this is acceptable but not defense-in-depth.
- **Render-time regex decoration** of `<a href="./files/...">` is simple but coupled to the exact relative path prefix. Authors who write absolute URLs to the same folder won't get the paperclip pill automatically.
- **Two parallel pipelines** (images vs files) increases surface area in the frontend (two modules, two handlers to keep in sync on clipboard and drag events). A future refactor could unify them behind a single `upload-dispatcher` that routes by MIME type.
- **Admin UI accepts free-form text** — validation is strict (`/^[a-z0-9]+$/`) but there is no autocomplete or known-extensions helper. Typos silently drop entries.
