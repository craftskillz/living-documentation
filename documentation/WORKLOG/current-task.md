---
**date:** 2026-06-29
**status:** Completed
**description:** Les endpoints Workspace qui contactent des services externes exposent maintenant les causes réseau et les erreurs HTTP upstream utiles.
**tags:** worklog, workspace, llm, list-models, test-llm, run-agent, mcp, fetch, error-cause, backend-logs
---

# Current task

## Statut courant

Completed

## Tache realisee

La gestion d'erreurs de `src/routes/workspace.ts` a ete verifiee endpoint par endpoint, puis uniformisee pour les chemins qui contactent des services externes.

Les changements principaux :

- `errorMessageWithCause()` extrait les details utiles de `error.cause` quand Node/Undici renvoie un `fetch failed` ;
- `upstreamHttpError()` ajoute l'URL appelee, le statut HTTP et un extrait court du body de reponse pour les erreurs fournisseur LLM/MCP ;
- `workspaceErrorMessage()` journalise en console backend les erreurs reseau/upstream avec un prefixe `[workspace]` ;
- `test-llm`, `list-models`, `run-agent`, `run-agent-stream`, `run-agent-document` et `run-agent-document-stream` propagent des messages plus exploitables ;
- `callMcp()` detaille les echecs de connexion MCP et les reponses HTTP non-OK ;
- les documents d'erreur agent incluent aussi les details issus de `error.cause`.

Les erreurs de validation attendues restent simples (`endpoint is required`, `model is required`, etc.) et ne sont pas traitees comme des erreurs backend bruyantes.

## Contenu modifie

- `src/routes/workspace.ts`
- `documentation/WORKLOG/current-task.md`
- `graphify-out/*`

## Verifications realisees

- `npm run build` : OK.
- `git diff --check` : OK.
- `graphify update .` : OK.

## Limites connues

- Les endpoints de lecture/sauvegarde locale du workspace gardent leur gestion simple : ils ne contactent pas de service externe et ne beneficient pas de `error.cause` reseau.
- Les extraits de body upstream sont volontairement tronques a 500 caracteres pour rester lisibles.

## Prochaine action recommandee

Relancer le serveur local et reproduire les erreurs LLM/MCP : le body JSON et la console backend doivent maintenant afficher une cause exploitable au lieu d'un simple `fetch failed`.
