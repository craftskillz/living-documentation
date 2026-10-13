---
type: Worklog
title: US6 — Drag and drop dans l'explorateur
description: Glisser-déposer HTML5 dans l'explorateur, branché sur POST /api/tree/move : ligne d'insertion, dépôt dans un dossier, ouverture d'un dossier fermé au survol, document ouvert conservé sous son nouvel id, toast traduit en cas d'erreur, drag désactivé pendant une recherche.
tags:
  - worklog
  - us
  - explorateur
  - drag-and-drop
status: To Be Validated
---

# US6 — Drag and drop dans l'explorateur

## Contexte

Sixième US livrée de la [ROADMAP-EXPLORATEUR](./ROADMAP-EXPLORATEUR.md), branchée sur l'API de l'US5.

## Réalisation

- `lib/home/treeDrop.ts` (logique pure) :
  - `dropPositionAt` : document → moitié haute `before`, basse `after` ; dossier → bords (`FOLDER_EDGE_RATIO = 0.25`) `before` / `after`, centre `inside` ;
  - `dropRequest` : traduit un dépôt en `{ source, targetFolder, index }` ; l'index est calculé sur la liste complète de `home.explorerTree` (éléments cachés compris), sans l'élément déplacé ; renvoie `null` si rien ne bouge ;
  - `movedDocId` : nouvel id du document ouvert quand lui-même ou un dossier ancêtre a bougé.
- `state.svelte.ts` : `dragSourcePath`, `dropTarget`, `setDropTarget` (ouverture d'un dossier fermé après `FOLDER_HOVER_OPEN_MS = 600`), `endDrag`.
- `TreeNode.svelte` : `draggable` seulement hors recherche, handlers `dragstart` / `dragover` / `drop` / `dragend`, attribut `data-drop` stylé dans `home.css` (ligne d'insertion en `box-shadow`, surbrillance du dossier).
- `Sidebar.svelte` : `moveEntry` appelle `POST /api/tree/move` (`api.moveTreeEntry`) ; succès → `onmoved` ; erreur → toast `sidebar.move_conflict` (409) ou `sidebar.move_failed`, puis arbre rechargé. Libellés EN/FR.
- `Home.svelte` : `onEntryMoved` recharge documents et arbre ; si le document ouvert est concerné, nouvel id, document re-rendu depuis son nouvel emplacement et URL remplacée (`history.replaceState`).
- La validation (dossier dans un descendant, collisions, etc.) reste côté serveur.

## Vérifications

- Unitaire : `tests/unit/tree-drop.test.ts` (4 tests).
- E2E : `tests/e2e/explorer.spec.ts` (réordonnancement, déplacement du document ouvert dans un dossier fermé ouvert au survol, refus d'un dossier dans son descendant avec toast).
- Suites complètes : unitaires 35/35, `tests/api` 215/215, `tests/e2e` 111/111. Build réussi, Biome sans avertissement sur les fichiers touchés.
- Note test : un drag manuel Playwright passe par `locator.hover()` + `mouse.down()` ; `mouse.move()` seul ne déclenche pas le drag HTML5.

## Suites

- US4 — Supprimer la nomenclature.
