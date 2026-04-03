`🗄️ ADR : 2026_04_03_[DIAGRAM]_vis_network_z_order_patch.md`

**Date:** 2026-04-03
**Status:** Accepted

## Context

The diagram editor (`src/frontend/diagram.html`) uses vis-network 9.1.9 to render nodes on a canvas. vis.js's `CanvasRenderer._drawNodes` performs **three rendering passes** on every frame:

1. Normal nodes (in `nodeIndices` order)
2. Selected nodes (always on top)
3. Hovered nodes (always on top of selected)

This means that hovering or selecting a node always brings it visually to the front, regardless of the user-defined z-order. The "bring to front / send to back" feature became effectively non-functional as soon as the user interacted with any node.

A first attempt intercepted `network.body.nodeIndices` via `Object.defineProperty` to prevent vis.js from reordering them. This did not work because vis.js never reorders `nodeIndices` — it simply does separate passes in addition to the main one.

## Decision

Replace `network.renderer._drawNodes` with a patched version (instance-level monkey-patch, applied immediately after `new vis.Network(...)`) that performs a **single rendering pass** in `_canonicalOrder` — an array maintained by the application that holds the user-defined z-order.

The patched function replicates the original's viewport culling logic (`isBoundingBoxOverlappingWith`) and `drawExternalLabel` callback collection, but removes the selected/hovered reordering. `this` inside the patch correctly refers to the renderer because vis.js calls it as a method (`this._drawNodes(ctx, hidden)`).

`_canonicalOrder` is kept in sync with the vis.js `DataSet` via `nodes.on('add', ...)` and `nodes.on('remove', ...)` listeners, so structural changes (add node, delete, paste) are reflected automatically.

## Consequences

- Hover and selection no longer change the visual stacking order — the user-defined z-order is always respected.
- `changeZOrder(+1/-1)` (bring to front / send to back) now works correctly and visually.
- `saveDiagram` uses `_canonicalOrder` to persist nodes in z-order so reloading restores the same stacking.
- The patch is fragile if vis-network is upgraded: `_drawNodes`'s internal signature must be re-verified against the new version's source before upgrading.
- The patch must be re-applied every time `initNetwork` is called (network destroy + recreate), which it already is.
