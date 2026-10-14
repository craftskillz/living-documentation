---
type: Worklog
title: ROADMAP — Explorateur ordonné par liv-doc-main.md
description: Backlog des US qui remplacent les préfixes numériques et la nomenclature de catégories par un manifeste liv-doc-main.md par dossier (ordre + éléments cachés), rendent visibles les dossiers en point et ajoutent le drag and drop dans l'explorateur.
tags: []
timestamp: 2026-10-13T14:00:00Z
status: To be validated
language: fr
---

# ROADMAP — Explorateur ordonné par `liv-doc-main.md`

## Attentes (Youssef, 13/10/2026)

1. Plus de préfixes `001_`, `1_`… pour trier les dossiers.
2. Chaque dossier porte un fichier invisible `liv-doc-main.md` qui décrit l'ordre de ses fichiers et sous-dossiers. Un élément listé suit cet ordre ; les autres suivent l'ordre alphabétique standard, **dossiers puis fichiers**.
3. Drag and drop vertical dans l'explorateur : réordonner dans un même dossier ou déplacer dans un autre dossier.
4. Suppression de la nomenclature (pattern de nom de fichier, catégories) dans l'Admin.
5. Tous les dossiers sont visibles, y compris ceux préfixés de `.` (`.living-documentation`, `.scratch`…).
6. `liv-doc-main.md` liste aussi les fichiers et dossiers cachés.

## Décisions prises avec l'utilisateur

| Sujet | Décision |
|---|---|
| Périmètre affiché | Dossiers (y compris en `.`) + fichiers `.md` uniquement |
| Format du manifeste | Frontmatter YAML `order` / `hidden`, corps libre (description du dossier) |
| Noms de documents | Aucun renommage de l'existant. Titre = `title` du frontmatter, sinon nom du fichier sans `.md`. Nouveaux documents nommés d'après le titre (slug), sans date ni catégorie |
| Préfixes existants | Migration automatique : dossiers renommés sans préfixe, ordre reporté dans le `liv-doc-main.md` du parent |

## Format du manifeste

```markdown
---
order:
  - ADRS
  - guide
  - welcome.md
hidden:
  - .metadata.json
  - .scratch
---

Description libre du dossier.
```

Règles de tri d'un dossier :

1. les entrées de `order` existant sur disque, dans l'ordre du manifeste ;
2. puis les dossiers restants, alphabétique (insensible à la casse, `localeCompare`) ;
3. puis les fichiers `.md` restants, alphabétique.

Une entrée de `order` ou `hidden` qui n'existe plus est ignorée à la lecture et purgée à la prochaine écriture du manifeste.

## Hypothèses (validées par l'utilisateur le 13/10/2026)

- **H1 — Caché = affichage seulement.** Un élément `hidden` disparaît de l'explorateur et de sa recherche, mais reste accessible par lien direct et par le MCP.
- **H2 — Exclusions dures.** `.git` et `node_modules` ne sont jamais affichés. `liv-doc-main.md`, `index.md` et `log.md` (fichiers réservés) ne sont jamais affichés comme documents.
- **H3 — Dossiers `files/` et `images/` à la racine.** Ils deviennent visibles comme les autres. La migration les ajoute à `hidden` du manifeste racine pour conserver le rendu actuel.
- **H4 — Création paresseuse.** `liv-doc-main.md` est créé à la création d'un dossier depuis l'UI et, pour les dossiers existants, à la première écriture (réordonnancement, masquage).
- **H5 — Liens Markdown.** Le déplacement d'un fichier ou dossier (drag and drop) ne réécrit pas les liens des autres documents, comme aujourd'hui `POST /api/documents/:id/move`. Seule la migration (US8) réécrit les liens vers les dossiers renommés.
- **H6 — Migration.** Elle suit le modèle OKF : cœur de migration partagé, commande `migrate` et garde au démarrage avec un flag dans `.living-doc.json`.

---

## US1 — Lire le manifeste et servir un arbre ordonné (serveur)

