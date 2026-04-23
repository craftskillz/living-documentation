---
`🗄️ ADR : 2026_04_20_[DIAGRAM]_edge_label_resize_box_text_wrap_and_background.md`
**date:** 2026-04-20
**status:** Validated
**description:** Add a resizable label box to edge labels: dashed border (selection mode only), drag handles for symmetric width resize, text wrapping at fixed width, and an opaque canvas-background fill behind the text so the arrow line appears to pass cleanly behind the label.
**tags:** diagram, edge, label, label-box, resize, text-wrap, wrapText, edgeLabelWidth, edgeLabelBBox, dashed-border, handles, background-fill, drawPortEdge, drawEdgeLabels, ports.js, network.js, symmetric, center-fixed, dragView, persistence
---

## Context

Edge labels were rendered as single-line transparent text directly on top of the arrow line. Two visual problems:

1. The arrow line passing through the label text made it hard to read (text and line confused).
2. Long labels had no way to wrap — they extended infinitely in one direction.

A simple solid-white background was rejected because it would cover an excessively wide area of the arrow when `edgeLabelWidth` is set wide, making the diagram harder to understand.

## Decision

### `wrapText` utility (`ports.js`)

New exported function `wrapText(ctx, text, maxWidth)` splits text on whitespace, measuring each candidate line with `ctx.measureText()`, and returns an array of wrapped lines. Called only when `edgeLabelWidth` is set on the edge.

### Label box rendering (both `drawPortEdge` in `ports.js` and `drawEdgeLabels` in `network.js`)

Both renderers now share the same label rendering pipeline:

1. Set font, compute `fontSize`, `lineHeight = fontSize * 1.5`, `PAD_X = 6`, `PAD_Y = 4`.
2. If `edgeLabelWidth` is set: wrap text to `innerW = edgeLabelWidth - PAD_X * 2`; `textW = innerW`. Otherwise: `textW = ctx.measureText(label).width`.
3. Compute `boxW = textW + PAD_X * 2`, `boxH = lines.length * lineHeight + PAD_Y * 2`.
4. **Always** store `st.edgeLabelBBox[edgeId] = { cx, cy, w: boxW, h: boxH, rotation }` in canvas world coords (used by resize handles and hit detection regardless of selection state).
5. Draw an **opaque background fill** (`#f9fafb` light / `#030712` dark) tightly around the text only (`textW + 3px padding` each side), not the full box — the arrow appears to pass behind.
6. Draw the **dashed border** (`#9ca3af`, 0.8px, `[3,3]` dash) only when the edge is in `st.selectedEdgeIds`.
7. Render text lines centered at `(0, y)` in the rotated local coordinate system.

### Resize handles (`network.js`, `initNetwork`)

- `afterDrawing` draws two orange circles at `(±bbox.w/2, 0)` in label-local space when exactly one edge is selected and has a label.
- `container mousemove` (non-capture) tracks `_hoverHandle = { edgeId, bboxCx, bboxCy, rotation }` by iterating `st.selectedEdgeIds` and checking hit radius `8 / scale` in label-local coords. Sets `cursor: ew-resize` on hover.
- `container mousedown` (capture): if `_hoverHandle` is set, sets `_lr` and immediately calls `st.network.setOptions({ interaction: { dragView: false } })` — disabling canvas pan before any mouse movement (panning only starts on move, so this is race-free).
- `document mousemove`: on first move pushes snapshot, then computes `edgeLabelWidth = max(40, 2 * |localX|)` (symmetric, center fixed) and updates the DataSet.
- `document mouseup`: re-enables `dragView`, clears `_lr`, calls `markDirty()`.

### Reset button

A `↔` button (`btnEdgeLabelWidthReset`) added to the edge panel calls `resetEdgeLabelWidth()` which sets `edgeLabelWidth: null`, returning to auto-width single-line rendering.

### Persistence

`edgeLabelWidth` added to the edge serialization map in `persistence.js`.

## Consequences

### PROS

- Labels are now cleanly readable — the canvas background fill creates a "line passes behind text" effect that matches standard diagram tool conventions (draw.io, Mermaid).
- Background fill is tight around the actual text, not the resize box — minimal arrow coverage.
- Text wrapping enables concise multi-line annotations on edges without requiring very long single-line labels.
- Resize is fully interactive (drag) with center-fixed symmetric behavior; no Shift key required.
- The `dragView: false` technique (borrowed from the free-arrow body drag) prevents any canvas pan conflict during resize — no Shift/selection-box side effects.
- Dark mode supported automatically.

### CONS

- `edgeLabelBBox` is always recomputed on every render frame (in both renderers), adding a small per-edge cost.
- The background fill color is hardcoded to match `bg-gray-50`/`bg-gray-950` — if the canvas background is changed in CSS, the label background must be updated manually.
- Multi-line wrapped text bbox uses `innerW` as the background width even if individual lines are shorter — a slight over-cover for the last line.
- `_hoverHandle` pre-computation in mousemove means handles are only detectable on edges that are already selected (correct for UX, but handle visibility lags one frame after selection on first hover).
