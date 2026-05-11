---
`🗄️ ADR : 2026_04_23_[FRONTEND]_tame_tailwind_typography_defaults_for_inline_images_and_hr.md`
**date:** 2026-04-23
**status:** Pending Validation
**description:** Override Tailwind Typography's default margins for `.prose img` (2em top/bottom) and `.prose hr` (3em top/bottom, gray-200 border) — collapse image margins to zero when the image is inline (in a list, after `<br>`, mixed with text) and keep 1em only when the image is alone in its paragraph ; reduce hr margins to 2em and bump the border color to gray-300 (#d1d5db) for readability without epaississement.
**tags:** frontend, css, prose, tailwind-typography, image, hr, separator, margin, spacing, rendering, soft-breaks-followup, readability, lists, list-item, ux
---

## Context

The documentation viewer applies the `prose` class (from Tailwind's `@tailwindcss/typography` plugin, loaded via the CDN build with `?plugins=typography`) on the article body. Typography ships with opinionated defaults that target long-form editorial content — generous whitespace around every block-level element. Two of those defaults became actively painful once the `markdownSoftBreaks` flag was enabled (see sibling ADR `2026_04_23_[RENDERING]_configurable_markdown_newline_handling_commonmark_vs_gfm_breaks.md`):

### 1. `.prose img { margin-top: 2em; margin-bottom: 2em }`

With soft-breaks on, the user hit this real-world case:

```markdown
1. Créer un document
   [![…](./images/…png)](/diagram?id=d1776024969304)
```

renders as `<li><p>Créer un document<br><a><img></a></p></li>`. The `<br>` already pushes the image to the next visual line ; the inherited 32 px top margin on `<img>` then *adds* another full blank line, yielding a 32–48 px gap between the list-item label and its illustration. The same problem applies to any image sitting next to text (inline captions, emoji-style icons inside paragraphs, etc.). The 2em spacing is appropriate for an editorial photo set on its own line ; it is wrong for inline usage.

### 2. `.prose hr { margin-top: 3em; margin-bottom: 3em; border-color: #e5e7eb }`

48 px top + 48 px bottom = 96 px consumed per `<hr>`. Combined with the default `gray-200` border, the separator paradoxically feels *both* too wide *and* invisible on a white background — it eats vertical real estate yet does not meaningfully mark the transition it is supposed to announce.

The user wanted both defects fixed without reinventing the prose styling wholesale — just surgical overrides co-located with the other `.dark .prose *` rules already in `src/frontend/index.html`.

## Decision

All changes live in the `<style>` block of `src/frontend/index.html`, grouped with the existing `.prose` overrides.

### 1. Image margins — scope-aware

Two rules, in that order:

```css
.prose img {
  margin-top: 0;
  margin-bottom: 0;
}
.prose p > img:only-child,
.prose p > a:only-child > img {
  margin-top: 1em;
  margin-bottom: 1em;
}
```

The first rule zeroes out the 2em default globally. The second re-adds a moderate 1em only when the image sits as the only child of its paragraph — either directly (`<p><img></p>`) or wrapped in a single link (`<p><a><img></a></p>`). `:only-child` makes the selector robust: an image with a caption string next to it, an image in a list, an image after a `<br>` all fall back to the zero rule.

This matches the author's mental model: *"this image is the block"* deserves breathing room ; *"this image decorates text"* should flow with the text.

### 2. Horizontal-rule margins + color

```css
.prose hr {
  margin-top: 2em;
  margin-bottom: 2em;
  border-color: #d1d5db;
}
```

- Margin `3em → 2em` — still a strong visual break, but cuts the vertical blank zone by a third.
- Color `gray-200 → gray-300` (`#d1d5db`) — noticeably more visible on white without the brutality of gray-400 (`#9ca3af`, tested and rejected as too dark) or a thicker border (`border-top-width: 2px`, tested and rejected as visually noisy).

Dark mode keeps its pre-existing rule (`.dark .prose hr { border-color: #4b5563 }` at line ~265), which already has enough contrast on the dark background.

### 3. Decisions explicitly *not* taken

- No change to `.prose table`, `.prose blockquote`, `.prose ul` margins — they did not surface as problems yet. Holding off on more pre-emptive tweaks, in line with the "don't refactor beyond the task" principle.
- No move to a custom Typography plugin config (would require a build step) ; CDN-friendly CSS overrides are enough.
- No configurable knob in Admin — these are pure aesthetic refinements, not per-project preferences. The flags already in `.living-doc.json` are reserved for behaviours that legitimately differ between projects.

## Consequences

### PROS

- **Fixes the concrete user-reported issue** — inline images in numbered lists no longer get a 32 px ghost margin after the `<br>`.
- **Preserves editorial intent** — images that *are* the paragraph still get 1em of breathing room, so screenshots in their own block still look "framed".
- **Tamed separators** — `<hr>` is 33 % less wasteful vertically and actually visible on white, without needing a thicker stroke.
- **Zero JavaScript** — pure CSS, applies uniformly to the viewer and to every doc without any render-path change.
- **Self-contained** — all changes live in one `<style>` block ; no Tailwind config override, no build tooling change, no CDN URL change.
- **Compatible with both markdownSoftBreaks modes** — works equally well whether single newlines become `<br>` or spaces. The image scoping uses structural selectors, not newline artefacts.
- **Dark mode untouched** — the pre-existing `.dark .prose hr` rule already had adequate contrast, so we did not duplicate the work.

### CONS

- **Divergence from Typography defaults** — anyone pulling a doc out of the viewer and pasting into another Tailwind Typography context (e.g. a blog) will see different spacing. Acceptable given we own the viewer, but worth flagging.
- **`:only-child` selector is strict** — an image followed by a single whitespace-only text node will *not* match `:only-child` ; browsers normally coalesce whitespace but some HTML pipelines may leave a trailing text node that breaks the match. If we ever see such a case we can loosen to `:first-child:last-of-type` or equivalent.
- **Color hard-coded** — `#d1d5db` is inlined rather than pulled from a CSS custom property or Tailwind's `--tw-prose-hr`. If the user later wants to re-theme, this becomes another spot to update alongside `.dark .prose hr`.
- **No hr override for dark mode** — the margin/color tweaks only apply in light mode for the color ; dark users keep the original border. Intentional (dark already reads well), but asymmetric.
- **Tight feedback loop was needed to settle the values** — we iterated through 1em / 2em, 1px / 2px, gray-200 / gray-300 / gray-400 before landing on `2em + gray-300 + 1px`. This ADR captures the endpoint ; the rejected variants are documented in the decision section so we do not re-try them later.
