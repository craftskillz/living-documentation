---
`🗄️ ADR : 2026_03_20_10_15_[CONFIGURATION]_link_extra_files_as_documentation.md`
**date:** 2026-03-20
**status:** SuperSeeded
**superseded_by:** 2026_04_24_[CONFIGURATION]_portable_living_doc_json_with_relative_paths.md
**description:** Support for including Markdown files outside the docs folder via an extraFiles config array, with a filesystem browser in the admin panel. [SuperSeeded: the path-storage format moved from absolute to relative; the feature itself (whitelist security, admin browser, ordering, sidebar placement, document-id scheme) is preserved in the new ADR.]
**tags:** configuration, extraFiles, sidebar, security, api, browse, path-traversal, document-id, superseded
---

## Context

The tool was designed to serve all Markdown files from a single docs folder. A common real-world need emerged: projects often have important Markdown files at the repository root (e.g. `README.md`, `CLAUDE.md`) that are not inside the dedicated docs folder, but should still be surfaced in the viewer alongside the documentation.

## Decision

Introduce an `extraFiles` field in `.living-doc.json` — an ordered list of absolute paths to Markdown files that live outside the docs folder. These files are always assigned to the **General** category and appear before regular General documents in the sidebar.

An admin UI was added to browse the filesystem and add/remove/reorder extra files without editing the config file manually.

A new API endpoint `GET /api/browse?path=...` returns the directories and `.md` files at a given path, allowing the admin panel to navigate the filesystem.

## Consequences

### PROS

- Important files like `README.md` or `CLAUDE.md` at the repository root can be surfaced in the viewer without moving them into the docs folder.
- The admin UI allows managing extra files without manually editing `.living-doc.json`.
- Extra files maintain their user-defined config order (not date-sorted), giving full control over priority via the reorder UI.
- Security is preserved: only paths present in the `extraFiles` whitelist can be read; only `.md` files are accepted both at browse time and at config-write time.

### CONS

- Extra files bypass the `docsPath` path traversal guard (intentional, but widens the accessible surface).
- Absolute paths in config are not portable between machines or users.
- The document ID scheme becomes more complex: extra files use `encodeURIComponent(absolutePathWithoutExtension)` instead of `encodeURIComponent(filename)`, and the `/:id` route must detect extra files by checking `path.isAbsolute(decodedId)`.
