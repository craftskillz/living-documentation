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
  - path: src/frontend-svelte/src/lib/diagram/network.js
    hash: 3c74df3c34df86a2b9c91a8bd0894975dc527347a61a425480c5543656cb5cfa
    commit: 69c15d0e46b862f05d882a8637c6441e437a5a97
    dirty: true
  - path: src/frontend-svelte/src/lib/diagram/node-rendering.js
    hash: a436315aa7840b50a98a443d0326008d6e15650a6594cc9bead8c4988a60af57
    commit: 69c15d0e46b862f05d882a8637c6441e437a5a97
    dirty: true
  - path: src/frontend-svelte/src/lib/diagram/node-panel.js
    hash: b2779eaa28fe966bea19dbb8ff9fd0b8a2ef3498932eaf914ae773fbe412728e
    commit: 69c15d0e46b862f05d882a8637c6441e437a5a97
    dirty: true
  - path: src/frontend-svelte/src/lib/diagram/selection-overlay.js
    hash: a95db2e56fbfbd90738ed1594aed005de00d3d9aea82aa96136b0a0a0ac3bbff
    commit: 69c15d0e46b862f05d882a8637c6441e437a5a97
    dirty: true
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
