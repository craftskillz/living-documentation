# MCP tool: `read_source_file`

## Description

Read a source file under the project `sourceRoot`. Path must be relative to `sourceRoot`.

Use this **only after** you have tried the documentation tools (`list_documents` / `read_document`). If you find yourself reading more than 3 source files for the same diagram, stop and update the documentation first — the docs are the source of truth.

Files larger than 512 KB are rejected; use `search_source` to locate the relevant section.

## Schéma d'entrée

```json
{
  "type": "object",
  "properties": {
    "path": {
      "type": "string",
      "description": "Path relative to `sourceRoot`, e.g. `src/frontend/index.html`."
    }
  },
  "required": [
    "path"
  ]
}
```

## Requête effectuée

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "read_source_file",
    "arguments": {
      "path": "CLAUDE.md"
    }
  }
}
```

## Résultat

```json
{
  "path": "CLAUDE.md",
  "size": 2169,
  "content": "# CLAUDE.md - Living Documentation\n\nCe fichier est le point d'entrée pour Claude.\n\nAvant toute modification :\n\n1. Lire `documentation/AI/PROJECT-INSTRUCTIONS.md`.\n2. Lire `documentation/AI/PROJECT-STACK.md` pour comprendre la stack, les zones source utiles, les concepts centraux et les conventions structurantes.\n3. Lire `documentation/AI/PROJECT-USEFUL-COMMANDS.md` pour connaître les commandes de développement, build, test, lint et setup.\n4. Lire `memory/MEMORY.md` et charger seulement les fichiers mémoire utiles à la tâche.\n5. Lire toutes les règles dans `documentation/AI/rules/*.md`.\n6. Inspecter les ADR dans `documentation/ADRS/` en lisant d'abord `description` et `tags`, puis ouvrir l'ADR complet seulement s'il est pertinent.\n7. Vérifier si le MCP `living-documentation` est disponible et l'utiliser pour créer, mettre à jour et fiabiliser la documentation lorsque la tâche touche une décision, une règle, une commande, la stack ou un document technique.\n\n## MCP Living Documentation\n\nLe serveur Living Documentation expose son MCP sur `/mcp` en transport Streamable HTTP, par exemple `http://localhost:4321/mcp` lorsque le serveur utilise le port par défaut.\n\nQuand le MCP est disponible :\n\n- utiliser les outils de documents pour lire, créer ou mettre à jour la documentation ;\n- utiliser les outils source pour vérifier le code uniquement quand la documentation ne suffit pas ;\n- attacher les fichiers source avec `add_metadata` après création ou mise à jour d'un ADR ou document technique ;\n- appeler `refresh_metadata` lorsque le document est aligné avec le code.\n\n`PROJECT-STACK.md` et `PROJECT-USEFUL-COMMANDS.md` sont des documents vivants. Si l'agent découvre qu'ils sont faux, incomplets ou obsolètes, il doit proposer ou effectuer leur mise à jour dans la même tâche, sauf instruction contraire de l'utilisateur.\n\nSi le MCP n'est pas disponible, le signaler explicitement dans la réponse finale et ne pas prétendre avoir mis à jour les métadonnées ou les hashes Living Documentation.\n\nSi une règle ou une instruction projet contredit la demande utilisateur, signaler explicitement le conflit avant de continuer.\n"
}
```
