---
`🗄️ ADR : 2026_04_08_13_15_[NAVIGATION]_anchor_scroll_and_folder_sort_convention.md`
**date:** 2026-04-08
**status:** Accepted
**description:** Auto-generate heading IDs after async document render to enable in-page anchor scroll; introduce a numeric prefix convention (1_NAME) for controlling folder sort order in the sidebar while hiding the prefix in the UI.
**tags:** navigation, anchor, heading, scroll, sidebar, folder, sort, convention, prefix, frontend, marked, breadcrumbs
---

## Context

Two independent UX gaps were identified:

1. **Anchor navigation broken**: `marked` v12 does not generate `id` attributes on headings. Links like `[See section](#consequences)` or `?doc=...#consequences` silently failed — the page loaded but never scrolled to the target, because the heading element had no `id` to match.

2. **Folder sort order not controllable**: Sidebar folders are sorted alphabetically. Users with a specific reading order in mind (e.g. Tutorial → Reference → Advanced) had no way to enforce it without renaming folders to non-semantic names.

## Decision

### Anchor scroll

After injecting `doc.html` into the DOM, a post-render pass iterates over all `h1`–`h6` elements and assigns an `id` if none is present:

```js
h.id = h.textContent
  .toLowerCase()
  .replace(/[^\w\s-]/g, "")
  .trim()
  .replace(/\s+/g, "-");
```

After this pass, if `window.location.hash` is set, the matching element is scrolled into view with `scrollIntoView({ behavior: "smooth" })`. The `docView.scrollTop = 0` reset is skipped when a hash is present.

### Folder sort convention

Directories can be prefixed with a number and underscore (`1_TUTORIAL`, `2_REFERENCE`) to control their alphabetical sort position. The `folderLabel(seg)` helper strips the prefix for display:

```js
function folderLabel(seg) {
  return seg.replace(/^\d+_/, "");
}
```

`folderLabel` is applied in two places:

- The sidebar folder button label (`📁 TUTORIAL`)
- The violet breadcrumb pills in the article header

In both places the raw segment name is kept in a `title` attribute so the full name is visible on hover. The sort order itself is untouched — the filesystem name drives it.

## Consequences

### PROS

- Anchor links in documents now work reliably regardless of `marked` version
- The heading ID algorithm is deterministic and matches common Markdown renderer conventions
- Folder sort convention is zero-config — no admin UI, no persisted state; the filesystem name is the single source of truth
- Existing folders without a prefix are unaffected

### CONS

- Heading IDs are generated client-side; server-side rendered HTML still has no `id` attributes (acceptable since the viewer is always client-rendered)
- The slug algorithm strips non-ASCII punctuation which may produce collisions for headings that differ only in special characters
- The `1_` prefix convention is implicit — nothing enforces or documents it within the tool itself beyond the README
