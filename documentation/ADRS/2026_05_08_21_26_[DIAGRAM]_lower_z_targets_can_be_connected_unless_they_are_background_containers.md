---
type: ADR
title: Lower Z Targets Can Be Connected Unless They Are Background Containers
description: La création d'edges n'interdit plus les connexions vers une forme plus basse en z-order sauf lorsque cette forme inférieure contient la source et agit comme arrière-plan.
tags:
  - diagram
  - addEdge
  - z-order
  - port-edge
  - custom-shape
  - free-arrow
  - lowerZTargetContainsSource
  - canonicalOrder
  - network.js
  - background-container
timestamp: 2026-05-08T21:26:00Z
status: To be validated
---

# Lower Z Targets Can Be Connected Unless They Are Background Containers

## Contexte

La création d'edges bloquait auparavant toute cible située plus bas que la source dans `canonicalOrder`. Cette règle protégeait le cas d'un grand rectangle ou d'une image de fond sous une petite forme : relâcher la souris sur le fond ne devait pas connecter l'edge à ce fond mais créer une extrémité libre.

Cette règle était trop large. Sur un diagramme avec plusieurs formes normales, une forme personnalisée placée plus haut dans le z-order, comme `S3`, ne pouvait pas créer une edge vers `API Gateway` ou vers un rectangle plus bas dans l'ordre. Le geste était converti en flèche à extrémité libre alors que le sens inverse fonctionnait.

## Décision

Le blocage `targetBelow` est remplacé par `lowerZTargetContainsSource(sourceId, targetId)`. Une cible plus basse est refusée seulement si elle contient la position de la source, ce qui correspond au cas d'un conteneur ou arrière-plan sous la source.

Les connexions volontaires entre deux formes distinctes restent autorisées même si la cible est plus basse en z-order. La règle est appliquée dans les deux chemins de création d'edge :

- `manipulation.addEdge`, qui crée une edge node-to-node lorsque vis-network détecte une cible ;
- le fallback `mouseup`, qui transforme un relâchement sans cible valable en edge vers une anchor libre.

## Conséquences

### PROS

- Une forme personnalisée comme `S3` peut créer une edge vers une autre forme plus basse en z-order.
- Le sens de création de l'edge n'influence plus le type d'edge produit lorsque les deux formes sont distinctes.
- Le comportement de protection des fonds reste conservé pour les grands conteneurs qui entourent la source.

### CONS

- La détection d'un arrière-plan est maintenant géométrique : elle considère qu'une cible plus basse contenant le centre de la source est un fond. Une forme inférieure qui chevauche volontairement la source peut donc être traitée comme fond dans ce cas précis.
