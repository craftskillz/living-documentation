`🗄️ ADR : 2026_03_21_[CONFIGURATION]_general_category_and_sidebar_defaults.md`

**Date:** 2026-03-22
**Status:** Accepted

## Context

Files that do not match the filename pattern were grouped under a category called "Uncategorized" and placed at the bottom of the sidebar. This label was confusing — it implied the files were improperly named rather than simply ungrouped. Additionally, the sidebar loaded with all categories expanded, which was noisy for projects with many categories.

## Decision

1. **Rename "Uncategorized" → "General"**: conveys that these documents are general-purpose, not misfiled. Applied in the parser (`src/lib/parser.ts`), the frontend viewer, and the admin pattern-preview widget.

2. **"General" is always first**: the sidebar sorts categories alphabetically but pins "General" to the top, since it typically contains the most important entry-point documents (README, CLAUDE.md, etc.).

3. **All categories collapsed on load except General**: on initial page load, only the General section is expanded. Other categories are collapsed and open on click. This reduces visual noise and makes the most relevant content immediately visible.

## Consequences

Any existing `.living-doc.json` that stores category information derived from filenames is unaffected — the change is in the display label only, not in the stored data. Projects that previously relied on "Uncategorized" as a category filter string in search will no longer match (the string is now "General").
