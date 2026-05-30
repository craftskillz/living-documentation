# HTML-in-Canvas Configuration Experiment

This folder is an isolated prototype for a graph-native configuration interface.

## Goal

- Explore a dynamic Living Documentation configuration surface where LLM providers and MCP connect to the central system brick.
- Make LLM providers behave like nested system bricks: they can own agent leaves and grow their polygon side count.
- Increase each system/provider polygon side count as more child nodes are added.
- Render a professional contextual configuration form through the experimental HTML-in-Canvas API when the browser supports it.
- Keep the graph centered while no node is selected, then reserve a one-third-width consultation panel after selection.
- Zoom around the pointer with the mouse wheel and pan the whole diagram by dragging empty canvas space.
- Opening the configuration panel translates the camera horizontally without changing zoom.
- Keep the default preset compact, then grow layout radii only when child count or subtree size would create collisions.
- Lengthen the root-to-provider link when a provider owns a dense agent subtree.
- Let neighboring root clusters lengthen their root links when their subtree footprints collide.
- Fit the full graph into the available workspace by zooming out only when the graph would otherwise overflow.
- Keep a DOM fallback so the same prototype remains inspectable in regular Chromium.

## Run

From the repository root:

```bash
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080/experiments/html-in-canvas-configuration/
```

To test the native HTML-in-Canvas path, use Chrome Canary or Brave Stable with:

```text
chrome://flags/#canvas-draw-element
```

Set the flag to enabled and relaunch the browser.

## Notes

The experiment intentionally does not modify the existing diagram editor. It uses the current WICG-style API shape:

- `layoutsubtree` on the canvas;
- `CanvasRenderingContext2D.drawElementImage(...)`;
- `canvas.requestPaint()`;
- `canvas.onpaint`.

When `drawElementImage` is unavailable, the graph remains canvas-rendered and the form is mounted as a normal DOM panel.
