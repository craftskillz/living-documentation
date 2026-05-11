---
**date:** 2026-05-08
**status:** To be validated
**description:** Extension du champ arrowDir des arêtes pour accepter la valeur "from" en plus de "to", "both" et "none", avec un quatrième bouton edgeBtnFrom dans la barre de propriétés et propagation dans le rendu canvas et le MCP create_diagram.
**tags:** diagram, edge, arrowDir, arrowhead, edge-panel, edgeBtnFrom, drawPortEdge, visEdgeProps, create_diagram, normalizeArrowDir
---

# Direction de flèche `from` sur les arêtes

## Contexte

Le champ `arrowDir` d'une arête acceptait jusqu'ici trois valeurs : `to` (tête à l'extrémité destination, valeur par défaut), `both` (tête aux deux extrémités), et `none` (aucune tête). Conséquences :

- Impossible de modéliser une relation où la flèche pointe **uniquement vers la source** sans en réécrire le sens (inverser `from`/`to` côté donnée, ce qui casse l'évidence documentaire). Cas concret : un widget de tablette qui *est piloté par* le serveur — on veut écrire l'arête `serveur → tablette` mais afficher la tête côté serveur pour signaler le flux de contrôle inverse.
- L'API MCP `create_diagram` rejetait `arrowDir: "from"` avec une erreur `Allowed: to, both, none`, ce qui forçait l'agent à inverser les sommets de l'arête et à perdre l'alignement avec la documentation.

## Décision

### 1. Ajout de la valeur `from`

- [src/mcp/tools/diagrams.ts](src/mcp/tools/diagrams.ts) — `type ArrowDir = 'to' | 'from' | 'both' | 'none'`, `VALID_ARROW_DIRS` étendu, message d'erreur de `normalizeArrowDir` mis à jour.
- [src/frontend/diagram/edge-rendering.js](src/frontend/diagram/edge-rendering.js) — `visEdgeProps()` active `arrows.from` quand `arrowDir === 'from'` ou `'both'`.
- [src/frontend/diagram/ports.js](src/frontend/diagram/ports.js) — `drawPortEdge()` dessine la tête source quand `drawFrom = arrowDir === 'from' || arrowDir === 'both'`. Cela couvre les arêtes port-anchored qui contournent vis-network pour leur rendu Bezier.

### 2. Bouton `edgeBtnFrom` dans la barre de propriétés d'arête

[src/frontend/diagram/edge-panel.js](src/frontend/diagram/edge-panel.js) — `showEdgePanel()` ajoute un quatrième bouton entre `edgeBtnNone` et `edgeBtnTo`. La table de correspondance `arrowDir → buttonId` est étendue, et la classe `edge-btn-active` migre vers le nouveau bouton si la valeur le justifie. Le bouton est wiré dans le HTML et i18n-isé via `data-i18n`.

### 3. Compat ascendante

`arrowDir` reste optionnel et garde `to` comme defaut quand omis. Les diagrammes persistés avant ce changement continuent de se charger sans modification : la nouvelle valeur n'apparaît que si l'utilisateur (ou un appel MCP) la sélectionne explicitement.

## Conséquences

### PROS

- Les quatre directions sémantiques (`none`, `from`, `to`, `both`) couvrent maintenant tous les cas usuels sans devoir inverser les sommets d'une arête.
- Le MCP est aligné avec l'éditeur : un agent peut générer un diagramme avec `arrowDir: "from"` et l'utilisateur n'a pas besoin de corriger à la main.
- Le code des deux pipelines de rendu (vis-network natif et port-anchored Bezier) traite désormais `from` symétriquement à `both` pour la tête source.

### CONS

- L'ordre visuel des quatre boutons dans la barre (`none / from / to / both`) impose un coup d'œil pour distinguer `from` et `to` ; atténué par les icônes différenciées et les tooltips i18n.
- Ajoute une valeur au vocabulaire que tout futur outil de migration / export devra connaître (Notion, Confluence, HTML). L'exporteur HTML est canvas-based donc transparent ; les autres exporters textuels ignorent `arrowDir`.
