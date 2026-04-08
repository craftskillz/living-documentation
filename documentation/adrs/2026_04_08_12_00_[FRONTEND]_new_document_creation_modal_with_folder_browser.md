---
`🗄️ ADR : 2026_04_08_12_00_[FRONTEND]_new_document_creation_modal_with_folder_browser.md`
**date:** 2026-04-08
**status:** Pending Validation
**description:** Add a + button next to the document count in the sidebar that opens a modal for creating a new document, with title/category inputs, an inline folder browser scoped to docsFolder, new-folder creation, a live filename preview, and a POST /api/documents backend endpoint.
**tags:** frontend, sidebar, modal, document-creation, folder-browser, api, documents, filename, pattern, browse
---

## Context

There was no way to create a new document from within the viewer interface. Users had to create files manually on disk, respecting the configured filename pattern, which was error-prone and required leaving the app.

The sidebar header already displayed a document count (`x documents`) — a natural anchor for a creation entry point.

## Decision

A `+` button was added to the right of the document count line. Clicking it opens a **New Document modal** containing:

- **Title** input (required)
- **Category** input (defaults to `General`)
- **Location** — a read-only path display + a **Browse** button that expands an inline folder browser scoped to `docsFolder`; the browser allows navigating subdirectories and selecting a destination, or typing a new folder name to create it on save
- **Generated filename preview** — updates live as the user types, using the same substitution logic as the server (`YYYY`, `MM`, `DD`, `HH`, `mm`, `[Category]`, title slug)
- **Create** button — calls `POST /api/documents`, refreshes the sidebar, and opens the new document immediately

The `POST /api/documents` endpoint was added to `src/routes/documents.ts`. It:
- Accepts `{ title, category, folder }` in the request body
- Resolves the target directory within `docsPath` (path traversal guard)
- Creates any missing subdirectories with `fs.mkdirSync({ recursive: true })`
- Generates the filename via `buildFilename()` using current date and time
- Returns a 409 if a file with the same name already exists
- Writes the file with a `# Title` header as initial content
- Returns the new document metadata (id, filename, folder, category, date)

Enter on title/category submits the form; Escape closes the modal.

## Consequences

### PROS

- Documents can be created from the UI without touching the filesystem manually
- The filename is always correctly formatted according to the configured pattern
- The folder browser reuses the existing `/api/browse` endpoint — no new backend surface
- New folders are created lazily on document save, not speculatively

### CONS

- The live filename preview is computed client-side and must stay in sync with the server-side `buildFilename()` logic — two implementations of the same substitution
- The browser is not constrained server-side to `docsFolder`; the constraint is enforced only on the POST path traversal guard
