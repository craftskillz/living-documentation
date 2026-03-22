# ADR 001 — Extra Files Outside the Docs Folder

**Date:** 2026-03-22
**Status:** Accepted

## Context

The tool was designed to serve all Markdown files from a single docs folder. A common real-world need emerged: projects often have important Markdown files at the repository root (e.g. `README.md`, `CLAUDE.md`) that are not inside the dedicated docs folder, but should still be surfaced in the viewer alongside the documentation.

## Decision

Introduce an `extraFiles` field in `.living-doc.json` — an ordered list of absolute paths to Markdown files that live outside the docs folder. These files are always assigned to the **General** category and appear before regular General documents in the sidebar.

An admin UI was added to browse the filesystem and add/remove/reorder extra files without editing the config file manually.

A new API endpoint `GET /api/browse?path=...` returns the directories and `.md` files at a given path, allowing the admin panel to navigate the filesystem.

## Consequences

**Security:** The existing path traversal guard (resolved path must start with `docsPath`) is preserved for regular documents. Extra files bypass this guard intentionally, but are validated against an explicit whitelist: only paths present in `extraFiles` can be read, and only `.md` files are accepted both at browse time and at config-write time.

**Config:** `extraFiles` is validated on `PUT /api/config` — each entry must be an absolute path ending in `.md`. Non-conforming entries are silently dropped.

**Ordering:** Extra files maintain their config-defined order (not sorted by date). This is intentional — the user controls priority via the admin panel's reorder UI.

**Document ID scheme:** Regular documents use `encodeURIComponent(filename)` as their ID. Extra files use `encodeURIComponent(absolutePathWithoutExtension)` to guarantee uniqueness across directories. The `/:id` route detects extra files by checking `path.isAbsolute(decodedId)`.
