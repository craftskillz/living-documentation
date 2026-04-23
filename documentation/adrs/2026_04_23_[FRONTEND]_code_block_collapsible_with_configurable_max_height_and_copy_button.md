---
`🗄️ ADR : 2026_04_23_[FRONTEND]_code_block_collapsible_with_configurable_max_height_and_copy_button.md`
**date:** 2026-04-23
**status:** Pending Validation
**description:** Make rendered markdown `<pre>` blocks friendlier to long snippets — add a per-project `codeBlockMaxHeight` option (in pixels, default 400, `0` disables) editable from the Admin page that caps long blocks with a bottom-fade gradient and a "Show more / Show less" toggle, and always render a hover-revealed copy-to-clipboard icon in the top-right corner of every code block with visual confirmation on success.
**tags:** frontend, code-block, pre, markdown, copy, clipboard, collapsible, max-height, admin, configuration, ux, hljs, highlight.js, i18n, gradient, toggle
---

## Context

Documents in this project can contain long code blocks produced either via the Snippets inserter (language fence) or via direct markdown. They are rendered through marked + `hljs.highlightElement` in `src/frontend/documents.js::_wireDocContent`.

Two real-life problems emerged:

1. **Very long blocks push the article** — a 200-line snippet creates a wall that buries everything below it. The only existing mitigation was the user manually scrolling past. There was no cap, no visual hint that the block was abnormally long, and no way to fold it back.
2. **Copying code out of the viewer was awkward** — triple-click or select-by-hand, especially painful for multi-line blocks, and easy to accidentally copy adjacent text or miss a trailing line.

The user wanted:
- A **default max-height** configurable from the Admin page (not hardcoded), shared by every client of the same documentation via `.living-doc.json`.
- The **option to disable** the whole feature (one knob, not a boolean + a number).
- A per-block **Show more / Show less toggle** only when the block actually exceeds the cap.
- A **copy-to-clipboard button** in the top-right of every code block, regardless of length.
- Both labels **i18n-compliant** (EN + FR).

## Decision

### 1. Config field — `codeBlockMaxHeight: number`

Added to `LivingDocConfig` (`src/lib/config.ts`), default `400`. Whitelisted in `PUT /api/config` (`src/routes/config.ts`) with validation: must be a finite non-negative number, clamped to `[0, 5000]` and rounded to an integer. `0` is the disable-sentinel — no cap, no toggle button rendered, no CSS variable set.

### 2. Admin UI

A numeric input in the *Appearance & Metadata* card of `src/frontend/admin.html`, placed just below the two "exclusive expansion" checkboxes. `type="number"`, `min="0"`, `max="5000"`, `step="10"`, placeholder `400`. Loaded in `loadConfig()`, written in `saveConfig()` with a client-side clamp mirroring the server-side validation. Labels + hints added to `en.json` and `fr.json` as `admin.appearance.code_max_height_label` / `..._hint`.

### 3. Frontend plumbing — CSS variable + globals

`state.js` declares `codeBlockMaxHeight` (default `400`). `config.js`, after fetching `/api/config`, sets the value and — when `> 0` — posts it to the document root as a CSS custom property:
```js
document.documentElement.style.setProperty("--ld-code-max-h", value + "px");
```
This lets the CSS rule consume the value with a fallback:
```css
pre.ld-collapsible { max-height: var(--ld-code-max-h, 400px); overflow: hidden; position: relative; }
pre.ld-collapsible.ld-expanded { max-height: none; overflow: auto; }
```
A `::after` gradient is injected only while `:not(.ld-expanded)`, giving a visual "there is more below" hint.

### 4. Collapse toggle — `_decorateCollapsibleCodeBlocks(contentEl)`

Called from `_wireDocContent` after `hljs.highlightElement`. Skipped entirely when `codeBlockMaxHeight <= 0`. For each `<pre>` whose measured `scrollHeight` exceeds `codeBlockMaxHeight + 8` (8 px tolerance to avoid flickering the button on blocks that are *almost* at the cap), the block gains:
- Class `ld-collapsible` (enables the max-height + gradient).
- A bottom-right `button.ld-code-toggle` whose textContent toggles between `doc.code_show_more` / `doc.code_show_less` and which flips the `ld-expanded` class on the `<pre>`.

