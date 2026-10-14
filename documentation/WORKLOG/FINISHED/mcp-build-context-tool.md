---
type: Worklog
title: Mcp build context tool
description: Ajout de l'outil MCP `build_context(task, options?)` qui agrège git status/diff, contenu source et docs/ADR liés en un seul appel.
tags:
  - worklog
  - mcp
  - build_context
  - git
  - metadata
timestamp: 2026-07-01T00:00:00Z
status: Done
---

# Current task

Ce fichier suit une tâche distincte de celle en cours dans `current-task.md` (production de la
documentation utilisateur). Dédié plutôt que fusionné pour ne pas écraser ce suivi actif, conformément
à la règle `track-current-work`.

## Statut courant

Terminé.

## Tache realisee

Ajout de l'outil MCP `build_context` sur le serveur living-documentation, à partir de la spec
"Workspace Context MCP" fournie par l'utilisateur. Portée v1 : git (branche, HEAD, dirty, diff par
fichier), contenu source des fichiers modifiés, et documents/ADR déjà liés via `.metadata.json` aux
fichiers modifiés (avec leur accuracy). Règle déterministe unique : si tous les fichiers modifiés sont
des `.md` sous `docsFolder`, la section `source` est sautée (`skipped: "docs-only change"`).
Dependency graph et découverte de tests explicitement non couverts (documenté dans la description de
l'outil, pas simulé).

Un bug a été détecté et corrigé pendant l'implémentation : `git status`/`git diff` renvoient toujours
des chemins relatifs à la racine du dépôt, jamais au `cwd`, même en sous-répertoire — vérifié
empiriquement. `gitStatusPorcelain`/`gitDiff` tournent donc depuis `gitRoot` et les chemins sont
reconvertis relatifs à `sourceRoot` pour la sortie.

## Contenu modifie

- `src/lib/git.ts` — ajout de `gitStatusPorcelain` et `gitDiff` (exportées, dégradent en `null` plutôt
  que de lever, comme `currentSourceCommit`).
- `src/mcp/tools/context.ts` — nouveau, `toolBuildContext`.
- `src/mcp/server.ts` — import, entrée `TOOLS`, cas du switch `build_context`, et section
  "One-shot workspace context" ajoutée au `SERVER_GUIDE`.
- `tests/api/mcp-build-context.spec.ts` — nouveau (nommé ainsi pour ne pas entrer en collision avec
  `tests/api/context.spec.ts`, qui teste les routes REST `/api/context/*`, sans rapport).
- `tests/api/mcp.spec.ts` — `build_context` et `retrodocument_adrs_from_git` ajoutés au test
  `tools/list exposes the expected tool set`.
- ADR créée et liée : `ADRS/2026_07_01_15_11_[MCP]_build_context_mcp_tool_aggregates_git_source_and_documentation.md`
  (liée à `src/mcp/tools/context.ts`, `src/lib/git.ts`, `src/mcp/server.ts` via `add_metadata`).

## Verifications realisees

- `npx tsc --noEmit` : aucune erreur.
- `npm run build` : succès.
- `npx playwright test tests/api/mcp-build-context.spec.ts` : 7/7.
- `npx playwright test tests/api/mcp.spec.ts tests/api/metadata.spec.ts tests/api/git.spec.ts tests/api/documents.spec.ts` : 73/73, aucune régression.
- ADR créée via le MCP living-documentation, liée aux 3 fichiers source touchés (accuracy 1).

## Verifications restantes

Aucune connue.

## Prochaine action recommandee

Aucune — tâche terminée. Extensions futures possibles (hors scope v1, notées dans l'ADR) : graphe de
dépendances, découverte de tests, sources CI/issue-tracker.
