# MCP tool: `get_accuracy`

## Description

Compute a document's accuracy: compares the SHA-256 hashes stored with each metadata entry against the hashes of the source files on disk today.

Returns each item with status `unchanged` / `modified` / `missing`, counts, and a weighted `accuracy` in [0, 1] (missing weighs 3× a simple modification).

A value close to 1 means the doc is still aligned with its source files. A value close to 0 means significant drift: read the doc and the modified source files, then update the doc.

## Schéma d'entrée

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "description": "Document id"
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
    "name": "get_accuracy",
    "arguments": {
      "id": "ADRS/2026_05_11_19_41_[FRONTEND]_copie_id_document_mcp_depuis_entete_viewer"
    }
  }
}
```

## Résultat

```json
{
  "id": "ADRS/2026_05_11_19_41_[FRONTEND]_copie_id_document_mcp_depuis_entete_viewer",
  "items": [
    {
      "path": "src/frontend/index.html",
      "storedHash": "4847d6804c6220bcbabf7675fac7e3a229e12f805d0922f49bce83a48808cfb9",
      "currentHash": "4847d6804c6220bcbabf7675fac7e3a229e12f805d0922f49bce83a48808cfb9",
      "status": "unchanged"
    },
    {
      "path": "src/frontend/misc.js",
      "storedHash": "723368fdc2c798be3831d64f1015a472d6e93cdc383bbe6773d75b647f1d0ef7",
      "currentHash": "723368fdc2c798be3831d64f1015a472d6e93cdc383bbe6773d75b647f1d0ef7",
      "status": "unchanged"
    },
    {
      "path": "src/frontend/i18n/en.json",
      "storedHash": "92b968341866ef355f16b3dc1a8722a2121e9583bc3fd9cf172bf3327d658e41",
      "currentHash": "1d5923644e771c6a4b14303ae630b5e99369627998dd09799caef8d357105821",
      "status": "modified"
    },
    {
      "path": "src/frontend/i18n/fr.json",
      "storedHash": "7fa702a41adfae4fff45a6c4d6369ae74ea40e3131eeab28fb0e3ab90193b145",
      "currentHash": "3a740c6ac6daf1c86144876d84fe1effd1b3b8404acd8d4328f12420b7a0f1ad",
      "status": "modified"
    },
    {
      "path": "tests/e2e/viewer.spec.ts",
      "storedHash": "91cd04887c47581e2d58427623241e7d2bfbdcd4d17057e5ca15770562908ab0",
      "currentHash": "91cd04887c47581e2d58427623241e7d2bfbdcd4d17057e5ca15770562908ab0",
      "status": "unchanged"
    }
  ],
  "total": 5,
  "unchanged": 3,
  "modified": 2,
  "missing": 0,
  "accuracy": 0.6
}
```
