# MCP tool: `list_metadata`

## Description

List the source-file metadata entries attached to a document. Each entry is a source file (path relative to `sourceRoot`) bound to the document with the SHA-256 hash that was stored when it was attached.

Use together with `get_accuracy` to decide whether a doc needs to be reviewed because one of its source-file dependencies has changed.

## Schéma d'entrée

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "description": "Document id as returned by list_documents"
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
    "name": "list_metadata",
    "arguments": {
      "id": "ADRS/2026_05_11_20_03_[DIAGRAM]_copie_id_diagramme_mcp_depuis_topbar_editeur"
    }
  }
}
```

## Résultat

```json
{
  "id": "ADRS/2026_05_11_20_03_[DIAGRAM]_copie_id_diagramme_mcp_depuis_topbar_editeur",
  "sourceRoot": "/Users/ymedaghri/Documents/Repositories/Medaghri-Alaoui-Repositories/09_My_Published_Projects/living-documentation",
  "items": [
    {
      "path": "src/frontend/diagram.html",
      "hash": "58db9ae80492b15c7c1892238b12adf8d35fc65f0f71c8870cc254c861c931c9"
    },
    {
      "path": "src/frontend/diagram/main.js",
      "hash": "18a57f2b180e016969d0eaa3b7650fdb0733cf98d9725b9ee9683c8c2399718a"
    },
    {
      "path": "src/frontend/i18n/en.json",
      "hash": "1d5923644e771c6a4b14303ae630b5e99369627998dd09799caef8d357105821"
    },
    {
      "path": "src/frontend/i18n/fr.json",
      "hash": "3a740c6ac6daf1c86144876d84fe1effd1b3b8404acd8d4328f12420b7a0f1ad"
    },
    {
      "path": "tests/e2e/diagram.spec.ts",
      "hash": "2c41a94dbc107e573ddb2100da25642bcae2f85fc8a83788c1d9a5fde4cd6a6c"
    }
  ]
}
```
