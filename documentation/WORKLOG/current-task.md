---
type: Worklog
title: Tâche courante
description: Point de reprise partagé entre assistants IA pour suivre la tâche courante, son statut, les fichiers touchés, les vérifications et la prochaine action.
tags:
  - worklog
  - handoff
  - progression
  - reprise
  - agents-ia
timestamp: 2026-10-15T03:00:00Z
status: To be validated
---


# Explorateur : ouvrir un dossier de « General » ne ferme plus le groupe — 14 octobre 2026

Avec l'option « un seul dossier ouvert à la fois » (`exclusiveFolderExpansion`), ouvrir `.agents` fermait « General » : les clés d'ouverture des dossiers extra n'avaient pas de `|`, donc `toggleFolder` les prenait pour des frères de premier niveau. `TreeNode.svelte` enracine désormais la clé du groupe sur son chemin (`:extra-files:`) puis suit la hiérarchie habituelle (`:extra-files:|.agents|skills`).

Tests : un test `tests/e2e/admin.spec.ts` avec l'option activée. Suites : unitaires 73/73, `tests/api` 230/230, `tests/e2e` 124/124, lint OK.

MCP Living Documentation non exposé : pas de métadonnées attachées.

---

# Explorateur : un dossier extra garde sa structure dans « General » — 14 octobre 2026

Changement de choix de l'utilisateur (option B au lieu de la liste à plat) : dans le groupe « General » de l'explorateur, chaque entrée `extraFiles` est un nœud, dans l'ordre de la config. Un dossier ajouté apparaît sous son nom (`.agents`) avec ses sous-dossiers ; un fichier ajouté seul reste à la racine du groupe. `withExtraFilesGroup` reçoit les entrées absolues de la config (`home.extraEntries`, rempli depuis `/api/config`). Côté serveur, `/api/documents` ne change pas.

Tests : `tests/unit/extra-files-group.test.ts` réécrit, `tests/e2e/admin.spec.ts` ouvre General → `.agents` → `skills`. Suites : unitaires 73/73, `tests/api` 230/230, `tests/e2e` 123/123, lint OK.

MCP Living Documentation non exposé : pas de métadonnées attachées.

---

# Explorateur : extra files de nouveau visibles (groupe « General ») — 14 octobre 2026

Régression depuis le passage de l'explorateur sur `/api/tree` (US2, `27ab1391`) : les extra files (ids absolus, hors dossier docs) n'apparaissaient plus dans la barre de gauche, seulement dans `/api/documents`. `withExtraFilesGroup` (`src/frontend-svelte/src/lib/home/tree.ts`) ajoute en tête de l'arbre un dossier virtuel « General »/« Général » (i18n `sidebar.extra_files_group`) qui les liste à plat, dans l'ordre du listing. Ces entrées (`extra: true`) ne se glissent pas, ne reçoivent pas de dépôt et n'ont pas de menu contextuel. L'E2E « dossier complet » de la tâche précédente vérifiait un titre trouvé dans le document ouvert, pas dans l'explorateur : il cible désormais l'arbre.

Tests : `tests/unit/extra-files-group.test.ts` (2), `tests/e2e/admin.spec.ts` corrigé. Suites : unitaires 73/73, `tests/api` 230/230, `tests/e2e` 123/123, lint OK.

MCP Living Documentation non exposé : pas de métadonnées attachées.

---

# Admin : ajouter un dossier complet en Extra Files — 14 octobre 2026

