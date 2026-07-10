---
type: ADR
title: Workspace Runs Agents En Streaming Llm Tout Fournisseur Et Secrets Par Variable D Environnement
description: "Rend les noeuds LLM du Workspace utilisables avec n'importe quel fournisseur OpenAI-compatible (liste d'hotes sans /v1 configurable, secrets references via env: au lieu de tokens en clair) et transforme l'execution d'agents en stream NDJSON live avec timeline tool-calls et pile de toasts persistante entre routes/reload."
tags:
  - workspace
  - llm
  - openai-compatible
  - deepseek
  - openrouter
  - run-agent-stream
  - ndjson
  - persistent-toast
  - env-secrets
  - spa-navigation
timestamp: 2026-06-25T22:58:00Z
status: To be validated
sources:
  - path: src/routes/workspace.ts
    hash: df208e1bad0c5d0e641a91d6cb45bacdc274f5b471d303d1d7792c139b148df7
    commit: 2bb01b88d66591d4eb79bbe0cbc16ec807367f4c
    dirty: false
  - path: src/lib/config.ts
    hash: e76e4310ecb7008bda801ffb6b39d49fa1c83015567a25656a221b9cb21e858a
    commit: 2bb01b88d66591d4eb79bbe0cbc16ec807367f4c
    dirty: false
  - path: src/routes/config.ts
    hash: 20f565abb5e14570e0aff9ffcc2a42b1cf1abe7725b61c6469c60b084ab05b45
    commit: 2bb01b88d66591d4eb79bbe0cbc16ec807367f4c
    dirty: false
  - path: src/frontend-svelte/src/lib/persistentToast.ts
    hash: 5f43913a980ef8f6ad33f64ac84431b6315c3f9361bf0919c2bd9e85baceb962
    commit: 57432cefdc7c3e7d4b0de51152892e3be9f9256b
    dirty: true
  - path: src/frontend-svelte/src/lib/workspace/persistence.ts
    hash: de0d4f1348ddbca177afd1d81ce0a0dc727750515520e221424da75f40e06924
    commit: 2bb01b88d66591d4eb79bbe0cbc16ec807367f4c
    dirty: false
  - path: src/frontend-svelte/src/lib/workspace/app.ts
    hash: 61047e59b98c901680c42e411c87014e9813e809d29e8ed111a6506ad6fbb669
    commit: 2bb01b88d66591d4eb79bbe0cbc16ec807367f4c
    dirty: false
  - path: src/frontend-svelte/src/routes/Workspace.svelte
    hash: a1c0c9ce308c7da22a57d8ec4255dfd2992b9b58b0f6aad67bfb01aca22df32e
    commit: 2bb01b88d66591d4eb79bbe0cbc16ec807367f4c
    dirty: false
  - path: src/frontend-svelte/src/routes/Admin.svelte
    hash: e12fa295872e65b9c2304b3fed8e153f58905400a87ffcdd4e82feadf68c036c
    commit: 2bb01b88d66591d4eb79bbe0cbc16ec807367f4c
    dirty: false
  - path: src/frontend-svelte/src/lib/Topbar.svelte
    hash: 076046a753bcd6023f32a56f0963fbbdc633a28a788776a0ec911f35016a7649
    commit: 2bb01b88d66591d4eb79bbe0cbc16ec807367f4c
    dirty: false
  - path: src/frontend-svelte/src/App.svelte
    hash: 46f9aa2f924c883283c601bb66915174f5cf35cd0d46aba882260ce992865a2d
    commit: 2bb01b88d66591d4eb79bbe0cbc16ec807367f4c
    dirty: false
  - path: src/frontend-svelte/src/styles/app.css
    hash: f0fada89775681970a749e81a961858e91eb938d8d75ca3651d3455d699e4da4
    commit: 019de294d1412d5511b045bc53d1fc5b0bc7010d
    dirty: true
  - path: src/frontend-svelte/src/lib/diagram/diagram.css
    hash: 32e66aa5f13b8d738c2829f9cad88e0c9810f736d98ef805640979def19085c1
    commit: aa27219572677ddf90c8370776a31d89481e513b
    dirty: true
  - path: src/frontend-svelte/src/lib/workspace/styles.css
    hash: a3511c12228c09e9f4e497b36f4d4f0a54007b91cd397278722d2d25caf57fec
    commit: b8eca35497a74e4c2b6ec57cd721513544ae3ad9
    dirty: true
---

# ADR — Workspace : runs agents en streaming, LLM tout fournisseur, secrets par variable d'environnement

Complete l'ADR [Workspace Configuration Graph Avec Agents Llm Et Tool Use Mcp](?doc=ADRS%252F2026_05_30_22_14_%255BFRONTEND%255D_workspace_configuration_graph_avec_agents_llm_et_tool_use_mcp) (graphe de configuration), qui reste valide. Cet ADR couvre l'execution runtime des agents, la flexibilite des fournisseurs LLM et la gestion des secrets.

## Contexte

Le module Workspace permettait de creer des noeuds LLM et d'y attacher des agents. Jusqu'ici les LLM pointaient surtout vers une instance Ollama locale (modeles charges dynamiquement via `/v1/models`, pas de token). L'ouverture vers des fournisseurs en ligne (DeepSeek, OpenRouter, etc.) et l'execution d'agents ont fait apparaitre quatre besoins :

1. Certains fournisseurs exposent la liste des modeles sur `{base}/models` et non `{base}/v1/models` (cas DeepSeek), ce qui faisait echouer le selecteur de modeles avec un « No models found » muet.
2. Les tokens d'API etaient stockes en clair dans le fichier `.workspace`, lui-meme suivi par git — fuite de secret.
3. L'execution d'un agent n'affichait qu'un « Running agent... » statique jusqu'a la reponse finale, sans visibilite sur les tool calls MCP.
4. Les notifications de run disparaissaient en changeant de page ou au rechargement.

