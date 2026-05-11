# MCP tool: `read_document`

## Description

Read the raw Markdown content of a document by its id. Use this to gather facts (actors, systems, flows) before creating a diagram. Ignore documents whose frontmatter contains `status: SuperSeeded`. If unsure of the workflow, call `get_server_guide` first.

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
    "name": "read_document",
    "arguments": {
      "id": "2026_04_08_20_52_[General]_welcome"
    }
  }
}
```

## Résultat

# Living Documentation — Guide d'utilisation

> La documentation est un problème que presque tout le monde a résolu en faisant semblant de l'avoir résolu.
>
> — Nobody

Des README squelettiques, des outils documentaires tels que Notion et Confluence devenant des forêts vierges où personne ne rentre plus, où on passe du temps à faire un `Ctrl+F` global sur tous les espaces pour finalement ne rien trouver, ou pire, trouver quelque chose d'obsolète mais on va faire avec.

Au bout d'un moment, on n'y va plus du tout, et la connaissance redevient individuelle.

Ca en arrange certains ? Pas moi !

# Pourtant certaines approches ont prouvé leur valeur

[![Découvrons les ADRs](./images/decouverte_adrs.png)](?doc=3_concept%252F2026_04_08_20_58_%255BDOCUMENTING%255D_ADRS)

<h1 style="text-align:center"><code>CLIC sur l'image pour naviguer 😉</code></h1>
