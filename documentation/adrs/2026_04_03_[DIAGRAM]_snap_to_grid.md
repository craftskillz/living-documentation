`🗄️ ADR : 2026_04_03_[DIAGRAM]_snap_to_grid.md`

**Date:** 2026-04-03
**Status:** Accepted

## Context

The diagram editor supports a snap-to-grid feature (40px world-unit grid). When the user drops a node after dragging, it should snap so that its **left edge aligns on a vertical grid line** and its **top edge aligns on a horizontal grid line**.

Two bugs were present.

### Bug 1 — Snap was applied to the center, not the visual edge

The original implementation snapped `(x, y)` (the vis.js node centre) to the nearest multiple of `GRID_SIZE`:

```js
network.moveNode(id, snapToGrid(p.x), snapToGrid(p.y));
```

Because node dimensions are not multiples of 40, the visual left/top edges would land at arbitrary positions between grid lines.

A second attempt used `network.getBoundingBox(id)` to get `{left, top, right, bottom}` and snapped those. This was also incorrect:

- For `box` shapes, `getBoundingBox` inflates the box by `borderRadius` (default 5 px) on all sides, so `bb.left ≠` the visual left edge of the drawn rectangle.
- For `actor` (custom `ctxRenderer`), `shape.updateBoundingBox` uses `this.options.size` (default 25) rather than the declared `nodeDimensions` (30 × 52), so the bounding box is entirely wrong.

### Bug 2 — Grid lines were misaligned on Retina/HiDPI displays

`drawGrid` draws in physical pixel space (after `ctx.setTransform(1,0,0,1,0,0)`), but computed the step and offset in CSS pixel units:

```js
const step    = GRID_SIZE * scale;           // CSS pixels — wrong in physical space
const offsetX = ((W/2 - center.x * scale) % step + step) % step;
```

`canvas.width` (`W`) is in physical pixels; `center.x` and `scale` are in vis.js CSS-pixel coordinates. On a Retina display (DPR = 2) this causes the grid to be rendered at half the correct spacing and shifted, so even correctly-snapped nodes appear misaligned with the visible grid lines.

## Decision

### Snap fix

Read the actual visual dimensions directly from `network.body.nodes[id].shape.width` and `.shape.height`, which are set by the shape's `resize()` method on every draw call and reflect the true rendered size for all shape types (`box`, `ellipse`, `circle`, `database`, `actor`).

```js
const bodyNode = network.body.nodes[id];
const w  = bodyNode.shape.width  || 0;
const h  = bodyNode.shape.height || 0;
const cx = bodyNode.x;
const cy = bodyNode.y;
const snappedLeft = Math.round((cx - w / 2) / GRID_SIZE) * GRID_SIZE;
const snappedTop  = Math.round((cy - h / 2) / GRID_SIZE) * GRID_SIZE;
network.moveNode(id, snappedLeft + w / 2, snappedTop + h / 2);
```

This works uniformly for all shape types: `cx - w/2` is always the visual left edge and `cy - h/2` is always the visual top edge, regardless of border radius, label extension, or custom renderer.

### Grid DPR fix

Multiply step and offset by `window.devicePixelRatio` when working in physical pixel space:

```js
const dpr  = window.devicePixelRatio || 1;
const step = GRID_SIZE * scale * dpr;
const offsetX = ((W / 2 - center.x * scale * dpr) % step + step) % step;
const offsetY = ((H / 2 - center.y * scale * dpr) % step + step) % step;
```

`beforeDrawing` is emitted after vis.js calls `ctx.save()`, `ctx.translate(tx, ty)`, and `ctx.scale(vs, vs)` on top of the DPR scaling. After `ctx.setTransform(1,0,0,1,0,0)` the space is physical pixels, so all vis.js CSS-pixel quantities must be multiplied by DPR to match.

## Consequences

- Node left/top edges now land exactly on grid lines after a drag, for all shape types.
- Grid lines and snapped node edges are visually coincident on both standard (DPR=1) and Retina (DPR=2+) displays.
- `shape.width/height` are internal vis-network properties — they should be re-verified if vis-network is upgraded.
- `network.getBoundingBox()` is **not** suitable for snap calculations and should not be used for this purpose.
