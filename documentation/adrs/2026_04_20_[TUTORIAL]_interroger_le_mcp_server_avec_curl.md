---
`🗄️ ADR : 2026_04_20_[TUTORIAL]_interroger_le_mcp_server_avec_curl.md`
**date:** 2026-04-20
**status:** Validated
**description:** Guide opérationnel pour inspecter le serveur MCP de Living Documentation avec curl — liste des tools, des prompts et lecture du contenu d'un prompt tel qu'un LLM le reçoit.
**tags:** mcp, curl, debug, tutorial, streamable-http, sse, tools, prompts, json-rpc
---

## Context

Le serveur MCP de Living Documentation est exposé via le transport **Streamable HTTP** (stateless) sur `POST /mcp`. Ce transport impose deux contraintes qui rendent l'inspection avec curl non triviale :

1. Le header `Accept` doit obligatoirement déclarer **à la fois** `application/json` et `text/event-stream` — le SDK MCP rejette la requête avec `-32000 Not Acceptable` si l'un des deux manque.
2. Malgré l'Accept, le serveur répond systématiquement au format **SSE** (`text/event-stream`). La réponse JSON-RPC est encapsulée dans une ligne `data: {...}`, ce que `jq` ne peut pas parser directement.

## Decision

Pour interroger le MCP avec curl, il faut :

- Ajouter `-H "Accept: application/json, text/event-stream"`
- Extraire la ligne `data:` avec `grep` + `sed` avant de passer à `jq`

### Résumé des endpoints

| Méthode     | URL          | Rôle                                 |
| ----------- | ------------ | ------------------------------------ |
| `GET /mcp`  | —            | Résumé JSON custom (tools + prompts) |
| `POST /mcp` | JSON-RPC 2.0 | Protocole MCP complet                |

### Commandes curl

**Résumé rapide (GET custom) :**

```bash
curl -s http://localhost:4321/mcp | jq
```

**Lister les tools :**

```bash
curl -s -X POST http://localhost:4321/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
  | grep "^data:" | sed 's/^data: //' | jq
```

**Lister les prompts :**

```bash
curl -s -X POST http://localhost:4321/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"prompts/list","params":{}}' \
  | grep "^data:" | sed 's/^data: //' | jq
```

**Lire le contenu d'un prompt (ce que le LLM reçoit) :**

```bash
curl -s -X POST http://localhost:4321/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"prompts/get","params":{"name":"c4-context"}}' \
  | grep "^data:" | sed 's/^data: //' | jq
```

Prompts disponibles : `c4-context`, `c4-container`, `flow`, `erd`.

**Appeler un tool :**

```bash
curl -s -X POST http://localhost:4321/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"list_documents","arguments":{}}}' \
  | grep "^data:" | sed 's/^data: //' | jq
```

## Consequences

### PROS

- Permet de vérifier exactement ce qu'un LLM voit sans avoir besoin d'un client MCP dédié.
- Le pattern `grep "^data:" | sed 's/^data: //'` est réutilisable pour tout endpoint Streamable HTTP.
- Le `GET /mcp` reste utilisable sans ces précautions pour un aperçu rapide.

### CONS

- La double exigence `Accept` n'est pas intuitive et casse les appels curl naïfs.
- La réponse SSE nécessite un post-traitement (`grep` + `sed`) que les outils REST standard (Postman, Insomnia) ne gèrent pas nativement sans configuration spécifique.
