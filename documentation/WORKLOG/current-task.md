---
**date:** 2026-05-23
**status:** Increment completed
**description:** Point de reprise partagé entre assistants IA pour suivre la tâche courante, son statut, les fichiers touchés, les vérifications et la prochaine action.
**tags:** worklog, handoff, progression, reprise, agents-ia
---

# Current task

Ce document est le point de reprise entre assistants IA. Tout agent doit le lire avant de continuer une tâche et le mettre à jour avant de rendre la main.

## Statut courant

Increment completed

## Tâche courante

Audit qualité de code et plan de refactoring incrémental. Troisième incrément réalisé : extraction cohésive des builders Markdown de snippets hors de l'orchestration de modale.

## Dernière action réalisée

- Incrément `refactor(snippet-builders): isolate markdown builders from modal orchestration` réalisé.
- Nouveau helper `src/frontend/snippet-builders.js`, chargé avant `snippet-detect.js`, centralise la reconstruction Markdown par type de snippet.
- `snippets.js` ne porte plus directement les templates Markdown dans `buildSnippetMarkdown()` : il collecte les valeurs de formulaire via `_snippetMarkdownBuildData(type)` puis délègue à `ldBuildSnippetMarkdown(type, data)`.
- Les builders existants des listes et des attributs de table restent réutilisés depuis `snippet-builders.js`, sans modifier le rendu ni les formulaires.
- L'ADR inline snippets a été mise à jour pour refléter la séparation durable entre collecte DOM et reconstruction Markdown.
- Incrément précédent `refactor(snippet-lists): centralize list markdown capture/build helpers` réalisé et commité.
- Nouveau helper `src/frontend/snippet-list-markdown.js`, chargé avant `snippet-detect.js`, centralise Markdown par défaut, regex de capture, détection simple et reconstruction des listes ordonnées/non ordonnées.
- `snippet-detect.js` consomme désormais `ldLooksLikeOrderedListSnippet()` et `ldLooksLikeUnorderedListSnippet()`.
- `inline-snippet-edit.js` consomme désormais `ldOrderedListBlockRegex()` et `ldUnorderedListBlockRegex()`.
- `snippets.js` consomme désormais `ldOrderedListDefaultMarkdown()`, `ldUnorderedListDefaultMarkdown()`, `ldBuildOrderedListMarkdown()` et `ldBuildUnorderedListMarkdown()`.
- L'ADR inline snippets a été mise à jour pour refléter le helper centralisé des listes.
- Incrément précédent `refactor(table-attributes): centralize table snippet attributes` réalisé et commité.
- Nouveau helper `src/frontend/snippet-table-attributes.js`, chargé avant `snippet-detect.js`, centralise valeurs autorisées, parsing des commentaires table, compatibilité legacy, détection table, collecte depuis `currentDocContent`, parsing de cellules/separateur et build du préfixe canonique.
- `documents.js` consomme désormais `ldCollectTableAttributesFromSource()` au lieu de porter ses propres sets/regex.
- `snippet-detect.js` consomme désormais `ldLooksLikeTableSnippet()`.
- `inline-snippet-edit.js` construit sa regex table depuis `ldTableBlockSource()`.
- `snippets.js` consomme `ldBuildTableAttributesPrefix()`, `ldParseTableAttributesFromMarkdown()`, `ldIsMarkdownTableSeparatorLine()` et `ldParseMarkdownTableCells()`.
- L'ADR inline snippets a été mise à jour pour refléter le helper centralisé.
- Audit initial réalisé sans modification de code produit avant cet incrément.
- Zones les plus sensibles identifiées : `src/frontend/snippets.js`, `src/frontend/inline-snippet-edit.js`, `src/frontend/snippet-detect.js`, `src/frontend/documents.js`, `src/frontend/snippet-table.js`, `src/frontend/diagram/network.js`, `src/mcp/server.ts`.
- Dette principale : la grammaire des snippets est dispersée entre détection, capture de plage source, parsing formulaire, reconstruction Markdown et tests.
- Dette secondaire : les attributs de table (`table-style`, `table-border`, `table-color`) sont dupliqués entre rendu viewer, détection, capture inline et build/parse de snippet.
- Dette structurelle : plusieurs gros fichiers frontend restent en JavaScript classique sans lint/type-check dédié ; le serveur TypeScript est strict, mais `src/frontend` est exclu du `tsconfig`.
- Risque identifié : ne pas mélanger les refactors de snippets, tables, tooling qualité, MCP et diagrammes dans un même commit.

## Prochaine action recommandée

