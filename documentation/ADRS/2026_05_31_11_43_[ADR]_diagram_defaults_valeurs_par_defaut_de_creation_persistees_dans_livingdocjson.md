---
type: ADR
title: Diagram Defaults Valeurs Par Defaut De Creation Persistees Dans Livingdocjson
description: "Les valeurs par défaut de création des formes et flèches (taille, couleur, police) sont persistées dans `.living-doc.json` sous la clé `diagramDefaults`, accessibles via l'API config, avec trois points d'entrée UI : modal ⚙ dans la toolbar, bouton ⚙ en fin de barre de propriétés des formes, et fallback automatique à la création."
tags:
  - diagram
  - defaults
  - config
  - living-doc-json
  - node-panel
  - edge-panel
  - color-picker
  - localStorage
  - fallback
  - persistence
timestamp: 2026-05-31T11:43:00Z
status: To be validated
---

## Contexte

L'éditeur de diagrammes créait toutes les formes et flèches avec des dimensions, couleurs et tailles de police fixes codées en dur dans `SHAPE_DEFAULTS` (node-rendering.js). L'utilisateur n'avait aucun moyen de changer ces valeurs initiales globalement , il devait reformater chaque élément après création.

La mémoire courte (localStorage) existait déjà : `ld-node-style-<shapeType>` et `ld-free-arrow-style` retenaient le dernier style utilisé par type. Mais ces données étaient liées au navigateur, pas au projet, et ne couvraient pas les dimensions.

## Décision

### Stockage

Les defaults sont persistés dans `.living-doc.json` sous la clé `diagramDefaults` :

```json
{
  "diagramDefaults": {
    "arrows": { "fontSize": 11, "arrowDir": "to", "dashes": false },
    "shapes": {
      "box":      { "width": 100, "height": 40, "colorKey": "c-gray", "fontSize": 13 },
      "ellipse":  { "width": 110, "height": 50, "colorKey": "c-gray", "fontSize": 13 },
      "post-it":  { "width": 120, "height": 100, "colorKey": "c-amber", "fontSize": 13 },
      ...
    }
  }
}
```

`diagramDefaults: null` = réinitialisation aux valeurs système. L'API `PUT /api/config` valide la structure (présence de `arrows` et `shapes`). Les types sont définis dans `StoredConfig` (config.ts).

### Hiérarchie de priorité à la création d'un élément

```
1. localStorage (ld-node-style-<shapeType> / ld-free-arrow-style)  ← dernier utilisé
2. diagramDefaults du projet (.living-doc.json)                      ← default intentionnel
3. Valeurs système hardcodées (SHAPE_DEFAULTS / ARROW_SYSTEM_DEFAULTS)
```

`getLastNodeStyle(shapeType)` et `getLastFreeArrowStyle()` implémentent ce fallback.

### Points d'entrée UI

1. **Modal ⚙ dans la toolbar** (`btnDiagramDefaults`) , configurateur complet avec tableau par forme + section flèches. Enregistre via PUT /api/config.
2. **Bouton ⚙ en fin de barre de propriétés** (`btnSaveShapeDefault`) , applique directement les propriétés de la forme sélectionnée (colorKey, fontSize, nodeWidth, nodeHeight) comme default de son type. Flash orange de confirmation.
3. **Fallback automatique** , chaque nouvelle forme créée hérite des defaults du projet si aucune mémoire courte n'existe.

### Mémoire courte étendue

`ld-free-arrow-style` intègre désormais `fontSize` (champ manquant avant cette feature). La mémoire courte reste en localStorage car c'est de l'état transitoire lié à la session, pas au projet.

## Modules concernés

| Fichier                                  | Rôle                                                                                               |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `src/lib/config.ts`                      | Types `DiagramDefaults`, `DiagramShapeDefault` + champ `diagramDefaults` dans `StoredConfig`       |
| `src/routes/config.ts`                   | Whitelist + validation `diagramDefaults` dans PUT /api/config                                      |
| `src/frontend/diagram/defaults-modal.js` | Modal, `initDiagramDefaults()`, `getDiagramDefaults()`, `getShapeDefaults()`, `getArrowDefaults()` |
| `src/frontend/diagram/node-panel.js`     | Fallback dans `getLastNodeStyle()`, `saveShapeAsDefault()`                                         |
| `src/frontend/diagram/edge-panel.js`     | Fallback dans `getLastFreeArrowStyle()`, `fontSize` dans persist                                   |
| `src/frontend/diagram/network.js`        | Création nœud avec `lastStyle.width/height`, création flèche avec `lastStyle.fontSize`             |

## Conséquences

- Les defaults sont portables avec le projet (dans `.living-doc.json`, commitable dans git).
- `null` dans le fichier = comportement antérieur garanti.
- La mémoire courte localStorage reste prioritaire , l'utilisateur qui formate un élément continue à voir son dernier choix repris.
- Les formes custom et images sont exclues (leurs tailles sont gérées séparément).
