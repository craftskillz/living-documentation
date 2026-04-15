---
`🗄️ ADR : 2026_04_15_[DIAGRAM]_port_ellipse_database_fix_stamp_bug_and_size_stamp.md`
**date:** 2026-04-15
**status:** Pending Validation
**description:** Fix port positions for ellipse (H forced to W only for circle) and database (dedicated PORT_OFFSETS_DATABASE with diagonals at wall edge), fix stamp crash caused by missing btnStampRotation element, and add a third size stamp to copy nodeWidth/nodeHeight between shapes.
**tags:** diagram, ports, ellipse, database, cylinder, port-offsets, CIRCULAR_SHAPES, stamp, color-stamp, font-stamp, size-stamp, btnStampRotation, btnStampSize, applyStamp, STAMP_BTNS, getNodeAtDOMPoint, nodeWidth, nodeHeight
---

## Context

Three independent bugs/improvements discovered in the diagram editor:

### 1. Port positions wrong for ellipse
`nodeGeometry()` in `ports.js` forced `H = W` for all `CIRCULAR_SHAPES` (which included both `circle` and `ellipse`). This made the ellipse behave like a circle for port calculations: all 8 attachment points were placed on a circle of radius `W/2` instead of the actual ellipse boundary. Arrows visually ended up detached from the shape.

### 2. Port positions wrong for database (cylinder)
The database shape used `PORT_OFFSETS_RECT` (rectangular corners), placing the NE/NW/SE/SW ports at the bounding box corners which extend outside the cylinder's visual silhouette. Arrowheads at diagonal ports were hidden inside the shape or visually detached.

Adding `database` to `CIRCULAR_SHAPES` was tried but produced diagonal ports too deep inside the cylinder (CIRC offsets at `SQRT2_INV ≈ 0.707` place them on an ellipse rather than at the cylinder wall).

### 3. Stamp crash + missing size stamp
The color and font-size stamps (`btnStampColor`, `btnStampFontSize`) never worked: `STAMP_BTNS` referenced `rotation: 'btnStampRotation'` which no longer existed in the HTML. `document.getElementById('btnStampRotation')` returned `null`, and `null.classList` crashed both `activateStamp` and `cancelStamp` silently — the stamp appeared to activate (cursor became crosshair) but the apply always failed. Additionally, no stamp existed for shape dimensions.

## Decision

### Ellipse port fix (`ports.js`)

`H` is now forced to `W` only for `circle`, preserving the actual height for all other shapes:

```js
// Before (buggy):
const H = CIRCULAR_SHAPES.has(shapeType) ? W : (n.nodeHeight || defaults[1]);

// After:
const H = shapeType === 'circle' ? W : (n.nodeHeight || defaults[1]);
```

### Database port offsets (`ports.js`)

`database` is kept out of `CIRCULAR_SHAPES`. A dedicated `PORT_OFFSETS_DATABASE` is defined where diagonal ports sit at the cylinder wall (`x = ±1`) at the junction between the straight body and the elliptic cap:

```js
// ry = H × 0.12 → body_top_frac = 1 − 2×0.12 = 0.76
const PORT_OFFSETS_DATABASE = {
  N:  [ 0,     -1    ], NE: [ 1,     -0.76 ],
  E:  [ 1,      0    ], SE: [ 1,      0.76 ],
  S:  [ 0,      1    ], SW: [-1,      0.76 ],
  W:  [-1,      0    ], NW: [-1,     -0.76 ],
};
```

`getPortPosition` selects offsets via:
```js
const offsets = shapeType === 'database'      ? PORT_OFFSETS_DATABASE
             : CIRCULAR_SHAPES.has(shapeType) ? PORT_OFFSETS_CIRC
             : PORT_OFFSETS_RECT;
```

### Stamp crash fix + size stamp (`node-panel.js`, `main.js`, `diagram.html`, i18n)

- Removed `rotation: 'btnStampRotation'` from `STAMP_BTNS` (button was removed from HTML but constant not updated).
- Added `size: 'btnStampSize'` to `STAMP_BTNS`.
- `applyStamp` handles `type === 'size'`: copies `nodeWidth` and `nodeHeight` from source to targets.
- New button `btnStampSize` added to node panel in `diagram.html` (after font-size stamp), with an SVG icon showing a small rectangle with resize arrows.
- Wired in `main.js` mousedown (target capture) and click (`activateStamp('size')`).
- i18n keys `diagram.node_panel.stamp_size` added to `en.json` and `fr.json`.

## Consequences

### PROS

- Ellipse port arrows now connect correctly to the actual ellipse boundary regardless of aspect ratio.
- Database (cylinder) diagonal ports sit exactly at the wall/cap junction — arrowheads are fully visible and visually correct.
- Color and font-size stamps now work reliably (the silent crash is gone).
- Size stamp completes the format-painter trio: users can now propagate color, font size, and dimensions independently between shapes.
- `PORT_OFFSETS_DATABASE` constant is self-documenting and easy to tune if the cylinder cap ratio (`H × 0.12`) changes.

### CONS

- `PORT_OFFSETS_DATABASE` hardcodes `y = ±0.76` derived from `ry = H × 0.12`. If the database renderer's cap ratio changes, this constant must be updated manually — there is no runtime coupling between the two.
- The size stamp copies raw `nodeWidth/nodeHeight` values; if the source shape uses default dimensions (`null`), targets are also reset to their own defaults, which may not be the intended behaviour in all cases.
