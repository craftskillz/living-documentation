---
type: Rule
title: Respecter les contraintes vis-network du diagram editor
description: Le rendu diagramme (Svelte, lib/diagram) dépend de plusieurs contournements vis-network documentés ; les modifier sans les vérifier peut casser le z-order, les formes custom ou le resize.
tags:
  - diagram
  - vis-network
  - canvas
  - z-order
  - custom-shape
  - svelte
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
  - src/frontend-svelte/src/routes/Diagram.svelte
  - src/frontend-svelte/src/routes/ShapeEditor.svelte
  - src/frontend-svelte/src/lib/diagram/**/*.js
  - src/frontend-svelte/src/lib/diagram/**/*.ts
---

vis-network 9.1.9 est chargé en UMD depuis `src/frontend-svelte/index.html`. Avant de modifier le rendu ou les interactions de l'éditeur de diagrammes (`src/frontend-svelte/src/lib/diagram/`), vérifier les ADR pertinents et ces contraintes :

- Toutes les formes sont des `ctxRenderer`. vis-network met en cache la closure et ne la relit jamais après `nodes.update()` : chaque renderer doit lire l'état courant via `st.nodes.get(id)` au moment du dessin (`nodeData()` dans `node-rendering.js`) plutôt que capturer des valeurs dans une closure.
- Après un `nodes.update()` qui change couleur, taille, rotation ou alignement, forcer `network.body.nodes[id].refreshNeeded = true` puis `network.redraw()` (voir `forceRedraw()` dans `node-panel.js`, et `history.js`, `edge-panel.js`).
- `getBoundingBox()` est peu fiable pour les `ctxRenderer` ; calculer les bounds depuis `bodyNode.x/y`, `nodeWidth/nodeHeight` (ou `SHAPE_DEFAULTS`) et la rotation, comme `nodeBounds()` dans `selection-overlay.js` et `groups.js`.
- Le patch `network.renderer._drawNodes` (`network.js`) remplace le rendu multi-pass de vis-network (normal → selected → hovered) par une passe unique dans `st.canonicalOrder`, avec les edges dessinées juste avant leur nœud le plus haut. `st.canonicalOrder` doit rester synchronisé avec les events add/remove du DataSet. Revalider la signature interne de `_drawNodes` lors d'une montée de version vis-network.
- Les labels externes des formes custom (placement `left`/`right`/`above`/`below`) sont dessinés dans `drawNode()` du renderer ; ne pas les dessiner une seconde fois ailleurs.

Ne pas supprimer ou simplifier ces contournements sans test ciblé sur l'éditeur et justification dans un ADR si le comportement durable change.
