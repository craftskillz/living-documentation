---
`🗄️ ADR : 2026_04_15_[DIAGRAM]_alignment_guides_center_snap_hitbox_fix_and_state_persistence.md`
**date:** 2026-04-15
**status:** Pending Validation
**description:** Replace auto-layout with alignment guides (dashed lines + snap on release for same-type nodes), change snap-to-grid to target shape centers instead of top-left corners, fix F5 hit-testing bug by resetting shape.width/height to undefined after first draw, and persist gridEnabled/alignGuides per diagram in .diagrams.json.
**tags:** diagram, alignment-guides, snap-to-grid, snap-center, hit-testing, shape-width, shape-height, refreshNeeded, needsRefresh, vis-network, persistence, gridEnabled, alignGuides, diagrams-json, toolbar-state, F5, click, getNodeAt
---

## Context

The diagram editor had several related issues around node positioning and toolbar state:

1. **Auto-layout button** was unreliable and not useful in practice — users needed a smarter positional aid.
2. **Snap-to-grid** was snapping the visual top-left corner of shapes to grid intersections, which felt unintuitive — snapping the center is more natural and consistent across shape types.
3. **F5 hit-testing bug**: after a page reload, clicking on nodes did nothing. Cmd+A then deselect fixed it. Root cause: vis-network initialises `shape.width` and `shape.height` to `50` (not `undefined`), so `needsRefresh()` returns `false`, `resize()` never runs, and `getNodeAt()` uses a 50×50 hit box instead of the actual shape dimensions.
4. **Grid and alignment guides state** was not persisted per diagram — toggling them did not activate the Save button and was not written to `.diagrams.json`.

## Decision

### Alignment Guides (`alignment.js`)

Replaced the auto-layout / physics button with an "Alignment Guides" feature:
- During drag (`dragging` event), compares the dragged node's center against all other nodes of the **same `shapeType`**.
- If centers are within `THRESHOLD = 6` world units horizontally or vertically, a dashed guide line is drawn on the canvas (via `afterDrawing`) extending `EXT = 40` world units beyond both centers.
- On drag release (`dragEnd`), if a guide is active the node snaps exactly to the aligned axis.
- Icon: solid horizontal line crossed by two dashed vertical lines (`| — |` pattern).
- State: `st.alignGuides` (default `true`). Toggle wired to `btnAlign`.

### Center snap (`grid.js`, `selection-overlay.js`)

`onDragEnd` now snaps `bodyNode.x / bodyNode.y` (the center) directly:
```js
const snappedX = Math.round(cx / GRID_SIZE) * GRID_SIZE;
const snappedY = Math.round(cy / GRID_SIZE) * GRID_SIZE;
```
New nodes created by double-click also snap their center to the nearest grid intersection if grid is enabled. Resize handles call `snapToGrid` on the center after resize ends.

### F5 hit-testing fix (`network.js`)

In `initNetwork`, a `once('afterDrawing')` handler fires after the first render. It resets `bn.shape.width = undefined` and `bn.shape.height = undefined` for every node, then calls `st.network.redraw()`. On that second render, `needsRefresh()` returns `true` (because `this.width === undefined`), vis-network's own loop calls `shape.resize(ctx)` with the correct canvas context, and correct dimensions are computed before the first user click.

```js
st.network.once('afterDrawing', () => {
  for (const id of st.network.body.nodeIndices) {
    const bn = st.network.body.nodes[id];
    if (!bn || !bn.shape) continue;
    bn.shape.width  = undefined;
    bn.shape.height = undefined;
  }
  st.network.redraw();
});
```

### Per-diagram state persistence

- `applyGridState(enabled)` and `applyAlignGuidesState(enabled)` helpers set state and sync button UI without toggling — called from `openDiagram` with `diagram.gridEnabled ?? true` / `diagram.alignGuides ?? true`.
- `toggleGrid` and `toggleAlignGuides` both call `markDirty()` so the Save button activates on toggle.
- `saveDiagram` serialises both flags into the PUT body.
- Server route (`diagrams.ts`) extracts `gridEnabled` and `alignGuides` from `req.body` and writes them to `.diagrams.json`. Default: `gridEnabled !== false` / `alignGuides !== false` (preserves `true` for old diagrams).
- Both flags default to `true` in `state.js`.

## Consequences

### PROS

- Alignment guides replace a broken auto-layout with a genuinely useful interaction pattern — snapping to same-type node axes reduces manual positioning effort.
- Center-based snap is consistent and predictable across all shape types (box, actor, database, image…).
- F5 no longer breaks click selection — the editor is fully usable immediately after reload.
- Grid and alignment guide preferences survive navigation and are stored per diagram, so each diagram can have its own layout mode.

### CONS

- The `once('afterDrawing')` double-redraw adds one extra render cycle on every diagram load — imperceptible in practice but worth noting if more post-load hooks are added.
- Alignment guides only detect same-`shapeType` nodes — cross-type alignment is intentionally excluded to reduce noise, but some users may expect broader detection.
- Resetting `shape.width/height` to `undefined` relies on vis-network's internal `needsRefresh()` implementation; if vis-network is upgraded, this assumption must be re-verified.