Prochain incrément recommandé : `refactor(snippet-parsers): isolate markdown parsers from modal orchestration`, à discuter avant exécution. Garder ce prochain commit limité à l'extraction du parsing Markdown depuis `parseAndFillSnippet()`, en évitant de mélanger avec des changements UX ou de rendu.

## Fichiers ou zones concernés

- `src/frontend/snippet-detect.js` : détection pure des types de snippets.
- `src/frontend/snippet-table-attributes.js` : helper centralisé pour les commentaires et helpers table.
- `src/frontend/snippet-list-markdown.js` : helper centralisé pour les règles Markdown de listes.
- `src/frontend/snippet-builders.js` : helper centralisé pour reconstruire le Markdown des snippets.
- `src/frontend/inline-snippet-edit.js` : mapping DOM rendu -> plages Markdown source.
- `src/frontend/snippets.js` : picker, formulaires, build Markdown, parse Markdown, insertion/suppression inline.
- `src/frontend/snippet-table.js` : état et grille d'édition des tableaux.
- `src/frontend/documents.js` : rendu viewer, post-processing DOM, attributs tables, code blocks.
- `src/frontend/index.html` : shell viewer, CSS tables et formulaires snippets.
- `src/frontend/diagram/network.js` : module diagramme complexe, à traiter plus tard par sous-responsabilité.
- `src/mcp/server.ts` : serveur MCP volumineux avec guide, descriptions de tools, schemas et dispatch.
- `package.json`, `tsconfig.json`, `documentation/AI/PROJECT-STACK.md`, `documentation/AI/PROJECT-USEFUL-COMMANDS.md` : concernés si ajout d'un lint/check frontend.
- `tests/e2e/inline-snippet-edit.spec.ts`, `tests/unit/*` : tests à ajuster selon chaque incrément.

## Vérifications récentes

- `npm run build` : OK.
- `npx playwright test tests/e2e/inline-snippet-edit.spec.ts -g "colored text opens snippet editor|colored section opens snippet editor|table captures header|code block captures language|blockquote captures editable|unordered list captures|ordered list captures|simple collapsible exposes|level-1 heading opens"` : OK, 9 tests passés.
- Vérifications de l'incrément listes précédent :
  - `npm run build` : OK.
  - `npx playwright test tests/e2e/inline-snippet-edit.spec.ts -g "right-click on unordered list captures editable item content|right-click on ordered list captures editable item content|inline insert picker pre-fills unordered and ordered list editors"` : OK, 3 tests passés.
- Vérifications de l'incrément table précédent :
  - `npm run build` : OK.
  - `npx playwright test tests/e2e/inline-snippet-edit.spec.ts -g "table preceded by table-style|borderless tables keep horizontal|borderless colored tables|inline-edit on a styled table|inline-edit can clear the color|inserting a table from the picker|striped tables use the neutral|right-click on table captures"` : OK, 8 tests passés.
- Dernières vérifications fonctionnelles connues avant l'audit :
  - `npm run build` : OK.
  - `npx playwright test tests/e2e/inline-snippet-edit.spec.ts -g "right-click on unordered list captures editable item content|right-click on ordered list captures editable item content"` : OK.
  - MCP Living Documentation : OK, `refresh_metadata` sur l'ADR inline snippets, accuracy 1.

## Notes de reprise

### Audit qualité initial

1. Priorité haute : centraliser la grammaire des snippets.
   - Aujourd'hui, un type de snippet est défini par plusieurs fragments dispersés : regex de détection, regex de capture inline, parsing formulaire, build Markdown, tests.
   - C'est la cause directe des bugs récents sur les listes : le rendu Markdown acceptait certains cas, mais la capture inline ne suivait pas la même grammaire.
   - Objectif : isoler la connaissance par type de snippet dans des helpers cohérents, sans forcément migrer tout le frontend en modules ES.

2. Priorité haute : extraire le domaine `table attributes`.
   - Les règles `table-style`, `table-border`, `table-color`, valeurs autorisées, compatibilité legacy et ordre canonique doivent être définis à un seul endroit.
   - Cible probable : nouveau fichier `src/frontend/snippet-table-attributes.js` chargé avant `documents.js`, `snippet-detect.js`, `inline-snippet-edit.js` et `snippets.js`.
   - Ce module devrait exposer des helpers purs : parsing des commentaires, validation des valeurs, reconstruction du préfixe canonique, regex ou fonction de capture des commentaires table.

