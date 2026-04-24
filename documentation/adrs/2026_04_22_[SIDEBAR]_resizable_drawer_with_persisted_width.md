---
`🗄️ ADR : 2026_04_22_[SIDEBAR]_resizable_drawer_with_persisted_width.md`
**date:** 2026-04-22
**status:** Accepted
**description:** Make the index page sidebar horizontally resizable via a drag handle on its right edge, persist the chosen width across reloads in localStorage, and keep the existing toggle (show/hide) working unchanged.
**tags:** sidebar, drawer, resize, drag-handle, localStorage, persistence, frontend, index, toggle, ux
---

## Context

The sidebar on the index page (`src/frontend/index.html`) had a fixed width of `w-72` (288px) defined via a Tailwind class. Users with long category/folder names or deep trees had to truncate or scroll horizontally to read entries, while users who wanted more room for the article had no way to shrink the drawer.

Two constraints framed the design:

1. The width choice had to survive a page reload (F5) — a per-session UI setting is pointless if every refresh resets it.
2. The existing sidebar toggle (the icon at the top-left that shows/hides the drawer via `toggleSidebar()` in `sidebar.js`) had to keep working without any behavioural change. That toggle relies on flipping the Tailwind `hidden` class on `#sidebar`.

## Decision

Introduce a new module `src/frontend/sidebar-resize.js` loaded via `defer` in `index.html` (right after `sidebar.js`) and initialised from `boot.js` on `DOMContentLoaded`, after `loadConfig()` but alongside the other early init hooks (`initFileAttach`, `initMarkerState`, `initFullWidthState`).

**Handle** — A 6px-wide `<div>` positioned `absolute; top:0; right:-2px; height:100%; cursor:col-resize` is appended inside `#sidebar`. The sidebar itself is given `position: relative` so the handle anchors to its right edge. The handle is transparent at rest and fades to a blue tint on hover and while dragging, mirroring the existing blue accent used elsewhere in the UI.

**Drag loop** — `mousedown` on the handle captures `startX` and the sidebar's current `getBoundingClientRect().width`; `mousemove` on `document` recomputes the width as `startW + (e.clientX - startX)` clamped to `[200, 600]` px and writes it to `sidebar.style.width`. `mouseup` removes the listeners, clears the cursor/user-select overrides applied to `document.body` during the drag, and persists the final width to `localStorage` under key `ld-sidebar-w`.

**Class stripping** — On first drag (and on load when a stored width exists), the `w-72` Tailwind class is removed from `#sidebar`. This prevents the inline `style.width` from fighting with the Tailwind-provided `width: 18rem`, which would otherwise win because Tailwind's utility classes are compiled with higher specificity than inline styles via the `@layer utilities` CDN build.

**Restoration** — On init, `sidebar-resize.js` reads `ld-sidebar-w` from `localStorage`, clamps it to `[200, 600]`, removes `w-72`, and applies the width inline. If no stored value exists, the default Tailwind `w-72` class is left in place and the sidebar keeps its 288px default.

**Toggle compatibility** — `toggleSidebar()` in `sidebar.js` continues to toggle the `hidden` class. Tailwind's `.hidden { display: none !important }` wins over any inline `width`, so the drawer disappears on toggle-off. When toggled back on, the inline width is still present and the resized size is restored automatically. No change to `sidebar.js` was needed.

**Asset copy** — `scripts/copy-assets.ts` recursively copies `src/frontend/` to `dist/src/frontend/`, so the new `.js` file is picked up automatically by the build without editing the script.

## Consequences

### PROS

- Users can now adapt the sidebar width to their content density (long folder names, deeper trees) or favour more reading room for the article.
- The width survives reloads via `localStorage`, matching the persistence model already used across the project (`ld-dark`, `ld-hide-categories`, `wc-root`, …).
- Zero interaction with the existing toggle: `toggleSidebar()` is untouched and the Tailwind `hidden` class override naturally wins over inline width.
- No new dependency, no build step change, ~100 lines in an isolated module that can be removed without touching any other file.
- Clamping to `[200, 600]` prevents both unusable slivers and the sidebar swallowing the entire viewport.

### CONS

- The drag handle is only 6px wide and transparent at rest — discoverability relies on the `col-resize` cursor. Users who don't hover precisely on the right edge may not realise the sidebar is resizable.
- Mobile / touch devices are not supported: the handler uses `mousedown`/`mousemove`/`mouseup` only. Touch resizing would require additional pointer-event plumbing.
- The inline `style.width` introduced on the sidebar is a subtle divergence from the rest of the codebase, which is overwhelmingly Tailwind-class driven. Future contributors reading the DOM may be briefly surprised by the mix.
- `localStorage` is per-origin, not per-project: when the same user opens different `living-documentation` instances on the same host and port, they share the stored width.
