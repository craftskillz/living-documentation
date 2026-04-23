---
`🗄️ ADR : 2026_04_23_[CONFIGURATION]_exclusive_folder_and_category_expansion_options.md`
**date:** 2026-04-23
**status:** Pending Validation
**description:** Add two admin-configurable options (exclusiveFolderExpansion, exclusiveCategoryExpansion, both off by default) that make the index sidebar behave as an "accordion" — opening a folder or category auto-collapses its siblings (and, for folders, their entire subtree) ; sibling collapse is rendered instantly (transition disabled) so the new panel's open animation does not visually fight with the old panel's close animation.
**tags:** configuration, sidebar, drawer, folder, category, accordion, exclusive, expansion, collapse, admin, ux, animation, transition, frontend, i18n
---

## Context

In `src/frontend/index.html`, the sidebar drawer renders a recursive tree of folders and, inside each folder, category groups. Every folder and every category has its own independent collapse / expand toggle, stored respectively in the `expandedFolders` and `expandedCategories` Sets (in `state.js`).

For users with wide documentation trees, this independence becomes noisy: as the user navigates, several folders and categories stay expanded side-by-side, the sidebar grows long and the active section gets lost in the noise. The user asked for a built-in "accordion" behaviour — but scoped by parent, not global — and opt-in rather than forced (some users prefer the current free-form behaviour).

Two distinct needs:

- **Categories** are single-level inside a folder. Exclusivity is straightforward: only one category open per parent folder.
- **Folders** are multi-level (folders contain folders). Exclusivity must close the sibling folder *and* recursively all of its expanded descendants — otherwise the user-invisible descendants would re-appear the next time the ancestor is reopened.

A first implementation worked functionally but felt visually "slow": closing the previous sibling went through the standard `max-height 0.2s + opacity 0.2s` transition, while the newly-clicked panel was simultaneously running its *opening* animation. The two overlapping animations produced a noticeably wobbly effect.

## Decision

### 1. Two new config flags

Added to `LivingDocConfig` (in `src/lib/config.ts`) with `false` defaults, and whitelisted in `PUT /api/config`:

- `exclusiveFolderExpansion: boolean`
- `exclusiveCategoryExpansion: boolean`

### 2. Admin UI

Two checkboxes in the Admin panel (`src/frontend/admin.html`), placed in the *Appearance & Metadata* card right under the diagram debug option. Loaded in `loadConfig()`, sent in `saveConfig()` via the existing PUT payload. Labels and hints added to `en.json` and `fr.json`.

### 3. Frontend wiring

Two globals declared in `state.js` (`exclusiveFolderExpansion`, `exclusiveCategoryExpansion`), assigned from the fetched config in `config.js`. No localStorage — the flags follow the server-side `.living-doc.json` so the behaviour is uniform for every client hitting the same documentation.

### 4. Exclusive-expansion logic (`sidebar.js`)

`toggleCategory(key)` — when expanding and `exclusiveCategoryExpansion === true`:
- Parent path = all segments except the last.
- Iterate over `[...expandedCategories]`; for each sibling whose parent path matches and whose key differs, call `collapseCategoryByKey(siblingKey, /* instant */ true)`.

`toggleFolder(pathKey)` — when expanding and `exclusiveFolderExpansion === true`:
- Same parent-path comparison.
- For each sibling, call `collapseFolderAndDescendants(siblingKey, /* instant */ true)`, which recursively closes the folder, every descendant folder, and every descendant category (all sharing the `pathKey + "|"` prefix).

No "last-opened" Map was introduced. Scanning the `expandedFolders` / `expandedCategories` Sets on each click is O(n) where n is the number of currently-open panels — in exclusive mode that number stays small by construction, and the scan is sub-millisecond. An explicit last-opened Map would duplicate state, add sync risk on collapse-descendants, and bring no measurable gain.

### 5. Instant sibling collapse (the UX fix)

Added CSS class `.category-docs.no-transition { transition: none !important; }` in `index.html`.

Added helper `setInstantCollapse(el)` in `sidebar.js`:
1. Add `no-transition` + `collapsed`, remove `expanded`.
2. Force a reflow via `void el.offsetHeight` so the collapsed state is committed while transitions are disabled.
3. `requestAnimationFrame(() => el.classList.remove("no-transition"))` — next frame, transitions are re-enabled so any future manual toggle of that same panel animates normally.

Only sibling collapses triggered by the exclusive-mode branches pass `instant = true`. User-initiated collapses (clicking a panel to close it) keep the original 200 ms animation.

## Consequences

### PROS

- **Accordion behaviour when desired** — users with noisy sidebars get a single-path view ; users who liked the free-form behaviour are untouched (flags default to off).
- **Scoped exclusivity** — siblings are closed per-parent, not globally, so expanding a deep folder does not collapse unrelated branches.
- **Multi-level handled correctly** — `collapseFolderAndDescendants` cleans up `expandedFolders` *and* `expandedCategories` below the closed sibling, avoiding ghost-expanded state on the next reopen.
- **No animation overlap** — instant collapse on siblings keeps the UX snappy while the newly-opened panel still gets its smooth open animation.
- **Per-project configuration** — flags live in `.living-doc.json`, so all clients of the same documentation share the setup (good for shared/team docs).
- **Minimal code impact** — ~100 LoC across state/config/sidebar/admin, no new data structures (reuses existing `expandedFolders` / `expandedCategories` Sets).

### CONS

- **Per-click scan of the expanded Sets** — O(n) on every toggle. Negligible in practice (n rarely > 20) but not as symbolically clean as a `Map<parentPath, lastOpenedKey>`.
- **Two-step render on exclusive close** — the `no-transition` class is added then removed via `requestAnimationFrame`, which is one extra frame of bookkeeping per exclusive click. Invisible to users but adds a small amount of subtlety to the toggle functions.
- **No localStorage override** — a user who would prefer a different setting than the project-wide one cannot override locally. Acceptable given the flag affects shared documentation UX, but worth noting.
- **Search-triggered expansions are not re-constrained** — if a search programmatically expands ancestors via direct `expandedFolders.add(...)`, the exclusive rule does not fire (by design: only user clicks trigger it). This can leave multiple ancestors expanded after a search, which is the intended behaviour but surprises users expecting strict accordion semantics.
