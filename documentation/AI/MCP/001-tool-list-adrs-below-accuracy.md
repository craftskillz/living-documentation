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
  "items": [
    {
      "id": "ADRS%2F2026_05_11_22_33_%5BMCP%5D_review_adr_relevance_mcp_tool",
      "title": "Review Adr Relevance Mcp Tool",
      "category": "MCP",
      "folder": "ADRS",
      "accuracy": 0,
      "total": 3,
      "unchanged": 0,
      "modified": 3,
      "missing": 0
    },
    {
      "id": "ADRS%2F2026_05_11_20_03_%5BDIAGRAM%5D_copie_id_diagramme_mcp_depuis_topbar_editeur",
      "title": "Copie Id Diagramme Mcp Depuis Topbar Editeur",
      "category": "DIAGRAM",
      "folder": "ADRS",
      "accuracy": 0.2,
      "total": 5,
      "unchanged": 1,
      "modified": 4,
      "missing": 0
    },
    {
      "id": "ADRS%2F2026_05_11_19_41_%5BFRONTEND%5D_copie_id_document_mcp_depuis_entete_viewer",
      "title": "Copie Id Document Mcp Depuis Entete Viewer",
      "category": "FRONTEND",
      "folder": "ADRS",
      "accuracy": 0.4,
      "total": 5,
      "unchanged": 2,
      "modified": 3,
      "missing": 0
    },
    {
      "id": "ADRS%2F2026_05_29_21_56_%5BFRONTEND_EXPERIMENT%5D_prototype_isole_html_in_canvas_pour_configuration_graphe",
      "title": "Prototype Isole Html In Canvas Pour Configuration Graphe",
      "category": "FRONTEND_EXPERIMENT",
      "folder": "ADRS",
      "accuracy": 0.4444444444444444,
      "total": 9,
      "unchanged": 4,
      "modified": 5,
      "missing": 0
    },
    {
      "id": "ADRS%2F2026_05_11_19_33_%5BAI_CONTEXT%5D_affichage_detail_erreur_appels_mcp_page_context",
      "title": "Affichage Detail Erreur Appels Mcp Page Context",
      "category": "AI_CONTEXT",
      "folder": "ADRS",
      "accuracy": 0.5,
      "total": 2,
      "unchanged": 1,
      "modified": 1,
      "missing": 0
    },
    {
      "id": "ADRS%2F2026_05_13_19_03_%5BPACKAGING%5D_revert_vendoring_tailwind_and_font_awesome_proxy_access_restored",
      "title": "Revert Vendoring Tailwind And Font Awesome Proxy Access Restored",
      "category": "PACKAGING",
      "folder": "ADRS",
      "accuracy": 0.5,
      "total": 6,
      "unchanged": 3,
      "modified": 3,
      "missing": 0
    },
    {
      "id": "ADRS%2F2026_05_23_10_40_%5BFRONTEND%5D_feature_folders_frontend_pour_snippets_et_modales",
      "title": "Feature Folders Frontend Pour Snippets Et Modales",
      "category": "FRONTEND",
      "folder": "ADRS",
      "accuracy": 0.5,
      "total": 2,
      "unchanged": 1,
      "modified": 1,
      "missing": 0
    },
    {
      "id": "ADRS%2F2026_05_12_00_58_%5BMCP%5D_retrodocument_adrs_from_git_mcp_tool_and_prompt",
      "title": "Retrodocument Adrs From Git Mcp Tool And Prompt",
      "category": "MCP",
      "folder": "ADRS",
      "accuracy": 0.6666666666666666,
      "total": 3,
      "unchanged": 2,
      "modified": 1,
      "missing": 0
    },
    {
      "id": "ADRS%2F2026_05_12_11_46_%5BDIAGRAM%5D_export_diagrammes_au_format_drawio_mxgraph_xml",
      "title": "Export Diagrammes Au Format Drawio Mxgraph Xml",
      "category": "DIAGRAM",
      "folder": "ADRS",
      "accuracy": 0.6666666666666666,
      "total": 3,
      "unchanged": 2,
      "modified": 1,
      "missing": 0
    },
    {
      "id": "ADRS%2F2026_05_14_11_33_%5BSTARTER_DOC%5D_worklog_convention_for_ai_handoff_in_bilingual_starter",
      "title": "Worklog Convention For Ai Handoff In Bilingual Starter",
      "category": "STARTER_DOC",
      "folder": "ADRS",
      "accuracy": 0.6666666666666666,
      "total": 6,
      "unchanged": 4,
      "modified": 2,
      "missing": 0
    }
  ],
  "totalBelowThreshold": 12
}
```
