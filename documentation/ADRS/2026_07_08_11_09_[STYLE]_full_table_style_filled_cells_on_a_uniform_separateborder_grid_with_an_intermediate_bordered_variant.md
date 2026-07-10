---
type: ADR
title: Full Table Style Filled Cells On A Uniform Separateborder Grid With An Intermediate Bordered Variant
description: 'A fourth table style "full" (Plein) renders every cell filled on a uniform grid with rounded outer corners using border-collapse: separate and a single `--tbl-full-line` color (soft by default, an intermediate color-mix shade when the bordered option is on), mirrored in both the rendered view and the snippet editor, with the header forced to match the body so no line is ever hidden.'
tags:
  - table-style-full
  - Plein
  - tableAttributes
  - ALLOWED_STYLES
  - border-collapse-separate
  - tbl-full-line
  - color-mix
  - table-color
  - home.css
  - snippet-table
timestamp: 2026-07-08T11:09:00Z
status: To be validated
sources:
  - path: src/frontend-svelte/src/lib/home/tableAttributes.ts
    hash: b29ba90eb1d1675185a0a832f6c47b683fa2a6ab3ec4c84185043c1c9063abd3
    commit: 0aafdb062960a54320423ef1e617f119fc93845f
    dirty: false
  - path: src/frontend-svelte/src/lib/home/home.css
    hash: 279b25d2f40766a9ac8286648b28c7cb96fabb0b09de9595a961f28121e6baba
    commit: 0aafdb062960a54320423ef1e617f119fc93845f
    dirty: false
---

## Context

The table snippet system already supported styles Default, Compact and Striped
(see [spreadsheet-style table editor](?doc=ADRS%252F2026_06_06_21_47_%255BSNIPPET%255D_spreadsheet_style_table_snippet_editor)),
declared as `<!-- table-style: … -->` comment prefixes and applied as
`table-style-<value>` classes. A "Full" style was requested to match the filled,
gridded look of the `huggingface/tau` feature tables.

## Decision

### A new whitelisted style value
`"full"` is added to `ALLOWED_STYLES` in `tableAttributes.ts`; the class is
applied generically as `table-style-full` (no per-value code), so only CSS was
otherwise needed.

### Separate-border model with one line color
`.prose table.table-style-full` uses `border-collapse: separate; border-spacing: 0`
so the **rounded outer border is drawn on the table element** and never clipped
(the earlier `collapse` + `overflow: hidden` clipped the outer line away); inner
lines come from each cell's `border-right` / `border-bottom`, with the last
column/last body row dropping their redundant edge line. A single custom property
`--tbl-full-line` drives every line so the grid is always uniform:
- default → `--tbl-accent-soft`;
- with the "bordered" option → an **intermediate** shade via
  `color-mix(in srgb, var(--tbl-accent) 45%, var(--tbl-accent-soft))` (the full
  accent read too strong).

The generic `table-border-bordered` rule is scoped `:not(.table-style-full)` so
"Full" fully owns its bordered look and never doubles borders.

### Uniform header
The header shares the body fill and line color (overriding `table-color`'s tinted
header and its stronger accent separator, which otherwise hid the header's own
borders since the tint equalled the border color). Only the header text may stay
colored when a `table-color` is applied.

### Editor parity
The same model is mirrored in the snippet table editor
(`.ld-table-edit-table.table-style-full`, including the first-row header override
and the bordered variant), and the picker gets a "Full" / "Plein" option with
FR/EN i18n.

## Consequences

- "Full" is uniform across every combination (rendered/editor, base/tau theme,
  with/without a table-color, with/without the bordered option).
- `color-mix` requires a modern browser (fine for this locally-served tool); a
  fallback to fixed shades would be the migration path for very old browsers.
