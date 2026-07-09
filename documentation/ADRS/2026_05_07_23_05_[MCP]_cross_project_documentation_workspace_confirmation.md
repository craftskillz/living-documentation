---
type: ADR
title: Cross Project Documentation Workspace Confirmation
description: Ajout d'une convention MCP pour confirmer les espaces de documentation decouples des sources puis creer les documents source-of-truth avant les diagrammes.
tags:
  - mcp
  - server-guide
  - sourceRoot
  - documentation-workspace
  - cross-project
  - create_document
  - create_diagram
  - evidence
  - workflow
timestamp: 2026-05-07T23:05:00Z
status: To be validated
---

# Convention MCP pour les espaces de documentation decouples des sources

## Contexte

Un utilisateur peut volontairement connecter le MCP Living Documentation a un
nouveau projet de documentation, tout en demandant d'analyser un dossier source
different. C'est un cas valide : le nouveau projet MCP sert alors d'espace de
synthese pour construire des documents et des diagrammes sans ecrire dans le
depot source.

Avant cette convention, un agent pouvait interpreter l'ecart entre le dossier
pointe par l'utilisateur et le `sourceRoot` du MCP comme une mauvaise
configuration. Il risquait alors de contourner le MCP, d'ecrire des fichiers a
la main dans le depot source, ou de produire un diagramme a partir du code sans
documents Markdown locaux pour en porter la preuve.

## Decision

Le `SERVER_GUIDE` precise maintenant le comportement attendu quand le dossier
pointe par l'utilisateur ne semble pas correspondre au `sourceRoot` ou a
l'inventaire documentaire du MCP :

- l'agent doit demander confirmation avant de creer des documents ou des
  diagrammes ;
- si l'utilisateur confirme que l'ecart est intentionnel, le MCP courant reste
  la cible documentaire ;
- l'agent doit d'abord creer dans ce MCP les documents Markdown source-of-truth
  necessaires : vue d'ensemble, acteurs, conteneurs runtime, systemes externes,
  flux de donnees, decisions clefs et contraintes ;
- les diagrammes doivent ensuite etre derives de ces documents et citer ces
  documents via `evidence` ;
- l'acces au code source reste un intrant de recherche pour rediger les
  documents, pas une source directe a citer dans les diagrammes.

La meme convention est resumee dans les descriptions operationnelles de
`create_document` et `create_diagram`, afin que les clients MCP qui ne
surfacent pas le guide complet voient quand meme la regle au moment d'appeler
les outils.

## Consequences

Les workflows de documentation multi-projets deviennent explicites. Un nouveau
projet Living Documentation peut servir d'espace de documentation pour un depot
source externe, mais l'agent doit obtenir la confirmation utilisateur et
construire d'abord le corpus Markdown local.

Les diagrammes conservent leur contrat de source de verite : ils ne doivent pas
dessiner des acteurs, systemes ou relations absents des documents du MCP,
meme si ces informations ont ete observees dans le code source analyse.