### 5. Copy button — `_decorateCodeBlocksWithCopy(contentEl)`

Called before the collapse decorator, so the two buttons co-exist on opposite corners. For every `<pre>` containing a `<code>` (and not already decorated), a `button.ld-code-copy` is appended with:
- Inline SVG (clipboard icon), switched to a check-mark SVG on copy success.
- Position `absolute; top: 0.4rem; right: 0.5rem` — hence excluded from the layout flow so `scrollHeight` (used by the collapse decorator) is not inflated.
- `opacity: 0` by default, revealed on `.prose pre:hover` or keyboard `:focus-visible`, and held visible while the success state (`.ld-copied`) is active.
- Click handler:
  - Reads `code.innerText` (plain text — hljs `<span>`s are stripped by the DOM API).
  - Tries `navigator.clipboard.writeText(...)`, falls back to a hidden `<textarea>` + `document.execCommand('copy')` for environments where the Clipboard API is blocked.
  - Adds `.ld-copied` (green theme) + swaps to check-mark SVG for 1500 ms, then reverts.
- Labels `doc.code_copy` / `doc.code_copied` — EN and FR.

### 6. Positioning invariants

- `.prose pre { position: relative }` is set unconditionally so both buttons can anchor. This is a generic rule on every `<pre>`, not just collapsible ones — needed because the copy button appears on every code block.
- The copy icon sits top-right, the collapse toggle bottom-right — they never overlap.
- The collapse toggle's gradient `::after` sits behind the copy button (`z-index: 1` vs `2`), so the icon stays readable even on collapsed blocks.

## Consequences

### PROS

- **Per-project control** — the max-height lives in `.living-doc.json`, so every client of the same documentation shares the same reading experience. No divergence between contributors.
- **Single knob, three states** — `0` (disable), small values (aggressive collapse for reference docs), large values (rarely collapse) — the whole feature is governed by one number.
- **Zero markdown changes** — existing documents are untouched; the UX is applied at render time. No migration needed.
- **Clean copy output** — `innerText` bypasses the hljs span soup, so pasted code matches exactly what the author wrote.
- **Clipboard fallback** — works in contexts where `navigator.clipboard` is denied (older browsers, insecure origins, strict permissions).
- **No layout pollution** — both buttons use `position: absolute`, so they never shift the rendered code nor break the `scrollHeight` measurement that drives the collapse heuristic.
- **Discoverable without being noisy** — the copy button is invisible until hover/focus, the collapse toggle only appears on blocks that actually need it.
- **i18n from day one** — all four new strings (`doc.code_copy`, `doc.code_copied`, `doc.code_show_more`, `doc.code_show_less`, and the two admin strings) are in both `en.json` and `fr.json`.

### CONS

- **DOM scan per render** — `_decorateCodeBlocksWithCopy` + `_decorateCollapsibleCodeBlocks` iterate every `<pre>` and read `scrollHeight` (triggers a reflow). Negligible for typical documents (< 20 code blocks), but worth knowing for unusually large docs.
- **Hover-only copy button on touch devices** — without `:hover`, the button stays invisible unless focused. Acceptable for a tool that is primarily a desktop documentation viewer, but mobile users cannot trigger copy. A future iteration could switch to an always-visible faded icon on coarse-pointer media.
- **Gradient tuned for dark hljs theme** — `rgba(40, 44, 52, ...)` matches the `github-dark` theme enforced by the earlier ADR; if we ever swap the hljs theme, the fade color has to be re-tuned or made CSS-variable driven.
- **No "copied" toast** — confirmation relies purely on the button's color + icon swap. Users whose eyes were on another part of the doc might miss the feedback. A 1500 ms cue felt adequate for the first iteration; we can upgrade to a centred toast later if needed.
- **Export not aware of the toggle** — the HTML/Notion/Confluence exports run a different rendering path; collapsed blocks export fully expanded (the collapse is a viewer-only convenience). Consistent with the "markdown stays authoritative" principle, but users might expect parity.
- **Scroll-height heuristic needs hljs to have run** — the decorator must be called *after* `hljs.highlightElement`, because highlighting can alter line wrapping and therefore the measured height. The order is explicit in `_wireDocContent` but fragile to future refactors.
