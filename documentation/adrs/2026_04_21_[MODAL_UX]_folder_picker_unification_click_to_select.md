---
🗄️ ADR : 2026_04_21_[MODAL_UX]_folder_picker_unification_click_to_select.md
**date:** 2026-04-21
**status:** Validated
**description:** Unify the folder-picker UX of the New Folder and New Document modals by making folder clicks both navigate and select, removing redundant explicit "select" links, and aligning the ↑ Up button styling and i18n.
**tags:** modal, ux, new-folder, new-document, folder-picker, browse, click-to-select, ↑-up-button, styling-consistency, i18n, common.up, frontend
---

## Context

Two modals let the user pick a destination folder under the docs root:

- **New Folder** ([src/frontend/new-folder-modal.js](src/frontend/new-folder-modal.js)) — choose where to create a new sub-folder.
- **New Document** ([src/frontend/new-doc-modal.js](src/frontend/new-doc-modal.js)) — choose where to create a new `.md` document.

Both embed an inline folder browser driven by `/api/browse`. Over time the two had diverged into an inconsistent UX:

- **New Folder** used a "Sélectionner ce dossier" link pattern — clicking a row navigated into the folder, and a separate link was required to mark it as the destination. The flow was confusing: the folder visible in the header was not necessarily the one that would be used.
- **New Document** used a different oddity — a per-row ✓ button plus a bottom "Utiliser ce dossier" link. Same conceptual problem, different visuals.
- The **↑ Up** button also looked different between the two modals: the new-doc one was blue with the label "↑ Up", the new-folder one was gray with just "↑".
- The **New Document** Up button was also missing its `data-i18n` attribute, breaking the CLAUDE.md rule that every user-visible string must be translatable.

## Decision

### 1. Click-to-select

Both modals now treat a folder-row click as `enter + select` in a single gesture:

- `newFolderLoadBrowse(path)` / `newDocLoadBrowse(path)` update `_*SelectedPath` / `_newDocSelectedFolder` on every navigation, refresh the destination-display label (`#new-folder-location-display` / `#new-doc-folder-display`), and, in the new-doc case, call `newDocUpdatePreview()` so the filename preview tracks the current folder.
- Each folder row is now a single button whose `onclick` is just the navigation call — no separate ✓ button, no tick-mark UI.
- The bottom "Utiliser ce dossier" / "Sélectionner ce dossier" links are removed along with their handlers (`newFolderSelectFolder`, `newFolderSelectCurrentLocation`, `newDocSelectFolder`, `newDocSelectCurrentFolder`) and their i18n keys (`modal.new_folder.select_btn`, `modal.new_folder.browse_select_btn`, `modal.new_doc.use_folder_btn`).
- `newDocCreateFolder` no longer hides the browser on success — the user stays oriented.

The folder the user ends up "on" is, by construction, the folder that will be used — no dual state to reconcile.

### 2. Consistent ↑ Up button

`#new-folder-browse-up` was re-styled in [src/frontend/index.html](src/frontend/index.html) to match `#new-doc-browse-up`:

```html
class="text-xs text-blue-600 dark:text-blue-400 hover:underline
disabled:opacity-30 disabled:pointer-events-none shrink-0"
```

Label unified to `↑ Up`.

### 3. i18n

Both `#new-folder-browse-up` and `#new-doc-browse-up` now carry `data-i18n="common.up"`. The `common.up` key was already defined in [src/frontend/i18n/en.json](src/frontend/i18n/en.json) as `"↑ Up"` and in [src/frontend/i18n/fr.json](src/frontend/i18n/fr.json) as `"↑ Monter"`.

## Consequences

### PROS

- The two modals now follow the same mental model: the folder you are currently looking at is the folder that will be used. No hidden "active folder" state.
- Fewer clicks for the common case: a single click both navigates and selects, instead of the previous two-step browse-then-confirm.
- The UI surface shrank: per-row action buttons and the bottom "use this folder" link disappeared, which also trims the i18n catalog (three keys removed from both EN and FR).
- Both ↑ Up buttons look identical and are fully localised — the CLAUDE.md i18n rule is upheld end-to-end.
- Future maintenance is easier: the two modals now share a single interaction pattern, so a change to one is directly transposable to the other.

### CONS

- A user who opens the browser and then closes the modal without any other action will have silently moved the selection by hovering-and-clicking — there is no "peek without selecting" mode anymore. In practice the previous explicit-select flow also changed selection on click of the links, so the regression is only theoretical.
- The behaviour is now less discoverable for power-users who expected the explicit "Use this folder" affordance as a safeguard. The mitigation is the always-visible destination label at the top of the modal, which makes the current selection obvious at a glance.
