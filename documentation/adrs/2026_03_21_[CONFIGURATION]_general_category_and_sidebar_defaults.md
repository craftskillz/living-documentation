---
`🗄️ ADR : 2026_03_21_[CONFIGURATION]_general_category_and_sidebar_defaults.md`
**date:** 2026-03-21
**status:** Accepted
**description:** Rename "Uncategorized" to "General", pin it first in the sidebar, and collapse all other categories on load.
**tags:** configuration, sidebar, category, parser, frontend, ux, general, uncategorized
---

## Context

Files that do not match the filename pattern were grouped under a category called "Uncategorized" and placed at the bottom of the sidebar. This label was confusing — it implied the files were improperly named rather than simply ungrouped. Additionally, the sidebar loaded with all categories expanded, which was noisy for projects with many categories.

## Decision

1. **Rename "Uncategorized" → "General"**: conveys that these documents are general-purpose, not misfiled. Applied in the parser (`src/lib/parser.ts`), the frontend viewer, and the admin pattern-preview widget.

2. **"General" is always first**: the sidebar sorts categories alphabetically but pins "General" to the top, since it typically contains the most important entry-point documents (README, CLAUDE.md, etc.).

3. **All categories collapsed on load except General**: on initial page load, only the General section is expanded. Other categories are collapsed and open on click. This reduces visual noise and makes the most relevant content immediately visible.

## Consequences

### PROS

- "General" is a more intuitive and non-judgmental label for ungrouped documents.
- Pinning General to the top ensures the most commonly accessed documents are immediately visible.
- Collapsing all other categories on load reduces visual noise for projects with many categories.

### CONS

- Projects that previously relied on "Uncategorized" as a category filter string in search will no longer match (the string is now "General").
- Any existing `.living-doc.json` that stores category information derived from filenames is unaffected — the change is in the display label only, not in stored data.
