---
**date:** 2026-05-11
**status:** To be validated
**description:** Ajout du couple MCP `review_adr_relevance` + prompt `review-adr-relevance`, séparant le rapport factuel d'une ADR de l'orchestration LLM qui décide entre refresh metadata et supersession confirmée.
**tags:** mcp, adr, metadata, accuracy, review_adr_relevance, review-adr-relevance, prompt, refresh_metadata, update_document, source-files, supersede, playwright
---

# Revue de pertinence ADR via MCP

## Contexte

Les tools existants `get_accuracy`, `list_metadata`, `read_document`, `read_source_file`, `refresh_metadata` et `update_document` permettaient déjà de détecter puis corriger une dérive documentaire. En pratique, un agent devait composer lui-même le workflow : vérifier que le document est bien une ADR, lire le document, identifier les fichiers source dont le hash a changé, relire ces fichiers, puis décider entre refresh ou supersession.

Ce workflow était trop implicite pour le cas fréquent où l'utilisateur pointe une ADR précise dont la jauge est passée sous 100 %.

## Décision

Séparer le besoin en deux primitives MCP :

1. un tool factuel `review_adr_relevance(id)` ;
2. un prompt d'orchestration `review-adr-relevance`.

### Tool `review_adr_relevance`

Le tool :

- exige un `id` de document ;
- résout le document via l'inventaire documentaire ;
- vérifie que le document est une ADR, principalement via le dossier `ADRS`, la catégorie `ADR`, le marqueur `[ADR]` ou la mention `Architecture Decision Record` ;
- retourne le contenu Markdown complet du document, son `status`, sa `description` et ses `tags` ;
- calcule la jauge metadata avec les mêmes helpers que `get_accuracy` ;
- expose `sourceFilesToReread`, limité aux entrées metadata dont le statut est `modified` ou `missing` ;
- retourne un `state` factuel : `no_metadata`, `metadata_current`, `needs_llm_review` ou `already_superseeded`.

Le tool ne contient pas la procédure de décision complète. Il fournit les faits nécessaires au LLM appelant.

### Prompt `review-adr-relevance`

Le prompt porte le workflow sémantique :

1. appeler `review_adr_relevance(id)` ;
2. interpréter `state` ;
3. relire avec `read_source_file` chaque fichier `modified` listé dans `sourceFilesToReread` ;
4. ne pas rafraîchir en cas de fichier `missing` sans clarification utilisateur ;
5. comparer `document.description`, le corps de l'ADR et le code actuel ;
6. si l'ADR reste cohérente, appeler `refresh_metadata(id)` et indiquer que la jauge revient à 100 % ;
7. si l'ADR contredit le code, expliquer la contradiction et demander confirmation avant toute supersession ;
8. si l'utilisateur accepte, utiliser `update_document` pour passer le statut à `SuperSeeded` et ajouter une note de supersession ;
9. si l'utilisateur refuse, lui indiquer que la vérification et le refresh des hashes lui reviennent.

Cette séparation évite de cacher une décision sémantique dans un tool déterministe : le tool observe, le prompt guide le raisonnement et les interactions utilisateur.

## Conséquences

### PROS

- `review_adr_relevance` reste testable et déterministe : il valide l'ADR, calcule l'accuracy et liste les fichiers à relire.
- `review-adr-relevance` encode explicitement le comportement attendu du LLM, notamment l'obligation de lire le code avant `refresh_metadata`.
- La supersession reste une action volontaire : le prompt impose une confirmation utilisateur avant `update_document`.
- Le workflow est découvrable à la fois depuis `tools/list` et `prompts/list`.

### CONS

- L'appel complet demande au minimum un prompt + un tool + des lectures source, au lieu d'un seul tool monolithique.
- Le tool retourne le contenu complet de l'ADR, ce qui peut produire une réponse longue pour des ADR volumineuses.
- Les contenus source ne sont pas inclus directement ; le LLM doit appeler `read_source_file` pour les fichiers modifiés listés.
- La détection ADR reste conventionnelle. Un document hors dossier `ADRS` peut être accepté s'il porte des marqueurs ADR explicites, ou rejeté si son nom et son contenu ne permettent pas de l'identifier.

## Validation

- `npm run build`
- `npx playwright test tests/api/mcp.spec.ts --project=chromium`
