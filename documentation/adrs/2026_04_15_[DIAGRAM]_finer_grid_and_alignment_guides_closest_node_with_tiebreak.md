---
`🗄️ ADR : 2026_04_15_[DIAGRAM]_finer_grid_and_alignment_guides_closest_node_with_tiebreak.md`
**date:** 2026-04-15
**status:** Validated
**description:** Halve the grid cell size (GRID_SIZE 40 → 20) for finer positioning, and refine alignment guides detection: same-type nodes take priority per axis, any-type nodes serve as fallback, and when multiple candidates share an axis the closest one wins (tiebreak: rightmost for H, lowest for V).
**tags:** diagram, alignment-guides, snap-to-grid, grid-size, GRID_SIZE, closest-node, tiebreak, shapeType, fallback, alignment, onDragging, snapToAlignGuides, collectCandidates, pickBest
---

## Context

Two independent improvements to the diagram editor's positioning system:

1. **Grid too coarse** — `GRID_SIZE = 40` world units produced large cells that made precise positioning impractical. Users needed finer granularity without changing the overall snap behaviour.

2. **Alignment guide candidate selection was incomplete** — the previous implementation:
   - Only detected same-`shapeType` nodes, so mixed-type diagrams got no guides at all.
   - Picked the **first** matching node found in DataSet iteration order (non-deterministic), ignoring closer candidates on the same axis.
   - Had no tiebreak rule when two candidates were equidistant.

   The desired behaviour: prefer same-type nodes, fall back to any type, and among all matches on an axis pick the geometrically nearest one with a deterministic tiebreak.

## Decision

### Grid size (`constants.js`)

```js
export const GRID_SIZE = 20; // was 40
```

All consumers (`drawGrid`, `onDragEnd`, `snapToGrid`, `onResizeEnd`) reference this constant, so no other change is needed.

### Alignment guide candidate selection (`alignment.js`)

Two new private helpers replace the inline loop logic in both `onDragging` and `snapToAlignGuides`:

**`collectCandidates(draggedBody, draggedType, draggedIds)`**
Iterates all non-dragged nodes and fills four buckets:

- `sameH` / `sameV` — same `shapeType`, within `THRESHOLD` on H / V axis
- `anyH` / `anyV` — any `shapeType`, within `THRESHOLD` on H / V axis (fallback)

**`pickBest(candidates, dx, dy, axis)`**
Among a bucket's candidates, selects the one with the smallest perpendicular distance to the dragged center:

- H axis: smallest `|dx - ox|` → tiebreak: largest `ox` (rightmost)
- V axis: smallest `|dy - oy|` → tiebreak: largest `oy` (lowest)

```js
function pickBest(candidates, dx, dy, axis) {
  return candidates.reduce((best, curr) => {
    const dBest =
      axis === "h" ? Math.abs(dx - best.ox) : Math.abs(dy - best.oy);
    const dCurr =
      axis === "h" ? Math.abs(dx - curr.ox) : Math.abs(dy - curr.oy);
    if (dCurr < dBest) return curr;
    if (dCurr === dBest)
      return axis === "h"
        ? curr.ox > best.ox
          ? curr
          : best
        : curr.oy > best.oy
          ? curr
          : best;
    return best;
  });
}
```

Both `onDragging` and `snapToAlignGuides` now call:

```js
const { sameH, sameV, anyH, anyV } = collectCandidates(
  draggedBody,
  draggedType,
  draggedIds,
);
const hMatch = pickBest(sameH.length ? sameH : anyH, dx, dy, "h");
const vMatch = pickBest(sameV.length ? sameV : anyV, dx, dy, "v");
```

The two axes are evaluated independently — same-type priority can apply on H while fallback applies on V.

## Consequences

### PROS

- Finer grid (20 units) enables more precise layout without losing the snap-to-grid discipline.
- Alignment guides now work in mixed-type diagrams (any-type fallback).
- Candidate selection is deterministic regardless of DataSet iteration order.
- The tiebreak rule (`F1 -- MOI -- F2` → prefer F2) is explicit, predictable, and matches spatial intuition (prefer the node on the dominant side).
- `collectCandidates` and `pickBest` are reused by both `onDragging` and `snapToAlignGuides`, keeping the detection logic DRY.

### CONS

- `collectCandidates` iterates all nodes on every `dragging` event tick — O(n) per dragged node. Acceptable for typical diagram sizes; could be optimised with spatial indexing if diagrams grow very large.
- Halving the grid size doubles the number of grid lines drawn on screen at the same zoom level, which may feel visually busier at low zoom.
