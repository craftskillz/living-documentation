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

Feature terminée et redocumentée : ajout des snippets de titre `heading-1` à `heading-4` (insertion + édition inline) qui partagent un panel unique `snip-panel-heading`, édition inline correcte des blocs repliables (`<details>`) — extraction et réécriture du corps, plus précédence des containers sur les snippets internes —, popup d'édition inline désormais typée par snippet (`Éditer le tableau`, `Éditer le bloc de code`, `Éditer le titre niveau 2`, etc.) avec icône FontAwesome adaptée, insertion inline depuis le viewer (résolution hybride incluant fallback whitespace via `clientY`), et correctifs sur les code blocks (indentés dans une liste, sans langage).

## Dernière action réalisée

- Mode `inline-insert` ajouté à `_setSnippetModalMode(mode)` qui accepte désormais `"insert" | "inline-edit" | "inline-insert"` au lieu d'un booléen. État dédié `_snippetInlineInsert` pour différencier l'UI de l'écriture (`_snippetInlineEdit` reste réservé au remplacement d'une plage source existante).
- Nouvelle fonction `openSnippetsModalForInlineInsert(insertPos)` dans `src/frontend/snippets.js`. La modale s'ouvre avec un titre `Insert a snippet`, le sélecteur de type actif, le bouton `Delete block` caché, et la carte élargie comme en édition inline.
- `insertSnippet()` détecte `wasInlineInsert` et écrit dans `currentDocContent` via `saveCurrentDocumentContent()` plutôt que dans le textarea. Le Markdown inséré est encadré par `\n\n` quand le contexte source ne fournit pas déjà la séparation, avec gestion des bords (début/fin de document).
- `src/frontend/inline-snippet-edit.js` : le handler `contextmenu` route maintenant vers `_inlineShowPopup` avec une config (label, icône, action). Si la cible a `data-inline-snippet-index`, popup `Edit inline`. Sinon, calcul d'une position d'insertion via `_inlineFindInsertPosition(contentEl, target, candidates, clientY)` qui cascade : (0) résoudre le top-level child via `_inlineTopLevelBlock`, ou via `_inlineNearestBlockByY` quand `event.target` est `#doc-content` lui-même (clic dans la marge verticale entre blocs — corrige le cas où l'insertion partait toujours en fin de document) ; (1) range-anchor — si le bloc cliqué ou un descendant porte `data-inline-snippet-index`, utiliser la `range.end` max puis sauter au prochain `\n\n` (garantit l'insertion en fin de paragraphe rendu, pas au milieu) ; (2) signature textuelle — première ligne `textContent` (≤ 60 chars) cherchée dans `currentDocContent` ; (3) frères précédents/suivants — même résolution appliquée aux siblings DOM, avec saut au prochain/précédent `\n\n` ; (4) fin du document en dernier recours. Helpers extraits : `_inlineTopLevelBlock`, `_inlineNearestBlockByY`, `_inlineResolveBlockEnd`, `_inlineResolveBlockStart`. Popup affichée : `Insert a snippet here`.
- Le popup expose `data-action="edit" | "insert"` pour le test E2E.
- Clés i18n ajoutées dans `fr.json` et `en.json` : `snippet.inline_insert_btn`, `snippet.inline_insert_modal_title`, `snippet.inline_insert_failed`, et un set complet de `snippet.inline_edit_btn_<type>` pour chaque snippet éditable (table, code_block, blockquote, ordered_list, unordered_list, tree, colored_section, colored_text, collapsible, link, doc_link, anchor_link, anchor_doc_link, image, separator).
- Popup d'édition inline typée : `_inlineEditAffordance(type)` dans `inline-snippet-edit.js` mappe le type vers `{ labelKey, iconClass }`. La popup expose `data-snippet-type` pour le test. Fallback : `snippet.inline_edit_btn` générique + icône `fa-pen-to-square`.
- Édition complète des blocs repliables (`<details>`) : nouveau textarea `#snip-collapsible-body` dans `src/frontend/index.html` (panel `snip-panel-collapsible`). `parseAndFillSnippet` cas `collapsible` extrait désormais summary ET body (regex `<details\b[^>]*>[\s\S]*?</summary>\s*\n?([\s\S]*?)\s*</details>\s*$`). `buildSnippetMarkdown` cas `collapsible` reconcatène summary + body (fallback `## Titre\n\nTexte` si vide). Préview Markdown masqué pour `collapsible` (ajouté à la liste dans `snippetTypeChanged`). Clés i18n ajoutées : `snippet.collapsible_body_label`, `snippet.collapsible_body_placeholder` (fr + en).
- Nesting strict autorisé : `_inlineRangesOverlap` rejette désormais uniquement les positions identiques (deux regex matchant la même chaîne) et les chevauchements partiels. Les nestings stricts (une plage entièrement contenue dans une autre) sont autorisés. Cela permet à un `<details>` et aux snippets internes (code block, heading, liste…) de coexister dans la liste des candidats. Au clic droit, `closest()` retourne l'ancêtre mappé le plus proche, donc le snippet intérieur l'emporte sur le container quand l'utilisateur cible explicitement un élément intérieur. La fonction `_inlineHasMappedAncestor` introduite plus tôt et le filtre associé dans `_inlineAssignElements` ont été retirés — tous les éléments mappables reçoivent maintenant un `data-inline-snippet-index`, y compris ceux à l'intérieur d'un container déjà mappé.
- Snippets heading (4 types `heading-1` à `heading-4`) : détection inline via `/(?:^|\n\n)(#{1,4} [^\n]+)/g` (le préfixe `\n\n` ou début de document évite de matcher un `#` dans un autre contexte). Tous les types partagent un panel `snip-panel-heading` via `_SNIPPET_TYPE_TO_PANEL` consulté par `snippetTypeChanged`. `parseAndFillSnippet` extrait le texte avec un regex paramétré par le niveau, `buildSnippetMarkdown` reconstruit `"#".repeat(level) + " " + text`. Aperçu Markdown masqué. Sélecteurs `_INLINE_TYPE_SELECTORS` étendus avec `h1`/`h2`/`h3`/`h4`. Affordances ajoutées avec icône `fa-heading` et clés `snippet.inline_edit_btn_heading_{1..4}`. Quatre options ajoutées au dropdown du snippet modal.
- Filtre nested-ancestor retiré (voir entrée précédente) : tous les éléments mappables, y compris ceux à l'intérieur d'un container déjà mappé, reçoivent un index. Au clic droit, `closest()` route automatiquement vers l'élément le plus profond.
- Tests Playwright ajoutés : `right-click on unmapped block proposes inline snippet insertion and writes to source` (clic sur le `<h1>`, vérifie l'UI de la modale en mode insertion et le round-trip blockquote inséré entre titre et paragraphe suivant) ; `right-click on a formatted paragraph (signature fails) inserts via sibling fallback` (clic sur un paragraphe contenant `**formatting**`, dont la signature textContent ne matche pas la source, exerce le fallback frères et insère bien entre ce paragraphe et le suivant) ; `right-click in vertical whitespace between blocks resolves to nearest block above` (clic dans la marge entre `<h1>` et le paragraphe suivant via `page.mouse` à des coordonnées x/y calculées, vérifie l'insertion entre `# Inline Snippets` et le paragraphe formaté).
- Fixture `with-inline-snippets` enrichie d'un paragraphe `This paragraph has **formatting** that breaks signature search.` entre le `# Inline Snippets` et `This sentence contains ...` pour exercer le fallback signature → frères.
- ADR `2026_05_17_19_11_[SNIPPET]_edition_inline_des_snippets_depuis_le_viewer_par_clic_droit.md` mis à jour (description, tags, décisions 1, 3 et 7, PROS, CONS).

