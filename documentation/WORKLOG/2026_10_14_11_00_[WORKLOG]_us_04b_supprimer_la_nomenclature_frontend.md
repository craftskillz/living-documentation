---
type: Worklog
title: US4b — Supprimer la nomenclature (frontend)
description: L'UI ne parle plus de catégorie, de pattern de nom de fichier ni de tri de la sidebar — formulaire de création avec aperçu du slug, Admin allégé, code mort de l'ancien arbre par catégories supprimé.
tags:
  - worklog
  - us
  - explorateur
  - nomenclature
  - frontend
status: To Be Validated
---

# US4b — Supprimer la nomenclature (frontend)

## Réalisé

- `src/lib/docSlug.ts` (nouveau) : `docSlug` extrait de `parser.ts` en module pur, réexporté par `parser.ts` et importé par `NewDocModal.svelte` ; l'aperçu du nom est donc exactement celui du serveur (hors suffixe `-2` de collision).
- `NewDocModal.svelte` : champ catégorie et datalist supprimés, plus de `category` envoyé à `POST /api/documents`, aperçu `dossier/<slug>.md` (`data-testid="new-doc-filename-preview"`).
- `Admin.svelte` : section « Convention de nommage » (pattern + aperçu), sélecteur de tri de la sidebar et case « expansion exclusive des catégories » supprimés ; ces clés ne sont plus envoyées par `PUT /api/config`.
- `Home.svelte` : lecture de `filenamePattern` / `sidebarSort` / `exclusiveCategoryExpansion` et rappel du pattern sur l'écran d'accueil supprimés.
- `home/tree.ts` : `buildFolderTree`, `compareDocs`, `SidebarSort`, compteurs et helpers par catégorie supprimés ; restent `folderLabel` et les helpers `ExplorerNode`. Type `TreeNode` retiré de `types.ts`.
- `home/state.svelte.ts` : `expandedCategories`, `hideCategories`, `exclusiveCategoryExpansion`, `sidebarSort`, `toggleCategory`, `toggleHideCategories` supprimés.
- `ExportModal.svelte` : l'export PDF ne regroupe plus les documents sous une pseudo-catégorie « General » dans la table des matières.
- CSS `.category-docs` et `.pattern-*` supprimés ; i18n EN/FR : 24 clés obsolètes retirées, description de la section sidebar corrigée.
- Test : `tests/e2e/naming.spec.ts` (création sans catégorie avec aperçu `mon-guide-ete.md`, Admin sans les trois réglages ni les clés dans le payload).

## Vérifications

- `npm run build` OK, `npx biome lint src tests` sans erreur, `svelte-check` 0 erreur.
- Unitaires 43/43, `tests/api` 212/212, `tests/e2e` 113/113 (dont les 2 nouveaux).

## Suite

US8 (migration des préfixes numériques) puis US9 (starters et documentation : clés retirées encore présentes dans les starters et les fixtures `.living-doc.json`, guides Admin).

MCP Living Documentation non exposé dans la session : documentation écrite à la main, pas de métadonnées attachées.
