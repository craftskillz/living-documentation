---
**date:** 2026-06-26
**status:** Completed
**description:** Correction des specs Playwright cassees par le nouveau contrat pagine MCP list_documents et par le rendu conditionnel du bouton Blueprint Group.
**tags:** worklog, tests, playwright, mcp, list_documents, blueprint, clusters, graphify
---

# Current task

## Statut courant

Completed

## Tache realisee

Plusieurs tests Playwright echouaient depuis le dernier commit.

Deux causes ont ete corrigees :

- `list_documents` MCP retourne maintenant une enveloppe paginee `{ total, page, pageSize, totalPages, hasNextPage, nextPage, folder, documents }`, alors que `tests/api/mcp.spec.ts` attendait encore un tableau brut.
- `tests/e2e/blueprint-clusters.spec.ts` capturait les boutons de la rail avant l'activation du mode drag ; le bouton de groupement est rendu conditionnellement apres ce clic, donc l'ancien `rail[2]` pointait vers le mauvais bouton.

## Contenu modifie

- Ajout d'un helper type `listDocuments()` dans `tests/api/mcp.spec.ts`.
- Mise a jour des assertions MCP pour lire `result.documents` et verifier aussi les champs de pagination par defaut.
- Mise a jour du test Blueprint pour re-query les boutons apres l'activation du mode drag, puis cliquer le bouton `Group` reel.

## Fichiers concernes

- `tests/api/mcp.spec.ts`
- `tests/e2e/blueprint-clusters.spec.ts`
- `documentation/WORKLOG/current-task.md`
- `graphify-out/*` mis a jour via `graphify update .`

## Verifications realisees

- `npm run build` : OK.
- `npx playwright test tests/api/mcp.spec.ts --project=chromium` : OK, 38 tests passes.
- `npx playwright test tests/e2e/blueprint-clusters.spec.ts --project=chromium` : OK, 1 test passe.
- `npm run test:e2e` dans le sandbox : echec attendu avec `listen EPERM: operation not permitted 0.0.0.0` sur les fixtures qui demarrent des serveurs.
- `npm run test:e2e` hors sandbox avec permission escaladee : OK, 233 tests passes.
- `graphify update .` : OK.

## Limite connue

Le build affiche toujours un warning Svelte preexistant sur `src/frontend-svelte/src/lib/blueprint/BlueprintCanvas.svelte:99` (`currentCanvasPath` non declare avec `$state(...)`). Ce warning n'a pas ete traite dans cette correction.

## Point documentaire

Pas d'ADR cree : la correction aligne les tests sur un contrat MCP deja modifie et documente dans le code du dernier commit, sans nouvelle decision durable.

Le MCP Living Documentation a ete utilise pour relire et mettre a jour ce worklog. Aucune metadata documentaire n'a ete rafraichie, car ce worklog operationnel n'est pas un ADR lie a des fichiers source.

## Prochaine action recommandee

Committer la correction des specs et les sorties `graphify-out` si elles doivent rester versionnees.
