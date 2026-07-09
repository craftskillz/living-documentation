---
type: ADR
title: Server Guide And Feature Workflow For The Mcp
description: Le MCP Living Documentation expose un SERVER_GUIDE complet (instructions à l'initialize + outil get_server_guide) qui fait de la création d'ADR une étape obligatoire de fin de feature, et ajoute l'outil update_document nécessaire au superseding.
tags:
  - mcp
  - server-guide
  - adr
  - feature-workflow
  - supersede
  - update_document
  - get_server_guide
  - frontmatter
  - living-documentation
  - living-ai-documentation
  - markdown-conventions
timestamp: 2026-04-27T15:40:00Z
status: To be validated
---

# Server guide et workflow ADR pour le MCP

## Contexte

Jusqu'ici, le serveur MCP Living Documentation exposait ses outils (`list_documents`, `create_document`, `create_diagram`, `add_metadata`, etc.) sans contrat explicite sur la façon dont un agent codeur devait s'en servir pour faire vivre la documentation. Concrètement :

- Un agent qui terminait une feature pouvait se contenter de modifier le code, sans créer d'ADR ni lier les fichiers sources concernés via `add_metadata`. La documentation prenait alors du retard, et la mesure de dérive (`get_accuracy`) restait aveugle à la nouvelle feature.
- Aucun moyen n'existait pour _modifier_ un document : `create_document` refuse les collisions de nom. Impossible donc de « superseder » une ADR obsolète sans intervention manuelle dans le filesystem.
- Les conventions Markdown propres au viewer (liens cross-doc avec encodage doublé, liens vers diagrammes, pièces jointes, ancres internes) n'étaient documentées nulle part côté MCP, ce qui produisait des liens cassés dans les ADRs générées.

## Décision

### 1. Un SERVER_GUIDE central

`src/mcp/server.ts` définit une constante `SERVER_GUIDE` envoyée à deux endroits :

- via le champ `instructions` retourné lors de l'`initialize` MCP , la plupart des clients (Claude Code, etc.) chargent ce texte dans leur contexte au démarrage ;
- via un outil dédié `get_server_guide` , fallback pour les clients qui ne surfacent pas `instructions` au modèle.

Le guide formalise notamment :

- la convention espaces documentation/sources découplés (déjà actée dans une ADR séparée mais désormais référencée ici) ;
- le **workflow ADR obligatoire** (cf. section 2) ;
- la **frontmatter ADR obligatoire** : `**date:**`, `**status:**` (toujours `To be validated` à la création), `**description:**` (une phrase technique dense), `**tags:**` (5–10 tags spécifiques) ;
- les **conventions Markdown** propres au viewer : lien cross-doc `?doc=<doublyEncodedId>` avec la règle « copier le `linkHref` verbatim », lien vers diagramme `/diagram?id=...`, pièce jointe `./files/...`, ancre interne `#heading-slug`, arbres ASCII dans un fenced code block ;
- les conventions par type de diagramme (context, container, UML, screen-guide) , déjà actées mais consolidées ici.

### 2. Workflow ADR comme étape de fin de feature

Le guide stipule qu'une feature n'est _terminée_ qu'après la création (ou supersede) d'une ADR liée aux fichiers sources concernés. Étapes obligatoires :

1. `list_documents` pour récupérer l'inventaire.
2. Shortlist des ADRs topiquement proches, puis `read_document` pour confirmer.
3. **Supersede check** , si une ADR existante est rendue obsolète, basculer son `**status:**` à `SuperSeeded` via `update_document` et y ajouter un pointeur vers la nouvelle.
4. `create_document` pour la nouvelle ADR (frontmatter mandatory, `status: To be validated`).
5. `add_metadata` pour **chaque fichier source** qui porte la logique , en excluant les « god files » (lockfiles, barrels, root routers).

### 3. Nouvel outil `update_document`

`src/mcp/tools/documents.ts` expose `toolUpdateDocument(id, content)` :

- résout l'`id` en chemin absolu via la même logique que `read_document` (decodeURIComponent + guard de path traversal + whitelist `extraFiles`) ;
- refuse si le document n'existe pas (ne crée pas) ;
- écrit le contenu complet en remplacement, retourne `{ success, id, bytes }`.

L'outil est utilisé pour deux scénarios :

- **Supersede** : flipper le `**status:**` d'une ADR + ajouter un pointeur (Scenario A du workflow).
- **Audit drift** : réécrire le corps d'un document désynchronisé du code, puis appeler `refresh_metadata` pour rebaseliner les hashes (Scenario B).

L'outil refuse les contenus vides pour éviter d'effacer accidentellement un document.

## Conséquences

### PROS

- Le workflow de documentation est désormais auto-décrit par le serveur lui-même : un agent qui appelle `get_server_guide` ou lit les `instructions` à l'`initialize` reçoit le contrat complet.
- La frontmatter ADR uniforme rend la recherche par `tags` et la lecture par `description` exploitables par d'autres agents (et par l'humain via le viewer).
- `update_document` débloque les deux scénarios qui manquaient (supersede + drift correction). Sans lui, la « living documentation » n'a pas de mécanisme de remise à jour.
- Le viewer et le MCP partagent désormais le même vocabulaire de liens , les ADRs générées par un agent restent navigables dans le viewer.

### CONS

- Le guide est long (~280 lignes). Les clients MCP qui _résument_ `instructions` au lieu de le coller verbatim peuvent perdre des règles. Atténué par l'outil `get_server_guide` redondant.
- `update_document` est destructif (overwrite intégral). Pas de versioning interne ; on s'appuie sur git pour l'historique.
- Le mandat « ADR à chaque feature » a un coût : un agent qui itère vite va générer beaucoup d'ADRs. Atténué par la possibilité de superseder (au lieu d'empiler).
