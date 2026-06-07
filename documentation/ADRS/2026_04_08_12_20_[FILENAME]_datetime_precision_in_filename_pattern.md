---
`🗄️ ADR : 2026_04_08_12_20_[FILENAME]_datetime_precision_in_filename_pattern.md`
**date:** 2026-04-08
**status:** Accepted
**description:** Extend the default filename pattern from YYYY_MM_DD to YYYY_MM_DD_HH_mm to allow multiple documents per day to coexist without naming conflicts, while preserving backward compatibility with existing YYYY_MM_DD files.
**tags:** filename, pattern, datetime, parser, config, backward-compatibility, HH, mm, date, documents
---

## Context

The previous default pattern `YYYY_MM_DD_[Category]_title` only had day-level granularity. Users creating multiple documents on the same day with similar titles could run into filename conflicts, and had no way to distinguish documents temporally within a day.

## Decision

The default `filenamePattern` was changed from `YYYY_MM_DD_[Category]_title` to `YYYY_MM_DD_HH_mm_[Category]_title` across the entire codebase:

- **`src/lib/config.ts`** , updated default
- **`src/lib/parser.ts`** , two new tokens `HH` and `mm` detected via `/HH.*mm/`; when present, the date capture group becomes `(\d{4}_\d{2}_\d{2}(?:_\d{2}_\d{2})?)` , the time portion is **optional** so old `YYYY_MM_DD` files continue to match; `dateStrToISO()` converts `YYYY_MM_DD_HH_mm` → `YYYY-MM-DDTHH:MM` and `YYYY_MM_DD` → `YYYY-MM-DD`; `formatDate()` appends the time when present
- **`src/routes/documents.ts`** , `buildFilename()` now substitutes `HH` and `mm` from `new Date()` at creation time
- **`src/frontend/index.html`** , live filename preview in the New Document modal includes hours and minutes
- **`src/frontend/admin.html`** , pattern preview examples, `buildPatternsFromFormat`, `parsePreview`, placeholder and fallback strings all updated
- **`README.md`, `CLAUDE.md`, `memory/project_overview.md`** , documentation updated with new format and examples
- **All existing ADR files** , renamed to include `HH_mm` and their internal `🗄️ ADR :` frontmatter references updated accordingly

## Consequences

### PROS

- Multiple documents created on the same day are naturally ordered and distinguishable
- Full backward compatibility: existing `YYYY_MM_DD` files parse correctly without any migration
- The time is captured at actual creation time, reflecting when the document was truly authored

### CONS

- Filenames are longer and slightly less readable at a glance
- The optional time group in the regex adds a small complexity to the parser
- Users who had customised their `filenamePattern` to `YYYY_MM_DD_...` are not automatically migrated , they need to update their `.living-doc.json` manually