## Prochaine action recommandée

Le MCP `living-documentation` connecté pointe sur un autre projet : `refresh_metadata` non lancé. Quand le MCP local sera disponible pour ce repo, rebaseliner les hashes de l'ADR inline snippets avec les fichiers suivants attachés : `src/frontend/inline-snippet-edit.js`, `src/frontend/snippets.js`, `src/frontend/i18n/en.json`, `src/frontend/i18n/fr.json`, `tests/e2e/inline-snippet-edit.spec.ts`, `tests/fixtures/with-inline-snippets/testdocs/2026_01_01_10_00_[General]_inline_snippets.md`. Ensuite relire le diff global et commit si le comportement convient.

## Fichiers ou zones concernés

- `src/frontend/inline-snippet-edit.js`
- `src/frontend/snippet-detect.js`
- `src/frontend/snippets.js`
- `src/frontend/index.html`
- `src/frontend/i18n/en.json`
- `src/frontend/i18n/fr.json`
- `tests/e2e/inline-snippet-edit.spec.ts`
- `tests/fixtures/with-inline-snippets/testdocs/2026_01_01_10_00_[General]_inline_snippets.md`
- `documentation/ADRS/2026_05_17_19_11_[SNIPPET]_edition_inline_des_snippets_depuis_le_viewer_par_clic_droit.md`

## Vérifications récentes

- `npm run build` : OK.
- `npx playwright test tests/e2e/inline-snippet-edit.spec.ts` : OK, 18 tests passés. Tests ajoutés/ajustés : `right-click on the summary of a collapsible containing inner snippets edits the collapsible as a whole` (clique sur le `<summary>` du 2ᵉ collapsible et vérifie type=collapsible) ; `right-click on an inner code block of an open collapsible edits the code block, not the collapsible` (force `open=true`, clique sur le `<pre>` intérieur, vérifie type=code-block et que la modale a bien chargé le langage `markdown` et le contenu de l'image). `right-click on a level-1 heading opens heading editor and saves new text` et `right-click on a level-3 heading reuses the shared heading panel and saves at level 3` valident les nouveaux snippets heading. Robustesse : deux assertions `toContainText` ajoutées avant `fs.readFileSync` pour stabiliser les tests sous parallélisme (la sauvegarde inline est async).
- MCP `living-documentation` local pour ce projet : non disponible (le MCP connecté pointe sur un autre workspace). Métadonnées Living Documentation NON rafraîchies.

## Notes de reprise

Convention rappel : ce worklog n'est pas un ADR. Y consigner uniquement l'état opérationnel.

Limite connue de l'insertion inline : la cascade de résolution évite la fin de document tant qu'une ancre est trouvée (snippet mappé, signature textuelle, ou frère mappé). Cas résiduels où l'insertion peut se placer ailleurs que voulu : (a) plusieurs blocs partagent le même incipit textuel ET aucun snippet n'est présent dans le voisinage immédiat ; (b) le clic est sur du whitespace pur en dehors de tout top-level child (rare). Le fallback final reste la fin du document.
