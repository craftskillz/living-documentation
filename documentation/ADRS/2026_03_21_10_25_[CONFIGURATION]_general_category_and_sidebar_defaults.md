---
type: ADR
title: General Category And Sidebar Defaults
description: Renommer « Uncategorized » en « General », l'épingler en première position dans la sidebar, réduire toutes les autres catégories au chargement, et étendre la sidebar en une arborescence de dossiers récursive avec des pastilles de fil d'Ariane dans l'en-tête d'article.
tags:
  - configuration
  - sidebar
  - catégorie
  - parser
  - frontend
  - ux
  - general
  - uncategorized
  - navigation
  - dossier
  - arborescence
  - récursif
  - fil d'Ariane
  - sous-dossier
  - DocMetadata
timestamp: 2026-03-21T10:25:00Z
status: Acceptée
---

## Contexte

Les fichiers qui ne correspondaient pas au pattern de nommage étaient regroupés sous une catégorie appelée « Uncategorized » et placés en bas de la sidebar. Cette étiquette prêtait à confusion — elle laissait entendre que les fichiers étaient mal nommés plutôt que simplement non regroupés. De plus, la sidebar se chargeait avec toutes les catégories développées, ce qui était bruyant pour les projets comportant de nombreuses catégories.

Par la suite, avec l'ajout du support des sous-répertoires, la sidebar a dû évoluer davantage : les fichiers dans les sous-répertoires étaient gérés avec un fallback plat où le nom du sous-répertoire était substitué en tant que catégorie. Les fichiers avec une `[Category]` explicite ignoraient complètement le sous-répertoire. Cela signifiait que `adrs/test/file.md` et `adrs/file.md` apparaissaient comme des groupes de catégories frères au même niveau — pas d'imbrication, pas de hiérarchie.

## Décision

### Phase 1 — Catégorie General et valeurs par défaut de la sidebar

1. **Renommer « Uncategorized » → « General »** : indique que ces documents sont d'ordre général, et non mal classés. Appliqué dans le parser (`src/lib/parser.ts`), le viewer frontend et le widget d'aperçu du pattern dans l'admin.

2. **« General » est toujours en premier** : la sidebar trie les catégories alphabétiquement mais épingle « General » en haut, car elle contient généralement les documents de point d'entrée les plus importants (README, CLAUDE.md, etc.).

3. **Toutes les catégories réduites au chargement sauf General** : au chargement initial de la page, seule la section General est développée. Les autres catégories sont réduites et s'ouvrent au clic.

### Phase 2 — Arborescence de dossiers récursive et fil d'Ariane

**Backend (`parser.ts` + `documents.ts`)**

- Ajout de `folder: string[] | null` à `DocMetadata`. Le parser renvoie toujours `folder: null` ; la route déduit la valeur à partir du chemin relatif.
- Dans `listDocs`, `path.dirname(relPath)` est découpé sur `path.sep` et chaque segment est mis en casse de titre pour produire le tableau `folder` (ex. `adrs/test` → `["Adrs", "Test"]`). L'ancienne logique de « remplacement de la catégorie par le nom du sous-répertoire » est supprimée.
- Le handler `GET /api/documents/:id` parse uniquement `path.basename(filename)` (corrigeant un bug préexistant où les fichiers en sous-répertoire ne pouvaient pas être parsés), puis déduit `folder` de `path.dirname(id)` en utilisant `"/"` comme séparateur.

**Frontend (`index.html`)**

- `renderSidebar` construit une arborescence de nœuds récursive via `buildFolderTree` : chaque nœud contient `{ categories, children }`.
- `renderTreeNode` rend chaque nœud récursivement : **catégorie General en premier**, puis les sous-dossiers (triés alphabétiquement), puis les autres catégories (triées alphabétiquement).
- L'état de bascule des dossiers est suivi dans `expandedFolders` (un `Set` de clés de chemin jointes par `|`, ex. `"Adrs|Test"`).
- Les clés de bascule des catégories sont également qualifiées par le chemin (`"Adrs|Test|Architecture"`), garantissant l'absence de collisions d'identifiants entre des catégories de même nom à différentes profondeurs de dossiers.
- L'en-tête d'article a remplacé l'unique `#doc-category` span par un conteneur `#doc-breadcrumbs` : une pastille violette par segment de dossier, suivie d'une pastille bleue pour la catégorie.

**Convention de tri des dossiers**

Les répertoires peuvent être préfixés par un chiffre et un underscore (`1_TUTORIAL`, `2_REFERENCE`) pour contrôler leur position de tri alphabétique. L'assistant `folderLabel(seg)` retire le préfixe pour l'affichage ; le nom complet est conservé dans l'attribut `title` (infobulle).

## Conséquences

### AVANTAGES

- « General » est une étiquette plus intuitive et non-jugeante pour les documents non regroupés.
- Épingler General en haut garantit que les documents les plus fréquemment consultés sont immédiatement visibles.
- Réduire toutes les autres catégories au chargement réduit le bruit visuel pour les projets avec de nombreuses catégories.
- Navigation hiérarchique réelle : `adrs/test/file.md` apparaît sous **Adrs > Test** dans la sidebar, et non comme un frère plat `Adrs/Test`.
- La profondeur d'imbrication arbitraire fonctionne sans modifications supplémentaires.
- `[Category]` et dossier sont totalement indépendants — un fichier peut vivre dans `tutorials/` et porter `[OAAS]` comme catégorie.
- Le fil d'Ariane dans l'en-tête d'article rend l'emplacement complet d'un document immédiatement visible.
- L'ordre de tri des dossiers est contrôlable via une convention de nommage (`1_NAME`) sans aucune configuration ni UI — le nom du système de fichiers est la source unique de vérité.

### INCONVÉNIENTS

- Les projets qui utilisaient auparavant « Uncategorized » comme chaîne de filtre de catégorie dans la recherche ne correspondront plus.
- Les clés de bascule des catégories sont désormais des chaînes qualifiées par le chemin ; tout état `expandedCategories` en mémoire est perdu au re-rendu — acceptable puisque celui-ci est de toute façon réinitialisé au chargement de la page.
- Le schéma d'identifiants de la sidebar est désormais dérivé du chemin complet, ce qui pourrait produire des identifiants DOM longs pour les structures profondément imbriquées.
- La convention de préfixe `1_` est implicite — rien ne la valide ni ne la documente dans l'outil lui-même en dehors du README.