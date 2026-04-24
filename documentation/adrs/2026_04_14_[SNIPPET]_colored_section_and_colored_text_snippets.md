---
`🗄️ ADR : 2026_04_14_[SNIPPET]_colored_section_and_colored_text_snippets.md`
**date:** 2026-04-14
**status:** Validated
**description:** Add two new snippet types to the Snippets modal: "Colored section" (block-level div with a left-border accent and background) and "Colored text" (inline span with a foreground color). Both use inline CSS styles with 6 semantic color swatches, support detect-and-re-edit, and are fully internationalized in EN and FR. Also fixes the diagram nav icon (⋄ U+22C4 → ◇ U+25C7).
**tags:** snippet, editor, colored-section, colored-text, inline-style, html-in-markdown, i18n, span, div, swatch, detection, marked, frontend
---

## Context

The Snippets modal already provides a set of reusable markdown constructs (table, tree, diagram, code block, etc.). Users wanted the ability to add visual emphasis to their documentation — either at the block level (a callout-style panel) or inline (a colored word or sentence) — without leaving the editor.

Standard Markdown does not support color. Because the server uses `marked` with default settings, raw HTML blocks pass through to the rendered output. This makes `<div>` and `<span>` with inline styles a viable approach.

Tailwind utility classes were ruled out for inline styling: the CDN JIT build only scans the initial HTML — classes injected into markdown at runtime are not present in the stylesheet.

The diagram nav button also had a cosmetic issue: the icon character `⋄` (U+22C4, math DIAMOND OPERATOR) has poor vertical metrics in most system fonts and was visually clipping. The HTML fallback already used `◇` (U+25C7, WHITE DIAMOND from the Geometric Shapes block), which renders correctly at the same size as `☁` and `⚙`.

## Decision

### Colored section

A new snippet type `colored-section` generates a block-level `<div>` with inline CSS:

```html
<div
  style="background:#eff6ff;border-left:4px solid #3b82f6;color:#1e3a5f;padding:1rem 1.25rem;border-radius:0.375rem;margin:1rem 0;"
>
  Content here — **markdown works** inside the blank-line sandwich.
</div>
```

The blank lines between the opening/closing tags cause `marked` to parse the inner content as markdown, enabling bold, lists, headings, etc.

Six semantic swatches are offered, each defined as `{ bg, border, text }` in a `_COLOR_SWATCHES` map:

| Swatch  | Background | Border  | Text    |
| ------- | ---------- | ------- | ------- |
| Info    | #eff6ff    | #3b82f6 | #1e3a5f |
| Success | #f0fdf4    | #22c55e | #14532d |
| Warning | #fffbeb    | #f59e0b | #451a03 |
| Danger  | #fef2f2    | #ef4444 | #450a0a |
| Note    | #f5f3ff    | #8b5cf6 | #2e1065 |
| Neutral | #f9fafb    | #6b7280 | #111827 |

### Colored text

A new snippet type `colored-text` generates an inline `<span>`:

```html
<span style="color:#3b82f6;">your text</span>
```

Uses the `border` color from `_COLOR_SWATCHES` as the foreground — vivid enough to stand out. Same 6 swatches, shown as solid filled circles.

### Detect and re-edit

Both types are detectable from selected text in the editor:

- `colored-section`: matched by `/^<div\s[^>]*border-left[^>]*>/`
- `colored-text`: matched by `/^<span\s[^>]*color:[^>]*>[\s\S]*<\/span>$/`

On detection, `parseAndFillSnippet` extracts the border/color value, finds the matching swatch, and pre-fills the content field — allowing the user to re-edit an existing snippet in place.

### Icon fix

`⋄` (U+22C4) replaced by `◇` (U+25C7) in both `i18n/en.json` and `i18n/fr.json`, for `nav.diagram` and `modal.diag_link.title`.

### Internationalization

All user-visible strings added to both `en.json` and `fr.json`:

- Dropdown label, color label, swatch titles (6 × 2 languages), content label, content placeholder.
- Swatch title keys are shared between the two panels to avoid duplication.

## Consequences

### PROS

- Users can visually emphasize callouts, warnings, and key passages without external tooling.
- Inline styles are self-contained — no dependency on a CSS framework at render time.
- Detection + pre-fill makes colored snippets as editable as any other snippet type.
- The icon fix removes a rendering glitch present across all locales.

### CONS

- Inline styles are not dark-mode-aware: colored sections always render with their light-mode palette regardless of the reader's theme preference.
- The 6 swatches are fixed; users cannot pick a custom color from the snippet UI.
- `marked`'s HTML passthrough means malformed HTML in the content field will appear as-is in the rendered output.