**En tant que** lecteur, **je veux** que l'explorateur respecte l'ordre défini dans `liv-doc-main.md` **afin de** maîtriser l'ordre de lecture sans renommer mes dossiers.

- **Zones** : nouveau `src/lib/folderManifest.ts` (parse/serialize YAML, purge des entrées orphelines), nouvelle route `GET /api/tree` (arbre imbriqué déjà trié : `{ name, path, kind: "folder" | "doc", id?, title?, hidden, children? }`).
- **Critères d'acceptation** :
  - sans manifeste : dossiers alphabétiques puis fichiers alphabétiques ;
  - avec `order` partiel : éléments listés en tête dans l'ordre, puis le reste selon la règle par défaut ;
  - entrée `order` inexistante ignorée sans erreur ; manifeste YAML invalide → ordre par défaut + avertissement serveur, jamais d'erreur 500 ;
  - `liv-doc-main.md` est un fichier réservé : absent des documents (`collectMdFiles`, MCP `list_documents`, index OKF, validateur, migration OKF) ;
  - les `index.md` OKF générés (`src/lib/okf/index-generator.ts`) listent concepts et sous-dossiers dans le même ordre que l'explorateur.
- **Tests** : unitaires sur `folderManifest` ; API Playwright via le vrai CLI sur une fixture dédiée.

## US2 — Rendre visibles les dossiers et fichiers en point

**En tant que** utilisateur, **je veux** voir `.living-documentation`, `.scratch`, etc. **afin de** naviguer dans toute ma documentation.

- **Zones** : `collectMdFiles` et `listDocs` (`src/routes/documents.ts`), `src/routes/browse.ts` (`/` et `/alldirs`), `src/mcp/tools/documents.ts`, recherche, `GET /api/tree`.
- **Critères d'acceptation** :
  - un dossier `.scratch/` et un `.md` en point apparaissent dans l'arbre et sont ouvrables ;
  - `.git` et `node_modules` restent exclus (H2) ;
  - les fichiers non `.md` restent invisibles ;
  - les dossiers en point restent **hors des `index.md` OKF** (brouillons / espaces internes, pas de la documentation publiée) ;
  - l'explorateur Home consomme `GET /api/tree` (fin de `buildFolderTree` côté client).
- **Dépend de** : US1.

## US3 — Masquer et réafficher des éléments

**En tant que** utilisateur, **je veux** masquer un fichier ou un dossier depuis l'explorateur **afin de** garder une vue propre sans supprimer.

- **Zones** : `PUT /api/tree/hidden` (ajout ou retrait dans `hidden` du manifeste du dossier parent), `Sidebar.svelte` / `TreeNode.svelte`, i18n EN/FR.
- **Critères d'acceptation** :
  - menu contextuel « Masquer » / « Afficher » sur chaque élément ;
  - bouton « Afficher les éléments cachés » dans l'en-tête du drawer : éléments cachés affichés grisés ; préférence locale (`localStorage`) ;
  - un élément listé dans `hidden` n'apparaît ni dans l'arbre ni dans la recherche de la sidebar (H1) ;
  - un élément `hidden` est omis des `index.md` OKF générés.
- **Dépend de** : US1, US2.

## US4 — Supprimer la nomenclature (pattern et catégories)

**En tant que** administrateur, **je ne veux plus** configurer de pattern de nom de fichier ni de catégories **afin que** l'organisation repose uniquement sur les dossiers.

- **Zones** : `Admin.svelte` (section pattern, aperçu, option `exclusiveCategoryExpansion`, `sidebarSort`), `src/lib/config.ts` et `src/routes/config.ts` (clés ignorées si présentes, plus écrites), `src/lib/parser.ts` (titre = frontmatter `title`, sinon nom de fichier ; date = frontmatter `timestamp`), `TreeNode.svelte` (plus de groupes de catégorie ni de toggle `hideCategories`), fil d'Ariane (pastille catégorie), `NewDocModal.svelte` (champ catégorie retiré, nom = slug du titre), `POST /api/documents`, MCP `create_document`, `export.ts`, `workspace.ts`, `blueprint.ts`, i18n EN/FR.
- **Critères d'acceptation** :
  - plus aucune mention de pattern ou de catégorie dans l'Admin ;
  - un `.living-doc.json` contenant encore `filenamePattern` / `sidebarSort` / `exclusiveCategoryExpansion` démarre sans erreur ;
  - un document existant `2026_…_[ADR]_x.md` garde son nom et s'affiche avec son `title` de frontmatter ;
  - un nouveau document « Mon guide » est créé en `mon-guide.md` (collision → `mon-guide-2.md`).
