# MCP tool: `list_adrs_below_accuracy`

## Description

List ADRs whose accuracy has dropped below 80%, sorted from most degraded first. Returns up to 10 ADRs per call along with the total count of ADRs below the threshold. Non-ADR documents, ADRs without metadata (total = 0), and SuperSeeded ADRs are excluded. ADR detection uses the same convention as review_adr_relevance: folder segment `ADRS`, category `ADR`, `[ADR]` in the id, or an `Architecture Decision Record` marker in the opening content.

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
    "name": "list_adrs_below_accuracy",
    "arguments": {}
  }
}
```

## Résultat

```json
{
  "items": [],
  "totalBelowThreshold": 0
}
```
