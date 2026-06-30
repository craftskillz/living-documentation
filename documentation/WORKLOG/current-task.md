---
**date:** 2026-06-30
**status:** Completed
**description:** Les runs agents chat-only n'injectent plus la memoire de run ni l'instruction save_context dans le prompt systeme.
**tags:** worklog, workspace, chat-only, toolMode, run-agent-document, Run memory, save_context, CHAT_ONLY_TOOL_NOTICE, prompt
---

# Current task

## Statut courant

Completed

## Tache realisee

Correction du prompt envoye aux LLM providers en mode `Chat only`.

Avant correction, les runs agents persistants construisaient toujours le prompt via `agentSystemPromptWithMemory()`, puis `runAgent()` ajoutait la contrainte runtime chat-only. Le prompt contenait donc a la fois :

- `## Run memory` ;
- le contexte sauvegarde dans `context.md` ;
- l'instruction `When you finish, call save_context...` ;
- puis `Runtime constraint: MCP tool calling is disabled...`.

Cette combinaison etait incoherente : `save_context` est un tool MCP, donc il ne doit pas etre demande dans un run chat-only.

Le backend utilise maintenant `agentSystemPromptForRun(docsPath, agent, toolsEnabled)` :

- si les tools sont actifs, le comportement historique reste conserve et la memoire de run est injectee ;
- si le provider parent est en `toolMode: "chat"`, le prompt agent brut est transmis a `runAgent()`, puis seule la contrainte `CHAT_ONLY_TOOL_NOTICE` est ajoutee.

La contrainte runtime continue de mentionner que `save_context` est indisponible, ce qui est volontaire : elle explique au modele quels tools ne peuvent pas etre appeles.

## Contenu modifie

- `src/routes/workspace.ts`
- `tests/api/workspace.spec.ts`
- `documentation/ADRS/2026_06_29_20_25_[WORKSPACE]_workspace_llm_tool_mode_chat_only.md`
- `documentation/.metadata.json`
- `documentation/WORKLOG/current-task.md`

## Documentation

ADR mis a jour : `documentation/ADRS/2026_06_29_20_25_[WORKSPACE]_workspace_llm_tool_mode_chat_only.md`.

Metadonnees ADR rafraichies pour les fichiers source et tests portant la feature. Note : les metadonnees ont ete rafraichies sur un working tree dirty.

## Verifications realisees

- `npm run build` : OK.
- `npx playwright test tests/api/workspace.spec.ts` : OK, 3 passed.

## Prochaine action recommandee

Tester manuellement un agent persistant rattache a un provider `Chat only` : le prompt debug doit contenir le prompt agent et `Runtime constraint`, mais ne doit plus contenir `## Run memory`, le contenu de `context.md`, ni `When you finish, call save_context...`.
