---
**date:** 2026-06-24
**status:** Completed
**description:** Ajout de boutons de copie dans le panneau fichiers Blueprint pour copier les listes de dossiers et fichiers.
**tags:** worklog, blueprint, file-explorer, clipboard, copy-folders, copy-files, svelte, i18n, e2e
---

# Current task

## Statut courant

Completed

## Tache realisee

Le panneau latéral fichiers de la page Blueprint affiche désormais une icône de copie à droite des sections `Dossiers` et `Fichiers`. Chaque bouton copie les noms visibles de la section correspondante, un nom par ligne.

## Implementation

- Ajout de `copyNames(kind, names)` dans `FileExplorer.svelte`, qui écrit `names.join("\n")` dans `navigator.clipboard`.
- Ajout d'un état `copiedSection` pour basculer temporairement l'icône copie en coche après action.
- Ajout des boutons `copy-blueprint-folders` et `copy-blueprint-files` dans les en-têtes de section, uniquement quand la section existe.
- Ajout des styles compacts `.explorer-copy-btn` et de l'alignement `.explorer-section-label.with-action`.
- Ajout des tooltips i18n : `blueprint.explorer.copy_folders` et `blueprint.explorer.copy_files` en français et anglais.
- Le test E2E Blueprint ouvre le panneau de la boîte `alpha`, crée des sous-dossiers/fichiers dans la fixture, intercepte le clipboard et vérifie les contenus copiés.

## Fichiers concernés

- `src/frontend-svelte/src/lib/blueprint/FileExplorer.svelte`
- `src/frontend-svelte/src/lib/blueprint/styles.css`
- `src/frontend-svelte/public/i18n/en.json`
- `src/frontend-svelte/public/i18n/fr.json`
- `tests/e2e/blueprint-edit.spec.ts`
- `graphify-out/graph.json`
- `graphify-out/graph.html`
- `graphify-out/GRAPH_REPORT.md`

## Verifications

- `npm run build` : OK.
- `npx playwright test tests/e2e/blueprint-edit.spec.ts --project=chromium` : OK, 4 tests passés.
- `graphify update .` : OK.

## Points d'attention

- Des fichiers déjà modifiés ou générés avant cette tâche restent présents dans le working tree, notamment `graphify-out/`.

## Prochaine action recommandee

Tester manuellement depuis `/blueprint` sur un dossier contenant à la fois des sous-dossiers et des fichiers, puis coller le presse-papiers pour vérifier le format ligne par ligne.
