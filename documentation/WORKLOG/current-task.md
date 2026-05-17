---
**date:** 2026-05-17
**status:** Idle
**description:** Point de reprise partagé entre assistants IA pour suivre la tâche courante, son statut, les fichiers touchés, les vérifications et la prochaine action.
**tags:** worklog, handoff, progression, reprise, agents-ia
---

# Current task

Ce document est le point de reprise entre assistants IA. Tout agent doit le lire avant de continuer une tâche et le mettre à jour avant de rendre la main.

## Statut courant

Idle

## Tâche courante

Feature terminée et redocumentée : édition inline des snippets depuis le viewer par clic droit.

## Dernière action réalisée

- Extension de l'édition inline aux snippets structurés : table complète avec cellules vides, bloc de code avec textarea, citation avec textarea, listes à puces et numérotées avec textareas, arborescence, texte coloré et section colorée.
- Masquage de l'aperçu Markdown pour les mini éditeurs où il n'apporte rien : table, code, tree, citation, listes, texte coloré et section colorée.
- Ajout d'un bouton `Supprimer le bloc`, visible uniquement en mode inline, avec confirmation via `showConfirm()` avant suppression de la plage Markdown source.
- Verrouillage de la selectbox `#snippet-type` en mode inline pour empêcher de changer le type détecté ; elle reste active en mode insertion classique.
- Mise à jour de la fixture `with-inline-snippets` et de la spec `tests/e2e/inline-snippet-edit.spec.ts` pour couvrir les nouveaux cas et la suppression.
- ADR `2026_05_17_19_11_[SNIPPET]_edition_inline_des_snippets_depuis_le_viewer_par_clic_droit` mis à jour via MCP, enrichi avec les nouvelles décisions UX/techniques, attaché à `src/frontend/snippet-detect.js` et metadata rafraîchie à accuracy 1.
- Documentation utilisateur mise à jour : tutoriel `1_tutorial/2026_04_12_10_00_[General]_utiliser_les_snippets` et référence `4_reference/2026_04_09_03_00_[REFERENCE]_types_de_snippets`, avec métadonnées source attachées à accuracy 1.

## Prochaine action recommandée

Relire le diff global puis commit si le comportement convient. Le document sample `documentation/5_talks/sample/2026_05_17_19_12_[CONFERENCE]_sample.md` est modifié séparément et doit être traité selon l'intention utilisateur.

## Fichiers ou zones concernés

- `src/frontend/inline-snippet-edit.js`
- `src/frontend/snippets.js`
- `src/frontend/snippet-detect.js`
- `src/frontend/documents.js`
- `src/frontend/index.html`
- `src/frontend/i18n/en.json`
- `src/frontend/i18n/fr.json`
- `tests/e2e/inline-snippet-edit.spec.ts`
- `tests/fixtures/with-inline-snippets/`
- `documentation/ADRS/2026_05_17_19_11_[SNIPPET]_edition_inline_des_snippets_depuis_le_viewer_par_clic_droit.md`
- `documentation/1_tutorial/2026_04_12_10_00_[General]_utiliser_les_snippets.md`
- `documentation/4_reference/2026_04_09_03_00_[REFERENCE]_types_de_snippets.md`
- `documentation/.metadata.json`

## Vérifications récentes

- `npm run build` : OK.
- `npx playwright test tests/e2e/inline-snippet-edit.spec.ts` : OK, 9 tests passés.
- `refresh_metadata` MCP sur l'ADR inline snippets : OK, accuracy 1 avec 8 fichiers attachés.
- `add_metadata` MCP sur les deux documents utilisateur snippets : OK, accuracy 1 avec 3 fichiers attachés chacun.

## Notes de reprise

Convention rappel : ce worklog n'est pas un ADR. Y consigner uniquement l'état opérationnel.

Limite connue : la correspondance Markdown vers HTML est heuristique et ordonnée, pas une source map exacte. Les snippets canoniques générés par la modale sont la cible principale. La régénération des listes numérotées renumérote les items selon leur niveau d'indentation.
