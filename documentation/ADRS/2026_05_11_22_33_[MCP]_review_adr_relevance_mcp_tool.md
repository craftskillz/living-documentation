---
type: ADR
title: Review Adr Relevance Mcp Tool
description: Ajout du workflow MCP ADR-only `list_adrs_below_accuracy` + `review_adr_relevance` + prompts `audit-adrs-drift` et `review-adr-relevance`, séparant les rapports factuels des décisions LLM de refresh ou supersession confirmée.
tags:
  - mcp
  - adr
  - metadata
  - accuracy
  - list_adrs_below_accuracy
  - audit-adrs-drift
  - review_adr_relevance
  - review-adr-relevance
  - prompt
  - refresh_metadata
  - update_document
  - source-files
  - supersede
  - playwright
timestamp: 2026-05-11T22:33:00Z
status: To be validated
sources:
  - path: src/mcp/server.ts
    hash: 3b1a958205aacbca4131f8a5557957d09cca5266d0937dae99e464b2c3b0e7af
  - path: src/mcp/tools/metadata.ts
    hash: a1f4e76088ecb14b2395ae526de9766bcca185e144d891e291167fe253d44fce
  - path: tests/api/mcp.spec.ts
    hash: d95c629036430dded46eefcb38a3ae0e6983652860b67d2fb63fff4ba9bd005b
---

# Revue de pertinence et audit de dérive ADR via MCP

## Contexte

Les tools existants `get_accuracy`, `list_metadata`, `read_document`, `read_source_file`, `refresh_metadata` et `update_document` permettaient déjà de détecter puis corriger une dérive documentaire. En pratique, un agent devait composer lui-même le workflow : vérifier que le document est bien une ADR, lire le document, identifier les fichiers source dont le hash a changé, relire ces fichiers, puis décider entre refresh ou supersession.

Deux problèmes sont apparus :

- la revue d'une ADR précise devait être séparée entre un rapport factuel déterministe et un prompt de jugement LLM ;
- l'audit batch ne devait pas lister toute documentation en dérive, mais uniquement les ADRs.

## Décision

Séparer le besoin en primitives MCP spécialisées :

1. un tool factuel `review_adr_relevance(id)` ;
2. un tool d'inventaire ADR-only `list_adrs_below_accuracy()` ;
3. un prompt d'orchestration pour une ADR : `review-adr-relevance` ;
4. un prompt d'orchestration batch : `audit-adrs-drift`.

### Détection ADR

Les deux tools ADR-only utilisent la même convention de détection :

- un segment de dossier `ADRS` ;
- ou une catégorie `ADR` ;
- ou le marqueur `[ADR]` dans l'id ;
- ou la mention `Architecture Decision Record` dans le début du document.

Un document non-ADR avec metadata peut avoir une jauge sous 100 %, mais il ne remonte pas dans `list_adrs_below_accuracy`.

### Tool `review_adr_relevance`

Le tool :

- exige un `id` de document ;
- résout le document via l'inventaire documentaire ;
- vérifie que le document est une ADR ;
- retourne le contenu Markdown complet du document, son `status`, sa `description` et ses `tags` ;
- calcule la jauge metadata avec les mêmes helpers que `get_accuracy` ;
- expose `sourceFilesToReread`, limité aux entrées metadata dont le statut est `modified` ou `missing` ;
- retourne un `state` factuel : `no_metadata`, `metadata_current`, `needs_llm_review` ou `already_superseeded`.

Le tool ne contient pas la procédure de décision complète. Il fournit les faits nécessaires au LLM appelant.

### Tool `list_adrs_below_accuracy`

Le tool :

- parcourt les documents connus ;
- ignore les documents sans metadata ;
- lit le Markdown pour exclure les non-ADR et les ADRs `SuperSeeded` ;
- calcule l'accuracy ;
- retourne au maximum 10 ADRs dont l'accuracy est inférieure à 80 %, triées de la plus dégradée à la moins dégradée.

Ce tool remplace `list_documents_below_accuracy`, qui mélangeait potentiellement documents généraux et ADRs.

### Prompt `review-adr-relevance`

Le prompt porte le workflow sémantique pour une ADR :

1. appeler `review_adr_relevance(id)` ;
2. interpréter `state` ;
3. relire avec `read_source_file` chaque fichier `modified` listé dans `sourceFilesToReread` ;
4. ne pas rafraîchir en cas de fichier `missing` sans clarification utilisateur ;
5. comparer `document.description`, le corps de l'ADR et le code actuel ;
6. si l'ADR reste cohérente, appeler `refresh_metadata(id)` et indiquer que la jauge revient à 100 % ;
7. si l'ADR contredit le code, expliquer la contradiction et demander confirmation avant toute supersession ;
8. si l'utilisateur accepte, utiliser `update_document` pour passer le statut à `SuperSeeded` et ajouter une note de supersession ;
9. si l'utilisateur refuse, lui indiquer que la vérification et le refresh des hashes lui reviennent.

### Prompt `audit-adrs-drift`

Le prompt batch :

1. appelle `list_adrs_below_accuracy()` ;
2. pour chaque ADR listée, appelle `review_adr_relevance(id)` ;
3. relit les fichiers source modifiés ;
4. applique la même décision que `review-adr-relevance` ;
5. reboucle sur `list_adrs_below_accuracy()` jusqu'à épuisement, blocage ou absence de progrès.

Cette séparation évite de cacher une décision sémantique dans un tool déterministe : les tools observent, les prompts guident le raisonnement et les interactions utilisateur.

## Conséquences

### PROS

- `review_adr_relevance` reste testable et déterministe : il valide l'ADR, calcule l'accuracy et liste les fichiers à relire.
- `list_adrs_below_accuracy` ne remonte plus de documents généraux : l'audit batch est explicitement ADR-only.
- `review-adr-relevance` encode explicitement le comportement attendu du LLM, notamment l'obligation de lire le code avant `refresh_metadata`.
- `audit-adrs-drift` réutilise `review_adr_relevance`, donc les workflows single-ADR et batch partagent la même base factuelle.
- La supersession reste une action volontaire : les prompts imposent une confirmation utilisateur avant `update_document`.

### CONS

- L'ancien nom `list_documents_below_accuracy` n'est plus exposé par le MCP ; les clients doivent appeler `list_adrs_below_accuracy`.
- L'ancien prompt `audit-doc-drift` est remplacé par `audit-adrs-drift` ; les clients doivent mettre à jour leur invocation.
- L'appel complet demande au minimum un prompt + un tool + des lectures source, au lieu d'un seul tool monolithique.
- La détection ADR reste conventionnelle. Un document hors dossier `ADRS` peut être accepté s'il porte des marqueurs ADR explicites, ou rejeté si son nom et son contenu ne permettent pas de l'identifier.

## Validation

- `npm run build`
- `npx playwright test tests/api/mcp.spec.ts --project=chromium`
