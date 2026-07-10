---
type: ADR
title: Workspace Llm Tool Mode Chat Only
description: Les providers LLM du Workspace persistent un toolMode herite par leurs agents pour autoriser les payloads tools MCP ou forcer un mode chat-only explicite sans injecter de memoire de run inutilisable.
tags:
  - workspace
  - llm-provider
  - toolMode
  - chat-only
  - mcp-tools
  - runAgent
  - CHAT_ONLY_TOOL_NOTICE
  - agentSystemPromptForRun
  - Workspace.svelte
  - workspace.ts
  - provider-compatibility
timestamp: 2026-06-29T20:25:00Z
status: To be validated
sources:
  - path: src/routes/workspace.ts
    hash: 870feaafa4aba602208a1e359464afe600c11f6501c07099658fa1c6e14cad49
    commit: 3ae2c739844bf84627189959aadb3383e6e8a8e8
    dirty: true
  - path: src/frontend-svelte/src/lib/workspace/app.ts
    hash: 9990874c2155f9117f6c3963fa3b1b12166c3b3524a7dc44e067020402093e58
    commit: 3ae2c739844bf84627189959aadb3383e6e8a8e8
    dirty: true
  - path: src/frontend-svelte/src/lib/workspace/persistence.ts
    hash: 6150f16149fd4a028c3ec861495acaba4316e018a567a087eec585e992df0c0b
    commit: 3ae2c739844bf84627189959aadb3383e6e8a8e8
    dirty: true
  - path: src/frontend-svelte/src/routes/Workspace.svelte
    hash: 1fdf8f14dc64962b695da3543d7621e1f4debc10fb5854be2dfdd4341dc792c3
    commit: 3ae2c739844bf84627189959aadb3383e6e8a8e8
    dirty: true
  - path: src/frontend-svelte/src/styles/app.css
    hash: 6d13c0c5baad0153257094fc61346cdcbeb5c4f8283ecf1b49e320ec1f50be98
    commit: 3ae2c739844bf84627189959aadb3383e6e8a8e8
    dirty: true
  - path: tests/api/workspace.spec.ts
    hash: 12b16f9612c3f0d15bcaea9f62e1e277ce1d33c97ce9de1264b54f663ff41858
    commit: 3ae2c739844bf84627189959aadb3383e6e8a8e8
    dirty: true
---

# Workspace LLM tool mode chat only

