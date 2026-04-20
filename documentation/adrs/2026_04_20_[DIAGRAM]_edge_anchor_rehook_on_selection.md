---
`🗄️ ADR : 2026_04_20_[DIAGRAM]_edge_anchor_rehook_on_selection.md`
**date:** 2026-04-20
**status:** Pending Validation
**description:** Allow users to change the attachment port of an existing port edge by clicking the edge to select it, then clicking a different port dot on either the source or target node to reconnect that end of the arrow.
**tags:** diagram, ports, attachment-points, rehook, edge-reconnect, port-dots, afterDrawing, mousemove, onClickNode, _rehookEdgeId, onSelectEdge, onDeselectAll, vis-network, event-order
---

## Context

Port edges connect two shapes via explicit attachment points (N/NE/E/SE/S/SW/W/NW). Once created, the anchor ports were immutable — the only way to change them was to delete and recreate the edge. This was friction-heavy for diagram editing.

The desired UX: click an existing arrow → port dots appear on both endpoint shapes → hover highlights the nearest dot → click a dot to reconnect that end to the new port.

## Decision

Three changes to `network.js`:

**1. `_rehookEdgeId` state** — three module-level variables track the rehook context:
- `_rehookEdgeId`: ID of the selected port edge (set on edge selection, cleared on empty-space click).
- `_rehookHoveredNodeId` / `_rehookHoveredPortKey`: the node and port currently highlighted under the cursor.

**2. `afterDrawing` overlay** — when `_rehookEdgeId` is set and the tool is not `addEdge`, port dots are drawn on both endpoint nodes via `drawPortDots()`, with the hovered port highlighted in solid orange.

**3. Dedicated `mousemove` listener** — runs only in rehook mode (edge selected, not in addEdge, no anchor dragging). For each of the two endpoint nodes it calls `getNearestPort()` + `getPortPosition()`, keeps the closest one within a 15-world-unit threshold (comparing both nodes to avoid always favouring `from`), and triggers a redraw on change.

**4. `onClickNode` intercept** — first handler in `onClickNode`. If `_rehookEdgeId`, `_rehookHoveredNodeId`, and `_rehookHoveredPortKey` are all set, it updates `fromPort` or `toPort` on the edge, pushes a snapshot, and restores the edge selection via `setTimeout`.

**Event-order fix** — vis-network fires `deselectEdge` → `onDeselectAll` *before* the `click` event when the user clicks a port dot that lies on a node. Clearing rehook state in `onDeselectAll` would destroy the context needed by the click handler. The fix: `onDeselectAll` no longer clears rehook variables; the `mousemove` listener clears them naturally once the edge is no longer selected, and `onClickNode` clears them explicitly after an empty-space click.

**`onSelectEdge` update** — `_rehookEdgeId` is also set here (and in the three manual-selection paths in `onClickNode`) so port dots appear immediately on click without requiring a mouse move.

## Consequences

### PROS

- Full port mutability without deleting and recreating edges.
- Consistent visual feedback: same orange port-dot style as edge creation.
- Event-order fix is minimal and isolated — no impact on non-port edges or other tools.
- Closest-port selection across both nodes prevents ambiguity when shapes are near each other.

### CONS

- `onDeselectAll` no longer clears rehook state, which means stale `_rehookEdgeId` can survive briefly until the next mousemove. In practice this is invisible to the user but is a subtle invariant to be aware of when debugging.
- The 15-world-unit snap threshold is fixed; at very high zoom levels the clickable area for a port dot is larger than the threshold, which may occasionally require a more precise click.
