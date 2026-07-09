---
type: Technical Doc
title: 005 tool review adr relevance
---

# MCP tool: `review_adr_relevance`

## Description

Prepare a relevance review for one ADR document.

The tool accepts a document id, verifies that the document is an ADR, returns the ADR content, its frontmatter summary, the metadata accuracy report, and the source files whose hashes no longer match.

This is a factual reporting tool, not the whole workflow. Use prompt `review-adr-relevance` when the LLM must decide between `refresh_metadata` and user-confirmed supersession.

## Schéma d'entrée

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "description": "Document id. Must identify an ADR document."
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
    "name": "review_adr_relevance",
    "arguments": {
      "id": "ADRS/2026_05_11_22_33_[MCP]_review_adr_relevance_mcp_tool"
    }
  }
}
```

## Résultat

```json
{
  "id": "ADRS/2026_05_11_22_33_[MCP]_review_adr_relevance_mcp_tool",
  "isAdr": true,
  "state": "metadata_current",
  "document": {
    "id": "ADRS%2F2026_05_11_22_33_%5BMCP%5D_review_adr_relevance_mcp_tool",
    "decodedId": "ADRS/2026_05_11_22_33_[MCP]_review_adr_relevance_mcp_tool",
    "title": "Review Adr Relevance Mcp Tool",
    "category": "MCP",
    "folder": "ADRS",
    "status": "To be validated",
    "description": "Ajout du workflow MCP ADR-only `list_adrs_below_accuracy` + `review_adr_relevance` + prompts `audit-adrs-drift` et `review-adr-relevance`, séparant les rapports factuels des décisions LLM de refresh ou supersession confirmée.",
    "tags": "mcp, adr, metadata, accuracy, list_adrs_below_accuracy, audit-adrs-drift, review_adr_relevance, review-adr-relevance, prompt, refresh_metadata, update_document, source-files, supersede, playwright",
    "content": "---\n**date:** 2026-05-11\n**status:** To be validated\n**description:** Ajout du workflow MCP ADR-only `list_adrs_below_accuracy` + `review_adr_relevance` + prompts `audit-adrs-drift` et `review-adr-relevance`, séparant les rapports factuels des décisions LLM de refresh ou supersession confirmée.\n**tags:** mcp, adr, metadata, accuracy, list_adrs_below_accuracy, audit-adrs-drift, review_adr_relevance, review-adr-relevance, prompt, refresh_metadata, update_document, source-files, supersede, playwright\n---\n\n# Revue de pertinence et audit de dérive ADR via MCP\n\n## Contexte\n\nLes tools existants `get_accuracy`, `list_metadata`, `read_document`, `read_source_file`, `refresh_metadata` et `update_document` permettaient déjà de détecter puis corriger une dérive documentaire. En pratique, un agent devait composer lui-même le workflow : vérifier que le document est bien une ADR, lire le document, identifier les fichiers source dont le hash a changé, relire ces fichiers, puis décider entre refresh ou supersession.\n\nDeux problèmes sont apparus :\n\n- la revue d'une ADR précise devait être séparée entre un rapport factuel déterministe et un prompt de jugement LLM ;\n- l'audit batch ne devait pas lister toute documentation en dérive, mais uniquement les ADRs.\n\n## Décision\n\nSéparer le besoin en primitives MCP spécialisées :\n\n1. un tool factuel `review_adr_relevance(id)` ;\n2. un tool d'inventaire ADR-only `list_adrs_below_accuracy()` ;\n3. un prompt d'orchestration pour une ADR : `review-adr-relevance` ;\n4. un prompt d'orchestration batch : `audit-adrs-drift`.\n\n### Détection ADR\n\nLes deux tools ADR-only utilisent la même convention de détection :\n\n- un segment de dossier `ADRS` ;\n- ou une catégorie `ADR` ;\n- ou le marqueur `[ADR]` dans l'id ;\n- ou la mention `Architecture Decision Record` dans le début du document.\n\nUn document non-ADR avec metadata peut avoir une jauge sous 100 %, mais il ne remonte pas dans `list_adrs_below_accuracy`.\n\n### Tool `review_adr_relevance`\n\nLe tool :\n\n- exige un `id` de document ;\n- résout le document via l'inventaire documentaire ;\n- vérifie que le document est une ADR ;\n- retourne le contenu Markdown complet du document, son `status`, sa `description` et ses `tags` ;\n- calcule la jauge metadata avec les mêmes helpers que `get_accuracy` ;\n- expose `sourceFilesToReread`, limité aux entrées metadata dont le statut est `modified` ou `missing` ;\n- retourne un `state` factuel : `no_metadata`, `metadata_current`, `needs_llm_review` ou `already_superseeded`.\n\nLe tool ne contient pas la procédure de décision complète. Il fournit les faits nécessaires au LLM appelant.\n\n### Tool `list_adrs_below_accuracy`\n\nLe tool :\n\n- parcourt les documents connus ;\n- ignore les documents sans metadata ;\n- lit le Markdown pour exclure les non-ADR et les ADRs `SuperSeeded` ;\n- calcule l'accuracy ;\n- retourne au maximum 10 ADRs dont l'accuracy est inférieure à 80 %, triées de la plus dégradée à la moins dégradée.\n\nCe tool remplace `list_documents_below_accuracy`, qui mélangeait potentiellement documents généraux et ADRs.\n\n### Prompt `review-adr-relevance`\n\nLe prompt porte le workflow sémantique pour une ADR :\n\n1. appeler `review_adr_relevance(id)` ;\n2. interpréter `state` ;\n3. relire avec `read_source_file` chaque fichier `modified` listé dans `sourceFilesToReread` ;\n4. ne pas rafraîchir en cas de fichier `missing` sans clarification utilisateur ;\n5. comparer `document.description`, le corps de l'ADR et le code actuel ;\n6. si l'ADR reste cohérente, appeler `refresh_metadata(id)` et indiquer que la jauge revient à 100 % ;\n7. si l'ADR contredit le code, expliquer la contradiction et demander confirmation avant toute supersession ;\n8. si l'utilisateur accepte, utiliser `update_document` pour passer le statut à `SuperSeeded` et ajouter une note de supersession ;\n9. si l'utilisateur refuse, lui indiquer que la vérification et le refresh des hashes lui reviennent.\n\n### Prompt `audit-adrs-drift`\n\nLe prompt batch :\n\n1. appelle `list_adrs_below_accuracy()` ;\n2. pour chaque ADR listée, appelle `review_adr_relevance(id)` ;\n3. relit les fichiers source modifiés ;\n4. applique la même décision que `review-adr-relevance` ;\n5. reboucle sur `list_adrs_below_accuracy()` jusqu'à épuisement, blocage ou absence de progrès.\n\nCette séparation évite de cacher une décision sémantique dans un tool déterministe : les tools observent, les prompts guident le raisonnement et les interactions utilisateur.\n\n## Conséquences\n\n### PROS\n\n- `review_adr_relevance` reste testable et déterministe : il valide l'ADR, calcule l'accuracy et liste les fichiers à relire.\n- `list_adrs_below_accuracy` ne remonte plus de documents généraux : l'audit batch est explicitement ADR-only.\n- `review-adr-relevance` encode explicitement le comportement attendu du LLM, notamment l'obligation de lire le code avant `refresh_metadata`.\n- `audit-adrs-drift` réutilise `review_adr_relevance`, donc les workflows single-ADR et batch partagent la même base factuelle.\n- La supersession reste une action volontaire : les prompts imposent une confirmation utilisateur avant `update_document`.\n\n### CONS\n\n- L'ancien nom `list_documents_below_accuracy` n'est plus exposé par le MCP ; les clients doivent appeler `list_adrs_below_accuracy`.\n- L'ancien prompt `audit-doc-drift` est remplacé par `audit-adrs-drift` ; les clients doivent mettre à jour leur invocation.\n- L'appel complet demande au minimum un prompt + un tool + des lectures source, au lieu d'un seul tool monolithique.\n- La détection ADR reste conventionnelle. Un document hors dossier `ADRS` peut être accepté s'il porte des marqueurs ADR explicites, ou rejeté si son nom et son contenu ne permettent pas de l'identifier.\n\n## Validation\n\n- `npm run build`\n- `npx playwright test tests/api/mcp.spec.ts --project=chromium`\n"
  },
  "metadata": {
    "sourceRoot": "/Users/ymedaghri/Documents/Repositories/Medaghri-Alaoui-Repositories/09_My_Published_Projects/living-documentation",
    "hasMetadata": true,
    "items": [
      {
        "path": "src/mcp/server.ts",
        "storedHash": "3b1a958205aacbca4131f8a5557957d09cca5266d0937dae99e464b2c3b0e7af",
        "currentHash": "3b1a958205aacbca4131f8a5557957d09cca5266d0937dae99e464b2c3b0e7af",
        "status": "unchanged"
      },
      {
        "path": "src/mcp/tools/metadata.ts",
        "storedHash": "a1f4e76088ecb14b2395ae526de9766bcca185e144d891e291167fe253d44fce",
        "currentHash": "a1f4e76088ecb14b2395ae526de9766bcca185e144d891e291167fe253d44fce",
        "status": "unchanged"
      },
      {
        "path": "tests/api/mcp.spec.ts",
        "storedHash": "d95c629036430dded46eefcb38a3ae0e6983652860b67d2fb63fff4ba9bd005b",
        "currentHash": "d95c629036430dded46eefcb38a3ae0e6983652860b67d2fb63fff4ba9bd005b",
        "status": "unchanged"
      }
    ],
    "total": 3,
    "unchanged": 3,
    "modified": 0,
    "missing": 0,
    "accuracy": 1,
    "sourceFilesToReread": []
  }
}
```