3. Priorité moyenne : réduire `snippets.js`.
   - `snippets.js` mélange picker, emojis, états de modale, build Markdown, parsing Markdown, insertion, suppression et intégration diagramme.
   - Découpage conseillé : commencer par extraire `snippet-builders.js` puis `snippet-parsers.js`, sans changer l'interface utilisateur.
   - Ne pas faire cette extraction en même temps que le refactor table, pour garder un commit lisible.

4. Priorité moyenne : nommer les constantes implicites.
   - Exemples : délais de focus, durée feedback copie, marge popup, seuil drag, min rows/cols table, seuils de recherche, offsets UI.
   - Les constantes doivent être introduites localement dans le module responsable, avec un nom exprimant l'intention.
   - Éviter un commit purement cosmétique global ; traiter les constantes dans le module refactoré par l'incrément courant.

5. Priorité moyenne : ajouter un contrôle qualité frontend.
   - Le backend/CLI est en TypeScript strict, mais le frontend plain JS n'est pas linté.
   - Option raisonnable : ajouter ESLint ciblé sur `src/frontend/**/*.js` avec une config prudente, puis corriger uniquement les erreurs utiles.
   - Cette étape doit mettre à jour `package.json`, `PROJECT-STACK.md` et `PROJECT-USEFUL-COMMANDS.md`.

6. Priorité basse : gros fichiers MCP et diagrammes.
   - `src/mcp/server.ts` mélange guide, descriptions, schemas et dispatch ; utile à découper plus tard.
   - `src/frontend/diagram/network.js` est complexe mais déjà organisé par domaines d'interaction ; ne pas commencer par là.

### Incréments de refactoring proposés

Chaque incrément doit pouvoir produire un commit séparé et cohésif.

1. `refactor(table-attributes): centralize table snippet attributes`
   - Extraire valeurs autorisées, parsing de commentaires, compatibilité legacy et build du préfixe table.
   - Toucher seulement `documents.js`, `snippet-detect.js`, `inline-snippet-edit.js`, `snippets.js`, nouveau helper, tests table ciblés.
   - Vérification minimale : `npm run build` + tests Playwright table/snippet ciblés.

2. `refactor(snippet-lists): centralize list markdown capture/build helpers`
   - Extraire helpers listes ordonnées/non ordonnées : marqueurs, continuations indentées, continuations paresseuses, fallback de génération.
   - Toucher seulement les snippets/listes et leurs tests.
   - Vérification minimale : `npm run build` + tests Playwright listes ciblés.

3. `refactor(snippet-builders): isolate markdown builders from modal orchestration`
   - Extraire la reconstruction Markdown par type depuis `buildSnippetMarkdown()`.
   - Ne pas changer le rendu ni les formulaires.
   - Ajouter si possible quelques tests unitaires simples sur helpers purs, en plus des tests E2E ciblés.

4. `refactor(snippet-parsers): isolate markdown parsers from modal orchestration`
   - Extraire les parseurs de `parseAndFillSnippet()`.
   - Garder les écritures DOM dans `snippets.js` ou introduire des objets de formulaire simples si le découpage reste lisible.
   - Vérification minimale : tests inline edit ciblés.

5. `chore(frontend-quality): add conservative lint/check for frontend js`
   - Ajouter un script qualité réellement exécutable.
   - Ne pas corriger toute la base dans le même commit si le volume est trop large.
   - Mettre à jour les docs IA de stack/commandes.

6. `refactor(doc-rendering): extract document viewer decorators`
   - Extraire de `documents.js` les post-processors DOM : tables, headings anchors, code copy, collapsible code, links.
   - À faire après les snippets, car moins urgent.

7. `refactor(mcp-server): split tool catalog and prompt catalog`
   - Extraire `SERVER_GUIDE`, descriptions de tools et prompts hors du dispatch.
   - À faire plus tard, avec tests MCP ciblés.

8. `refactor(diagram-network): isolate one interaction domain at a time`
   - Ne jamais refactorer tout `network.js` en bloc.
   - Incréments possibles : edge label rendering, free-arrow interactions, selection state, image node creation.

### Règles de commit pour cette phase

- Un commit doit porter une seule responsabilité observable.
- Chaque commit doit avoir sa vérification minimale indiquée dans le message final.
- Éviter les commits qui mélangent refactor pur, changement UX et ajout de tooling.
- Si un refactor révèle un bug comportemental, faire soit un commit bugfix séparé avant, soit documenter explicitement que l'incrément inclut le correctif.
- Mettre à jour l'ADR seulement quand l'incrément change une décision durable ou un contrat de comportement ; sinon le worklog suffit.

### Conventions récentes à préserver

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
