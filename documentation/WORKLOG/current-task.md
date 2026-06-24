---
**date:** 2026-06-24
**status:** Completed
**description:** Ajout du tool MCP `list_blueprint_box` pour lister les dossiers et fichiers immédiats d'une boîte Blueprint.
**tags:** worklog, blueprint, mcp, list_blueprint_box, sourceRoot, file-explorer, path-traversal, playwright
---

# Current task

## Statut courant

Completed

## Tache realisee

Le MCP expose désormais un tool `list_blueprint_box` qui accepte un chemin de boîte Blueprint relatif à `sourceRoot`, par exemple `tests/api`, et retourne les dossiers et fichiers immédiats avec leurs noms et chemins relatifs.

## Implementation

- Création de `src/lib/blueprint.ts` pour partager les règles Blueprint entre REST et MCP : normalisation de chemin, garde path traversal, dossiers ignorés et listing dossiers/fichiers.
- Refactor léger de `src/routes/blueprint.ts` pour réutiliser cette lib partagée, tout en conservant le format REST existant `{ folders: string[], files: string[] }`.
- Ajout de `src/mcp/tools/blueprint.ts` avec `toolListBlueprintBox`.
- Ajout du tool `list_blueprint_box` dans `TOOLS`, dans le guide MCP et dans le dispatcher `tools/call`.
- Sortie du tool : `{ sourceRoot, path, folders: [{ name, path }], files: [{ name, path }] }`.
- Ajout de tests MCP pour `tools/list`, le listing de `tests/api`, le filtrage des dossiers ignorés/dotfiles, et le rejet d'un path traversal.

## Fichiers concernés

- `src/lib/blueprint.ts`
- `src/routes/blueprint.ts`
- `src/mcp/tools/blueprint.ts`
- `src/mcp/server.ts`
- `tests/api/mcp.spec.ts`
- `graphify-out/graph.json`
- `graphify-out/graph.html`
- `graphify-out/GRAPH_REPORT.md`

## Verifications

- `npm run build` : OK.
- `npx playwright test tests/api/mcp.spec.ts --project=chromium` : OK, 38 tests passés.
- `npx playwright test tests/e2e/blueprint-edit.spec.ts --project=chromium` : OK, 4 tests passés.
- `graphify update .` : OK.

## Points d'attention

- Aucun ADR durable n'a été créé pour l'instant car le working tree est déjà dirty. Les règles projet demandent de créer/mettre à jour l'ADR après commit ou validation explicite de l'utilisateur dans cet état.
- Des fichiers déjà modifiés ou générés avant cette tâche restent présents dans le working tree, notamment `graphify-out/`.

## Prochaine action recommandee

Après stabilisation/commit du working tree, créer un ADR pour documenter le contrat MCP `list_blueprint_box` et l'attacher à `src/lib/blueprint.ts`, `src/mcp/tools/blueprint.ts`, `src/mcp/server.ts` et `src/routes/blueprint.ts`.
