# MCP tool: `create_document`

## Description

Create a **new** Markdown document. The filename is generated automatically from the configured pattern (date + category + title slug). Pass `content` as full Markdown; omit to create an empty stub. To **modify an existing document** (correct drift, flip `**status:**` to `SuperSeeded`, edit body), use `update_document(id, content)` instead — `create_document` will refuse with `A document with this name already exists` if the target filename collides.

## Primary use case — ADRs (Architecture Decision Records)
On this project, the dominant use of `create_document` is to record an ADR every time a coding agent implements or modifies a feature. The full workflow is described in `get_server_guide` ("Feature workflow"). In short:

1. **Supersede check first.** `list_documents` → shortlist ADRs whose title/category overlaps the feature → `read_document` to confirm. If one is obsoleted, overwrite it with `status: SuperSeeded` + a one-line pointer to the new ADR.
2. **Create the new ADR** with the mandatory frontmatter (below).
3. **Bind the source files** with `add_metadata` (see that tool for the god-files exclusion list). Without this, the ADR escapes drift detection.

## Mandatory ADR frontmatter
Every ADR body starts with these four fields. They drive search, audit, and lifecycle:

```
---
**date:** YYYY-MM-DD
**status:** To be validated
**description:** One dense, technical sentence — what the decision does, not why.
**tags:** 5–10 specific tags mixing concepts, technologies, and key symbol names
---
```

- `status:` is **always** `To be validated` at creation. Only the human owner promotes to `Accepted`. The status has **no effect** on how the LLM treats the ADR — only `SuperSeeded` is filtered out downstream.
- `description:` stays factual and short — one sentence. The "why" goes in the body.
- `tags:` are the primary search signal. Be specific.
- `category` is the domain bucket in the filename pattern, uppercase (e.g. `SERVICES CLOUD`, `INTEGRATION`, `ALGORITHMES`).
- `folder` should be `adrs` (or the project ADR sub-folder).

## Worked ADR example
```json
{
  "title":    "ajout ressource storage s3",
  "category": "SERVICES CLOUD",
  "folder":   "adrs",
  "content":  "---\n**date:** 2026-04-27\n**status:** To be validated\n**description:** Ajout du module S3 Storage via Amplify Gen 2 — bucket nommé via CDK override, CORS configuré, pas de mode hors-ligne\n**tags:** s3, storage, amplify, CDK, bucket, CORS, cloud\n---\n\n# Ajout ressource storage S3\n\n## Contexte\n...\n\n## Décision\n...\n\n## Conséquences\n..."
}
```

## Source-of-truth contract
Documents are the source of truth. Diagrams are derived views. If a diagram needs a concept that isn't documented, create or update the document first (here) before calling `create_diagram`.

## Cross-project documentation workspace
If the user points you to a folder/repository that does not appear to match this MCP workspace, ask whether the mismatch is intentional. When confirmed, create the source-of-truth documents in this MCP workspace first; diagrams must then cite those documents, not raw source-code inspection.

If unsure of the workflow, call `get_server_guide` first.

## Schéma d'entrée

```json
{
  "type": "object",
  "properties": {
    "title": {
      "type": "string",
      "description": "Human-readable document title"
    },
    "category": {
      "type": "string",
      "description": "Category extracted from the filename, e.g. \"Architecture\", \"Guide\""
    },
    "folder": {
      "type": "string",
      "description": "Optional subfolder relative to the docs root, e.g. \"adrs\" or \"adrs/backend\""
    },
    "content": {
      "type": "string",
      "description": "Full Markdown content. Omit to create an empty document."
    }
  },
  "required": [
    "title",
    "category"
  ]
}
```

## Requête effectuée

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "create_document",
    "arguments": {
      "title": "",
      "category": ""
    }
  }
}
```

## Résultat

```json
{
  "success": true,
  "filename": "2026_05_11_22_13_[General]_document.md",
  "id": "2026_05_11_22_13_%5BGeneral%5D_document",
  "url": "http://localhost:4321/?doc=2026_05_11_22_13_%255BGeneral%255D_document",
  "linkHref": "?doc=2026_05_11_22_13_%255BGeneral%255D_document"
}
```
