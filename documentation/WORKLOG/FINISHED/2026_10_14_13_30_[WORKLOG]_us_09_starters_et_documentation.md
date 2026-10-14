---
type: Worklog
title: US9 — Starters et documentation
description: Starters, manuel et fixtures sans préfixes ni clés de nomenclature, README et page Home des starters réécrits pour le manifeste, nouvel ADR explorateur qui remplace quatre ADR.
tags:
  - worklog
  - us
  - explorateur
  - documentation
status: To Be Validated
---

# US9 — Starters et documentation

## Réalisé

- Correctif US8 (commit séparé) : la migration remappe aussi les chemins de sources (relatifs à `sourceRoot`) qui visent des documents ; le binding `BLUEPRINT/…documentation` → `concept/…living_documentation.md` du dépôt a été réparé à la main (migration déjà appliquée par l'utilisateur).
- `starter-doc/`, `starter-doc-fr/` : migrés par le CLI (`000_DOCUMENTATION` → `DOCUMENTATION`, manifeste racine avec `order` et `images` caché, favori réécrit, flag `explorerMigration`). La config, réécrite par `writeConfig`, perd `filenamePattern` / `exclusiveCategoryExpansion` et gagne les défauts explicites (`siteTheme`, `gitIntegration`…). `index.md` / `log.md` régénérés.
- `usermanual-documentation/` : migration des préfixes seule (5 dossiers, 11 fichiers de liens) ; son frontmatter n'est pas OKF et n'a pas été converti (manuel hérité, non utilisé par le code).
- Fixtures : les trois clés retirées supprimées partout sauf `legacy-abs-paths` (legacy volontaire) ; le test de purge (`config-validation.spec.ts`) utilise désormais ce fixture.
- Page Home des starters EN/FR : section « Dossiers et ordre » (glisser-déposer, `liv-doc-main.md`, Masquer / Afficher les éléments cachés), création de document sans catégorie, exemple de dossier sans préfixe ; ligne de bienvenue mise à jour.
- README EN/FR : section structure réécrite (manifeste, masquage, glisser-déposer, `migrate`), `filenamePattern` et `[Category]` retirés de l'exemple de configuration.
- ADR [Explorateur ordonné par manifeste liv-doc-main.md](?doc=ADRS%252F2026_10_14_13_00_%255BNAVIGATION%255D_explorateur_ordonne_par_manifeste_liv_doc_main) ; `anchor_scroll_and_folder_sort_convention`, `general_category_and_sidebar_defaults`, `exclusive_folder_and_category_expansion_options` passent en `Partially SuperSeeded`, `datetime_precision_in_filename_pattern` en `SuperSeeded`.
- `PROJECT-STACK.md` : modules de l'explorateur et concept « Explorateur ordonné ».

## Vérifications

- `npm run build` OK, `npx biome lint src tests` sans erreur, `npm run okf:validate` : 296 documents, 0 erreur, 81 avertissements.
- Unitaires 56/56, `tests/api` 213/213, `tests/e2e` 113/113.

## Reste hors périmètre

- Captures des starters (`readme-sidebar.png`) montrant encore la sidebar par catégories.
- Guides de `documentation/` et du manuel décrivant l'ancienne convention (catégories, pattern, préfixes) en prose ou en exemples de code.

MCP Living Documentation non exposé dans la session : documentation écrite à la main, pas de métadonnées attachées.
