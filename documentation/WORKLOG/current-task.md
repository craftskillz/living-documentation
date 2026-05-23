---
**date:** 2026-05-22
**status:** Completed
**description:** Point de reprise partagé entre assistants IA pour suivre la tâche courante, son statut, les fichiers touchés, les vérifications et la prochaine action.
**tags:** worklog, handoff, progression, reprise, agents-ia
---

# Current task

Ce document est le point de reprise entre assistants IA. Tout agent doit le lire avant de continuer une tâche et le mettre à jour avant de rendre la main.

## Statut courant

Completed

## Tâche courante

Correction de la refonte des styles de tableau : séparation explicite entre le style (`default`, `compact`, `striped`), la bordure (checkbox avec/sans bordures) et la couleur optionnelle.

## Dernière action réalisée

- `table-style` ne porte plus les concepts de bordure dans la nouvelle UI : le select ne propose que `Default`, `Compact` et `Striped`.
- La bordure est portée par une checkbox `snip-table-bordered`, sérialisée en source avec `<!-- table-border: bordered -->` uniquement lorsqu'elle est cochée.
- Le rendu reste compatible avec les sources legacy `<!-- table-style: bordered -->` et `<!-- table-style: borderless -->` : elles alimentent la nouvelle dimension de bordure.
- Le type par défaut est visuellement borderless mais conserve les séparateurs horizontaux : les tables `.prose` n'ont pas de bordures verticales ni de grille complète, avec padding généreux.
- `striped` sans couleur utilise le fallback neutre CSS, sans option `neutral` dans le select couleur.
- Les rayures colorées ont été corrigées : le header utilise la teinte plus soutenue, et les rayures utilisent la teinte plus claire pour toutes les couleurs.
- En mode `striped` avec couleur `Aucune`, la rayure se comporte comme l'ancien neutre : gris `rgb(243 244 246)` en clair, gris `rgb(55 65 81)` en sombre.
- En mode sans bordures avec une couleur sélectionnée, les séparateurs horizontaux prennent la teinte claire de la couleur et la ligne sous header prend l'accent.
- Les cellules de table rendues vides sont remplacées côté DOM par `\u00A0` pour stabiliser l'affichage, sans modifier le Markdown source ni la valeur vide dans l'éditeur de grille.
- L'éditeur des listes ordonnées conserve désormais le Markdown numéroté complet, inclut les lignes de continuation indentées et les sous-puces (`   - ...`), puis sauvegarde ce bloc tel quel quand les marqueurs numérotés sont présents.
- L'option couleur neutre a été retirée de l'UI, des catalogues i18n et de la whitelist de rendu.
- Les commentaires canoniques sont maintenant dans l'ordre `table-style`, `table-border`, `table-color`.
- L'ADR inline snippets a été mis à jour et ses métadonnées MCP ont été rafraîchies à 100 % ; `src/frontend/snippet-table.js` a été ajouté aux fichiers suivis par l'ADR.

## Prochaine action recommandée

Aucune action restante pour ce correctif.

## Fichiers ou zones concernés

- `src/frontend/index.html` (CSS tables, select style, checkbox bordure, select couleur)
- `src/frontend/documents.js` (parsing/apply des attributs `style`, `border`, `color`)
- `src/frontend/inline-snippet-edit.js` (capture inline de jusqu'à 3 commentaires table)
- `src/frontend/snippet-detect.js` (détection table avec `table-border`)
- `src/frontend/snippet-table.js` (reset de la checkbox bordure)
- `src/frontend/snippets.js` (parse/build des trois dimensions)
- `src/frontend/i18n/en.json`, `src/frontend/i18n/fr.json`
- `tests/e2e/inline-snippet-edit.spec.ts`
- `tests/fixtures/with-inline-snippets/testdocs/2026_01_01_10_00_[General]_inline_snippets.md`
- `documentation/ADRS/2026_05_17_19_11_[SNIPPET]_edition_inline_des_snippets_depuis_le_viewer_par_clic_droit.md`

## Vérifications récentes

- `npm run build` : OK.
- `npx playwright test tests/e2e/inline-snippet-edit.spec.ts -g "striped tables use the neutral stripe fallback"` : OK.
- `npx playwright test tests/e2e/inline-snippet-edit.spec.ts -g "right-click on table captures header, data rows, and empty cells"` : OK.
- `npx playwright test tests/e2e/inline-snippet-edit.spec.ts -g "right-click on ordered list captures editable item content"` : OK.
- `npx playwright test tests/e2e/inline-snippet-edit.spec.ts -g "right-click on ordered list captures editable item content|inline insert picker pre-fills unordered and ordered list editors"` : OK.
- `npx playwright test tests/e2e/inline-snippet-edit.spec.ts -g "right-click on unordered list captures editable item content|inline insert picker pre-fills unordered and ordered list editors"` : OK.
- `npx playwright test tests/e2e/inline-snippet-edit.spec.ts -g "right-click on unordered list captures editable item content|right-click on ordered list captures editable item content"` : OK.
- `npx playwright test tests/e2e/inline-snippet-edit.spec.ts` : les tests table concernés sont passés, puis la passe complète a échoué plus loin sur des timeouts/teardown et assertions de snippets non-table.
- MCP Living Documentation : OK, `refresh_metadata` sur l'ADR inline snippets, accuracy 1.

## Notes de reprise

Convention table actuelle :

- `<!-- table-style: compact -->` ou `<!-- table-style: striped -->` pour le style visuel.
- `<!-- table-border: bordered -->` pour activer la grille complète ; absence de ce commentaire = sans bordures verticales mais avec séparateurs horizontaux.
- `<!-- table-color: info|success|warning|danger|note -->` pour la couleur.
- `striped` sans `table-color` doit produire la rayure grise de l'ancien neutre via fallback CSS, sans commentaire ni option `neutral`.
- Avec `table-color`, le header doit être plus soutenu que les rayures.
- Avec `table-color` sans `table-border: bordered`, les séparateurs horizontaux doivent être teintés, sans bordures verticales.
- Les cellules vides doivent rester vides dans le Markdown et dans l'éditeur de grille, mais être rendues en viewer avec `\u00A0`.
- Les anciens `<!-- table-style: bordered -->` et `<!-- table-style: borderless -->` restent lus pour compatibilité, mais ne sont plus produits par `buildSnippetMarkdown()`.
- Les listes ordonnées avec lignes de continuation ou sous-listes à puces indentées doivent être capturées comme un seul snippet `ordered-list`; l'éditeur doit afficher les numéros et sauvegarder le Markdown numéroté complet.
- Les listes à puces avec lignes de continuation ou sous-listes indentées doivent être capturées comme un seul snippet `unordered-list`; l'éditeur doit afficher les marqueurs `-` / `*` / `+` et sauvegarder le Markdown à puces complet.
- Les continuations paresseuses Markdown non indentées dans un item de liste (`- b` suivi de `titi`, ou `2. b` suivi de `titi`) doivent être incluses dans la plage éditable, car le rendu Markdown les rattache à l'item précédent.
