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

Feature terminée et redocumentée : édition inline des code blocks (1) indentés à l'intérieur d'une liste et (2) sans langage explicite après la fence d'ouverture.

## Dernière action réalisée

- Détection de l'indentation canonique avant la fence d'ouverture d'un code block via une nouvelle boucle dédiée `_inlineAddCodeBlockRanges` dans `src/frontend/inline-snippet-edit.js`. La plage source est étendue en arrière pour inclure les espaces de tête et l'indent est porté par le candidat (`range.indent`).
- État `_snippetInlineIndent` ajouté dans `src/frontend/snippets.js` : posé depuis `range.indent` à l'ouverture inline, réinitialisé dans `_setSnippetModalMode(false)`.
- `parseAndFillSnippet` cas `code-block` : regex resserré en `/^```[ \t]*([^\n]*)\n([\s\S]*?)\n[ \t]*```$/`. Le `[ \t]*` (au lieu de `\s*`) après la fence d'ouverture empêche d'aspirer un saut de ligne et donc d'absorber la première ligne de contenu comme langage quand la fence n'a pas de langage explicite. Le `[ \t]*` avant la fence de fermeture accepte une fence indentée. Stripping de l'indent canonique sur chaque ligne avant remplissage du textarea.
- `buildSnippetMarkdown` cas `code-block` : en mode inline edit avec indent non vide, chaque ligne du bloc reconstruit (y compris les deux fences) est préfixée par l'indent canonique.
- Fixture `with-inline-snippets` enrichie de deux nouveaux cas : un item de liste numérotée contenant un code block YAML indenté de 3 espaces, et un code block sans langage (style requête CloudWatch Logs Insights). Tests Playwright ajoutés : `right-click on code block without language keeps language empty and does not consume first content line` et `right-click on indented code block inside a list captures language, strips indent, and preserves it on save`. Sélecteurs `#doc-content pre` du test existant ajustés en `.first()` pour rester non ambigus.
- ADR `2026_05_17_19_11_[SNIPPET]_edition_inline_des_snippets_depuis_le_viewer_par_clic_droit.md` mis à jour à la main : description, tags, décision 4 (code-block) et décision 7 (tests).

## Prochaine action recommandée

Le MCP `living-documentation` connecté ne sert pas cette codebase (il pointe sur un autre projet Amplify). Quand le MCP local pour ce repo sera disponible, lancer `refresh_metadata` sur l'ADR inline snippets pour rebaseliner les hashes et inclure `src/frontend/inline-snippet-edit.js`, `src/frontend/snippets.js`, `tests/e2e/inline-snippet-edit.spec.ts`, `tests/fixtures/with-inline-snippets/testdocs/2026_01_01_10_00_[General]_inline_snippets.md`. Ensuite relire le diff global et commit si le comportement convient.

## Fichiers ou zones concernés

- `src/frontend/inline-snippet-edit.js`
- `src/frontend/snippets.js`
- `tests/e2e/inline-snippet-edit.spec.ts`
- `tests/fixtures/with-inline-snippets/testdocs/2026_01_01_10_00_[General]_inline_snippets.md`
- `documentation/ADRS/2026_05_17_19_11_[SNIPPET]_edition_inline_des_snippets_depuis_le_viewer_par_clic_droit.md`

## Vérifications récentes

- `npm run build` : OK.
- `npx playwright test tests/e2e/inline-snippet-edit.spec.ts` : OK, 11 tests passés (9 existants + 2 nouveaux : code block indenté dans liste, code block sans langage).
- MCP `living-documentation` local pour ce projet : non disponible (le MCP connecté pointe sur un autre workspace). Métadonnées Living Documentation NON rafraîchies.

## Notes de reprise

Convention rappel : ce worklog n'est pas un ADR. Y consigner uniquement l'état opérationnel.

Limite connue : la correspondance Markdown vers HTML est heuristique et ordonnée, pas une source map exacte. L'indent d'un code block est calculé à partir des caractères qui précèdent la fence d'ouverture sur la même ligne (uniquement espaces/tabs). Les fences imbriquées dans des contextes plus complexes (blockquote, listes profondes mixtes) peuvent ne pas être correctement détectées par ce premier pas.
