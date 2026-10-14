---
type: Worklog
title: US2 — Dossiers en point visibles et explorateur branché sur GET /api/tree
description: Les dossiers et fichiers .md en point sont listés partout (arbre, documents, MCP, sélecteur de dossiers) sauf .git et node_modules ; l'explorateur Home affiche l'arbre ordonné servi par le serveur, sans groupes de catégories.
tags:
  - worklog
  - us
  - explorateur
  - dotfiles
status: To Be Validated
---

# US2 — Dossiers en point visibles et explorateur branché sur `GET /api/tree`

## Contexte

Deuxième US de la [ROADMAP-EXPLORATEUR](ROADMAP-EXPLORATEUR.md).

## Réalisation

- `src/lib/explorerEntries.ts` : règle unique de visibilité (`isListedDir`, `isListedDocFile`, `isListedEntry`) ; seuls `.git`, `node_modules` et les fichiers réservés sont exclus.
- Règle appliquée à `GET /api/tree` (`src/lib/folderTree.ts`), `collectMdFiles` / `GET /api/documents`, MCP `list_documents`, `GET /api/browse` et `/alldirs` (dans le dossier docs uniquement ; ailleurs sur le disque les dossiers en point restent masqués).
- `files/` et `images/` à la racine apparaissent dans l'arbre et la liste des documents (H3) ; ils restent exclus du sélecteur de dossiers car création et déplacement y sont refusés.
- Nœuds `doc` de l'arbre : `id` identique à `/api/documents`.
- Front : `home.explorerTree` chargé via `fetchTree()` ; `TreeNode.svelte` rend l'arbre ordonné (dossiers et documents mêlés selon le manifeste) ; recherche = arbre élagué aux documents trouvés (`filterExplorerTree`) ; compteurs de dossier via `countExplorerDocs`.
- Les groupes de catégories disparaissent de l'explorateur et le bouton « masquer les catégories » est retiré (anticipation de l'US4, sans quoi l'ordre du manifeste ne pouvait pas s'appliquer). Le reste de la nomenclature (Admin, parser, modales, état `expandedCategories`) est traité en US4.
- Les `index.md` OKF continuent d'ignorer les dossiers en point (décision utilisateur).

## Vérifications

- Seams validés : API (`tree.spec.ts` 7 tests, `mcp.spec.ts`, `browse.spec.ts`) et E2E (`tests/e2e/explorer.spec.ts`).
- Suite `tests/api` sur le Mac : 201/202 ; l'échec restant demande un navigateur et passe dans l'espace cloud.
- E2E dans l'espace cloud de l'agent (copie du dépôt, CDN bloqués remplacés par des stubs dans une copie locale du fixture, non commitée) : 107 tests ; échecs uniquement dus à l'environnement (vis-network stubbé pour un test diagramme). `viewer.spec.ts` adapté à la disparition des catégories.
- Mutation : sans l'ordre du manifeste, `explorer.spec.ts` échoue.
- `npm run build` et `svelte-check` (0 erreur) dans l'espace cloud ; Biome : aucun avertissement nouveau.

## Suites

- À relancer sur le Mac : `npm run test:e2e` complet (CDN réels).
- US7 puis US3.
