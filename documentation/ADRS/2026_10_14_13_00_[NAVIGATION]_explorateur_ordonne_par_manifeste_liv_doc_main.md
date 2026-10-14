---
type: ADR
title: Explorateur ordonné par manifeste liv-doc-main.md
description: Chaque dossier porte un manifeste invisible liv-doc-main.md (order, hidden) qui ordonne et masque ses entrées ; le glisser-déposer l'écrit, les préfixes numériques et la nomenclature par catégorie disparaissent, avec une migration déterministe des projets existants.
tags:
  - navigation
  - explorateur
  - liv-doc-main
  - manifeste
  - drag-and-drop
  - migration
  - nomenclature
status: To be validated
---

## Contexte

L'explorateur triait les dossiers par nom : pour imposer un ordre, il fallait préfixer les dossiers (`001_BLUEPRINT`, `1_tutorial`), et l'interface masquait ensuite ce préfixe. Les documents étaient regroupés par catégories extraites du nom de fichier selon un pattern configurable (`YYYY_MM_DD_HH_mm_[Category]_title`). Les dossiers commençant par `.` restaient invisibles.

Cette nomenclature rendait les noms de fichiers longs et fragiles, et réordonner un dossier obligeait à le renommer, ce qui cassait les liens. Le besoin exprimé le 13/10/2026 : plus de préfixes, un ordre libre par glisser-déposer, tous les dossiers visibles, et plus de nomenclature dans l'Admin.

## Décision

### Le manifeste

Chaque dossier peut contenir un fichier réservé `liv-doc-main.md`, jamais affiché comme document. Son frontmatter YAML porte deux listes de noms d'entrées du dossier ; son corps décrit librement le dossier.

```markdown
---
order:
  - ADRS
  - welcome.md
hidden:
  - .scratch
---
```

Tri d'un dossier : les entrées de `order` existant sur disque, dans l'ordre du manifeste ; puis les dossiers restants, puis les fichiers `.md` restants, chacun par ordre alphabétique (`localeCompare`, insensible à la casse). Une entrée qui n'existe plus est ignorée à la lecture et purgée à la prochaine écriture. Un manifeste au frontmatter invalide est ignoré à la lecture (ordre par défaut) et n'est jamais réécrit.

