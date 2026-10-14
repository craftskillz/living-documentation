---
type: Worklog
title: US7 — Manifeste liv-doc-main.md à la création d'un dossier
description: POST /api/browse/mkdir écrit un liv-doc-main.md vide dans tout nouveau dossier du dossier docs et ajoute le dossier en fin d'order du parent quand cet order est non vide.
tags:
  - worklog
  - us
  - explorateur
  - manifeste
status: To Be Validated
---

# US7 — Manifeste `liv-doc-main.md` à la création d'un dossier

## Contexte

Troisième US livrée de la [ROADMAP-EXPLORATEUR](ROADMAP-EXPLORATEUR.md).

## Réalisation

- `src/lib/folderManifest.ts` : `createFolderManifest` (écrit `order: []`, `hidden: []`, ne remplace jamais un manifeste existant) et `appendToManifestOrder` (ajoute le nom en fin d'`order` seulement si l'`order` du parent est non vide et ne le contient pas ; autres champs et corps conservés ; manifeste absent ou YAML invalide : rien n'est écrit).
- `POST /api/browse/mkdir` (`src/routes/browse.ts`) appelle les deux fonctions seulement dans le dossier docs ; ailleurs sur le disque, aucun manifeste.
- `NewFolderModal.svelte` est inchangé, il passe déjà par cette route. Les colonnes kanban, créées par la même route, reçoivent aussi un manifeste.

## Vérifications

- `tests/api/browse.spec.ts` : 4 nouveaux tests (manifeste créé, ajout en fin d'`order`, `order` vide intact, hors dossier docs), 12/12.
- Suites complètes sur le Mac : `tests/api` 206/206, `tests/e2e` 107/107. `npm run build` réussi, Biome sans avertissement sur les fichiers touchés.

## Suites

- US3 — Masquer et réafficher des éléments.
