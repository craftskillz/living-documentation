---
type: Worklog
title: US11a — Renommer et réécrire les liens (backend)
description: PUT /api/tree/rename renomme un fichier ou dossier visible ; renommage et déplacement réécrivent les liens entrants et les liens relatifs des documents déplacés, puis régénèrent les index.md OKF.
tags:
  - worklog
  - us
  - explorateur
status: To Be Validated
---

# US11a — Renommer et réécrire les liens (backend)

US11 découpée : US11a (backend, cette session), US11b (frontend : menu « Renommer », URL du document ouvert, i18n).

## Réalisé

- `src/lib/linkRewrite.ts` (nouveau) : réécriture des liens extraite de `prefixMigration.ts` et généralisée. `entryMapper(from, to, isFolder)`, `rewriteMovedLinks`, `planLinkRewrites` / `applyLinkRewrites`, `migrateSourcePaths`. Règle : un lien qui résout encore sa cible depuis le nouvel emplacement du fichier est conservé ; sinon remplacement des segments renommés sur place ; sinon recalcul du chemin (`./` conservé, encodage conservé). `?doc=` mappé via `id + ".md"`.
- `src/lib/prefixMigration.ts` : délègue à `linkRewrite` (comportement US8 inchangé, tests verts).
- `src/lib/treeMove.ts` : `changeEntryPath` (planification des liens, `renameSync`, `migrateDocIds`, `migrateSourcePaths`, écriture des liens) partagé par `relocateEntry` et `renameTreeEntry` ; `refreshOkfIndexes` régénère les `index.md` si la racine en a un (aussi après un réordonnancement). `relocateEntry` sert aussi `POST /api/documents/:id/move`, qui réécrit donc les liens.
- `src/lib/folderManifest.ts` : `renameInManifest` (remplacement sur place dans `order` et `hidden`).
- `src/routes/tree.ts` : `PUT /api/tree/rename` `{ path, newName }` → `{ path, id? }`. 400 nom invalide, élément masqué ou réservé ; 403 hors racine ; 404 absent ; 409 nom pris ou manifeste invalide. Renommage limité à la casse autorisé.
- ADR explorateur (puce « Renommage et liens ») et `PROJECT-STACK.md` mis à jour.

## Tests

- Unitaire `link-rewrite.test.ts` (7) : renommage de fichier et de dossier, déplacement (liens entrants et sortants recalculés), dossier déplacé (liens internes intacts), encodage, octet près.
- API `tree.spec.ts` (+4) : déplacement avec réécriture, renommage de fichier (position, stores, liens, blocs de code, `index.md`), renommage de dossier, refus sans toucher au disque.
- Suites complètes : unitaires 64/64, `tests/api` 219/219, `tests/e2e` 114/114, `okf:validate` conforme.

## Suite

US11b dans une nouvelle session : entrée « Renommer » dans `TreeNode.svelte` (absente sur masqués, réservés, `files`/`images` racine), saisie en place ou modale, URL du document ouvert mise à jour, rechargement de l'arbre, i18n EN/FR, E2E.
