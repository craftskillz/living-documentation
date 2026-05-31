---
**date:** 2026-05-31
**status:** To be validated
**description:** La palette de couleurs inline (rangée de ronds) dans les panneaux node et edge est remplacée par un unique carré-swatch cliquable qui ouvre une mini popup avec des carrés rectangulaires, via un module partagé `color-picker.js` qui respecte les `nodeColorOverrides` de runtime.
**tags:** diagram, color-picker, node-panel, edge-panel, swatch, popup, nodeColorOverrides, UX, toolbar, shared-module
---

## Contexte

La barre de propriétés des formes affichait une longue rangée de 15+ cercles colorés (construite dynamiquement dans `diagram.html`). Cette approche avait plusieurs problèmes :

- Elle occupait beaucoup d'espace horizontal dans une toolbar déjà dense.
- Les couleurs affichées ignoraient `st.nodeColorOverrides` (couleurs custom de la config projet), causant un décalage visuel entre la palette et les formes réellement rendues.
- Le code de construction était dupliqué entre le node panel et l'edge panel.
- Aucune réutilisation possible depuis d'autres contextes (ex: modal defaults).

## Décision

### Module partagé `color-picker.js`

Un module `src/frontend/diagram/color-picker.js` expose :

```js
openColorPickerPopup(trigger, entries, selectedValue, onSelect, opts)
closeAllColorPickerPopups()
```

- `entries` : tableau `{ value, bg, border, label }` — agnostique du domaine (fonctionne pour les couleurs de nœuds comme pour les couleurs d'arêtes).
- La popup est positionnée sous le `trigger`, décalée si proche du bord droit.
- `z-index: 2000` pour passer au-dessus de tous les panneaux flottants.
- Un seul `click` externe ferme la popup (listener `capture` auto-détaché).

### Node panel

- `nodePaletteContainer` (div avec boutons `[data-color]`) remplacé par un unique `<button id="nodeColorSwatch">`.
- `syncNodeColorSwatch()` met à jour la couleur du swatch à chaque `showNodePanel()` en lisant `st.nodeColorOverrides[colorKey] || NODE_COLORS[colorKey]` — les couleurs affichées dans la popup correspondent exactement au rendu réel des formes.
- `buildNodeColorEntries()` est appelé dynamiquement à l'ouverture (pas au chargement du module) pour prendre en compte les overrides appliqués au boot.
- Le handler `[data-color]` dans `main.js` est supprimé.

### Edge panel

- `edgePaletteContainer` remplacé par `<button id="edgeColorSwatch">`.
- `initEdgeColorSwatch(palette)` reçoit la palette de l'arête au boot (injectée depuis `diagram.html`).
- La popup affiche les couleurs sur une seule ligne (`columns = palette.length`).
- `syncEdgeColorSwatch(hex)` appelé depuis `showEdgePanel()`.

### Réutilisation dans defaults-modal.js

La modal de configuration des defaults utilise le même `color-picker.js` pour le picker de couleur par forme.

## Conséquences

- La toolbar node panel est nettement plus compacte.
- Les couleurs dans la popup sont fidèles au rendu (override-aware).
- Un seul module à maintenir pour la logique popup.
- `diagram.html` ne construit plus les boutons palette dynamiquement — le boot est simplifié.
- Les imports `NODE_COLORS`, `DEFAULT_NODE_PALETTE`, `DEFAULT_EDGE_PALETTE` sont retirés du script inline de `diagram.html`.