- **Dépend de** : US2 (l'arbre ne groupe plus par catégorie).
- **Découpage (13/10/2026)** : décisions utilisateur — `category` supprimé complètement des API (pas de champ legacy), nommage par slug partout (UI, MCP, workspace, Blueprint), US4 découpée en deux.
  - **US4a — backend** (terminée) : parser (titre/date depuis le frontmatter, slug + suffixe `-2`), config (clés retirées, purgées au démarrage), `POST /api/documents`, MCP `create_document` / `list_documents`, workspace, export, Blueprint (document `001_BLUEPRINT/<slug-du-dossier>.md`, anciens `_[NOM]_` toujours trouvés), points d'appel front qui auraient planté.
  - **US4b — frontend** (terminée) : `Admin.svelte` (pattern, aperçu, `exclusiveCategoryExpansion`, `sidebarSort`), `NewDocModal.svelte` (champ catégorie, aperçu du nom), code mort de `home/tree.ts` (`buildFolderTree`, catégories, tri), `hideCategories` / `expandedCategories` dans `home/state.svelte.ts`, CSS `.category-docs`, i18n EN/FR, tests E2E Admin/éditeur concernés.

## US5 — API de déplacement et de réordonnancement

**En tant que** frontend, **je veux** une API unique pour déplacer un fichier ou un dossier à une position donnée **afin de** brancher le drag and drop.

- **Zones** : `POST /api/tree/move` `{ source, targetFolder, index }`, extraction d'un service commun avec `POST /api/documents/:id/move`.
- **Critères d'acceptation** :
  - même dossier : seul le `order` du manifeste change (aucun déplacement disque) ;
  - autre dossier : déplacement disque, retrait de l'entrée du manifeste source, insertion à `index` dans le manifeste cible ;
  - déplacement d'un dossier : migration de tous les ids concernés dans `.metadata.json`, `.annotations.json` et les favoris de `.living-doc.json` ;
  - refus : dossier déposé dans lui-même ou un descendant (400), collision de nom (409), path traversal (403), dossiers réservés.
- **Dépend de** : US1.

## US6 — Drag and drop dans l'explorateur

**En tant que** utilisateur, **je veux** glisser un élément verticalement **afin de** le réordonner ou le ranger dans un autre dossier.

- **Zones** : `TreeNode.svelte`, `Sidebar.svelte`, `home/state.svelte.ts`, i18n EN/FR.
- **Critères d'acceptation** :
  - ligne d'insertion visible entre deux éléments (réordonnancement) ; surbrillance d'un dossier survolé (dépôt à l'intérieur, en fin d'`order`) ;
  - un dossier fermé survolé environ 600 ms s'ouvre (constante nommée) ;
  - le document ouvert reste ouvert après déplacement (nouvel id, URL mise à jour) ;
  - erreur serveur → toast traduit, arbre rechargé ;
  - drag désactivé pendant une recherche.
- **Tests** : E2E Playwright (réordonnancement, déplacement inter-dossiers, refus dossier dans descendant).
- **Dépend de** : US5.

## US7 — Créer `liv-doc-main.md` à la création d'un dossier

- **Zones** : `POST /api/browse/mkdir`, `NewFolderModal.svelte`.
- **Critères d'acceptation** : un dossier créé depuis l'UI contient un `liv-doc-main.md` avec `order: []`, `hidden: []` ; il apparaît en fin d'`order` du parent si le parent a un `order` non vide.
- **Dépend de** : US1.

## US8 — Migration des préfixes numériques

**En tant que** utilisateur d'un projet existant, **je veux** que mes dossiers `001_X` / `1_x` soient renommés automatiquement en conservant leur ordre.

- **Zones** : cœur de migration partagé (modèle OKF), commande `migrate`, garde au démarrage, flag `.living-doc.json` (H6).
- **Algorithme déterministe et idempotent** :
  1. pour chaque dossier, détecter les enfants `^\d+_` ;
  2. calculer l'ordre d'origine (tri actuel sur le nom préfixé) et l'écrire dans `order` du manifeste parent (noms sans préfixe), en fusionnant avec un manifeste existant ;
  3. renommer ; en cas de collision (`1_tutorial` et `tutorial`), ne pas renommer et le signaler dans le rapport ;
  4. réécrire les liens Markdown relatifs et `?doc=` qui visent les dossiers renommés ; migrer les clés de `.metadata.json`, `.annotations.json` et des favoris ;
  5. ajouter `files` et `images` au `hidden` du manifeste racine (H3) ;
  6. mode `--dry-run` avec rapport.
- **Critères d'acceptation** : rejouable sans effet ; fixture avec `001_A`, `2_b`, `c` → `order: [A, b]`, puis `c` ; aucun binding de métadonnées cassé.
- **Dépend de** : US1, US5 (service de migration des ids).

## US9 — Starters et documentation

- **Zones** : `starter-doc/` et `starter-doc-fr/` (`000_DOCUMENTATION` → `DOCUMENTATION` + manifestes), `usermanual-documentation/`, README EN/FR, `PROJECT-STACK.md`.
- **ADR** : nouvel ADR « Explorateur ordonné par manifeste `liv-doc-main.md` » qui remplace `2026_04_08_13_15_[NAVIGATION]_anchor_scroll_and_folder_sort_convention` (partie tri : `Partially SuperSeeded`) et rend partiellement caducs `2026_03_21_10_25_[CONFIGURATION]_general_category_and_sidebar_defaults`, `2026_04_08_12_20_[FILENAME]_datetime_precision_in_filename_pattern` et `2026_04_23_[CONFIGURATION]_exclusive_folder_and_category_expansion_options` (partie catégories).
- **Dépend de** : US1 à US8.

## US10 — Dévoiler les fichiers réservés avec les éléments cachés

**En tant que** utilisateur, **je veux** que « Afficher les éléments cachés » dévoile aussi les fichiers réservés (`index.md`, `log.md`, `liv-doc-main.md`) **afin de** voir et consulter ce que l'outil génère dans chaque dossier.

- **Zones** : `src/lib/folderTree.ts` (lister les fichiers réservés dans `/api/tree` avec un marqueur `reserved: true`, sans toucher `isListedEntry` partagé avec la liste des documents, la recherche et le MCP), `GET /api/documents/:id` (servir un fichier réservé en lecture), `PUT /api/documents/:id` (refuser l'écriture d'un fichier réservé), `TreeNode.svelte` / `Sidebar.svelte`, viewer (mode lecture seule), i18n EN/FR.
- **Décisions utilisateur (14/10/2026)** : ouverture en lecture seule ; aucune action sur ces fichiers.
- **Critères d'acceptation** :
  - bouton « Afficher les éléments cachés » désactivé : aucun fichier réservé dans l'arbre (comportement actuel) ;
  - bouton activé : les fichiers réservés présents apparaissent grisés, comme les éléments cachés, en tête de leur dossier ;
  - clic sur un fichier réservé : le viewer l'affiche sans bouton d'édition ; pour `liv-doc-main.md`, dont le contenu utile est le frontmatter (`order`, `hidden`), le YAML est affiché ;
  - l'API refuse l'écriture d'un fichier réservé ;
  - ni drag and drop, ni menu Masquer/Afficher, ni renommage, ni suppression sur un fichier réservé ; l'API de déplacement les refuse ;
  - les fichiers réservés restent absents de la liste des documents, de la recherche de la sidebar quand le bouton est désactivé, des `index.md` générés et du MCP.
- **Dépend de** : US3.

## US11 — Renommer un fichier ou un dossier, liens entrants à jour

**En tant que** utilisateur, **je veux** renommer un fichier ou un dossier depuis le menu contextuel de l'explorateur **afin de** réorganiser sans casser les liens des autres documents. Le drag and drop bénéficie de la même réécriture des liens.

- **Zones** : nouvelle route `PUT /api/tree/rename` (`{ path, newName }`) dans `src/routes/tree.ts`, `src/lib/treeMove.ts` (renommage sur disque, `migrateDocIds`, remplacement du nom dans `order` / `hidden` du manifeste parent, réécriture des liens après un renommage **et** après un déplacement `moveTreeEntry`), `src/lib/prefixMigration.ts` (`rewriteMovedLinks` / `rewriteTarget` à généraliser : aujourd'hui ils ne savent que retirer un préfixe numérique), régénération des `index.md` concernés, `TreeNode.svelte` (entrée « Renommer » + saisie en place ou modale), i18n EN/FR.
- **Décisions utilisateur (14/10/2026)** :
  - pour un fichier, « Renommer » change le **nom de fichier** (`.md` conservé) ; le `title` du frontmatter n'est pas modifié ;
  - la réécriture des liens entrants s'applique aussi au drag and drop (US5/US6), qui jusqu'ici ne met à jour que les stores et les favoris ;
  - l'`index.md` OKF ne sert pas à détecter les dépendances (il liste les liens sortants d'un dossier et peut être périmé) : les liens entrants sont trouvés en parcourant tous les `.md`, comme en US8.
- **Critères d'acceptation** :
  - menu contextuel « Renommer » sur les fichiers et dossiers **non masqués** ; absent sur les éléments masqués, sur les fichiers réservés (US10) et sur les dossiers racine réservés `files` / `images` ;
  - nom invalide (vide, `/`, nom réservé, `.` / `..`) → 400 ; nom déjà pris dans le dossier → 409 ; rien n'est modifié en cas d'erreur ;
  - l'élément renommé garde sa position dans `order` et son état dans le manifeste parent ;
  - métadonnées, annotations, diagrammes, favoris et sources liées suivent le nouvel identifiant (`migrateDocIds`), y compris pour tous les documents d'un dossier renommé ;
  - les liens entrants des autres documents sont réécrits, qu'ils soient relatifs (`./x.md`, `../d/x.md`), bundle-relatifs (`/d/x.md`) ou `?doc=` ; ancres et suffixes conservés ; les liens dans les blocs de code ne sont pas modifiés ; un lien non concerné reste identique à l'octet près ;
  - après un déplacement par drag and drop, les liens entrants **et** les liens relatifs sortants des documents déplacés (recalculés depuis leur nouvel emplacement) restent valides ;
  - le document ouvert renommé reste affiché (URL mise à jour) ;
  - les `index.md` OKF des dossiers concernés sont régénérés ; `okf:validate` reste à 0 erreur.
- **Dépend de** : US3, US5, US8.

---

## Ordre recommandé

- [x] ~~US1 — Lire le manifeste et servir un arbre ordonné~~
- [x] ~~US2 — Rendre visibles les dossiers et fichiers en point~~
- [x] ~~US7 — Créer `liv-doc-main.md` à la création d'un dossier~~
- [x] ~~US3 — Masquer et réafficher des éléments~~
- [x] ~~US5 — API de déplacement et de réordonnancement~~
- [x] ~~US6 — Drag and drop dans l'explorateur~~
- [x] ~~US4a — Supprimer la nomenclature (backend)~~
- [x] ~~US4b — Supprimer la nomenclature (frontend)~~
- [x] ~~US8 — Migration des préfixes numériques~~
- [x] ~~US9 — Starters et documentation~~
- [ ] US10 — Dévoiler les fichiers réservés avec les éléments cachés
- [ ] US11 — Renommer un fichier ou un dossier, liens entrants à jour

Convention : `[x] ~~US… ~~` une fois terminée, avec un document `AAAA_MM_JJ_HH_mm_[WORKLOG]_us_XX_<slug>.md`.
