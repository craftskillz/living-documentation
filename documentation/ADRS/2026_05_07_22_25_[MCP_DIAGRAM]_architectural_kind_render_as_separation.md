---
type: ADR
title: Architectural Kind Render As Separation
description: Separation de la semantique architecturale kind et du rendu visuel renderAs pour les noeuds crees par MCP, avec preservation dans l'editeur diagramme.
tags:
  - mcp
  - diagram
  - create_diagram
  - read_diagram
  - kind
  - renderAs
  - C4
  - shapeType
  - persistence
  - history
timestamp: 2026-05-07T22:25:00Z
status: To be validated
---

# Separation du type architectural et du rendu visuel

## Contexte

`create_diagram` utilisait historiquement `type` comme forme graphique directe (`box`, `database`, `ellipse`, etc.). Cette valeur ne permettait pas de distinguer un systeme interne d'un systeme externe, d'un conteneur, d'une API tierce ou d'un service cloud lorsque ces elements partagent la meme forme visuelle.

La semantique architecturale etait donc portee uniquement par le texte du label C4, ce qui rendait les diagrammes moins structurables par les clients MCP.

## Decision

`create_diagram` accepte maintenant `kind`, `renderAs` et `description` sur les noeuds :

- `kind` decrit la nature architecturale (`external_system`, `api`, `database`, `backend_service`, etc.) ;
- `renderAs` choisit la forme graphique et surcharge le rendu par defaut du `kind` ;
- `description` sert a construire automatiquement la troisieme ligne du label C4 quand `kind` est fourni avec un `name` simple.

Quand `kind` est present, le MCP construit un label C4 `Name\n[Kind Label]\nDescription`, applique une couleur par defaut et choisit une forme par defaut. Quand `kind` est absent, le comportement historique via `type` reste supporte.

Les noeuds persistent aussi `kind`, `renderAs` et `description`. `read_diagram` les restitue pour permettre un round-trip MCP sans perte de semantique.

Cote editeur diagramme, la sauvegarde, l'historique undo/redo et le chargement preservent ces champs. Le rendu continue de s'appuyer sur `shapeType`, avec `renderAs` comme fallback si un diagramme structure ancien ou externe n'a pas encore de `shapeType`.

## Consequences

Les clients MCP peuvent produire des diagrammes C4 plus structurés sans encoder toute la signification dans le label. Les diagrammes restent compatibles avec l'editeur existant, car `shapeType` demeure le champ de rendu effectif.

Le champ `type` reste accepte pour les appels existants. Les nouveaux appels peuvent omettre `type` lorsqu'ils fournissent `kind`.