Complete [Workspace Configuration Graph Avec Agents Llm Et Tool Use Mcp](?doc=ADRS%252F2026_05_30_22_14_%255BFRONTEND%255D_workspace_configuration_graph_avec_agents_llm_et_tool_use_mcp) et [Workspace : runs agents en streaming, LLM tout fournisseur, secrets par variable d'environnement](?doc=ADRS%252F2026_06_25_22_58_%255BWORKSPACE%255D_workspace_runs_agents_en_streaming_llm_tout_fournisseur_et_secrets_par_variable_d_environnement), qui restent valides.

## Contexte

Certains fournisseurs OpenAI-compatibles acceptent `/v1/models` et `/v1/chat/completions` en mode chat simple, mais refusent les payloads contenant `tools` hors de leur propre studio agentique. Le Workspace envoyait automatiquement `tools` des qu'un endpoint MCP etait configure, ce qui bloquait ces providers avec des erreurs upstream de type `403 Forbidden` alors que l'authentification et le chat simple fonctionnaient.

Un provider chat-only ne peut pas executer un agent dont la mission depend de `read_document`, `update_document`, `save_context` ou d'autres tools MCP. Dans ce cas, le retour du modele doit rester coherent : il ne doit pas simuler un appel outil sous forme XML ou JSON quand aucun tool-call reel n'est possible.

Les runs agents persistants injectent normalement une section `Run memory` qui rappelle le `context.md` sauvegarde et demande au modele d'appeler `save_context` en fin de run. Cette consigne devient contradictoire en chat-only, car `save_context` fait partie des tools MCP explicitement desactives.

Les tokens API ne doivent jamais etre stockes en clair dans `.workspace`, mais le champ de saisie ne doit pas etre vide pendant qu'un utilisateur tape progressivement une reference d'environnement comme `env:LLM_API_KEY`.

## Decision

Ajouter un mode de tools au niveau du noeud LLM, persiste dans `.workspace` via `config.toolMode` :

- `tools` : valeur par defaut et comportement historique, les agents enfants peuvent charger les tools MCP et envoyer le champ OpenAI-compatible `tools` ;
- `chat` : mode chat-only, les agents enfants n'envoient jamais `tools`, meme si un endpoint MCP existe.

Le choix est porte par le provider LLM parce qu'il decrit une capacite du fournisseur/proxy, pas une preference de chaque agent. Les agents qui derivent du provider l'heritent automatiquement au moment du run.

En mode `chat`, `runAgent()` ajoute aussi une contrainte systeme runtime apres le prompt agent : les tool calls MCP sont desactives, le modele ne peut pas appeler `read_document`, `update_document`, `save_context` ou un autre tool, il ne doit pas emettre de pseudo tool calls, et il doit expliquer clairement qu'une tache dependante des tools ne peut pas etre terminee en chat-only.

Pour les runs persistants en mode `chat`, le prompt systeme n'injecte pas la section `Run memory` et ne demande pas d'appeler `save_context`. La contrainte runtime reste injectee, car elle explique pourquoi les tools sont indisponibles et ce que le modele doit faire si la tache exige un tool.

La persistance frontend du token distingue le brouillon local de la valeur persistable : une valeur invalide ou partielle est conservee dans l'input focalise, mais serialisee comme vide vers le backend. Une reference valide (`env:NAME` ou `${NAME}`) est trimmee et persistee normalement.

## Implementation

### Frontend Workspace

`Workspace.svelte` ajoute un groupe radio visible uniquement dans les champs LLM :

- `Allow MCP tools` ;
- `Chat only`.

`app.ts` hydrate les anciens workspaces avec `toolMode: "tools"`, persiste les changements via l'autosave existant et transmet `toolMode` lors des runs agents declenches depuis la page Workspace. En mode chat-only, le frontend n'envoie pas d'endpoint MCP pour le run interactif.

`app.ts` conserve aussi le brouillon du champ `nodeToken` pendant un autosave lorsque ce champ est focalise et que la valeur est encore une reference d'environnement invalide ou partielle. `tokenValueForPersistence()` empeche l'envoi d'un token invalide au backend, ce qui preserve la regle de securite sans vider le champ pendant la saisie.

### Backend Workspace

`workspace.ts` etend `WorkspaceEntityConfig` avec `toolMode: "tools" | "chat"` et sanitise toute valeur inconnue vers `tools` pour rester compatible avec les `.workspace` existants.

`runAgent()` recoit `toolsEnabled`. Quand `toolsEnabled` est faux :

- il ne charge pas `tools/list` depuis le MCP ;
- il n'ajoute jamais `tools` au payload `/v1/chat/completions` ;
- il ajoute `CHAT_ONLY_TOOL_NOTICE` au message systeme pour interdire les pseudo-appels outil et demander une explication explicite quand la tache exige des tools ;
- il emet un evenement `mcp_tools` indiquant que les tools sont desactives par configuration provider.

`agentSystemPromptForRun()` choisit le prompt systeme des runs persistants : il conserve `agentSystemPromptWithMemory()` uniquement quand les tools sont actifs, et renvoie le prompt agent brut quand le provider parent est en mode `chat`. Dans ce dernier cas, `runAgent()` ajoute ensuite seulement `CHAT_ONLY_TOOL_NOTICE`.

Les routes qui executent des agents persistants (`run-agent-document`, `run-agent-document-stream`) lisent le mode depuis le parent LLM stocke. Les routes de run direct (`run-agent`, `run-agent-stream`) acceptent aussi `toolMode`, avec override serveur par le provider stocke quand `providerId` est fourni.

## Consequences

### PROS

- Les providers OpenAI-compatibles qui refusent le tool-calling peuvent quand meme executer les agents en chat simple.
- Le comportement reste compatible par defaut : les workspaces existants continuent a autoriser les tools.
- Le mode est centralise sur le provider LLM, donc tous les agents enfants ont un comportement coherent.
- Les agents incompatibles chat-only repondent de facon explicite au lieu de produire des faux appels outil textuels.
- Les prompts chat-only ne contiennent plus d'instruction impossible demandant d'appeler `save_context`.
- La saisie du token API reste utilisable sans relacher la protection contre la persistance de secrets en clair.

### CONS

- En mode chat-only, l'agent ne peut pas appeler directement les tools MCP ; il peut seulement produire une reponse textuelle.
- Le contexte sauvegarde par `save_context` n'est pas reinjecte en chat-only, car cette memoire est liee au workflow MCP outille.
- Les prompts qui supposent un tool-use MCP effectif doivent etre adaptes au provider chat-only, ou migrer vers une orchestration backend dediee si le backend doit lire et ecrire les documents a la place du LLM.

## Verification

- `npm run build` : OK.
- `npx playwright test tests/api/workspace.spec.ts` : OK, 3 passed.