« + Add » existe aussi sur les dossiers du navigateur « General — Extra Files ». Choix de l'utilisateur : liste à plat et dépliage dynamique. Le chemin du dossier est stocké dans `extraFiles` ; ses `.md` (récursif, mêmes exclusions que l'explorateur, triés par chemin) apparaissent dans General à sa position, et un fichier ajouté plus tard apparaît sans toucher la config. Nouveau module `src/lib/extraFiles.ts` : `expandExtraFiles` (listing documents et MCP) et `isAllowedExtraFile` (contrôle d'accès des routes documents, export, statut et des outils MCP, qui faisaient chacun `extraFiles.includes`). `PUT /api/config` accepte une entrée relative qui est un dossier existant. `PROJECT-STACK.md` mis à jour.

Hors scope : pas de regroupement par dossier dans General ; les titres restent dérivés du nom de fichier.

Tests : un test `tests/api/extra-files.spec.ts`, un test `tests/e2e/admin.spec.ts`. Suites : unitaires 71/71, `tests/api` 230/230, `tests/e2e` 123/123, lint OK.

MCP Living Documentation non exposé : pas de métadonnées attachées.

---

# Admin : dossiers et fichiers « point » attachables en Extra Files — 14 octobre 2026

Le navigateur « General — Extra Files » de l'admin n'affichait pas les dossiers commençant par un point (`.agents`…) hors du dossier docs. `GET /api/browse` accepte `hidden=1` : hors du dossier docs, les dossiers « point » sont alors listés (les fichiers `.md` « point » l'étaient déjà). Seul `FileBrowser.svelte` passe `hidden=1` ; les autres sélecteurs (nouveau document, nouveau dossier, instructions, nuage de mots) gardent le comportement actuel. Côté serveur, `listDocs` lit déjà les extra files quel que soit leur chemin.

Tests : un test `tests/api/browse.spec.ts`, un test `tests/e2e/admin.spec.ts`. Suites : unitaires 71/71, `tests/api` 229/229, `tests/e2e` 122/122, lint OK.

MCP Living Documentation non exposé : pas de métadonnées attachées.

---

# Suppression : liens entrants déliés et preuves de diagrammes purgées — 14 octobre 2026

Suite de la suppression de dossier. Supprimer un dossier (`DELETE /api/tree`) ou un document (`DELETE /api/documents/:id`) passe désormais par le même nettoyage `forgetDeletedEntry` (`src/lib/treeMove.ts`) : les liens entrants sont déliés en gardant leur texte (choix de l'utilisateur ; définitions de référence retirées, images et code clôturé intacts, `unlinkDeletedLinks` dans `src/lib/linkRewrite.ts`), et les ids sortent de `.metadata.json`, `.annotations.json`, des favoris et des `evidence` de `.diagrams.json`. Avant, la suppression d'un document ne purgeait que les annotations. Côté Home, la suppression d'un document relit `/api/config` pour resynchroniser le menu Favoris. ADR explorateur et `PROJECT-STACK.md` mis à jour.

Hors scope : un usage `[texte][ref]` dont la définition est retirée s'affiche en texte brut ; la suppression d'un document seul ne régénère pas les `index.md` OKF (comme la création).

Tests : deux tests unitaires `tests/unit/link-rewrite.test.ts`, un test `tests/api/tree.spec.ts`, un test `tests/api/documents.spec.ts`, un test `tests/e2e/explorer.spec.ts`. Suites : unitaires 71/71, `tests/api` 228/228, `tests/e2e` 121/121, lint OK.

MCP Living Documentation non exposé : pas de métadonnées attachées (sources à attacher à l'ADR explorateur : `src/lib/treeMove.ts`, `src/lib/linkRewrite.ts`, `src/routes/documents.ts`).

---

# Explorateur : supprimer un dossier depuis le menu contextuel — 14 octobre 2026

Entrée « Supprimer » dans le menu contextuel des dossiers (mêmes exclusions que « Renommer » : masqués, `files`/`images` racine ; jamais sur un document). Modale `DeleteFolderModal.svelte` avec le nombre de documents (compté sur l'arbre complet) ; le document ouvert se ferme s'il était dans le dossier. Backend `DELETE /api/tree` `{ path }` → `deleteTreeFolder` (`src/lib/treeMove.ts`) : suppression récursive, retrait du manifeste parent, purge des ids sous le dossier dans `.metadata.json`, `.annotations.json` et les favoris, régénération des `index.md` OKF ; un lien symbolique contenu est supprimé sans toucher sa cible. i18n `sidebar.delete_folder`, `modal.delete_folder.*` EN/FR. ADR explorateur et `PROJECT-STACK.md` complétés.

Hors scope : liens entrants vers les documents supprimés non réécrits ; preuves de diagrammes pointant ces documents non purgées (comme pour la suppression d'un document).

Tests : deux tests `tests/api/tree.spec.ts`, deux tests `tests/e2e/explorer.spec.ts`. Suites : unitaires 69/69, `tests/api` 226/226, `tests/e2e` 120/120, lint OK.

MCP Living Documentation non exposé : pas de métadonnées attachées (sources à attacher : `src/lib/treeMove.ts`, `src/routes/tree.ts`, `src/frontend-svelte/src/lib/home/DeleteFolderModal.svelte`).

---

# Explorateur : fichiers liés (AI/CLAUDE.md…) de nouveau visibles — 14 octobre 2026

Régression depuis le passage de l'explorateur sur `/api/tree` : `isListedEntry` ne gardait que les fichiers réguliers, donc les liens symboliques `AI/AGENTS.md`, `AI/CLAUDE.md`, `AI/MEMORY.md` disparaissaient de l'arbre (mais restaient dans `/api/documents`). Choix de l'utilisateur : visibles normalement, lecture seule dans l'explorateur. `/api/tree` les liste avec `linked: true` (lien cassé ignoré) ; `POST /api/tree/move` et `PUT /api/tree/rename` les refusent (400) — avant, le déplacement réussissait et cassait le lien relatif. Frontend : icône lien, ni glisser-déposer, ni menu contextuel, ni renommage ; le contenu reste éditable depuis le viewer. i18n `sidebar.linked_file` EN/FR.

Tests : deux tests `tests/api/tree.spec.ts`, un test `tests/e2e/explorer.spec.ts`. Suites : unitaires 69/69, `tests/api` 224/224, `tests/e2e` 118/118, `okf:validate` conforme.

Suite possible : compléter l'ADR explorateur (manifeste `liv-doc-main.md`) avec la règle des fichiers liés.

MCP Living Documentation non exposé : pas de métadonnées attachées.

---

# Lien symbolique cassé : la liste des documents ne tombe plus — 14 octobre 2026

La suppression de `CLAUDE.md` (commit `47b743c0`) avait cassé le lien `documentation/AI/CLAUDE.md` ; `fs.statSync` levait `ENOENT` et `/api/documents` et `/api/context/orientation` répondaient 500. Nouveau helper `isFileOrLinkToFile` (`src/lib/explorerEntries.ts`) utilisé par `collectMdFiles` (`src/routes/documents.ts`) et `listInstructionFiles` (`src/routes/context.ts`) : un lien cassé est ignoré. `CLAUDE.md` restauré à la demande de l'utilisateur (`f394fe59`).

Tests : un test « broken symlink » dans `tests/api/documents.spec.ts` et `tests/api/context.spec.ts`. Suites : unitaires 69/69, `tests/api` 222/222, `tests/e2e` 117/117.

MCP Living Documentation non exposé : pas de métadonnées attachées.

---

# Règles IA : front-matter YAML lu et écrit en OKF — 14 octobre 2026

`src/routes/context.ts` n'a plus de parseur maison : `readAiRules` passe par le lecteur partagé `parseFrontmatter` (`src/lib/frontmatter.ts`, qui exporte désormais `lookupCaseInsensitive`). `appliesto` (clé canonique en minuscules écrite par `normalizeFrontmatter`) et les listes YAML multi-lignes (`tags`, `appliesto`) arrivent donc dans `/api/context/orientation` et l'écran AI Rules. `createRuleMarkdown` écrit le YAML OKF canonique (`type: Rule`, listes en bloc, `appliesto`) via `normalizeFrontmatter`. Contrat de l'API inchangé (champ JSON `appliesTo`).

Tests : `tests/api/context.spec.ts` (nouveau test de lecture YAML canonique, test de création renforcé). Suites : unitaires 69/69, `tests/api` 220/220, `tests/e2e` 117/117, `okf:validate` conforme.

Appliqué après validation de l'utilisateur : précisé dans `PROJECT-INSTRUCTIONS.md` (dépôt et deux starters) que `appliesTo` s'écrit `appliesto` dans le front-matter canonique.

MCP Living Documentation non exposé : pas de métadonnées attachées.

---

# Audit des instructions agents — 14 octobre 2026

Instructions agents allégées sans perte de consigne : chaque consigne n'est plus écrite qu'à un seul endroit (routine et conflits dans `CLAUDE.md`/`AGENTS.md`, MCP, métadonnées et « documents vivants » dans `PROJECT-INSTRUCTIONS.md`, vérification dans la règle `cost-efficient-agent-workflow`, contenu de `current-task.md` dans la règle `track-current-work`, i18n, vis-network et coverage dans leurs règles). Corrigé : nom du MCP (`living-ai-documentation`), `example-doc` inexistant, tableau des commandes dangereuses, note E2E périmée, `appliesto` de `no-magic-numbers`, front-matter des roadmaps et worklogs. `memory/project_svelte_migration.md` supprimé (périmé), `MEMORY.md` réindexé.

Reste à l'utilisateur : supprimer `09_My_Published_Projects/CLAUDE.md` (pointe vers un `testproject/` inexistant ; suppression refusée par le classifieur de permissions). Configuration du MCP : à rediscuter.

US suivante, livrée le 14/10 (voir section ci-dessus) : `parseFrontmatter` de `src/routes/context.ts:87` ne lit pas le front-matter YAML des règles. (1) Les règles écrivent `appliesto` alors que le code lit `fields.appliesTo` (l. 147). (2) Les lignes `  - x` sont ignorées : `tags` et `appliesto`, écrits en listes YAML multi-lignes, arrivent vides dans `/api/context` et l'écran AI Rules. Piste : réutiliser le lecteur de front-matter partagé (ticket 02) et aligner `createRuleMarkdown` (l. 164) sur le YAML canonique. Démarrer par un test API rouge sur `/api/context`.

---

# okf:validate contrôle les index.md — 14 octobre 2026

Nouvelle règle `index` (erreur) dans `src/lib/okf/validate.ts` : chaque `index.md` doit être exactement ce que le générateur écrirait (périmé, manquant ou dans un dossier sans document → erreur, corrigée par `migrate`). Le générateur expose `planOkfIndexFiles` (lecture seule), partagé avec le validateur, et supprime l'`index.md` d'un dossier vidé (`documentation/images-ai/index.md` retiré). Règle ignorée sans `index.md` racine (bundle jamais migré, ex. `usermanual-documentation`, déjà non conforme).

Suites : unitaires 69/69, `tests/api` 219/219, `tests/e2e` 117/117, `okf:validate` conforme sur `documentation/` et les deux starters.

MCP Living Documentation non exposé : pas de métadonnées attachées.

---

# WORKLOG rangé en CURRENT, FUTURE et FINISHED — 14 octobre 2026

`WORKLOG/` garde `current-task.md` à sa racine et range le reste : `FINISHED/` (roadmaps OKF et explorateur, leurs traces de tickets, `mcp-build-context-tool.md`), `FUTURE/` (`ROADMAP-RECHERCHE-RAG.md`), `CURRENT/` vide. Déplacements faits avec `relocateEntry` (liens, ids et manifestes suivis). Les deux starters livrent la même structure (roadmap d'exemple dans `FUTURE/`) et la décrivent dans `PROJECT-INSTRUCTIONS.md`, `track-current-work`, `AGENTS.md` et `CLAUDE.md`. Le générateur d'`index.md` ne liste plus les sous-dossiers sans concept (liens cassés). ADR [WORKLOG rangé en CURRENT, FUTURE et FINISHED](../ADRS/2026_10_14_19_00_%5BWORKLOG%5D_worklog_range_en_current_future_finished.md) en `To be validated`.

Suites : unitaires 65/65, `tests/api` 219/219, `tests/e2e` 117/117, `okf:validate` conforme.

Connu, non traité : le lien « ADR liens bundle-relatifs (T08) » du worklog ticket 14 était déjà cassé avant le rangement.

MCP Living Documentation non exposé : pas de métadonnées attachées.

---

# Explorateur : US11b livrée — 14 octobre 2026

US11b terminée sur `main` : entrée « Renommer » dans le menu contextuel de l'explorateur, modale de saisie, document ouvert suivi (URL mise à jour). Détails : [worklog US11b](./FINISHED/2026_10_14_18_00_%5BWORKLOG%5D_us_11b_renommer_depuis_l_explorateur_frontend.md). Suites : unitaires 64/64, `tests/api` 219/219, `tests/e2e` 117/117, `okf:validate` conforme.

Suite : backlog ROADMAP-EXPLORATEUR terminé ; validation humaine de l'ADR explorateur.

MCP Living Documentation non exposé : pas de métadonnées attachées.

---

# Explorateur : US11a livrée — 14 octobre 2026

US11a (backend) terminée sur `main` : `PUT /api/tree/rename` et réécriture des liens au renommage et au déplacement (`src/lib/linkRewrite.ts`). Détails : [worklog US11a](./FINISHED/2026_10_14_17_00_%5BWORKLOG%5D_us_11a_renommer_et_reecrire_les_liens_backend.md). Suites : unitaires 64/64, `tests/api` 219/219, `tests/e2e` 114/114, `okf:validate` conforme.

Suite : US11b (frontend : menu « Renommer », URL du document ouvert, i18n EN/FR) dans une nouvelle session.

MCP Living Documentation non exposé : pas de métadonnées attachées.

---

# Explorateur : US10 livrée — 14 octobre 2026

US10 terminée sur `main` : les fichiers réservés apparaissent avec les éléments cachés, en lecture seule. Détails : [worklog US10](./FINISHED/2026_10_14_15_00_%5BWORKLOG%5D_us_10_fichiers_reserves_avec_les_elements_caches.md). Suites : unitaires 57/57, `tests/api` 215/215, `tests/e2e` 114/114.

Suite : US11 (renommage + réécriture des liens) dans une nouvelle session, découpable en US11a backend / US11b frontend. Les nœuds `reserved` de `/api/tree` devront être exclus du menu « Renommer ».

MCP Living Documentation non exposé : pas de métadonnées attachées.

---

# Explorateur : cadrage US10 et US11 — 14 octobre 2026

Branche `feat/explorateur-liv-doc-main` fusionnée dans `main`. Deux nouvelles US cadrées avec l'utilisateur dans [ROADMAP-EXPLORATEUR](./FINISHED/ROADMAP-EXPLORATEUR.md), aucune ligne de code :

- **US10** : « Afficher les éléments cachés » dévoile aussi `index.md`, `log.md`, `liv-doc-main.md` (grisés, en tête du dossier, ouverture en lecture seule, aucune action). Marqueur `reserved: true` dans `/api/tree` seulement, sans toucher `isListedEntry`.
- **US11** : « Renommer » (nom de fichier, pas le `title`) sur les éléments non masqués, liens entrants réécrits ; le drag and drop réécrit aussi les liens. Généraliser `rewriteTarget` (`src/lib/prefixMigration.ts`). Découpage US11a backend / US11b frontend possible.

Suite : implémenter US10 dans une nouvelle session (une US par session).

---

# Explorateur ordonné par liv-doc-main.md — 14 octobre 2026

## État courant

Branche `feat/explorateur-liv-doc-main`. Backlog [ROADMAP-EXPLORATEUR](./FINISHED/ROADMAP-EXPLORATEUR.md) **terminé** : US1 à US9 commitées. `documentation/` du dépôt migré. ADR [Explorateur ordonné par manifeste liv-doc-main.md](?doc=ADRS%252F2026_10_14_13_00_%255BNAVIGATION%255D_explorateur_ordonne_par_manifeste_liv_doc_main) en `To be validated`. Détails : [worklog US9](./FINISHED/2026_10_14_13_30_%5BWORKLOG%5D_us_09_starters_et_documentation.md).

## Suite

1. Validation humaine de l'ADR, revue et merge de la branche (push à la charge de l'utilisateur).
2. Hors périmètre : captures des starters montrant les catégories, guides de `documentation/` et du manuel décrivant l'ancienne convention.
3. Attacher les sources de l'ADR et de `PROJECT-STACK.md` via le MCP quand il est disponible.

Suites au 14/10/2026 après US9 : unitaires 56/56, `tests/api` 213/213, `tests/e2e` 113/113, `okf:validate` 0 erreur.

MCP Living Documentation non exposé comme outil dans la session : worklog, roadmap et ADR écrits à la main, pas de métadonnées attachées.

---


# ADR du rendu Markdown dans summary — 24 septembre 2026

Rétrodocumentation terminée pour le commit `c1d2a1e1` du 23 septembre. [ADR : Rendu Markdown dans les titres des blocs repliables](?doc=ADRS%252F2026_09_23_20_30_%255BRENDERING%255D_rendu_markdown_dans_les_titres_des_blocs_repliables), statut `To be validated`. Aucun ADR antérieur remplacé.

Code et tests relus ; cinq fichiers attachés via MCP (summaryMarkdown, compareBlock, MarkdownPreview et les deux fichiers de tests). Hashes recalculés sur arbre propre, accuracy 100 %. ADR relu via MCP. Aucun changement de code ; tests et build non relancés pour cette passe documentaire. Suite : validation humaine de l'ADR.

---

# Mise à jour de l'image d'un diagramme depuis un document — 17 septembre 2026

## État courant

Feature terminée et commitée (`7d989d3d`). ADR créé : `ADRS/2026_09_17_11_46_[DIAGRAM]_mise_a_jour_de_limage_dun_diagramme_depuis_un_document_et_cache_busting` (To be validated, 4 sources attachées, accuracy 100 %). L'ADR `2026_04_12_[DIAGRAM]_insertion_diagramme_via_snippet_et_sauvegarde_auto_png` est passé en « Partially SuperSeeded ». En ouvrant un lien diagramme depuis un document (`[![x](./images/n.png)](/diagram?id=…)`), le viewer ajoute `&img=n.png` au lien. Le bouton PNG écrase donc cette image au lieu de copier dans le presse-papier. Au retour, l'image est rechargée avec `?v=<timestamp>` (version en `sessionStorage` + mémoire) pour ne pas afficher la copie en cache.

Fichiers : `src/frontend-svelte/src/lib/diagramImageLink.ts` (nouveau), `lib/home/wireContent.ts`, `lib/diagram/clipboard.js`, `lib/diagram/main.js`, `tests/e2e/diagram.spec.ts`.

## Vérifications

- `npm run build` réussi.
- `tests/e2e/diagram.spec.ts` (2/2, dont le nouveau parcours complet), `inline-snippet-edit` + `viewer` (50/50).
- Parcours vérifié manuellement dans le navigateur sur une copie de la fixture `with-diagrams`.

## Suite

Aucune implémentation restante. Validation humaine du nouvel ADR ; `npm run okf:validate` : 281 documents, 0 erreur.

---

# Menus du header — 17 septembre 2026

## État courant

Implémentation terminée et commitée : `420b9541` (visibilité depuis Admin), `395db08f` (sélection à l’installation), version `3.57.0` dans `2f6ce62b`. La correction de centrage des boutons du header est incluse dans le travail précédent.

La documentation a été mise à jour via le MCP reconnecté au bon projet : nouvel [ADR navigation](?doc=ADRS%252F2026_09_17_10_44_%255BNAVIGATION%255D_visibilite_des_menus_du_header_et_selection_a_installation), complément de l’ADR starter, guides Admin/démarrage, stack et commandes de test local. Les six documents techniques ont leurs sources attachées et leurs hashes recalculés, tous inchangés avec `dirty: false`.

## Vérifications réalisées pendant l’implémentation

- `npm run build` réussi ; avertissement de taille du bundle.
- Tests CLI, API config et navigateur header : 23/23.
- `npm run lint:ci` : aucune erreur, 63 avertissements et 2 informations.
- Sélecteur testé dans un terminal : cases initialement décochées, navigation, sélection Workspace/Survival Kit, persistance des trois autres routes masquées. Ce test a volontairement utilisé un port invalide pour arrêter après le scaffolding ; les tests automatisés vérifient le démarrage du serveur.
- Package local produit avec `npm pack` et présence des starters, du module CLI et des catalogues EN/FR vérifiée. Pas de publication npm réalisée par l’agent.
- Pour la présente passe documentaire, aucun changement de code ni nouvelle exécution des 23 tests ; relecture MCP et vérification des métadonnées.

- Validation documentaire finale : `npm run okf:validate`, 280 documents vérifiés, 0 erreur et 69 avertissements non bloquants. Arbre Git propre après les écritures et auto-commits du MCP.

## Suite

Aucune implémentation restante pour cette demande. Le nouvel ADR reste « To be validated » pour revue humaine. Les éventuels push restent à la charge de l’utilisateur. Le suivi antérieur ci-dessous est conservé comme historique.

---

# Clôture OKF — 16 septembre 2026

## État

Les 15 tickets sont réalisés dans leur périmètre retenu ; T13 porte sur l’import CLI. Les détails historiques restent dans les worklogs par ticket et Git. Ce résumé remplace les anciennes listes contradictoires de code non commité.

## Livré et commité

- `17a8cda0` : migration des copies de fixtures par le vrai CLI avant la garde de démarrage ; fixtures source conservées.
- `2be1dd1c` : collision de dossiers workspace évitée au renommage, avec test API conservant les fichiers existants.
- `e0e44059` : graphe T14 (`/graph`, `/api/graph`), extraction des vrais liens Markdown via marked, exclusion images/code/frontmatter/liens externes, tests unitaires et API, libellés EN/FR.
- Documentation enregistrée via MCP et auto-commits : ADR T14, complément de l’ADR workspace, stack, commandes, ADR Svelte, blueprint src, roadmap.
- Un contexte workspace sans frontmatter a été normalisé via MCP sans modifier son corps.

## Vérifications

- `npm run test:unit` : 24/24.
- `npx playwright test tests/api/okf-graph.spec.ts tests/api/workspace.spec.ts --project=chromium` : 9/9 (serveurs locaux autorisés hors sandbox).
- `npm run build` : réussi ; avertissement de taille de bundle.
- `npm run lint:ci` : aucune erreur, 61 avertissements et 2 informations.
- `npm run okf:validate` après correction du contexte : 278 documents vérifiés, 0 erreur, 66 avertissements non bloquants.
- Pas de nouvelle revue visuelle navigateur ; validation visuelle T14 historique conservée. Pas de suite E2E complète exécutée.
- Métadonnées T14, workspace, stack, commandes, ADR Svelte, blueprint src et normalisation T04 recalculées après vérification ; captures sur arbre propre (`dirty: false`). Les anciennes dérives hors de ces documents ne sont pas déclarées résolues.

## Suites

1. Les push sont pris en charge par l’utilisateur.
2. Interface d’import Admin/Files et résolution des liens absolus des bundles importés.
3. Audit des dérives documentaires historiques et génération systématique de frontmatter pour les contextes workspace.

ADR T14 : [Graphe de concepts OKF](?doc=ADRS%252F2026_09_16_17_40_%255BOKF%255D_readonly_okf_concept_graph_from_markdown_links).


## Simplification de l’outillage — 16 septembre 2026

Retrait de l’ancien outillage de graphe externe demandé par l’utilisateur. Le format OKF, le MCP Living Documentation et le visualiseur `/graph` sont conservés. Nettoyage des consignes, hooks, skill, caches et références documentaires terminé et commité (`bfd96ee9`). Un ADR dédié consigne la décision. Tests unitaires : 24/24 ; validation OKF sans erreur. Le push reste à la charge de l’utilisateur.


## Correction du header Survival Kit — 17 septembre 2026

Suppression du menu escamotable au survol dans `src/frontend-svelte/src/routes/SurvivalKit.svelte`. La Topbar est maintenant une ligne normale de la grille partagée `app-shell`, hors des zones défilantes, comme sur Home. Suppression du listener mousemove, du déclencheur de survol et des styles de translation du tiroir.

Vérifications : build réussi et `git diff --check` sans erreur. Les tests navigateur grand/petit écran n’ont pas été exécutés : la demande d’exécution hors sandbox a été refusée. Validation visuelle à effectuer. Correction non commitée ; aucun hash documentaire recalculé sur ce code modifié.
