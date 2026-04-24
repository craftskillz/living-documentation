---
`🗄️ ADR : 2026_04_20_[DIAGRAM]_free_arrow_two_click_anchor_pivot_and_snap_to_connect.md`
**date:** 2026-04-20
**status:** Accepted
**description:** Replace double-click free arrow creation with a two-click flow (click 1 = origin, click 2 = destination), fix anchor pivot so dragging a single endpoint moves only that endpoint, and add snap-to-connect so dragging an anchor endpoint near a shape or another anchor merges the connection with port attachment.
**tags:** diagram, free-arrow, anchor, two-click, pivot, snap-to-connect, addEdge, port, dragEnd, Hammer.js, vis-network, freeArrowFirstPoint, _onAnchorSnapConnect, port-dots, _draggingAnchorIds
---

## Context

Free-standing arrows (anchor→anchor edges) existed since the port-anchored-edges ADR. Three UX problems accumulated:

1. **Creation via double-click** was the original flow but conflicted with label editing and felt non-standard. Users expected the same two-click pattern as drawing a connection between shapes.
2. **Dragging a single anchor endpoint** moved the entire arrow instead of pivoting only that end, because the capture-phase body-drag handler called `getEdgeAt()` at the anchor position (which returned the connected edge) before checking for nodes.
3. **No way to connect a free arrow endpoint to a shape** — once created, free arrows were always free-floating with no way to anchor them to shapes or other anchors.

## Decision

### Two-click free arrow creation

- Replaced the `onDoubleClick` free-arrow branch with a `st.network.on('click', ...)` handler using vis-network's Hammer.js tap detection.
- First click on empty canvas sets `st.freeArrowFirstPoint = { x, y }` (canvas coords). An orange dot indicator is drawn in `afterDrawing`.
- Second click creates both anchor nodes and the edge in one operation, inheriting the last free-arrow style (`getLastFreeArrowStyle()`).
- Path A (drag from real node) clears any pending origin via `if (nodeId) st.freeArrowFirstPoint = null` in the mousedown handler — Hammer.js tap events never fire on drags so Path A and Path B cannot interfere.
- `st.freeArrowFirstPoint` is reset in `setTool()` when leaving addEdge mode.

### Anchor pivot fix

- In the capture-phase body-drag mousedown handler, added `if (st.network.getNodeAt(domPos)) return;` **before** the `getEdgeAt()` call.
- `getEdgeAt()` at an anchor position returns the connected edge (arrowhead is drawn at the anchor). `getNodeAt()` returns the anchor node. The guard routes anchor clicks to vis-network's normal node-drag, enabling single-endpoint pivot.

### Snap-to-connect

- New module-level function `_onAnchorSnapConnect(params)` called first in the `dragEnd` handler.
- For each dragged anchor node: finds the best snap target within a 30 canvas-unit threshold.
  - Regular node: anchor must land within the node's bounding box ± threshold.
  - Another anchor: distance must be < threshold. Self-loops blocked by skipping sibling anchor IDs.
- On snap: updates `edge.from`/`edge.to` to the target, sets `fromPort`/`toPort` (nearest port via `getNearestPort()` or the currently hovered port `_hoveredPortKey`), makes the edge transparent (ghost) if ports are set, removes the orphaned anchor, calls `markDirty()`.

### Port dots during anchor drag

- Module-level `_draggingAnchorIds` (Set) populated in `onDragStart`, cleared in `dragEnd`.
- The `visCanvas mousemove` handler extended: when `_draggingAnchorIds.size > 0`, performs a canvas-space bounding-box search (instead of `getNodeAt` which returns the dragged anchor itself) to find the hovered target node.
- `_hoveredPortNodeId`/`_hoveredPortKey` and `afterDrawing` port dot rendering reused — port dots appear on hover during anchor drag exactly as in addEdge mode.

## Consequences

### PROS

- Two-click creation is consistent with other tools and doesn't conflict with double-click label editing.
- Single-endpoint pivot works correctly — only the dragged anchor moves, not the whole arrow.
- Free arrow endpoints can be connected to shapes (with port attachment) or to other anchors, enabling hybrid diagrams mixing free arrows with port-anchored edges.
- Port dots visual feedback during anchor drag guides the user to valid attachment points.
- `_onAnchorSnapConnect` calls `pushSnapshot()` only once even when multiple anchors are dragged simultaneously.

### CONS

- The two-click flow requires the user to click twice on empty canvas without moving between clicks (Hammer.js cancels tap if cursor moves > threshold).
- Snap threshold (30 canvas units) is fixed; it may feel too aggressive at high zoom or too loose at low zoom.
- `_hoveredPortNodeId` and `_hoveredPortKey` are now module-level (hoisted out of `initNetwork`) to be accessible in `_onAnchorSnapConnect` — slightly increases module-level state surface.
