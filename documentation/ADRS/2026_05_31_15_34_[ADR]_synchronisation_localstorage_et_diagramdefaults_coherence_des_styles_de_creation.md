---
**date:** 2026-05-31
**status:** To be validated
**description:** Chaque enregistrement de default (modal ⚙, bouton ⚙ formes, bouton ⚙ flèches) met à jour simultanément `.living-doc.json` et les clés localStorage correspondantes, garantissant que la prochaine création reflète immédiatement le nouveau réglage sans rechargement.
**tags:** diagram, defaults, localStorage, diagramDefaults, synchronisation, node-panel, edge-panel, defaults-modal, ld-node-style, ld-free-arrow-style
---

## Contexte

Après l'introduction de `diagramDefaults` dans `.living-doc.json`, deux systèmes coexistaient pour décider du style d'un élément créé :

1. **localStorage** (`ld-node-style-<shapeType>`, `ld-free-arrow-style`) , mémoire courte, prioritaire
2. **diagramDefaults** (`.living-doc.json`) , default intentionnel, lu en fallback

Si l'utilisateur enregistrait un default via un des 3 points d'entrée UI, la valeur était persistée dans la config mais pas dans localStorage. À la prochaine création, localStorage (encore vide ou contenant une ancienne valeur) prenait la priorité, ignorant le nouveau réglage jusqu'au rechargement.

## Décision

Tout enregistrement de default met à jour **les deux systèmes simultanément** :

### Bouton ⚙ barre de propriétés des formes (`saveShapeAsDefault`)

```js
localStorage.setItem(
  "ld-node-style-" + shapeType,
  JSON.stringify({
    colorKey,
    fontSize,
    width,
    height,
    textAlign: null,
    textValign: null,
  }),
);
```

### Bouton ⚙ barre de propriétés des flèches (`saveEdgeAsDefault`)

```js
localStorage.setItem(
  "ld-free-arrow-style",
  JSON.stringify({
    arrowDir,
    dashes,
    fontSize,
    edgeColor: null,
    edgeWidth: null,
  }),
);
```

### Save dans la modal defaults

Toutes les clés `ld-node-style-*` (7 types de formes) + `ld-free-arrow-style` sont mises à jour.

### Réinitialisation (bouton Reset de la modal)

```js
SHAPE_KEYS.forEach((k) => localStorage.removeItem("ld-node-style-" + k));
localStorage.removeItem("ld-free-arrow-style");
```

Les clés sont supprimées plutôt qu'écrasées, ce qui force le fallback vers les valeurs système (comportement antérieur garanti).

## Robustesse : merge-with-defaults

`getLastFreeArrowStyle()` et `getLastNodeStyle()` filtrent les valeurs null du stocké avant de les merger avec les defaults :

```js
const clean = Object.fromEntries(
  Object.entries(stored).filter(([, v]) => v != null),
);
return { ...getArrowDefaults(), ...clean };
```

Cela protège contre les clés legacy écrites sans `fontSize` ou `width/height`, qui auraient sinon propagé `null` en ignorant les defaults du projet.

## Conséquences

- L'effet d'un enregistrement de default est **immédiat** , la prochaine forme créée dans la même session l'utilise sans rechargement.
- Le Reset supprime la mémoire courte , la session repart des valeurs système.
- La hiérarchie reste inchangée : localStorage > diagramDefaults > valeurs système.
