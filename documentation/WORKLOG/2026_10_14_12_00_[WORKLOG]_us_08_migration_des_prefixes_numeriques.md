---
type: Worklog
title: US8 — Migration des préfixes numériques
description: Les dossiers 001_X / 1_x sont renommés sans préfixe, leur ordre passe dans le liv-doc-main.md du parent, liens et stores suivent ; commande migrate, garde au démarrage et init partagent un même cœur.
tags:
  - worklog
  - us
  - explorateur
  - migration
status: To Be Validated
---

# US8 — Migration des préfixes numériques

## Réalisé

- `src/lib/prefixMigration.ts` (nouveau), déterministe et idempotent :
  - seuls les **dossiers** `^\d+_` sont renommés ; les documents (y compris préfixés d'une date) ne le sont jamais ;
  - ordre d'origine = ordre d'affichage actuel des noms préfixés (`localeCompare`, insensible à la casse, **non numérique** : `10_y` avant `2_z`) ;
  - fusion avec un manifeste existant : noms renommés remplacés en place dans `order` et `hidden`, puis dossiers renommés non listés ajoutés à la fin de `order` ;
  - collision (`1_tutorial` + `tutorial`, insensible à la casse) : pas de renommage, signalée dans le rapport ;
  - liens réécrits segment par segment (inline, images, définitions de référence, `?doc=` doublement encodé), hors blocs de code clôturés et liens à schéma ; encodage, `./`, fragments conservés ;
  - `files` et `images` ajoutés au `hidden` racine s'ils existent (H3) ; mode `dryRun`.
- `migrateDocIds` (`treeMove.ts`) remappe aussi `evidence[].documentId` de `.diagrams.json` : profite à la migration **et** au drag and drop (US5), qui cassait ces liens jusqu'ici.
- `src/lib/migrate.ts` : `migrateProject` = préfixes puis OKF (index/log voient les chemins finaux), flag `explorerMigration` dans `.living-doc.json` (posé même en cas de collision). `config.ts` : `isExplorerMigrated`.
- `bin/cli.ts` : `migrate [--dry-run]` exécute les deux migrations avec rapport détaillé ; garde au démarrage unique (OKF + préfixes), refus si non accepté (décision utilisateur) ; `init` passe par `migrateProject`.
- Blueprint : `BLUEPRINT_FOLDER` = `BLUEPRINT` (serveur, `AdrModal.svelte`, `BlueprintCanvas.svelte`), décision utilisateur. Fixtures renommées `BLUEPRINT` et `projets`.
- Tests : `tests/unit/prefix-migration.test.ts` (12), test CLI `migrate` (dry-run, renommage, liens, flag, rejeu) ; helper CLI « projet existant » tamponné `explorerMigration`.

## Vérifications

- `npm run build` OK, biome sans erreur sur les fichiers modifiés.
- Unitaires 55/55, `tests/api` 213/213, `tests/e2e` 113/113.
- Dry-run sur `documentation/` du dépôt : 9 dossiers à renommer, 0 collision, 16 fichiers de liens, `files`/`images` cachés. **Non appliqué** : le dépôt n'est pas migré.

## Suite

- Migrer `documentation/` du dépôt (`node dist/bin/cli.js migrate documentation`) : sinon la garde bloque le serveur sur ce dossier.
- US9 : starters (`000_DOCUMENTATION`), guides mentionnant `001_BLUEPRINT`, ADR de l'explorateur.

MCP Living Documentation non exposé dans la session : documentation écrite à la main, pas de métadonnées attachées.
