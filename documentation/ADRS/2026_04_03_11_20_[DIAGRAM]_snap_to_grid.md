---
`🗄️ ADR : 2026_04_03_11_20_[DIAGRAM]_snap_to_grid.md`
**date:** 2026-04-03
**status:** SuperSeeded by 2026_04_15_[DIAGRAM]_alignment_guides_center_snap_hitbox_fix_and_state_persistence.md
**description:** Correction du snap-to-grid utilisant shape.width/height pour l'alignement visuel des bords, et correction du décalage DPR de la grille sur les écrans Retina en multipliant les coordonnées CSS-pixels de vis.js par devicePixelRatio.
**tags:** diagram, snap-to-grid, grille, DPR, retina, vis-network, rendu, bounding-box, shape
---

## Contexte

L'éditeur de diagrammes propose une fonctionnalité de snap-to-grid (grille de 40px en unités monde). Lorsque l'utilisateur relâche un nœud après l'avoir déplacé, celui-ci doit s'aligner de sorte que son **bord gauche s'aligne sur une ligne verticale de la grille** et son **bord supérieur s'aligne sur une ligne horizontale de la grille**.

Deux bugs étaient présents.

### Bug 1 , Le snap s'appliquait au centre, pas au bord visuel

L'implémentation d'origine appliquait un snap de `(x, y)` (le centre du nœud vis.js) au multiple le plus proche de `GRID_SIZE` :

```js
network.moveNode(id, snapToGrid(p.x), snapToGrid(p.y));
```

Les dimensions des nœuds n'étant pas des multiples de 40, les bords visuels gauche et supérieur atterrissaient à des positions arbitraires entre les lignes de la grille.

Une deuxième tentative utilisait `network.getBoundingBox(id)` pour obtenir `{left, top, right, bottom}` et appliquait le snap sur ces valeurs. Cela était également incorrect :

- Pour les formes `box`, `getBoundingBox` gonfle la boîte de `borderRadius` (5px par défaut) de tous les côtés, donc `bb.left ≠` le bord visuel gauche du rectangle dessiné.
- Pour `actor` (`ctxRenderer` personnalisé), `shape.updateBoundingBox` utilise `this.options.size` (25 par défaut) plutôt que `nodeDimensions` déclaré (30 × 52), donc la boîte englobante est entièrement erronée.

### Bug 2 , Les lignes de la grille étaient désalignées sur les écrans Retina/HiDPI

`drawGrid` dessine dans l'espace des pixels physiques (après `ctx.setTransform(1,0,0,1,0,0)`), mais calculait le pas et le décalage en unités de pixels CSS :

```js
const step = GRID_SIZE * scale; // pixels CSS , incorrect dans l'espace physique
const offsetX = (((W / 2 - center.x * scale) % step) + step) % step;
```

`canvas.width` (`W`) est en pixels physiques ; `center.x` et `scale` sont en coordonnées CSS-pixels de vis.js. Sur un écran Retina (DPR = 2), cela entraîne un rendu de la grille à la moitié de l'espacement correct et décalé, de sorte que même les nœuds correctement alignés paraissent désalignés par rapport aux lignes visibles de la grille.

## Décision

### Correction du snap

Lire les dimensions visuelles réelles directement depuis `network.body.nodes[id].shape.width` et `.shape.height`, qui sont définies par la méthode `resize()` de la forme à chaque appel de rendu et reflètent la taille réelle affichée pour tous les types de formes (`box`, `ellipse`, `circle`, `database`, `actor`).

```js
const bodyNode = network.body.nodes[id];
const w = bodyNode.shape.width || 0;
const h = bodyNode.shape.height || 0;
const cx = bodyNode.x;
const cy = bodyNode.y;
const snappedLeft = Math.round((cx - w / 2) / GRID_SIZE) * GRID_SIZE;
const snappedTop = Math.round((cy - h / 2) / GRID_SIZE) * GRID_SIZE;
network.moveNode(id, snappedLeft + w / 2, snappedTop + h / 2);
```

Cela fonctionne uniformément pour tous les types de formes : `cx - w/2` est toujours le bord visuel gauche et `cy - h/2` est toujours le bord visuel supérieur, indépendamment du rayon de bordure, de l'extension d'étiquette ou du renderer personnalisé.

### Correction du DPR de la grille

Multiplier le pas et le décalage par `window.devicePixelRatio` lorsqu'on travaille dans l'espace des pixels physiques :

```js
const dpr = window.devicePixelRatio || 1;
const step = GRID_SIZE * scale * dpr;
const offsetX = (((W / 2 - center.x * scale * dpr) % step) + step) % step;
const offsetY = (((H / 2 - center.y * scale * dpr) % step) + step) % step;
```

`beforeDrawing` est émis après que vis.js appelle `ctx.save()`, `ctx.translate(tx, ty)` et `ctx.scale(vs, vs)` en plus de la mise à l'échelle DPR. Après `ctx.setTransform(1,0,0,1,0,0)`, l'espace est en pixels physiques, donc toutes les quantités CSS-pixels de vis.js doivent être multipliées par DPR pour correspondre.

## Conséquences

### AVANTAGES

- Les bords gauche et supérieur des nœuds atterrissent désormais exactement sur les lignes de la grille après un glisser-déposer, pour tous les types de formes.
- Les lignes de la grille et les bords des nœuds alignés sont visuellement coïncidents sur les écrans standard (DPR=1) comme sur les écrans Retina (DPR=2+).
- La correction est uniforme pour tous les types de formes , pas de cas particuliers par forme.

### INCONVÉNIENTS

- `shape.width/height` sont des propriétés internes de vis-network , elles doivent être revérifiées en cas de mise à niveau de vis-network.
- `network.getBoundingBox()` n'est **pas** adapté aux calculs de snap et ne doit pas être utilisé à cette fin.