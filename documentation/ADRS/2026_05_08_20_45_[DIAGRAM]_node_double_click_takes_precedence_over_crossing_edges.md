---
type: ADR
title: Node Double Click Takes Precedence Over Crossing Edges
description: Le clic et le double-clic sur une forme éditable priorisent désormais la forme avant les edges proches, sauf lorsqu'une zone de label d'edge est explicitement touchée.
tags:
  - diagram
  - click
  - double-click
  - node-selection
  - node-editing
  - edge-label
  - port-edge
  - hit-detection
  - topmostNodeAt
  - onClickNode
  - onDoubleClick
  - startLabelEdit
  - network.js
timestamp: 2026-05-08T20:45:00Z
status: To be validated
---

# Node Click Takes Precedence Over Crossing Edges

## Contexte

Dans les diagrammes denses avec de nombreuses port-edges, un clic ou un double-clic sur une forme pouvait parfois sélectionner ou éditer une edge proche ou traversante. La cause était similaire dans les deux handlers : la logique collectait des candidates edge (`labelEdgeId`, edge native, port-edge proche, `params.edges`), puis comparait leur niveau de dessin au niveau de la forme sous le curseur.

Dans un diagramme de dépendances dense, une edge connectée à une forme plus haute dans l'ordre canonique pouvait donc battre la forme directement cliquée, ce qui donnait une impression de comportement aléatoire. Par exemple, cliquer sur le rectangle `constants` pouvait sélectionner une arrow partant de `state` si cette edge était considérée comme prioritaire par la détection de proximité.

## Décision

`onDoubleClick` et `onClickNode` calculent maintenant d'abord la forme topmost sous le pointeur via `topmostNodeAt(params.pointer.canvas)`. Si cette forme est éditable (`!locked` et non `anchor`) et que l'événement ne touche pas explicitement une zone de label d'edge (`!labelEdgeId`), la forme gagne immédiatement :

- le double-clic démarre l'édition du label de la forme avec `startLabelEdit()` ;
- le clic simple sélectionne la forme avec `selectNodesFromClick()`.

Les edges ne sont évaluées qu'après cette priorité node. L'exception `labelEdgeId` est conservée afin qu'un clic ou double-clic sur le texte d'une arrow continue de cibler l'edge, même si ce label est dessiné au-dessus d'une forme.

## Conséquences

### PROS

- Cliquer une forme sélectionne toujours cette forme, même si des edges la traversent ou passent près de son centre.
- Double-cliquer une forme édite toujours cette forme dans les mêmes conditions.
- Le comportement reste compatible avec les labels d'edges : une interaction sur la zone de label d'une edge cible toujours l'edge.
- La correction est localisée dans `network.js` et ne modifie pas le rendu ni la persistance des diagrammes.

### CONS

- Un clic sur un segment d'edge qui traverse visuellement une forme éditable sélectionne désormais la forme, pas l'edge. C'est le compromis attendu : la cible visuelle prioritaire est la forme sous le curseur ; l'edge reste sélectionnable via son label ou depuis une zone hors forme.