- **Périmètre affiché** : dossiers, y compris ceux en `.`, et fichiers `.md`. `.git` et `node_modules` ne sont jamais affichés ; `liv-doc-main.md`, `index.md` et `log.md` ne sont jamais des documents.
- **Masquage** : une entrée de `hidden` disparaît de l'explorateur et de sa recherche, mais reste accessible par lien direct et par le MCP. « Afficher les éléments cachés » la montre grisée pour la réafficher.
- **Fichiers réservés** : « Afficher les éléments cachés » dévoile aussi `index.md`, `log.md` et `liv-doc-main.md`, grisés, en tête de leur dossier. `GET /api/tree` les marque `reserved: true` sans changer `isListedEntry` : ils restent hors de la liste des documents, de la recherche, des `index.md` générés et du MCP. Ils s'ouvrent en lecture seule ; le frontmatter (contenu utile du manifeste) est affiché en bloc YAML. Ni édition, ni suppression, ni déplacement, ni masquage : l'API refuse ces écritures (400), le glisser-déposer et le menu contextuel les ignorent.
- **Renommage et liens** : `PUT /api/tree/rename` (`{ path, newName }`) renomme le nom de fichier (`.md` ajouté si absent, `title` inchangé) ou de dossier, sur place ; le nom garde sa position dans `order` et son état dans le manifeste parent. Refus 400 pour un nom invalide (vide, `/`, `.`/`..`, réservé, `files`/`images` à la racine) ou un élément masqué, réservé ou racine réservé ; 409 si le nom est pris. Renommage et déplacement (`POST /api/tree/move`) passent par `src/lib/linkRewrite.ts` : tous les `.md` sont parcourus (jamais l'`index.md`, possiblement périmé) ; un lien qui résout encore sa cible reste identique à l'octet près, sinon les segments renommés sont remplacés sur place, et à défaut le chemin est recalculé depuis le nouvel emplacement. Liens relatifs, bundle-relatifs `/…` et `?doc=` ; ancres conservées ; blocs de code ignorés. Les `index.md` OKF sont ensuite régénérés.
- **Création** : le manifeste est créé à la création d'un dossier depuis l'UI et, pour un dossier existant, à sa première écriture (réordonnancement, masquage).
- **API** : `GET /api/tree` sert l'arbre déjà ordonné ; `POST /api/tree/move` réordonne ou déplace une entrée et met à jour les manifestes source et cible. Le déplacement migre les ids de documents dans `.metadata.json`, `.annotations.json`, les favoris et les preuves (`evidence[].documentId`) de `.diagrams.json`. Il ne réécrit pas les liens Markdown des autres documents.

### Fin de la nomenclature

Le nom de fichier n'est plus qu'un identifiant. Le titre vient du frontmatter `title` (sinon du nom de fichier), la date de `timestamp`. Un nouveau document est nommé par le slug de son titre (`mon-guide.md`). Les clés `filenamePattern`, `sidebarSort` et `exclusiveCategoryExpansion` sont retirées : purgées au démarrage, ignorées par `PUT /api/config`. L'UI ne parle plus de catégorie. Les fichiers existants ne sont pas renommés.

### Migration des projets existants

`migrateProject` (`src/lib/migrate.ts`) enchaîne la migration des préfixes (`src/lib/prefixMigration.ts`) puis la migration OKF. Elle est partagée par la commande `migrate [--dry-run]`, la garde au démarrage et `init`. Elle est déterministe et idempotente :

1. seuls les dossiers `^\d+_` sont renommés sans leur préfixe ; les documents ne le sont jamais ;
2. l'ordre d'affichage d'origine (alphabétique sur le nom préfixé) est écrit dans `order` du manifeste parent, en fusion avec un manifeste existant ;
3. un nom cible déjà pris n'est pas renommé et figure dans le rapport ;
4. les liens Markdown relatifs et `?doc=` vers les dossiers renommés sont réécrits (hors blocs de code), ainsi que les ids des stores, des favoris, des preuves de diagrammes et les chemins de sources qui visent des documents ;
5. `files` et `images` sont ajoutés au `hidden` racine, pour garder le rendu d'avant.

Le flag `explorerMigration` de `.living-doc.json` marque un projet migré. Comme pour OKF, la garde au démarrage propose la migration et refuse d'ouvrir le projet si elle est déclinée.

Le dossier Blueprint s'appelle désormais `BLUEPRINT` (au lieu de `001_BLUEPRINT`).

## Conséquences

### AVANTAGES

- L'ordre se choisit à la souris et se versionne dans un fichier lisible, sans renommer de dossier ni casser de lien.
- Les noms de fichiers et de dossiers redeviennent courts ; les dossiers en `.` sont accessibles.
- Les projets existants migrent une fois, avec un aperçu `--dry-run` et sans perte de binding.

### INCONVÉNIENTS

- Un `liv-doc-main.md` par dossier ordonné ou masqué s'ajoute au dépôt.
- Un déplacement par glisser-déposer ne réécrit pas les liens des autres documents.
- La migration ne touche pas les chemins cités en exemple dans les blocs de code, ni le texte des guides qui décrivent l'ancienne convention.
- Les captures d'écran des starters montrent encore la sidebar par catégories.

## ADR remplacés

- [Anchor Scroll And Folder Sort Convention](?doc=ADRS%252F2026_04_08_13_15_%255BNAVIGATION%255D_anchor_scroll_and_folder_sort_convention) : partie tri des dossiers par préfixe.
- [General Category And Sidebar Defaults](?doc=ADRS%252F2026_03_21_10_25_%255BCONFIGURATION%255D_general_category_and_sidebar_defaults) : partie catégories et tri de la sidebar.
- [Datetime Precision In Filename Pattern](?doc=ADRS%252F2026_04_08_12_20_%255BFILENAME%255D_datetime_precision_in_filename_pattern) : le pattern de nom de fichier n'existe plus.
- [Exclusive Folder And Category Expansion Options](?doc=ADRS%252F2026_04_23_%255BCONFIGURATION%255D_exclusive_folder_and_category_expansion_options) : partie catégories (`exclusiveCategoryExpansion`).

Backlog et hypothèses : [ROADMAP-EXPLORATEUR](?doc=WORKLOG%252FROADMAP-EXPLORATEUR).
