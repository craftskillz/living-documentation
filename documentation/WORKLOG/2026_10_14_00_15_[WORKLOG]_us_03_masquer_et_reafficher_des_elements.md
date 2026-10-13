---
type: Worklog
title: US3 — Masquer et réafficher des éléments de l'explorateur
description: Clic droit « Masquer » / « Afficher » sur un fichier ou un dossier via PUT /api/tree/hidden (liste hidden du manifeste parent) ; les éléments cachés sortent de l'arbre, de sa recherche et des index.md OKF, et peuvent être réaffichés grisés.
tags:
  - worklog
  - us
  - explorateur
  - manifeste
status: To Be Validated
---

# US3 — Masquer et réafficher des éléments

## Contexte

Quatrième US livrée de la [ROADMAP-EXPLORATEUR](./ROADMAP-EXPLORATEUR.md).

## Réalisation

- `GET /api/tree` : un nœud listé dans le `hidden` du manifeste de son dossier porte `hidden: true`. L'arbre complet reste servi ; c'est le front qui filtre.
- `PUT /api/tree/hidden` `{ path, hidden }` (`src/routes/tree.ts`) : ajoute ou retire le nom dans le `hidden` du manifeste parent via `setManifestHidden` (`src/lib/folderManifest.ts`). Le manifeste est créé s'il manque (H4) ; `order`, autres champs et corps sont conservés. Erreurs : 400 (chemin vide, hors dossier docs, fichier réservé, entrée non listée, `hidden` non booléen), 404 (entrée absente), 409 (manifeste parent au YAML invalide).
- `index.md` OKF (`src/lib/okf/index-generator.ts`) : les éléments cachés ne sont plus listés ; un dossier caché garde son propre `index.md`.
- Front : `withoutHiddenEntries` (`lib/home/tree.ts`) retire les éléments cachés de l'arbre avant la recherche (H1) ; bouton œil dans l'en-tête du drawer (`home.showHiddenEntries`, `localStorage` `ld-show-hidden-entries`) qui les réaffiche grisés (`data-hidden="true"`) ; menu contextuel au clic droit dans `Sidebar.svelte`, déclenché par `TreeNode.svelte` ; libellés EN/FR.
- H1 : `GET /api/documents`, le MCP et les liens directs ne sont pas filtrés.

## Vérifications

- Seams : `tests/api/tree.spec.ts` (4 nouveaux tests, 10/10), `tests/unit/okf-index.test.ts` (nouveau), `tests/e2e/explorer.spec.ts` (parcours masquer → réafficher grisé → reload → afficher).
- Suites complètes sur le Mac : unitaires 31/31, `tests/api` 210/210, `tests/e2e` 108/108. Build réussi, `svelte-check` 0 erreur, Biome sans avertissement sur les fichiers TS touchés.

## Suites

- US5 — API de déplacement et de réordonnancement.
