---
`🗄️ ADR : 2026_04_14_[MCP]_draft_mcp.md`
**date:** 2026-04-14
**status:** Draft
**description:** Exposition d'un serveur MCP (Model Context Protocol) via HTTP pour permettre aux assistants IA (Claude Desktop, Claude Code, Cursor…) d'interagir avec les documents et diagrammes de Living Documentation sans quitter leur éditeur.
**tags:** mcp, model-context-protocol, http, streamable-http, ai, claude-desktop, claude-code, tools, documents, diagrams
---

## Context

Living Documentation est un outil local de visualisation et d'édition de documentation Markdown. Jusqu'à présent, les interactions avec les documents et les diagrammes nécessitaient soit l'interface web, soit des appels REST directs. Les assistants IA (Claude Desktop, Claude Code, Cursor, etc.) ne disposaient d'aucun moyen standardisé pour lire ou créer du contenu dans l'outil.

Le protocole MCP (Model Context Protocol) est une norme émergente qui permet à un LLM d'invoquer des outils exposés par un serveur local. L'intégrer à Living Documentation permettrait aux développeurs de piloter leur documentation directement depuis leur assistant IA, sans changer de contexte.

## Decision

### Architecture

Un routeur Express est monté sur `/mcp`. Il instancie un serveur MCP (`@modelcontextprotocol/sdk`) avec le transport **Streamable HTTP** (stateless — un Server + Transport par requête POST). Le routeur est démarré automatiquement avec l'application Express existante ; aucun processus séparé n'est requis.

```
POST /mcp   →  mcpRouter  →  createMcpServer()  →  outil exécuté
GET  /mcp   →  résumé JSON (tools disponibles)
```

### Outils exposés (v1 — draft)

| Outil | Description |
|---|---|
| `list_documents` | Liste tous les documents (id, titre, catégorie, dossier) |
| `read_document` | Lit le contenu Markdown brut d'un document par son id |
| `create_document` | Crée un document Markdown (nom de fichier généré depuis le pattern configuré) |
| `list_diagrams` | Liste tous les diagrammes sauvegardés |
| `create_diagram` | Crée un diagramme à partir de nœuds et d'arêtes typés |

### Implémentation

- `src/mcp/server.ts` — définition des outils MCP et routeur Express
- `src/mcp/tools/documents.ts` — implémentation de `list_documents`, `read_document`, `create_document`
- `src/mcp/tools/diagrams.ts` — implémentation de `list_diagrams`, `create_diagram`
- Montage dans `src/server.ts` : `app.use('/mcp', mcpRouter(docsPath))`

### Configuration côté client

**Claude Desktop** (`claude_desktop_config.json`) :
```json
{
  "mcpServers": {
    "living-documentation": {
      "type": "http",
      "url": "http://localhost:4321/mcp"
    }
  }
}
```

**Claude Code** :
```bash
claude mcp add --transport http living-documentation http://localhost:4321/mcp
```

## Consequences

### Positif
- Les assistants IA peuvent lister, lire et créer documents et diagrammes sans quitter leur environnement.
- Le transport Streamable HTTP stateless est simple : pas de gestion de session, compatible avec les proxies HTTP standard.
- L'intégration est non-intrusive : le serveur MCP partage le même port que l'application web.

### Limitations (draft)
- Aucune authentification : le serveur est conçu pour un usage local uniquement.
- Les outils disponibles sont limités (pas encore de `update_document`, `delete_document`, `update_diagram`).
- Aucun test automatisé sur le serveur MCP pour l'instant.
- Le transport Streamable HTTP est relativement récent dans le SDK MCP — la stabilité de l'API est à surveiller.

## Status

**Draft** — fonctionnalité opérationnelle mais périmètre d'outils intentionnellement restreint. À compléter selon les besoins.
