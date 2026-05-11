# MCP tool: `refresh_metadata`

## Description

Re-hash every source file attached to a document and overwrite the stored hashes with the current values. Call this AFTER the document has been updated to reflect the current state of its source files — it validates the doc as accurate again.

Missing files keep their stored hash and remain flagged as missing.

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
    "name": "refresh_metadata",
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
  "refreshed": true,
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
      "storedHash": "1d5923644e771c6a4b14303ae630b5e99369627998dd09799caef8d357105821",
      "currentHash": "1d5923644e771c6a4b14303ae630b5e99369627998dd09799caef8d357105821",
      "status": "unchanged"
    },
    {
      "path": "src/frontend/i18n/fr.json",
      "storedHash": "3a740c6ac6daf1c86144876d84fe1effd1b3b8404acd8d4328f12420b7a0f1ad",
      "currentHash": "3a740c6ac6daf1c86144876d84fe1effd1b3b8404acd8d4328f12420b7a0f1ad",
      "status": "unchanged"
    },
    {
      "path": "tests/e2e/viewer.spec.ts",
      "storedHash": "91cd04887c47581e2d58427623241e7d2bfbdcd4d17057e5ca15770562908ab0",
      "currentHash": "91cd04887c47581e2d58427623241e7d2bfbdcd4d17057e5ca15770562908ab0",
      "status": "unchanged"
    }
  ],
  "total": 5,
  "unchanged": 5,
  "modified": 0,
  "missing": 0,
  "accuracy": 1
}
```
