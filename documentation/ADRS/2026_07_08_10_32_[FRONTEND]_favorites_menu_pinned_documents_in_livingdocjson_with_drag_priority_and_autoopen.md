---
**date:** 2026-07-08
**status:** To be validated
**description:** A topbar Favorites dropdown persists pinned documents (id + title) as an ordered `favorites` array in `.living-doc.json`, synced client-side through a single shared `/api/config` fetch observer, toggled from a per-document star button (kanban included), reorderable by drag for priority, opened first on reload, and seeded with the welcome doc at project init.
**tags:** favorites, FavoritesMenu, favorites.svelte.ts, configObserver, living-doc.json, drag-and-drop, priority-ordering, DocViewer-star, starter-doc-seed, i18n-preload, topbar
---

## Context

Users needed a fast way to return to important documents from anywhere in the
app. The topbar already hosts a dropdown pattern (`AgentsMenu`), and the project
already persists user preferences in the portable
[`.living-doc.json`](?doc=ADRS%252F2026_04_24_%255BCONFIGURATION%255D_portable_living_doc_json_with_relative_paths).
Favorites had to work on every page (not just Home), survive reloads, travel
with the project (committable), and cover any document — including kanban docs.

## Decision

### Storage — server config, not localStorage
Favorites live in `.living-doc.json` as an ordered `favorites: { id, title }[]`
array (`FavoriteDoc` in `src/lib/config.ts`, validated/deduped/capped in the
`PUT /api/config` handler). This makes them portable and git-committable rather
than per-browser. `id` is the same path-encoded document id the app uses
(`encodeURIComponent(relPath without .md)`); `title` is a snapshot so the menu
renders without loading every document. **List order is the priority** (top =
highest).

### Sync — one shared config observer, zero extra requests
Rather than an extra `/api/config` fetch per page (which would also regress the
single-request invariant asserted by the AI-Context e2e test), a single
`installConfigObserver()` (`configObserver.ts`) wraps `window.fetch` once and
notifies listeners with the parsed config of every `GET /api/config` the page
already makes. Both the favorites store and the tau site-theme now sync through
it (`onConfig(...)` in `main.ts`). Writes are an optimistic `PUT /api/config`
with rollback on failure (`FavoritesState.persist`).

### UI
- **Topbar** — `FavoritesMenu.svelte` (portaled dropdown mirroring `AgentsMenu`),
  placed **first** in `.topbar-right`. Lists favorites, click navigates to
  `/?doc=<id>`, `×` removes.
- **Per-document star** — a toggle button in the `DocViewer` header
  `view-actions`, rendered for **all** document types including kanban
  (outside the `isKanbanDocument` guards); filled amber star = favorited.
- **Drag priority** — each row has a grip handle and is draggable; dropping calls
  `FavoritesState.reorder(fromId, toId)`, persisting the new order.

### Auto-open on reload
When Home mounts with no `?doc=` query, it opens the **highest-priority favorite**
(first entry that still exists) before falling back to the default first document.

### Starter seeding
The bilingual starters
([initializer ADR](?doc=ADRS%252F2026_05_11_15_42_%255BSTARTER_DOC%255D_bilingual_starter_doc_and_interactive_npx_initializer))
copy their own `.living-doc.json`, so the welcome document is pre-pinned by adding
a `favorites` entry to `starter-doc/.living-doc.json` (EN) and
`starter-doc-fr/.living-doc.json` (FR) — no `cli.ts` change. On init the
Favorites menu is populated and Home opens the welcome doc immediately.

## Consequences

- Favorites are shared/committed with the project; a personal (localStorage)
  scope was explicitly rejected in favor of portability.
- `id` is path-based, so renaming/moving a favorited document orphans its entry
  (the auto-open and menu fall back gracefully via `find`).
- The shared config observer became the standard client-side channel for
  "react to server config" concerns, replacing the earlier per-feature fetch hook.

## Related

- i18n preloaded from a cached language before mount to avoid a raw-key flash in
  always-visible chrome — see
  [i18n en/fr ADR](?doc=ADRS%252F2026_04_14_%255BI18N%255D_internationalization_en_fr_with_json_translation_files).
- Portable config foundation:
  [portable living-doc.json](?doc=ADRS%252F2026_04_24_%255BCONFIGURATION%255D_portable_living_doc_json_with_relative_paths).
