---
🗄️ ADR : 2026_04_21_[NAVIGATION]_anchor_select_dropdowns_and_navhistory_rewind.md
**date:** 2026-04-21
**status:** Accepted
**description:** Preserve the #anchor fragment through SPA navigation, replace anchor text inputs by heading select dropdowns (co-dependent for doc+anchor), and rewind navHistory when clicking a link whose target already sits in the back-stack.
**tags:** navigation, anchor, fragment, spa, history, pushstate, snippets, anchor-link, anchor-doc-link, select, dropdown, headings, slugify, back-button, navhistory, rewind, cycle
---

## Context

The viewer supports two snippet types that produce in-document or cross-document jumps:

- `anchor-link` — a local `#heading-slug` jump inside the current document.
- `anchor-doc-link` — a cross-document link `?doc=<id>#heading-slug`.

Three issues surfaced once these snippets were used in real documentation:

1. **Anchor fragment lost on click.** Cross-document links were partially broken: clicking opened the right document but the page never scrolled to the anchor. The click handler extracted the `doc` query param with `/[?&]doc=([^&#]+)/`, which (correctly) stops at `#`, but the `#anchor` part was then silently dropped. The pushed URL state also omitted the fragment, so a reload or back/forward did not restore the scroll target either.
2. **Free-form anchor text inputs are error-prone.** Users had to type the slug by hand (e.g. `mon-titre`), guessing the slugification rules used by the renderer. Typos produced dead links that only failed at click time.
3. **navHistory grew unboundedly on cycles.** Navigating `Tata → Tutu → Tata` via in-doc links stacked `Tata` on top of itself. The back-button on Tata would then take the user back to Tutu instead of unwinding the full cycle. Longer cycles like `Tata → Tutu → Titi → Tata` had the same problem.

## Decision

### 1. Propagate the anchor as an explicit parameter

`openDocument(id, skipHistory, fromLink, anchor)` gained a fourth parameter. Click handlers in [src/frontend/documents.js](src/frontend/documents.js) now parse the `href` in two passes — first extract the doc id from the query string, then read `href.indexOf("#")` separately — and forward the raw anchor slug to `openDocument`. The pushed URL sets `url.hash` and the history state stores `{ id, anchor }`. After the document renders, scroll logic prefers the explicit `anchor` param and only falls back to `location.hash` when it is absent. The popstate handler in [src/frontend/boot.js](src/frontend/boot.js) reads `state.anchor || location.hash` and forwards it identically, so back/forward works the same as a fresh click.

### 2. Replace anchor text inputs by select dropdowns driven by headings

The snippet panel fields `#snip-anchor-id` (for `anchor-link`) and `#snip-anchor-doc-id` (for `anchor-doc-link`) became `<select>` elements in [src/frontend/index.html](src/frontend/index.html). A helper pipeline in [src/frontend/snippets.js](src/frontend/snippets.js) fills them:

- `_extractHeadingsFromMarkdown(md)` walks the raw markdown looking for ATX headings, strips inline formatting via `_stripMdInline`, and slugifies with the exact same transform used by the renderer: `text.toLowerCase().replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-")` — so the slug in the dropdown is guaranteed to match the id produced by `documents.js`.
- `_collectEditorHeadings()` reads the current editor buffer to feed the local `anchor-link` list.
- `_populateAnchorSelect()` and `snippetAnchorDocChanged()` wire the `#snip-anchor-doc-select` onchange event so that picking a document fetches its content and re-populates the anchor list. The two lists become co-dependent: document first, then its anchors.
- When `parseAndFillSnippet` is invoked on an existing snippet whose slug is not currently in the options (e.g. the underlying document has changed), a synthetic option is injected so the select still displays the current value without losing the user's previous choice.

### 3. Rewind navHistory on cycle detection

Still in [src/frontend/documents.js](src/frontend/documents.js), the push logic was replaced with a lookup:

```js
if (fromLink === true && currentDocId && currentDocId !== id) {
  const existingIdx = navHistory.findIndex((e) => e.id === id);
  if (existingIdx !== -1) {
    navHistory = navHistory.slice(0, existingIdx);
  } else {
    const prev = allDocs && allDocs.find((d) => d.id === currentDocId);
    navHistory.push({
      id: currentDocId,
      title: prev ? prev.title : currentDocId,
    });
  }
} else if (!fromLink) {
  navHistory = [];
}
```

When the clicked target is already present in the back-stack, the stack is truncated up to — but not including — that entry. `Tata → Tutu → Tata` collapses to an empty stack (identical to clicking the Tata back-button from Tutu). `Tata → Tutu → Titi → Tata` also collapses to empty. Non-cycle navigation behaves as before.

## Consequences

### PROS

- Cross-document anchor links scroll to the right heading on first click, on reload, and on browser back/forward — the anchor now survives every code path that produces a navigation.
- Users no longer guess slugs: the dropdown surfaces exactly the headings the renderer will produce, so snippet creation is WYSIWYG for anchors.
- The two-field `anchor-doc-link` picker feels like a single coherent control: pick a document, see its anchors, done.
- navHistory no longer grows on cycles. The back-button behaviour after a cycle matches what a user would get by pressing back manually.
- The synthetic-option fallback in `parseAndFillSnippet` keeps existing snippets editable even after their target document's headings change.

### CONS

- The anchor dropdown is a snapshot at snippet-creation time. If the target document is renamed or its heading retitled later, the link will dead-end — same failure mode as before, but now hidden behind a dropdown that implies freshness.
- `snippetAnchorDocChanged()` fetches the target document's markdown to rebuild the anchor list, which adds a network round-trip when switching documents in the picker.
- navHistory rewind changes the semantics of repeated link clicks: pages that intentionally rely on accumulating history entries (unlikely here) would break. The rule is currently unconditional; a future "force push" flag is not provided.
