# MCP tool: `list_diagrams`

## Description

List all saved diagrams with their id and title. Always call this before `create_diagram` — if a relevant diagram already exists, pass its id back to `create_diagram` to update rather than duplicate. If unsure of the workflow, call `get_server_guide` first.

## Schéma d'entrée

```json
{
  "type": "object",
  "properties": {}
}
```

## Requête effectuée

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "list_diagrams",
    "arguments": {}
  }
}
```

## Résultat

```json
[
  {
    "id": "d1775684671412",
    "title": "The Living Documentation Tool"
  },
  {
    "id": "d1775917727566",
    "title": "Créer Vos Dossiers (Tutoriel)"
  },
  {
    "id": "d1775924007206",
    "title": "Architecturer Une Documentation (Reference)"
  },
  {
    "id": "d1775937972731",
    "title": "Ajouter un Document dans un dossier"
  },
  {
    "id": "d1776024969304",
    "title": "Créer un document"
  },
  {
    "id": "d1776720502066",
    "title": "Screen Guide — src/frontend/index.html"
  },
  {
    "id": "d1777363627693",
    "title": "Living Documentation — context (demo conf)"
  }
]
```
