---
`🗄️ ADR : 2026_04_13_[DIAGRAM]_palette_couleurs_admin_et_corrections_editeur.md`
**date:** 2026-04-13
**status:** Validated
**description:** Add admin panel configuration for diagram color palettes (15 node slots + edge palette) with HSL-based border derivation using per-slot lightness ratios; default palettes persisted in config; plus editor bug fixes for free arrow copy/paste, locked node drag, textarea width, and multiline textValign.
**tags:** diagram, palette, admin, color, hsl, border-derivation, NODE_L_RATIOS, deriveNodeColors, config, diagramNodePalette, diagramEdgePalette, node-rendering, lock, drag, draggable, textarea, label-editor, textValign, multiline, copy-paste, free-arrow, anchor, clipboard
---

## Context

The diagram editor uses a fixed palette of 15 node colors and 8 edge colors. Users had no way to customise these palettes. Additionally, several bugs were present after the locking and free-arrow features were introduced:

- Free arrows (anchor→anchor edges) were not included in copy/paste because `st.selectedNodeIds` excludes anchor nodes.
- Locked nodes could still be dragged manually despite `fixed: { x: true, y: true }` being set — that flag only prevents physics, not pointer drag.
- The label editor textarea was hardcoded at 150 px wide, not adapting to the actual rendered node width.
- Multiline text with `textValign: 'top'` overflowed the top of the shape because `startY` was computed before the line count was known.

## Decision

### Admin palette configuration

A "Diagram Color Palettes" section was added to `admin.html` with:

- **15 fixed node slots** — each rendered as a colored circle swatch with an overlaid `<input type="color">` (opacity: 0). Clicking the swatch opens the native color picker.
- **Edge palette** — swatches with a × remove button, a color picker for adding new colors, and a Reset button.
- All palette changes (picker, add, remove, reset) update **local state only** — no API call is made. Palettes are persisted only when the user clicks **Save** on the main admin form, alongside title/theme/pattern.

### HSL-based border derivation

The previous `deriveNodeColors` used simple RGB multiplication (`r * 0.65`) which produced wrong hues. The new implementation:

1. Converts the bg hex to HSL.
2. Scales `L` by a per-slot lightness ratio (`NODE_L_RATIOS`) computed from the original Tailwind bg→border pairs (e.g. `border_L / bg_L` for `c-gray` = 0.667).
3. Converts back to hex, preserving hue and saturation.
4. Also computes `hbg` (hover bg, L × 0.93) and `hborder` (hover border, borderL × 0.89).

`NODE_L_RATIOS` is exported from `constants.js` and mirrored as `NODE_L_RATIOS_ADMIN` in `admin.html` (no ES module import available there).

### Default palettes in config

`config.ts` `DEFAULTS` now contains the actual bg hex arrays for both palettes instead of `null`. This means every new `.living-doc.json` ships with the default colors explicitly stored, making them visible and editable. Existing configs with `null` continue to work — the frontend falls back to `DEFAULT_NODE_PALETTE` / `DEFAULT_EDGE_PALETTE`.

### nodeColorOverrides in state

`st.nodeColorOverrides` (`state.js`) stores per-key derived colors at boot time. Node renderers call `getNodeColor(colorKey)` which checks `st.nodeColorOverrides[colorKey]` before falling back to `NODE_COLORS[colorKey]`. This allows palette overrides to apply without modifying the static constants.

### Bug fixes

**Free arrow copy/paste** — `copySelected()` in `clipboard.js` now uses `st.network.getSelectedNodes()` (which includes anchor nodes) instead of `st.selectedNodeIds` (which excludes them). Edges are included if both endpoints are in the copied set, or if the edge is directly selected.

**Locked node drag** — `draggable: false` is now set alongside `fixed: { x: true, y: true }` when locking a node or anchor. `draggable: false` prevents manual pointer drag; `fixed` prevents physics displacement.

**Textarea width** — `startLabelEdit()` in `label-editor.js` reads `bn.shape.width` (the canvas-space width set by vis-network's shape resize pass) and multiplies by `network.getScale()` to get DOM pixels, clamped to a minimum of 120 px.

**Multiline textValign top** — In `drawLabel()` (`node-rendering.js`), `lines` is now computed before `startY` so that `textValign: 'top'` correctly anchors the first line inside the shape top padding, and `textValign: 'bottom'` anchors the last line above the bottom padding.

## Consequences

### PROS

- Users can fully customise the diagram color palette from the admin panel without editing config manually.
- Border colors in admin swatches now match the vivid, saturated appearance seen in the diagram editor.
- Default palette is explicit in `.living-doc.json`, giving users a visible starting point.
- Free arrows are now correctly copied and pasted as a unit with their connected shapes.
- Locked shapes no longer drift when dragged in a multi-select operation.
- The label textarea scales with the node, making editing large shapes comfortable.
- Multiline text with `textValign: 'top'` or `'bottom'` renders correctly inside the shape bounds.

### CONS

- `NODE_L_RATIOS` is duplicated between `constants.js` and `admin.html` (no ES module import in plain HTML scripts). Must be kept in sync if ratios are ever revised.
- `draggable: false` is a vis-network internal property; it may need re-verification if vis-network is upgraded.
- Saving palettes is now coupled to the main admin Save action — users may forget their palette changes are pending if they navigate away without saving.
