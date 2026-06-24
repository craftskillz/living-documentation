---
**date:** 2026-06-24
**status:** Completed
**description:** Ajustement de l'entête des popups Blueprint pour afficher le dossier source sans modifier le contenu initial des documents.
**tags:** worklog, blueprint, popup-header, document-creation, svelte, i18n, e2e
---

# Current task

## Statut courant

Completed

## Tache realisee

Les popups de documents ouvertes depuis la page Blueprint affichent désormais un entête de dossier explicite, par exemple `Dossier /bin` en français, au lieu du seul titre de document `bin`.

## Implementation

- Le titre visuel de la popup Blueprint rend un libellé localisé (`Dossier` / `Folder`) suivi du chemin source dans un élément `code`, par exemple `/bin`.
- Le contenu Markdown initial n'est plus modifié par Blueprint : la création de document reste le comportement standard de `POST /api/documents`.
- Le nom de document et le flux Home restent inchangés.
- Les styles Blueprint ajoutent uniquement le rendu du `code` dans l'entête de popup.
- Le test E2E Blueprint vérifie le titre de popup `/beta`, le formulaire de création, puis la création complète avec un contenu standard `# beta`.

## Fichiers concernés

- `src/frontend-svelte/src/lib/blueprint/AdrModal.svelte`
- `src/frontend-svelte/src/lib/blueprint/styles.css`
- `src/frontend-svelte/public/i18n/en.json`
- `src/frontend-svelte/public/i18n/fr.json`
- `tests/e2e/blueprint-edit.spec.ts`
- `graphify-out/graph.json`
- `graphify-out/graph.html`
- `graphify-out/GRAPH_REPORT.md`

## Verifications

- `npm run build` : OK.
- `npx playwright test tests/e2e/blueprint-edit.spec.ts --project=chromium` : OK, 3 tests passés.
- `graphify update .` : OK après approbation escaladée.

## Points d'attention

- Le build signale toujours un warning Svelte existant : `currentAdrId` est modifié sans `$state(...)` dans `AdrModal.svelte`.
- Des fichiers déjà modifiés avant cette tâche n'ont pas été remis à zéro : `documentation/.blueprint-positions.json`, `documentation/.living-doc.json` et `documentation/000_BLUEPRINT/2026_06_24_19_32_[BIN]_bin.md`.

## Prochaine action recommandee

Tester manuellement depuis `/blueprint` sur le dossier `bin` pour valider visuellement l'entête `Dossier /bin`.
