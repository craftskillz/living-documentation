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
sources:
  - path: src/frontend/diagram/network.js
    hash: b75037700cefcb4276bfe5f3394f640862dfdac50518757539de8dfc245c7ee0
  - path: src/frontend/diagram/node-rendering.js
    hash: a436315aa7840b50a98a443d0326008d6e15650a6594cc9bead8c4988a60af57
  - path: src/frontend/diagram/grid.js
    hash: c751c3a259fc79f73764a6199f6da7af3f18ff2e5687b47fc2e124fdad2d8c55
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
