---
`🗄️ ADR : 2026_04_08_11_45_[NAVIGATION]_recursive_folder_tree_sidebar_and_breadcrumbs.md`
**date:** 2026-04-08
**status:** Pending Validation
**description:** Sidebar now renders a recursive folder tree (subdirectory path segments → category → docs) with General always first; article header shows one violet pill per folder segment plus a blue category pill.
**tags:** navigation, sidebar, folder, category, tree, recursive, breadcrumbs, parser, DocMetadata, frontend, subfolder
---

## Context

Previously, files in subdirectories were handled with a flat fallback: if a filename had no `[Category]` tag, the subdirectory name was substituted as the category. Files with an explicit `[Category]` ignored the subdirectory entirely. This meant that `adrs/test/file.md` and `adrs/file.md` appeared as sibling category groups `ADRS/TEST` and `ADRS` at the same level — no nesting, no hierarchy.

Users wanted a proper folder hierarchy: placing files in subdirectories should create a collapsible folder layer in the sidebar, independent of the `[Category]` extracted from the filename.

## Decision

**Backend (`parser.ts` + `documents.ts`)**

- Added `folder: string[] | null` to `DocMetadata`. The parser always returns `folder: null`; the route derives the value from the relative path.
- In `listDocs`, `path.dirname(relPath)` is split on `path.sep` and each segment is title-cased to produce the `folder` array (e.g. `adrs/test` → `["Adrs", "Test"]`). The old "override category with subdir name" logic is removed.
- The `GET /api/documents/:id` handler parses only `path.basename(filename)` (fixing a pre-existing bug where subdirectory files could not be parsed), then derives `folder` from `path.dirname(id)` using `"/"` as separator.

**Frontend (`index.html`)**

- `renderSidebar` builds a recursive node tree via `buildFolderTree`: each node holds `{ categories, children }`.
- `renderTreeNode` renders each node recursively: **General category first**, then subfolders (sorted alphabetically), then other categories (sorted alphabetically).
- Folder toggle state is tracked in `expandedFolders` (a `Set` of `|`-joined path keys, e.g. `"Adrs|Test"`).
- Category toggle keys are also path-qualified (`"Adrs|Test|Architecture"`), ensuring no ID collisions between same-named categories at different folder depths.
- The article header replaced the single `#doc-category` span with a `#doc-breadcrumbs` container: one violet pill per folder segment, followed by one blue pill for the category.

## Consequences

### PROS

- True hierarchical navigation: `adrs/test/file.md` appears under **Adrs > Test** in the sidebar, not as a flat `Adrs/Test` sibling.
- Arbitrary nesting depth works without additional changes.
- `[Category]` and folder are fully independent — a file can live in `tutorials/` and still carry `[OAAS]` as its category.
- Article header breadcrumbs make the full location of a document immediately visible.
- General always stays at the top regardless of nesting depth.

### CONS

- Category toggle keys are now path-qualified strings; any persisted `expandedCategories` state from a previous session (stored in memory only, not localStorage) is lost on re-render — acceptable since it resets on page load anyway.
- Sidebar ID scheme (folder IDs, category IDs) is now derived from the full path, which could produce long DOM IDs for deeply nested structures.
