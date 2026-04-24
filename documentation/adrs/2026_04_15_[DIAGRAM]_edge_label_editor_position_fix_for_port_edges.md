---
`🗄️ ADR : 2026_04_15_[DIAGRAM]_edge_label_editor_position_fix_for_port_edges.md`
**date:** 2026-04-15
**status:** Accepted
**description:** Fix the edge label editor textarea appearing at the wrong position when double-clicking port edges: root cause was that drawPortEdge never stored the bezier midpoint in st.edgeLabelCanvasPos, so startEdgeLabelEdit always fell back to the geometric midpoint which is wrong for curved bezier edges.
**tags:** diagram, edge, label, label-editor, port-edge, drawPortEdge, edgeLabelCanvasPos, bezier, midpoint, canvas-transform, textarea, ports.js, afterDrawing, fromPort, toPort, startEdgeLabelEdit
---

## Context

The diagram editor allows double-clicking an edge to open a floating textarea for in-place label editing. The textarea is positioned at the visual midpoint of the edge using coordinates stored in `st.edgeLabelCanvasPos` — populated at render time (when the canvas transform is known) so that world-space coordinates can be accurately converted to DOM CSS pixels.

There are two rendering paths for edges:

- **Non-port edges** (no `fromPort`/`toPort`): rendered by vis-network natively; custom labels drawn by `drawEdgeLabels` in the `afterDrawing` event.
- **Port edges** (`fromPort`/`toPort` defined): rendered entirely by `drawPortEdge` in `ports.js`, called from within the `_drawNodes` canvas patch.

`drawEdgeLabels` skipped port edges with `if (e.fromPort || e.toPort) return` — so `st.edgeLabelCanvasPos` was **never populated** for port edges. When `startEdgeLabelEdit` found no recorded position, it fell back to the geometric midpoint `(from + to) / 2`, which can be far from the visual centre of a curved bezier edge. This caused the textarea to open in the wrong place — sometimes displaced by hundreds of pixels in the direction opposite to the curve.

This bug only manifested when the user's diagram consisted exclusively of port edges, which is a common case when using the port attachment system.

## Decision

Modify `drawPortEdge` in `ports.js` to always compute the bezier midpoint — for every port edge, whether it carries a label or not — and store the resulting DOM position in `st.edgeLabelCanvasPos[edgeData.id]`.

The midpoint in world space:

```js
const mid =
  cp1 && cp2
    ? bezierAt(fromPos, cp1, cp2, toPos, 0.5)
    : { x: (fromPos.x + toPos.x) / 2, y: (fromPos.y + toPos.y) / 2 };
```

Conversion to DOM CSS pixels via the canvas transform matrix (identical to the approach used in `drawEdgeLabels` for non-port edges):

```js
const m = ctx.getTransform(); // physical-pixel matrix
const dpr = window.devicePixelRatio || 1;
const offsetX = canvasRect.left - containerRect.left; // canvas vs #labelInput container
st.edgeLabelCanvasPos[edgeData.id] = {
  x: (m.a * mid.x + m.e) / dpr + offsetX,
  y: (m.d * mid.y + m.f) / dpr + offsetY,
};
```

This position is stored for **all** port edges on every render frame (inside the `_drawNodes` patch where `ctx` carries the correct vis-network view transform). The label drawing section remains unchanged and is still gated by `if (edgeData.label)`.

`startEdgeLabelEdit` already prefers `st.edgeLabelCanvasPos[edgeId]` over the fallback. With port edges now populating this map, the textarea opens exactly at the visual bezier midpoint.

## Consequences

### PROS

- The textarea now opens at the visual centre of curved port edges regardless of curvature direction or magnitude.
- No change to `startEdgeLabelEdit` or the general label-editor flow — the fix is isolated to `drawPortEdge`.
- Consistent behaviour: both port and non-port edges populate `st.edgeLabelCanvasPos` at render time, giving `startEdgeLabelEdit` a single reliable source of truth.

### CONS

- `drawPortEdge` now calls `getBoundingClientRect()` on every render frame for every port edge, which is a DOM read inside the drawing loop. The performance impact is negligible at typical diagram sizes but could be noticeable with many hundreds of port edges.
- The `ctx.getTransform()` / DPR formula requires the canvas element's coordinate space to match the `_drawNodes` patch context — if vis-network's internal rendering pipeline changes in a future upgrade, this assumption must be re-verified.
