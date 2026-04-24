---
`🗄️ ADR : 2026_03_21_10_25_[CONFIGURATION]_general_category_and_sidebar_defaults.md`
**date:** 2026-03-21
**status:** Accepted
**description:** Rename "Uncategorized" to "General", pin it first in the sidebar, collapse all other categories on load, and extend the sidebar to a recursive folder tree with breadcrumb pills in the article header.
**tags:** configuration, sidebar, category, parser, frontend, ux, general, uncategorized, navigation, folder, tree, recursive, breadcrumbs, subfolder, DocMetadata
---

## Context

Files that do not match the filename pattern were grouped under a category called "Uncategorized" and placed at the bottom of the sidebar. This label was confusing — it implied the files were improperly named rather than simply ungrouped. Additionally, the sidebar loaded with all categories expanded, which was noisy for projects with many categories.

Later, as subdirectory support was added, the sidebar needed to evolve further: files in subdirectories were handled with a flat fallback where the subdirectory name was substituted as the category. Files with an explicit `[Category]` ignored the subdirectory entirely. This meant `adrs/test/file.md` and `adrs/file.md` appeared as sibling category groups at the same level — no nesting, no hierarchy.

## Decision

### Phase 1 — General category and sidebar defaults

1. **Rename "Uncategorized" → "General"**: conveys that these documents are general-purpose, not misfiled. Applied in the parser (`src/lib/parser.ts`), the frontend viewer, and the admin pattern-preview widget.

2. **"General" is always first**: the sidebar sorts categories alphabetically but pins "General" to the top, since it typically contains the most important entry-point documents (README, CLAUDE.md, etc.).

3. **All categories collapsed on load except General**: on initial page load, only the General section is expanded. Other categories are collapsed and open on click.

### Phase 2 — Recursive folder tree and breadcrumbs

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

**Folder sort convention**

Directories can be prefixed with a number and underscore (`1_TUTORIAL`, `2_REFERENCE`) to control their alphabetical sort position. The `folderLabel(seg)` helper strips the prefix for display; the full name is preserved in the `title` attribute (tooltip).

## Consequences

### PROS

- "General" is a more intuitive and non-judgmental label for ungrouped documents.
- Pinning General to the top ensures the most commonly accessed documents are immediately visible.
- Collapsing all other categories on load reduces visual noise for projects with many categories.
- True hierarchical navigation: `adrs/test/file.md` appears under **Adrs > Test** in the sidebar, not as a flat `Adrs/Test` sibling.
- Arbitrary nesting depth works without additional changes.
- `[Category]` and folder are fully independent — a file can live in `tutorials/` and still carry `[OAAS]` as its category.
- Article header breadcrumbs make the full location of a document immediately visible.
- Folder sort order is controllable via a naming convention (`1_NAME`) without any config or UI — the filesystem name is the single source of truth.

### CONS

- Projects that previously relied on "Uncategorized" as a category filter string in search will no longer match.
- Category toggle keys are now path-qualified strings; any in-memory `expandedCategories` state is lost on re-render — acceptable since it resets on page load anyway.
- Sidebar ID scheme is now derived from the full path, which could produce long DOM IDs for deeply nested structures.
- The `1_` prefix convention is implicit — nothing enforces or documents it within the tool itself beyond the README.
