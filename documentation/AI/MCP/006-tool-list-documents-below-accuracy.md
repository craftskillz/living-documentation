# MCP tool: `list_documents_below_accuracy`

## Description

List documents whose accuracy has dropped below 80%, sorted from most degraded first. Returns up to 10 documents per call along with the total count of documents below the threshold. Documents without any metadata (total = 0) and SuperSeeded documents are excluded. Use this to audit which documents need review after recent code changes.

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
    "name": "list_documents_below_accuracy",
    "arguments": {}
  }
}
```

## Résultat

```json
{
  "items": [
    {
      "id": "ADRS%2F2026_05_11_19_33_%5BAI_CONTEXT%5D_affichage_detail_erreur_appels_mcp_page_context",
      "title": "Affichage Detail Erreur Appels Mcp Page Context",
      "category": "AI_CONTEXT",
      "folder": "ADRS",
      "accuracy": 0,
      "total": 2,
      "unchanged": 0,
      "modified": 2,
      "missing": 0
    },
    {
      "id": "AI%2Frules%2Fi18n-user-visible-strings",
      "title": "I18n user visible strings",
      "category": "General",
      "folder": "AI/rules",
      "accuracy": 0.3333333333333333,
      "total": 3,
      "unchanged": 1,
      "modified": 2,
      "missing": 0
    },
    {
      "id": "ADRS%2F2026_05_11_19_41_%5BFRONTEND%5D_copie_id_document_mcp_depuis_entete_viewer",
      "title": "Copie Id Document Mcp Depuis Entete Viewer",
      "category": "FRONTEND",
      "folder": "ADRS",
      "accuracy": 0.6,
      "total": 5,
      "unchanged": 3,
      "modified": 2,
      "missing": 0
    }
  ],
  "totalBelowThreshold": 3
}
```
