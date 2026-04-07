---
`🗄️ ADR : 2026_04_03_[DIAGRAM]_debug_overlay.md`
**date:** 2026-04-03
**status:** Accepted
**description:** DOM-based debug overlay for diagram nodes showing centre coordinates and shape dimensions, gated by a showDiagramDebug config flag toggled from the Admin panel.
**tags:** diagram, debug, overlay, config, admin, vis-network, canvasToDOM, showDiagramDebug
---

## Context

Diagnosing snap-to-grid and rendering issues in the diagram editor requires knowing, for each node, its exact canvas centre coordinates and the dimensions that the snap logic actually uses. Without this information it is impossible to determine whether a visual misalignment comes from the snap calculation, the grid drawing, or something else.

A canvas-based overlay (`ctx.fillText`) was considered first but ruled out: canvas text is rendered as pixels and cannot be selected or copied by the user, making it impractical for sharing values during a debugging session.

## Decision

Add a DOM-based debug overlay that is:

- **Gated by a config flag** (`showDiagramDebug: boolean` in `.living-doc.json`, default `false`). The "Debug" button in the diagram editor's top bar is hidden unless this flag is `true`. It is toggled from the Admin panel ("Show debug button in diagram editor" checkbox).
- **Rendered as DOM elements** (`div.debug-box`), positioned absolutely over the canvas using `network.canvasToDOM({x, y})` to convert world coordinates to screen coordinates. This makes the text selectable and copyable.
- **Updated on every `afterDrawing` event** by recycling existing `div` elements (keyed by node id) to avoid layout thrashing.
- **Non-intrusive**: the overlay container (`#debugLayer`) has `pointer-events: none`; individual boxes have `pointer-events: auto` only for text selection.

Each box displays, for its node:

```
id : <nodeId>
cx=<center x>  cy=<center y>
w =<shape.width>   h =<shape.height>
L =<cx - w/2>   T =<cy - h/2>
```

`L` and `T` are the values fed directly into the snap calculation, so any discrepancy between them and the nearest grid multiple instantly reveals a snap bug. A crosshair was drawn at the visual centre — later removed in favour of the cleaner DOM approach.

The `showDiagramDebug` field is added to `LivingDocConfig` and whitelisted in the `PUT /api/config` route.

## Consequences

### PROS

- Debug information is always available during development without modifying code — just toggle the Admin checkbox.
- DOM text is selectable and copyable, unlike canvas-rendered text.
- The overlay repositions correctly during pan and zoom because it is rebuilt on every `afterDrawing` call using live `canvasToDOM` conversions.
- Users who never visit the Admin panel are unaffected (button hidden, no overhead).

### CONS

- `showDiagramDebug` should remain `false` in production; there is no server-side enforcement of this.
- Rebuilding DOM elements on every `afterDrawing` event has a minor layout cost at high frame rates.
