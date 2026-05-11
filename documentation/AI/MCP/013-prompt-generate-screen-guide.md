[user]
## Screen-guide diagram — source code IS the reference

A screen guide is an annotated screenshot built in **three layers**:
1. the screenshot image as background,
2. translucent `box` overlays covering each major layout region (zones),
3. `post-it` callouts for each first-level feature, linked to the UI by
   free-end arrows.

**The source code is the authoritative reference**, not the Markdown docs.
No ADR describes every button.

## ⚠️ Explicit-request check
Only proceed if the user explicitly asked for a *screen guide*, *UI guide*, or *annotated screenshot*.

## Step 1 — Resolve the screen source

Ask the user which screen to document (e.g. `src/frontend/index.html`). Then call `read_source_file` on it.

If the screen pulls in components or partials, use `search_source` + `read_source_file` to follow them. Cap at ~5 files total — enough to identify zones and first-level features, not to trace every dependency.

## Step 2 — Identify layout zones (YOU decide, do not ask)

Scan the screen structure for **major visual regions** that partition the layout. Typical zones:
- Left / right sidebar or drawer
- Top bar / header
- Main content area
- Footer
- Right panel

Pick **2–5 zones**. For each zone, capture:
- `name` — 1–3 words ("Top Bar", "Collapsible Drawer", "Main Page").
- `color` — one distinct color per zone. Suggested rotation: `c-red, c-amber, c-cyan, c-sky, c-lime, c-teal`. Never reuse a color between two zones.

You will need the zone's bounding box on the screenshot (left/top/width/height in pixels) — you'll compute that once the user provides the screenshot.

## Step 3 — Identify first-level features (YOU decide, do not ask)

A **first-level feature** is:
- **Visible on screen** without any interaction (a button, toggle, input, primary navigation element, filter).
- **Changes user-facing behavior significantly** when used (navigates, filters, toggles mode, opens a panel, searches).

NOT a first-level feature:
- Decorative elements (logos, dividers, icons without action).
- Controls nested inside a panel/modal that only appears after clicking something.
- Pure labels / static text.
- Duplicate controls (if the same action has two buttons, count it once).

Typical count: **4–10** features. Do not pad with minor buttons; do not omit obvious ones.

For each feature, capture:
- `name` — 2–5 words, title-cased ("Collapsible Drawer", "Dark / Light Mode", "Text Search in all documents"). Multi-line via `\n` allowed when needed.
- `kind`:
  - `interactive` — standard button, link, input, toggle. **Default.**
  - `differentiating` — a feature that distinguishes the product from alternatives ("Professional Diagram Editor", "Word Cloud Generator"). Reserve for the 1–3 truly distinguishing features.
- `target` — which UI element / zone it points to (used to place the anchor and the post-it).

**Color assignment for feature callouts:**
- `interactive` → `c-amber` or `c-orange` (yellow family). Default.
- `differentiating` → a distinct non-yellow color (`c-purple`, `c-rose`, `c-red`, `c-sky`, `c-teal`, `c-green`). Never yellow.

## Step 4 — Request the screenshot and WAIT

Tell the user:

> I identified N zones and M first-level features in `<file>`:
> - Zones: [comma-separated names]
> - Features: [comma-separated names, annotated with "(diff)" for the differentiating ones]
> I now need a screenshot of this screen. Two options:
> (a) Save the PNG into `./documentation/images/<name>.png` inside your docs folder.
> (b) Paste or drop the image into any existing diagram in the editor — it uploads automatically and returns a URL like `/images/xxx.png`.
> Please reply with (1) the URL, and (2) the natural pixel width × height of the image.

**Then stop.** Do not call `create_diagram` yet.



## Step 5 — Build the diagram

Coordinate system: screen-guide positions align to **screenshot pixels** (canvas centre is origin), NOT to the 40-unit grid. Use the pixel dimensions the user provided.

### Nodes

**A. Background image** (one node, `locked`):
```json
{ "type": "image", "name": "screenshot", "imageSrc": "<URL>",
  "width": <imgW>, "height": <imgH>, "x": 0, "y": 0, "locked": true }
```

**B. Zone overlays** (one per zone, `locked`, translucent):
```json
{ "type": "box", "name": "", "color": "<zone color>",
  "bgOpacity": 0.18, "locked": true,
  "width": <zoneW>, "height": <zoneH>,
  "x": <zoneCenterX>, "y": <zoneCenterY> }
```

**C. Zone labels** (one post-it per zone, **same color as the zone**):
```json
{ "type": "post-it", "name": "<zone name>", "color": "<zone color>",
  "x": <inside zone>, "y": <inside zone>, "locked": true }
```

**D. Feature callouts** (one post-it per feature, placed **outside** the screenshot):
```json
{ "type": "post-it", "name": "<feature name>",
  "color": "<c-amber for interactive, distinct non-yellow for differentiating>",
  "x": <outside screenshot>, "y": <outside screenshot> }
```
Spread them in horizontal bands above/below the image and/or vertical columns left/right of it. Keep callouts close to their target so the arrow reads naturally.

**E. Anchors** (one per feature callout, placed on the target pixel — 8×8, invisible at rest):
```json
{ "type": "anchor", "name": "a1", "color": "c-gray",
  "x": <target pixel x>, "y": <target pixel y> }
```
Use short unique names (`a1`, `a2`, …) — anchors are invisible so the label does not matter.

### Edges

For each feature callout, emit one directed edge from the post-it to its anchor, with an **empty** label:
```json
{ "from": "<post-it name>", "to": "a1", "label": "" }
```

If you do not know exact target coordinates, you may omit the anchor and the `to` field — the edge renders a free-end arrow the user can drag:
```json
{ "from": "<post-it name>", "label": "" }
```

**Prefer anchors.** The free-end fallback is a shortcut when pixel targets are unknown.

**Never** point edges at the image node itself — every arrow would converge on the image centre.

## Step 6 — Call `create_diagram`

```json
{
  "diagramType": "screen-guide",
  "userRequestedExplicitly": true,
  "title": "Screen guide — <screen name>",
  "nodes": [ /* image + zone boxes + zone labels + feature callouts + anchors */ ],
  "edges": [ /* one edge per feature callout → its anchor */ ]
}
```