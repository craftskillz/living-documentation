---
`🗄️ ADR : 2026_04_03_10_40_[DIAGRAM]_modularisation_javascript.md`
**date:** 2026-04-03
**status:** Accepted
**description:** Extract diagram.html's 2390-line JS monolith into 15 ES native modules under src/frontend/diagram/, each with a single responsibility.
**tags:** diagram, modularisation, es-modules, javascript, architecture, refactoring, main.js, state.js
---

## Context

`src/frontend/diagram.html` contenait l'intégralité du code JavaScript de l'éditeur de diagrammes dans un unique bloc `<script>` de **2 390 lignes**, regroupant ~45 fonctions couvrant des domaines très variés : état mutable, rendu vis.js, panneaux de formatage, grille, debug, persistance API, clipboard, raccourcis clavier, etc.

Ce monolithe rendait difficile :
- la navigation et la compréhension du code ;
- l'évolution isolée d'une fonctionnalité (ex. grid, z-order) sans risquer de régression sur les autres ;
- l'association d'une décision technique à son ADR de référence.

## Decision

Extraire tout le JavaScript en **modules ES natifs** (`type="module"`) répartis dans `src/frontend/diagram/`. Le répertoire est copié automatiquement vers `dist/` par `scripts/copy-assets.ts` (déjà récursif).

### Structure des modules

| Fichier | Responsabilité |
|---------|----------------|
| `constants.js` | Constantes pures : `NODE_COLORS`, `TOOL_BTN_MAP`, `GRID_SIZE` |
| `state.js` | Objet mutable partagé `st` + `markDirty()` |
| `node-rendering.js` | Rendu acteur, `visNodeProps`, `computeVadjust`, `getActualNodeHeight` |
| `edge-rendering.js` | `visEdgeProps` |
| `label-editor.js` | Textarea flottante pour édition des labels nœuds/arêtes |
| `selection-overlay.js` | Cadre de sélection + poignées de redimensionnement |
| `node-panel.js` | Panneau flottant de formatage des nœuds (couleur, police, alignement, z-order) |
| `edge-panel.js` | Panneau flottant de formatage des arêtes (flèche, tirets, police) |
| `grid.js` | Grille visuelle (DPR), snap-to-grid, toggle physique |
| `debug.js` | Overlay debug (coordonnées et dimensions des nœuds) |
| `zoom.js` | Contrôles de zoom |
| `network.js` | `initNetwork`, patch `_drawNodes`, tous les handlers vis.js |
| `persistence.js` | CRUD API `/api/diagrams`, rendu de la liste de diagrammes |
| `clipboard.js` | Copier / coller avec remappage d'IDs |
| `main.js` | Point d'entrée : câblage des boutons, raccourcis clavier, init |

### Partage d'état entre modules

L'état mutable (`network`, `nodes`, `edges`, `selectedNodeIds`, etc.) est centralisé dans un objet exporté `st` depuis `state.js`. Tous les modules l'importent par référence : les mutations sont immédiatement visibles partout sans passage de paramètres.

### Suppression des handlers inline

Tous les attributs `onclick="..."` ont été supprimés du HTML. Les boutons ont reçu des `id` explicites ou des `data-color` (pour les 15 boutons couleur, via délégation sur `#nodePanel`). Les listeners sont câblés dans `main.js` via `addEventListener`.

### Graphe de dépendances (simplifié)

[![Graphe de dépendances des modules diagram JS](./images/diagram_js_module_dependencies.png)](/diagram?id=d1775347200001)

Aucun cycle de dépendances : `constants` et `state` n'importent rien, `main` importe tout.

## Consequences

### PROS

- Chaque fichier a une responsabilité unique et correspond à un ADR existant ou à un domaine clairement délimité.
- Les modifications futures (ex. nouveau type de forme, nouvelle commande clavier) touchent un seul module.
- Pas de build step supplémentaire : les ES modules sont supportés nativement par tous les navigateurs modernes.
- `copy-assets.ts` copie déjà récursivement `src/frontend/` → pas d'adaptation nécessaire.

### CONS

- `vis` reste une globale CDN (`window.vis`) ; les modules y accèdent directement sans import.
- Si un module a besoin d'appeler une fonction d'un autre module, il doit l'importer explicitement — **ne pas ajouter de globals**.
- Si vis-network est mis à jour, vérifier `_drawNodes` dans `network.js` (cf. ADR z-order).