## Decisions

### 1. LLM tout fournisseur OpenAI-compatible
Un noeud LLM accepte n'importe quel endpoint OpenAI-compatible avec token bearer optionnel. `/list-models` et `/test-llm` construisent l'URL de listing en suffixant `/v1/models` par defaut, `/models` si l'endpoint finit deja par `/v1` ou `/models`.

### 2. Liste d'hotes « sans /v1 » configurable (Admin)
Nouveau champ de configuration `llmModelsNoV1Hosts: string[]` (`StoredConfig`), seede a `["https://api.deepseek.com"]`. Edite dans Admin (ajout/suppression d'URLs, chips), normalise et valide cote serveur par **origine** (protocole + hote), http/https uniquement, dedoublonne. Au listing, si l'origine de l'endpoint figure dans la liste, l'URL devient `{base}/models`. Le chat (`/v1/chat/completions`) n'est pas affecte. `/list-models` renvoie desormais un message d'erreur explicite (`URL -> status`) au lieu d'un echec muet.

### 3. Secrets par reference de variable d'environnement (env-only)
Le champ « API token » ne contient plus qu'une **reference** `env:NOM_DE_VAR` (ou `${NOM_DE_VAR}`), jamais un secret litteral :
- **Champ visible** (type text) car ce n'est plus un secret.
- **Validation client** : `Load models` et `Test connection` refusent toute valeur non-`env:` avant tout appel reseau.
- **Sanitisation a la persistance** : `sanitizeConfig` ne stocke le token que s'il matche `env:NAME`/`${NAME}`, sinon `''` — un litteral colle n'atteint jamais `.workspace`.
- **Resolution serveur** : `resolveSecret` lit `process.env[NAME]` au moment de l'appel ; un litteral n'est plus accepte comme bearer. Applique aux trois points qui posent l'header `Authorization` (`/list-models`, `/test-llm`, `runAgent`).

Mecanisme compatible avec un lancement `npx` : les variables d'environnement sont heritees du shell (`export VAR=...` ou `VAR=... npx ...`). Aucun chargement de fichier `.env` n'a ete ajoute (choix assume — pas de dependance `dotenv`).

### 4. Execution d'agent en streaming (timeline live)
- Backend : nouvelle route `POST /api/workspace/run-agent-stream` qui emet des evenements en **NDJSON** (`application/x-ndjson`) au fil de l'execution. La route JSON existante `POST /run-agent` reste intacte (non-breaking).
- `runAgent(config, report?)` recoit un callback `AgentRunReporter`. Types d'evenements `AgentRunEventType` : `status`, `mcp_tools`, `model_call`, `tool_call`, `tool_result`, `fallback`, `final`, `error`.
- Frontend : `runAgentPromptStream()` lit le `ReadableStream` (`getReader()`), parse les lignes NDJSON et alimente une timeline scrollable des interactions, reponse finale dans un bloc separe.

### 5. Toasts persistants globaux + navigation SPA
- Module `persistentToast.ts` : pile de toasts persistee dans `localStorage` (`living-documentation:persistent-toast`), DOM global rattache a `document.body` (`#workspaceToastStack`). Etats `success|error|loading`, bouton fermer par toast, expiration des `loading` apres 15 min, relecture de l'ancien format mono-toast (retro-compat).
- Restaure au bootstrap (`main.ts`) avant le montage des routes, re-rendu a chaque changement de route. Toast de fin de run conserve 10 min avec lien cliquable vers le Markdown genere dans `AI/WORKSPACE`.
- `Agents.svelte` rebranche sur le toast global (ancien toast local supprime, evite les doublons).
- `Topbar.svelte` + `App.svelte` interceptent les clics sur liens internes (capture sur `document`) et utilisent `history.pushState` — le stream et les toasts survivent a la navigation.
- Les toasts globaux utilisent une enveloppe plus large (`540px`, pile `600px`) et une hauteur maximale scrollable (`240px`) au lieu d'un clamp a deux lignes. Les toasts locaux de l'editeur de diagrammes (`.ld-toast`) reprennent les memes dimensions afin que les messages longs, dont les erreurs Git ou export, restent lisibles sans agrandir indefiniment l'interface.

### 6. Erreurs robustes
Les exceptions de `runAgent` sont ecrites dans le Markdown d'execution (phase/nom/message/stack). Nouvelle route `POST /api/workspace/run-agent-document-failure` pour generer un Markdown d'echec meme sur exception client. Lecture robuste des reponses non-JSON cote `/agents`.

## Consequences

- Un noeud LLM passe de `not_ready` a `ready` des que provider (kind `llm` + `model`) et `systemPrompt` sont definis (cf. `agentStatus` dans `Agents.svelte`).
- Tout token litteral deja persiste lors de tests precedents devient inerte (vide au prochain save, non envoye) ; il faut le remplacer par `env:VAR` et definir la variable cote serveur.
- Un refresh navigateur peut couper la requete de streaming en cours : les runs ne sont pas encore des jobs serveur persistants/reprenables (limite connue).

## Verifications

- `npm run build` (tsc + vite) : OK.
- Listing modeles teste OK via OpenRouter (`https://openrouter.ai/api/v1`) ; routing DeepSeek `/models` confirme cote reseau (401 = token, pas routing).
- Resolution `resolveSecret` / `sanitizeTokenRef` verifiee : `env:VAR` -> secret, litteral -> bloque/non persiste.
- Ajustement global des toasts : `npm run build` OK ; `npx playwright test tests/api/diagrams.spec.ts tests/e2e/admin.spec.ts` OK.
