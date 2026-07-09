---
type: Rule
title: Respecter les contraintes vis-network du diagram editor
description: Le rendu diagramme dépend de plusieurs contournements vis-network documentés ; les modifier sans les vérifier peut casser le z-order, les formes custom ou le resize.
tags:
  - diagram
  - vis-network
  - canvas
  - z-order
  - custom-shape
id: diagram-vis-network-gotchas
severity: warning
appliesto:
  - src/frontend/diagram.html
  - src/frontend/diagram/**/*.js
  - src/frontend/shape-editor.html
  - src/frontend/shape-editor.js
---

Avant de modifier le rendu ou les interactions de l'éditeur de diagrammes, vérifier les ADR pertinents et ces contraintes :

- `ctxRenderer` est mis en cache par vis-network ; utiliser un renderer stable qui lit l'état courant plutôt que reconstruire une closure après `nodes.update()`.
- `getBoundingBox()` est peu fiable pour les formes custom ; calculer les bounds depuis `bodyNode.x/y` et la géométrie connue lorsque la précision est nécessaire.
- Les formes `database` peuvent nécessiter `network.body.nodes[id].refreshNeeded = true` après changement de dimensions.
- Le patch `_drawNodes` remplace le rendu multi-pass de vis-network pour préserver `_canonicalOrder`; revalider sa signature lors d'une montée de version vis-network.
- Les labels externes des `ctxRenderer` ne doivent pas être dessinés deux fois.

Ne pas supprimer ou simplifier ces contournements sans test ciblé sur l'éditeur et justification dans un ADR si le comportement durable change.
