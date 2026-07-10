---
type: ADR
title: Persistance Et Application Des Styles De Fleches Tous Types Daretes Et Defaults A La Creation
description: La persistance du style de flèche (direction, tirets, couleur, épaisseur, taille police) est étendue à tous les types d'arêtes (pas seulement free arrows), et la création shape→shape utilise désormais les mêmes defaults que les free arrows ; un affichage de la taille de police est ajouté dans la barre edge panel.
tags:
  - diagram
  - edge-panel
  - persistFreeArrowStyle
  - addEdge
  - free-arrow
  - shape-to-shape
  - fontSize
  - defaults
  - ld-free-arrow-style
  - edge-font-size
timestamp: 2026-05-31T15:34:00Z
status: To be validated
sources:
  - path: src/frontend/diagram/edge-panel.js
    hash: b2ddc37fb5b6f8c8da864fbef8d32b53380a797181c1ed34511896b0ea75e990
  - path: src/frontend/diagram/network.js
    hash: 3c74df3c34df86a2b9c91a8bd0894975dc527347a61a425480c5543656cb5cfa
  - path: src/frontend/diagram.html
    hash: 58126f89d4eeefb3232481f2141c172b633654e8ab4ce1a0c06d4d52a1cacb13
---

## Contexte

### Persistance limitée aux free arrows

`persistFreeArrowStyle()` ne persistait que si la sélection contenait une free arrow (anchor→anchor). Modifier la direction, le style ou la taille de police d'une arête shape→shape ne mettait rien à jour dans `ld-free-arrow-style`. L'utilisateur voyait ses réglages ignorés pour les arêtes entre formes.

### Création shape→shape sans defaults

`addEdge()` dans `network.js` (vis-network callback) créait toujours les arêtes avec `arrowDir: 'to'` et `dashes: false` hardcodés, sans consulter `getLastFreeArrowStyle()`. Les defaults de flèches étaient ignorés à la création shape→shape.

### fontSize absent de la barre edge panel

La barre de propriétés des arêtes affichait Aa− et Aa+ sans montrer la valeur courante, contrairement à la barre des nœuds.

## Décisions

### 1. `persistFreeArrowStyle()` , tous les types d'arêtes

Free arrows restent prioritaires (si la sélection en contient une, c'est elle qui est persistée). Sinon, la première arête sélectionnée est utilisée :

```js
const edgeId = freeId || st.selectedEdgeIds[0];
```

### 2. `addEdge` utilise les defaults

```js
const edgeStyle = getLastFreeArrowStyle();
data.arrowDir = edgeStyle.arrowDir || "to";
data.dashes = edgeStyle.dashes || false;
if (edgeStyle.fontSize) {
  data.fontSize = edgeStyle.fontSize;
  data.font = {
    size: edgeStyle.fontSize,
    align: "middle",
    color: "rgba(0,0,0,0)",
  };
}
Object.assign(data, visEdgeProps(data.arrowDir, data.dashes));
```

### 3. Affichage fontSize dans edge panel

`<span id="edgeFontSizeValue">` entre Aa− et Aa+, synchronisé par `syncEdgeFontSizeValue()` appelée depuis `showEdgePanel()` et `changeEdgeFontSize()`.

### 4. `fontSize` dans `ld-free-arrow-style`

Ajouté à `persistFreeArrowStyle()` et à `saveEdgeAsDefault()`. Le merge-with-defaults dans `getLastFreeArrowStyle()` protège les clés legacy sans ce champ.

## Conséquences

- Toute modification de style sur n'importe quelle arête est mémorisée.
- Les arêtes shape→shape partagent la même mémoire de style que les free arrows.
- La barre edge panel affiche la taille de police courante comme la barre node panel.
- Les defaults arrows du projet s'appliquent à la création des deux types d'arêtes.
