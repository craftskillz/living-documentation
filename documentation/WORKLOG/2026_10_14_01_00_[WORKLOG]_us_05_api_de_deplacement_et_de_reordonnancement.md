---
type: Worklog
title: US5 — API de déplacement et de réordonnancement
description: POST /api/tree/move { source, targetFolder, index } réordonne un élément dans son dossier (manifeste seul) ou le déplace, fichier ou dossier, avec migration des ids dans .metadata.json, .annotations.json et les favoris ; service partagé avec POST /api/documents/:id/move.
tags:
  - worklog
  - us
  - explorateur
  - manifeste
status: To Be Validated
---

# US5 — API de déplacement et de réordonnancement

## Contexte

Cinquième US livrée de la [ROADMAP-EXPLORATEUR](./ROADMAP-EXPLORATEUR.md), prérequis du drag and drop (US6).

## Réalisation

- Service `src/lib/treeMove.ts` :
  - `moveTreeEntry` valide la requête ;
  - `relocateEntry` fait le déplacement disque et met à jour les manifestes ;
  - `migrateDocIds` migre les ids.
- `POST /api/tree/move` (`src/routes/tree.ts`) : `index` est la position finale de l'élément dans le dossier cible, comptée sur la liste complète de `GET /api/tree`, éléments cachés compris. Au-delà de la fin, l'élément est ajouté en dernier.
  - Même dossier : seul `order` est réécrit, avec la liste complète dans l'ordre affiché. Les entrées obsolètes de `order` et `hidden` sont purgées.
  - Autre dossier : `renameSync`, puis retrait de l'élément dans `order` et `hidden` du manifeste source, insertion à `index` dans le manifeste cible (créé s'il manque, H4).
  - Ids : un document change d'id seul ; pour un dossier, tous les ids de son sous-arbre changent. La migration porte sur `.metadata.json`, `.annotations.json` et les favoris de `.living-doc.json`, stockés sous forme encodée.
  - Erreurs :
    - 400 : `index` invalide, fichier réservé, dossier déposé dans lui-même ou dans un descendant, `files` / `images` racine en source ou en cible ;
    - 403 : source ou cible hors du dossier docs ;
    - 404 : source ou cible absente ;
    - 409 : collision de nom, ou manifeste au YAML invalide.
- `POST /api/documents/:id/move` délègue désormais à `relocateEntry`, sans `index` : l'élément est retiré du manifeste source et ajouté en fin d'un `order` cible non vide. `RESERVED_DOCS_SUBFOLDERS` devient `RESERVED_ROOT_FOLDERS`, exporté par le service.
- `folderTree.ts` expose `orderedEntryNames` (ordre d'affichage d'un dossier). `folderManifest.ts` ajoute `isManifestWritable`, `setManifestOrder` et `removeFromManifest`.
- H5 : les liens Markdown des autres documents ne sont pas réécrits.

## Vérifications

- Seams : `tests/api/tree.spec.ts` (4 nouveaux tests : réordonnancement, déplacement inter-dossiers, dossier avec migration des ids, 12 refus) et `tests/api/documents-move.spec.ts` (manifestes source et cible).
- Suites complètes sur le Mac : unitaires 31/31, `tests/api` 215/215, `tests/e2e` 108/108. Build réussi, Biome sans avertissement sur les fichiers touchés.

## Suites

- US6 — Drag and drop dans l'explorateur.
