# MCP tool: `read_diagram`

## Description

Read the nodes and edges of an existing diagram by its id. Returns the diagram in the same format accepted by `create_diagram`, ready to be modified and passed back. If unsure of the workflow, call `get_server_guide` first.

## Schéma d'entrée

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "description": "Diagram id as returned by list_diagrams"
    }
  },
  "required": [
    "id"
  ]
}
```

## Requête effectuée

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "read_diagram",
    "arguments": {
      "id": "d1777363627693"
    }
  }
}
```

## Résultat

```json
{
  "id": "d1777363627693",
  "title": "Living Documentation — context (demo conf)",
  "edgesStraight": false,
  "gridEnabled": false,
  "alignGuides": true,
  "nodes": [
    {
      "name": "",
      "type": "box",
      "color": "c-gray",
      "x": -164,
      "y": 84,
      "width": 828,
      "height": 661,
      "fontSize": 19,
      "textAlign": "right",
      "textValign": "bottom",
      "bgOpacity": null,
      "rotation": 0,
      "labelRotation": 0,
      "imageSrc": null,
      "groupId": null,
      "nodeLink": null,
      "locked": false
    },
    {
      "name": "Living Documentation\n[Software System]\nMarkdown viewer + Express API\n+ MCP server (create-adr,\naudit-doc-drift)",
      "type": "box",
      "color": "c-blue",
      "x": 0,
      "y": 0,
      "width": 240,
      "height": 112,
      "fontSize": null,
      "textAlign": null,
      "textValign": null,
      "bgOpacity": null,
      "rotation": 0,
      "labelRotation": 0,
      "imageSrc": null,
      "groupId": null,
      "nodeLink": null,
      "locked": false
    },
    {
      "name": "Coding agent\n[Person]\nClaude Code, Cursor…\nCodes the project and\nco-maintains its docs",
      "type": "actor",
      "color": "c-gray",
      "x": -426,
      "y": -176,
      "width": 30,
      "height": 52,
      "fontSize": null,
      "textAlign": null,
      "textValign": null,
      "bgOpacity": null,
      "rotation": 0,
      "labelRotation": 0,
      "imageSrc": null,
      "groupId": null,
      "nodeLink": null,
      "locked": false
    },
    {
      "name": "Developer / Reader\n[Person]\nBrowses ADRs, validates\nstatuses, reads diagrams",
      "type": "actor",
      "color": "c-gray",
      "x": -426,
      "y": 170,
      "width": 30,
      "height": 52,
      "fontSize": null,
      "textAlign": null,
      "textValign": null,
      "bgOpacity": null,
      "rotation": 0,
      "labelRotation": 0,
      "imageSrc": null,
      "groupId": null,
      "nodeLink": null,
      "locked": false
    },
    {
      "name": "Local filesystem\n[Datastore]\n.md docs, .metadata.json,\n.living-doc.json",
      "type": "database",
      "color": "c-teal",
      "x": 1,
      "y": 256,
      "width": 217,
      "height": 151,
      "fontSize": null,
      "textAlign": null,
      "textValign": null,
      "bgOpacity": null,
      "rotation": 0,
      "labelRotation": 0,
      "imageSrc": null,
      "groupId": null,
      "nodeLink": null,
      "locked": false
    }
  ],
  "edges": [
    {
      "from": "Coding agent\n[Person]\nClaude Code, Cursor…\nCodes the project and\nco-maintains its docs",
      "to": "Living Documentation\n[Software System]\nMarkdown viewer + Express API\n+ MCP server (create-adr,\naudit-doc-drift)",
      "label": "invokes MCP tools (create-adr, audit-doc-drift, add_metadata)",
      "arrowDir": "to",
      "dashes": false,
      "fontSize": null,
      "labelRotation": 0,
      "edgeLabelOffsetX": 31,
      "edgeLabelOffsetY": -22,
      "fromPort": "E",
      "toPort": "W",
      "edgeColor": null,
      "edgeWidth": null,
      "edgeLocked": false,
      "edgeLabelWidth": 209.01385498046875
    },
    {
      "from": "Living Documentation\n[Software System]\nMarkdown viewer + Express API\n+ MCP server (create-adr,\naudit-doc-drift)",
      "to": "Local filesystem\n[Datastore]\n.md docs, .metadata.json,\n.living-doc.json",
      "label": "reads from / writes to",
      "arrowDir": "both",
      "dashes": false,
      "fontSize": null,
      "labelRotation": 0,
      "edgeLabelOffsetX": 0,
      "edgeLabelOffsetY": 0,
      "fromPort": "S",
      "toPort": "N",
      "edgeColor": null,
      "edgeWidth": null,
      "edgeLocked": false,
      "edgeLabelWidth": 126.26385498046875
    },
    {
      "from": "Developer / Reader\n[Person]\nBrowses ADRs, validates\nstatuses, reads diagrams",
      "to": "Living Documentation\n[Software System]\nMarkdown viewer + Express API\n+ MCP server (create-adr,\naudit-doc-drift)",
      "label": "browses and edits docs via",
      "arrowDir": "to",
      "dashes": false,
      "fontSize": null,
      "labelRotation": 0,
      "edgeLabelOffsetX": 0,
      "edgeLabelOffsetY": 0,
      "fromPort": "E",
      "toPort": "W",
      "edgeColor": null,
      "edgeWidth": null,
      "edgeLocked": false,
      "edgeLabelWidth": 178.28289794921875
    }
  ]
}
```
