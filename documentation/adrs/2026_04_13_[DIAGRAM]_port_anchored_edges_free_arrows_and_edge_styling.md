---
`🗄️ ADR : 2026_04_13_[DIAGRAM]_port_anchored_edges_free_arrows_and_edge_styling.md`
**date:** 2026-04-13
**status:** Validated
**description:** Add 8 attachment ports per shape (N/NE/E/SE/S/SW/W/NW) with bezier routing guided by port normals, transparent ghost edges to prevent double-rendering, manual proximity hit detection for port edges, free-standing arrows via double-click on empty canvas, improved anchor node drag (16×16 hit area), and edge color/width customization with a palette of 8 colors.
**tags:** diagram, ports, attachment-points, bezier, edge-routing, anchor, free-arrow, ghost-edge, hit-detection, drawPortEdge, ports.js, edge-color, edge-width, edge-styling, edge-panel, persistence
---

## Context

Les flèches du diagramme partaient et arrivaient toujours au centre des formes. Il n'était pas possible d'ancrer une flèche sur un point précis d'une forme (bord, coin). Par ailleurs, il était impossible de créer une flèche complètement libre (non attachée à une forme), et les flèches n'avaient ni couleur ni épaisseur personnalisable.

## Decision

### Points d'attache (ports)

Chaque forme expose 8 ports : N, NE, E, SE, S, SW, W, NW. Les positions sont calculées dans `ports.js` :

- Formes rectangulaires : coins et milieux de côtés (`PORT_OFFSETS_RECT`)
- Formes circulaires/elliptiques : points sur la circonférence (`PORT_OFFSETS_CIRC`)

En mode `addEdge`, un `mousemove` calcule le port le plus proche du curseur (`getNearestPort`) et affiche 8 points orange via `drawPortDots` (canvas `afterDrawing`). `fromPort` et `toPort` sont capturés au `mousedown`/`mouseup` et attachés à l'edge.

### Rendu bezier et ghost edge

Les edges avec ports utilisent un rendu custom (`drawPortEdge` dans `ports.js`) avec des courbes de Bézier cubiques dont les points de contrôle suivent les normales sortantes des ports :

```
tension = max(60, dist × 0.4)
cp1 = fromPos + fromNormal × tension
cp2 = toPos   + toNormal   × tension
```

Pour éviter le double-rendu (vis-network + custom), l'edge vis-network des port-edges est rendu transparent (`rgba(0,0,0,0)`) dans le DataSet. `drawPortEdge` est appelé dans le patch `_drawNodes` après `e.draw(ctx)`.

### Hit detection manuelle

vis-network utilise le chemin ghost centre-à-centre pour la détection de clic. Pour les port-edges qui divergent visuellement, un scan manuel échantillonne la courbe de Bézier en 24 points (`distanceToPortEdge`) avec un seuil de 8 unités canvas.

### Flèches libres

Double-clic sur canvas vide en mode `addEdge` crée deux anchor nodes espacés de 60px et un edge entre eux. Les anchor nodes voient leur `nodeDimensions` passé de `{0,0}` à `{16,16}` pour que vis-network les détecte nativement (drag, clic). Sélectionner un edge anchor→anchor auto-sélectionne les deux endpoints via `network.setSelection()`, permettant le déplacement groupé.

### Couleur et épaisseur des flèches

Le panel edge reçoit :

- 8 pastilles de couleur (`data-edge-color`) : gris, noir, bleu, teal, vert, orange, rouge, violet
- Boutons `W−` / `W+` (pas de 0.5px, plage 1–8px)

Les champs `edgeColor` et `edgeWidth` sont stockés sur l'edge. Pour les edges non-port, vis-network est mis à jour nativement (`color`, `width`). Pour les port-edges, seul le champ custom est mis à jour ; `drawPortEdge` le lit directement. Tout est sauvegardé dans `persistence.js` et restauré au chargement.

## Consequences

### PROS

- Diagrammes expressifs : les flèches peuvent partir d'un point précis (ex. port S d'une forme vers port N d'une autre) sans déformation visuelle
- Courbes bezier naturelles grâce aux normales sortantes — pas de courbe qui "rebrousse chemin"
- Compatibilité ascendante : les edges sans `fromPort`/`toPort` continuent d'utiliser le rendu vis-network natif
- Flèches libres utilisables comme annotations ou connecteurs décoratifs indépendants de toute forme
- Couleur et épaisseur per-edge permettent une hiérarchisation visuelle des relations (flèches importantes en rouge épais, relations secondaires en gris fin)

### CONS

- Le ghost edge transparent (0,0,0,0) est un détour — si vis-network est mis à jour, la compatibilité du patch `_drawNodes` doit être re-vérifiée
- Les anchor nodes à `nodeDimensions: {16,16}` décalent légèrement le placement de la pointe de flèche (8px avant le centre) — imperceptible à l'usage normal mais techniquement inexact
- La sélection manuelle des port-edges via sampling bezier (24 points) est une approximation — des edges très proches pourraient être ambiguës au clic
