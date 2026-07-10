---
type: ADR
title: Callout Boxes Via Html Comment Prefix On Blockquotes
description: Styled callout boxes (info/success/warning/error) rendered from standard Markdown blockquotes preceded by `<!-- quote-type -->`, `<!-- quote-title -->`, and `<!-- quote-icon -->` HTML comment directives, with full snippet editor support and inline-edit round-trip.
tags:
  - callout
  - blockquote
  - quote-type
  - quote-title
  - quote-icon
  - blockquoteAttributes
  - wireContent
  - inlineSnippetEdit
  - SnippetsModal
  - prose
timestamp: 2026-06-07T12:23:00Z
status: To be validated
sources:
  - path: src/frontend-svelte/src/lib/home/blockquoteAttributes.ts
    hash: cbf1bc9d2fc8e2709caefa84bd045e0399ae63d79bc015e0d45c54b46a28c36d
  - path: src/frontend-svelte/src/lib/home/wireContent.ts
    hash: fdd1a993ac8a78f2cd94ccc36c6ab583abef50377490f7a856ba297f0423596b
  - path: src/frontend-svelte/src/lib/home/home.css
    hash: e8dd37c4b33813262301295c13bc5d9f9ef358cb8851eeae39e6cd1e305f9373
  - path: src/frontend-svelte/src/lib/home/snippets/parsers.ts
    hash: fff8c0bd6aa6bbffb078b4d7a8a3503608822dc1f16307ec06840b53715b93a9
  - path: src/frontend-svelte/src/lib/home/snippets/builders.ts
    hash: ee757a18e2c8b388b69b248300e25cbae8bc955f7de59bf19945b4e78f983673
  - path: src/frontend-svelte/src/lib/home/snippets/detect.ts
    hash: 32eee13ad452af05b12c64f57985f9c265681d06926b8effbfb31aae8db298db
  - path: src/frontend-svelte/src/lib/home/inlineSnippetEdit.ts
    hash: 5993e1336b6caac93c558de400b96bb695eeee7e4ef3a7fde16b4977ae9962e9
  - path: src/frontend-svelte/src/lib/home/SnippetsModal.svelte
    hash: b7d6e3e5fc0ed3740cf8082edc99b89b7957feeba0e99d969933ed0b0766c99c
---

## Context

Living Documentation renders Markdown blockquotes (`>`) with Tailwind Typography's default prose style (italic, left border). There was no way to create visually distinct callout boxes (note, warning, caution…) comparable to Astro/Starlight's `:::note` / `:::caution` directives.

The same comment-prefix pattern already existed for tables (`<!-- table-style -->`, `<!-- table-color -->`) and was proven reliable.

## Decision

Extend the comment-prefix pattern to blockquotes using three optional directives placed immediately before the `>` lines:

```markdown
<!-- quote-type: warning -->
<!-- quote-title: Integration tests on macOS (Apple Silicon M5) -->
<!-- quote-icon -->

> Content here , the icon appears inline before the first letter when no title is set.
```

### Directive semantics

| Directive                    | Values                                | Effect                              |
| ---------------------------- | ------------------------------------- | ----------------------------------- |
| `<!-- quote-type: X -->`     | `info`, `success`, `warning`, `error` | Sets border color + background tint |
| `<!-- quote-title: text -->` | any string                            | Displays bold title in a header row |
| `<!-- quote-icon -->`        | (no value)                            | Shows the type's SVG icon           |

Alias types (`note→info`, `tip→success`, `caution→warning`, `danger→error`) are accepted on read and normalised to canonical on write.

### Rendering modes

- **Icon + title** → dedicated `ld-callout-header` div (icon left, title right)
- **Title only** → header div without icon
- **Icon only** → icon injected inline as `span.ld-callout-icon-inline` before the first `<p>`'s first character (no separate header row)
- **Neither** → plain colored callout box, no header

### Quotation marks removed globally

Tailwind Typography adds `::before`/`::after` pseudo-elements with `open-quote`/`close-quote` on blockquote paragraphs. These are suppressed via `content: none` for all `.prose blockquote` elements.

## Architecture

### New file , `blockquoteAttributes.ts`

Mirrors the structure of `tableAttributes.ts`:

- `BlockquoteAttrs` interface , `{ type, title, icon }`
- `collectBlockquoteAttributesFromSource(source)` , line-by-line scan, returns one entry per top-level blockquote in document order
- `blockquoteBlockSource()` , returns a regex source string `(PREFIX)(BQ_BODY)` for capturing prefixed blockquotes including their comment lines; consumed by `inlineSnippetEdit.ts` (same pattern as `tableBlockSource()`)
- `getCalloutIcon(type)` , returns the SVG string for the 4 canonical types

### `wireContent.ts` , `applyBlockquoteStyles()`

Called after `innerHTML` is set, alongside `applyTableStyles`. Iterates `querySelectorAll("blockquote")` in DOM order (aligned with `collectBlockquoteAttributesFromSource`):

1. Adds `ld-callout` + `ld-callout-{type}` CSS classes
2. Injects header or inline icon depending on the `icon`/`title` combination

### Inline edit round-trip fix

The previous plain regex `/^> .*(?:\n>.*)*/gm` in `_inlineCollectSnippetRanges` did not capture the comment prefix, so the range started at the `>` line and the parser never saw the directives.

**Fix**: replaced with `blockquoteBlockSource()` wrapped in the same `(?:^|\n)((…))` group pattern used for tables. The range now starts at the first comment line, giving the parser the full markdown including directives.

`detect.ts` was also updated to recognise `<!-- quote-` as a blockquote snippet type (in addition to `^> `).

### Snippet editor (SnippetsModal.svelte)

Panel additions:

- **Type select** , 4 options (`info`, `success`, `warning`, `error`) with merged labels (e.g. "Info / Note (bleu)")
- **"Afficher l'icône" checkbox** , emits `<!-- quote-icon -->`
- **Title input** , optional; empty = icon-only mode

Smart defaults on type change (`blockquoteTypeChanged`):

- Selecting a colored type → auto-checks icon, sets default title if empty **or** if the current title matches any known default title
- Switching to another type → replaces the title with the new default
- Selecting "Aucun" → unchecks icon, clears title if it was a known default

### CSS (`home.css`)

```css
.prose blockquote.ld-callout { border-left: 4px solid var(--callout-accent); background: var(--callout-bg); … }
.prose blockquote.ld-callout-info    { --callout-accent: rgb(59 130 246); … }
.prose blockquote.ld-callout-success { --callout-accent: rgb(34 197 94);  … }
.prose blockquote.ld-callout-warning { --callout-accent: rgb(245 158 11); … }
.prose blockquote.ld-callout-error   { --callout-accent: rgb(239 68 68);  … }
/* + dark mode variants */
.ld-callout-icon-inline { vertical-align: middle; margin-right: 0.4rem; … }
```

## Consequences

- Plain `>` blockquotes without any `<!-- quote-* -->` prefix are unaffected , zero regression
- The comment-prefix pattern is consistent with the existing table system (same authoring UX, same parser architecture)
- Alias types stored in existing documents (`note`, `tip`, `caution`, `danger`) are silently normalised to canonical on the next save
