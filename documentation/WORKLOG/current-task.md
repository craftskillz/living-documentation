---
**date:** 2026-05-18
**status:** Idle
**description:** Point de reprise partagé entre assistants IA pour suivre la tâche courante, son statut, les fichiers touchés, les vérifications et la prochaine action.
**tags:** worklog, handoff, progression, reprise, agents-ia
---

# Current task

Ce document est le point de reprise entre assistants IA. Tout agent doit le lire avant de continuer une tâche et le mettre à jour avant de rendre la main.

## Statut courant

Idle

## Tâche courante

Feature terminée et redocumentée : extension du clic droit dans le viewer pour proposer l'insertion d'un snippet quand la zone cliquée n'est pas un snippet reconnu, avec stratégie de résolution de position d'insertion hybride (range-anchor + signature + frères mappés), en plus des correctifs précédents (code blocks indentés dans une liste et code blocks sans langage).

## Dernière action réalisée

- Mode `inline-insert` ajouté à `_setSnippetModalMode(mode)` qui accepte désormais `"insert" | "inline-edit" | "inline-insert"` au lieu d'un booléen. État dédié `_snippetInlineInsert` pour différencier l'UI de l'écriture (`_snippetInlineEdit` reste réservé au remplacement d'une plage source existante).
- Nouvelle fonction `openSnippetsModalForInlineInsert(insertPos)` dans `src/frontend/snippets.js`. La modale s'ouvre avec un titre `Insert a snippet`, le sélecteur de type actif, le bouton `Delete block` caché, et la carte élargie comme en édition inline.
- `insertSnippet()` détecte `wasInlineInsert` et écrit dans `currentDocContent` via `saveCurrentDocumentContent()` plutôt que dans le textarea. Le Markdown inséré est encadré par `\n\n` quand le contexte source ne fournit pas déjà la séparation, avec gestion des bords (début/fin de document).
- `src/frontend/inline-snippet-edit.js` : le handler `contextmenu` route maintenant vers `_inlineShowPopup` avec une config (label, icône, action). Si la cible a `data-inline-snippet-index`, popup `Edit inline`. Sinon, calcul d'une position d'insertion via `_inlineFindInsertPosition(contentEl, target, candidates, clientY)` qui cascade : (0) résoudre le top-level child via `_inlineTopLevelBlock`, ou via `_inlineNearestBlockByY` quand `event.target` est `#doc-content` lui-même (clic dans la marge verticale entre blocs — corrige le cas où l'insertion partait toujours en fin de document) ; (1) range-anchor — si le bloc cliqué ou un descendant porte `data-inline-snippet-index`, utiliser la `range.end` max puis sauter au prochain `\n\n` (garantit l'insertion en fin de paragraphe rendu, pas au milieu) ; (2) signature textuelle — première ligne `textContent` (≤ 60 chars) cherchée dans `currentDocContent` ; (3) frères précédents/suivants — même résolution appliquée aux siblings DOM, avec saut au prochain/précédent `\n\n` ; (4) fin du document en dernier recours. Helpers extraits : `_inlineTopLevelBlock`, `_inlineNearestBlockByY`, `_inlineResolveBlockEnd`, `_inlineResolveBlockStart`. Popup affichée : `Insert a snippet here`.
- Le popup expose `data-action="edit" | "insert"` pour le test E2E.
- Clés i18n ajoutées dans `fr.json` et `en.json` : `snippet.inline_insert_btn`, `snippet.inline_insert_modal_title`, `snippet.inline_insert_failed`.
- Tests Playwright ajoutés : `right-click on unmapped block proposes inline snippet insertion and writes to source` (clic sur le `<h1>`, vérifie l'UI de la modale en mode insertion et le round-trip blockquote inséré entre titre et paragraphe suivant) ; `right-click on a formatted paragraph (signature fails) inserts via sibling fallback` (clic sur un paragraphe contenant `**formatting**`, dont la signature textContent ne matche pas la source, exerce le fallback frères et insère bien entre ce paragraphe et le suivant) ; `right-click in vertical whitespace between blocks resolves to nearest block above` (clic dans la marge entre `<h1>` et le paragraphe suivant via `page.mouse` à des coordonnées x/y calculées, vérifie l'insertion entre `# Inline Snippets` et le paragraphe formaté).
- Fixture `with-inline-snippets` enrichie d'un paragraphe `This paragraph has **formatting** that breaks signature search.` entre le `# Inline Snippets` et `This sentence contains ...` pour exercer le fallback signature → frères.
- ADR `2026_05_17_19_11_[SNIPPET]_edition_inline_des_snippets_depuis_le_viewer_par_clic_droit.md` mis à jour (description, tags, décisions 1, 3 et 7, PROS, CONS).

## Prochaine action recommandée

Le MCP `living-documentation` connecté pointe sur un autre projet : `refresh_metadata` non lancé. Quand le MCP local sera disponible pour ce repo, rebaseliner les hashes de l'ADR inline snippets avec les fichiers suivants attachés : `src/frontend/inline-snippet-edit.js`, `src/frontend/snippets.js`, `src/frontend/i18n/en.json`, `src/frontend/i18n/fr.json`, `tests/e2e/inline-snippet-edit.spec.ts`, `tests/fixtures/with-inline-snippets/testdocs/2026_01_01_10_00_[General]_inline_snippets.md`. Ensuite relire le diff global et commit si le comportement convient.

## Fichiers ou zones concernés

- `src/frontend/inline-snippet-edit.js`
- `src/frontend/snippets.js`
- `src/frontend/i18n/en.json`
- `src/frontend/i18n/fr.json`
- `tests/e2e/inline-snippet-edit.spec.ts`
- `tests/fixtures/with-inline-snippets/testdocs/2026_01_01_10_00_[General]_inline_snippets.md`
- `documentation/ADRS/2026_05_17_19_11_[SNIPPET]_edition_inline_des_snippets_depuis_le_viewer_par_clic_droit.md`

## Vérifications récentes

- `npm run build` : OK.
- `npx playwright test tests/e2e/inline-snippet-edit.spec.ts` : OK, 14 tests passés (9 d'origine + 5 nouveaux : code block indenté dans liste, code block sans langage, insertion inline depuis viewer, insertion via fallback frères pour paragraphe formaté, insertion via clic dans le whitespace entre blocs).
- MCP `living-documentation` local pour ce projet : non disponible (le MCP connecté pointe sur un autre workspace). Métadonnées Living Documentation NON rafraîchies.

## Notes de reprise

Convention rappel : ce worklog n'est pas un ADR. Y consigner uniquement l'état opérationnel.

Limite connue de l'insertion inline : la cascade de résolution évite la fin de document tant qu'une ancre est trouvée (snippet mappé, signature textuelle, ou frère mappé). Cas résiduels où l'insertion peut se placer ailleurs que voulu : (a) plusieurs blocs partagent le même incipit textuel ET aucun snippet n'est présent dans le voisinage immédiat ; (b) le clic est sur du whitespace pur en dehors de tout top-level child (rare). Le fallback final reste la fin du document.
