---
**date:** 2026-05-21
**status:** Idle
**description:** Point de reprise partagé entre assistants IA pour suivre la tâche courante, son statut, les fichiers touchés, les vérifications et la prochaine action.
**tags:** worklog, handoff, progression, reprise, agents-ia
---

# Current task

Ce document est le point de reprise entre assistants IA. Tout agent doit le lire avant de continuer une tâche et le mettre à jour avant de rendre la main.

## Statut courant

Idle

## Tâche courante

Évolution terminée : la mini popup affichée au clic droit sur un snippet reconnu expose désormais **deux** actions — `Éditer …` et `Supprimer …` typées selon le snippet. Le bouton Supprimer ouvre directement la modale de confirmation `showConfirm` (la même que celle déclenchée depuis l'intérieur de la modale d'édition), sans passer par l'ouverture du formulaire d'édition.

## Dernière action réalisée

- 19 nouvelles clés i18n `snippet.inline_delete_btn_<type>` (FR + EN) couvrant tous les types éditables : table, code-block, blockquote, ordered/unordered_list, tree, colored_section, colored_text, collapsible, link, doc_link, anchor_link, anchor_doc_link, image, separator, heading_1..heading_4.
- Nouveau mapping `_INLINE_DELETE_LABEL_KEY_BY_TYPE` + helper `_inlineDeleteAffordance(type)` dans `src/frontend/inline-snippet-edit.js` (icône `fa-trash`, label spécifique au type).
- Refactor de `_inlineShowPopup` : la fonction accepte désormais soit une seule action (rétrocompat), soit un tableau d'actions empilées verticalement. Chaque bouton expose son propre `data-action="edit"|"delete"|"insert"`. Les boutons danger (delete) reçoivent un styling rouge.
- Le handler `contextmenu` sur un snippet reconnu passe maintenant deux actions à `_inlineShowPopup` : édit (ouvre `openSnippetsModalForInlineEdit`) et delete (appelle `confirmAndDeleteInlineSnippetRange`).
- Nouveau helper `confirmAndDeleteInlineSnippetRange(range)` exposé sur `window` dans `src/frontend/snippets.js`, qui prend une plage source directement (pas besoin d'ouvrir la modale d'édition d'abord). Refactor de `deleteInlineSnippetBlock` qui partage les helpers internes `_confirmInlineSnippetDeletion()` et `_performInlineSnippetDeletion(start, end)`.
- Tests Playwright existants ajustés : tous les `#inline-snippet-popup button` ont été remplacés par `#inline-snippet-popup button[data-action="edit"]` (24 occurrences) ou `[data-action="insert"]` (3 occurrences) selon le contexte. Sinon Playwright strict mode échouait à cause des deux boutons dans la popup edit.
- Deux nouveaux tests Playwright :
  - `right-click popup exposes a typed delete button that triggers the confirmation modal directly` : right-click sur la table → popup avec `Edit table` et `Delete table` → click delete → confirm modal s'ouvre directement (modale d'édition jamais ouverte) → ok → table retirée du disque.
  - `right-click popup delete button can be cancelled and leaves the snippet untouched` : right-click sur blockquote → click delete → confirm modal → cancel → blockquote toujours présent.

## Prochaine action recommandée

Aucune. Quand le MCP local pour ce repo sera disponible, lancer `refresh_metadata` sur l'ADR inline snippets.

## Fichiers ou zones concernés

- `src/frontend/inline-snippet-edit.js`
- `src/frontend/snippets.js`
- `src/frontend/i18n/en.json`
- `src/frontend/i18n/fr.json`
- `tests/e2e/inline-snippet-edit.spec.ts`
- `documentation/ADRS/2026_05_17_19_11_[SNIPPET]_edition_inline_des_snippets_depuis_le_viewer_par_clic_droit.md`
- `documentation/WORKLOG/current-task.md`

## Vérifications récentes

- `npm run build` : OK.
- `npx playwright test tests/e2e/inline-snippet-edit.spec.ts` : OK, 26 tests passés (24 existants ajustés + 2 nouveaux pour la suppression depuis la popup).
- MCP `living-documentation` local pour ce projet : non disponible (le MCP connecté pointe sur un autre workspace). Métadonnées Living Documentation NON rafraîchies.

## Notes de reprise

Convention rappel : ce worklog n'est pas un ADR. Y consigner uniquement l'état opérationnel.

La popup contient maintenant deux boutons quand on cible un snippet reconnu. Les sélecteurs Playwright doivent toujours préciser `[data-action="edit"]` ou `[data-action="delete"]` pour éviter l'erreur strict mode.
