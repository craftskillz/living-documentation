---
type: Worklog
title: US1 — Lire le manifeste et servir un arbre ordonné
description: Ajout du manifeste de dossier liv-doc-main.md (ordre via frontmatter YAML), de la route GET /api/tree qui sert l'arbre déjà trié, et alignement de l'ordre des index.md OKF.
tags:
  - worklog
  - us
  - explorateur
  - liv-doc-main
status: To Be Validated
---

# US1 — Lire le manifeste et servir un arbre ordonné

## Contexte

Première US de la [ROADMAP-EXPLORATEUR](ROADMAP-EXPLORATEUR.md) : l'ordre d'affichage d'un dossier est décrit par son `liv-doc-main.md` au lieu des préfixes numériques.

## Réalisation

- `src/lib/folderManifest.ts` : `FOLDER_MANIFEST_FILE`, `readFolderManifest(absDir)` (lit `order` / `hidden`, ignore les valeurs non textuelles, YAML invalide → manifeste vide + `console.warn`), `applyManifestOrder(entries, order)`.
- `src/lib/folderTree.ts` : `buildFolderTree(docsPath)` → nœuds `{ kind, name, path, children? }` ; dossiers puis fichiers `.md`, alphabétique insensible à la casse, puis ordre du manifeste.
- `src/routes/tree.ts` + montage `GET /api/tree` dans `src/server.ts`.
- `src/lib/okf.ts` : `liv-doc-main.md` ajouté aux fichiers réservés → absent de `/api/documents`, du MCP, des index OKF, du validateur et de la migration.
- `src/lib/okf/index-generator.ts` : concepts et sous-dossiers listés dans l'ordre de l'explorateur.

## Choix retenus

- Les exclusions de l'arbre restent celles de l'existant (noms en `.`, `files/` et `images/` à la racine) : leur évolution relève de l'US2.
- Les nœuds `doc` ne portent pas encore `id` ni `title` : ajoutés quand le front consommera l'arbre (US2) et quand la nomenclature disparaîtra (US4).
- Le tri alphabétique devient insensible à la casse (`sensitivity: "base"`), y compris dans `index.md`.

## Vérifications

- TDD au seam `GET /api/tree` (seul seam retenu par l'utilisateur) : `tests/api/tree.spec.ts`, 4 tests verts ; mutation manuelle (réservation et garde YAML retirées) → 3 tests rouges.
- Suite `tests/api` : 197/198, l'échec restant (`summary-markdown.spec.ts`) est dû à l'absence de Chromium dans le shell de la session, pas au code.
- `npm run test:unit` : 30/30.
- Ordre des `index.md` vérifié manuellement sur un dossier temporaire.
- Lint Biome non exécuté : binaire natif Linux absent des `node_modules` (installés sous macOS). À lancer sur le Mac : `npm run lint:ci`.

## Suites

- US2 : consommer `GET /api/tree` dans l'explorateur et rendre visibles les dossiers en point.
- MCP Living Documentation injoignable depuis la session : pas de métadonnées attachées.
