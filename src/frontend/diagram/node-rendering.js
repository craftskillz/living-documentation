// ── Node rendering ────────────────────────────────────────────────────────────
// All shapes are ctxRenderers so rotation (ctx.rotate) works uniformly.
// Each renderer reads live node data from st.nodes.get(id) on every draw call
// (vis-network caches the ctxRenderer reference and never re-reads it from the
// DataSet, so dimensions/rotation/alignment must be fetched at draw time).

import { NODE_COLORS } from "./constants.js";
import { st } from "./state.js";

// ── Link indicator ────────────────────────────────────────────────────────────
// Small chain icon drawn at bottom-right of any node that has a nodeLink.
function drawLinkIndicator(ctx, id, W, H) {
  const n = st.nodes && st.nodes.get(id);
  if (!n || !n.nodeLink) return;
  const r = 7;
  const bx = W / 2 - r;
  const by = H / 2 - r;
  ctx.save();
  ctx.fillStyle = n.nodeLink.type === "url" ? "#3b82f6" : "#f97316";
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(bx, by, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1.2;
  ctx.lineCap = "round";
  // Tiny link icon inside the badge
  ctx.beginPath();
  ctx.moveTo(bx - 1.5, by + 1.5);
  ctx.lineTo(bx + 1.5, by - 1.5);
  ctx.moveTo(bx - 2.5, by - 0.5);
  ctx.lineTo(bx - 0.5, by - 2.5);
  ctx.moveTo(bx + 0.5, by + 2.5);
  ctx.lineTo(bx + 2.5, by + 0.5);
  ctx.stroke();
  ctx.restore();
}

// ── Drawing helpers ───────────────────────────────────────────────────────────

// Break a single text line into wrapped sub-lines that fit within maxWidth pixels.
// Requires ctx.font to be set before calling.
function wrapWords(ctx, text, maxWidth) {
  if (!text) return [""];
  const words = text.split(" ");
  const result = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? current + " " + word : word;
    if (current && ctx.measureText(candidate).width > maxWidth) {
      result.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) result.push(current);
  return result.length ? result : [""];
}

// Draw multi-line label centred at (0,0) in the current (possibly rotated) ctx.
// labelRotation is applied around the label's own centre (independent of shape rotation).
function drawLabel(
  ctx,
  label,
  fontSize,
  color,
  textAlign,
  textValign,
  W,
  H,
  labelRotation,
) {
  if (!label) return;
  const pad = 8;
  ctx.save();
  ctx.font = `${fontSize}px system-ui,-apple-system,sans-serif`;
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";

  let xPos = 0;
  if (textAlign === "left") {
    ctx.textAlign = "left";
    xPos = W ? -W / 2 + pad : -40;
  } else if (textAlign === "right") {
    ctx.textAlign = "right";
    xPos = W ? W / 2 - pad : 40;
  } else {
    ctx.textAlign = "center";
    xPos = 0;
  }

  let yOff = 0;
  if (W && H) {
    if (textValign === "top") yOff = -(H / 2 - fontSize / 2 - pad);
    else if (textValign === "bottom") yOff = H / 2 - fontSize / 2 - pad;
  }

  // Auto-wrap: split each explicit \n line further if it overflows the shape width.
  const maxW = W ? W - pad * 2 : Infinity;
  const lines = String(label)
    .split("\n")
    .flatMap((l) => wrapWords(ctx, l, maxW));
  const lineH = fontSize * 1.3;
  const startY = yOff - ((lines.length - 1) * lineH) / 2;

  // Apply independent label rotation around the label centre.
  if (labelRotation) ctx.rotate(labelRotation);

  lines.forEach((line, i) => ctx.fillText(line, xPos, startY + i * lineH));
  ctx.restore();
}

// Polyfill-safe rounded rectangle (ctx.roundRect not universally available).
function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// Read ALL live node data from the DataSet on every draw call.
// vis-network caches the ctxRenderer closure and never re-reads it after
// nodes.update(), so colour, font size, dimensions, rotation, and alignment
// must all be fetched here to reflect the latest values.
function nodeData(id, defaultW, defaultH, defaultColorKey) {
  const n = st.nodes && st.nodes.get(id);
  const colorKey = (n && n.colorKey) || defaultColorKey || "c-gray";
  return {
    W: (n && n.nodeWidth) || defaultW,
    H: (n && n.nodeHeight) || defaultH,
    rotation: (n && n.rotation) || 0,
    labelRotation: (n && n.labelRotation) || 0,
    textAlign: (n && n.textAlign) || "center",
    textValign: (n && n.textValign) || "middle",
    fontSize: (n && n.fontSize) || 13,
    colorKey,
    c: NODE_COLORS[colorKey] || NODE_COLORS["c-gray"],
  };
}

// ── Shape renderers ───────────────────────────────────────────────────────────

export function makeBoxRenderer(colorKey) {
  return function ({ ctx, x, y, id, state: visState, label }) {
    const {
      W,
      H,
      rotation,
      labelRotation,
      textAlign,
      textValign,
      fontSize,
      c,
    } = nodeData(id, 100, 40, colorKey);
    return {
      drawNode() {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);
        ctx.strokeStyle = visState.selected ? "#f97316" : c.border;
        ctx.fillStyle = visState.selected ? c.hbg : c.bg;
        ctx.lineWidth = 1.5;
        roundRect(ctx, -W / 2, -H / 2, W, H, 4);
        ctx.fill();
        ctx.stroke();
        drawLabel(
          ctx,
          label,
          fontSize,
          c.font,
          textAlign,
          textValign,
          W,
          H,
          labelRotation,
        );
        drawLinkIndicator(ctx, id, W, H);
        ctx.restore();
      },
      nodeDimensions: { width: W, height: H },
    };
  };
}

export function makeEllipseRenderer(colorKey) {
  return function ({ ctx, x, y, id, state: visState, label }) {
    const {
      W,
      H,
      rotation,
      labelRotation,
      textAlign,
      textValign,
      fontSize,
      c,
    } = nodeData(id, 110, 50, colorKey);
    return {
      drawNode() {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);
        ctx.strokeStyle = visState.selected ? "#f97316" : c.border;
        ctx.fillStyle = visState.selected ? c.hbg : c.bg;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, W / 2, H / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        drawLabel(
          ctx,
          label,
          fontSize,
          c.font,
          textAlign,
          textValign,
          W,
          H,
          labelRotation,
        );
        drawLinkIndicator(ctx, id, W, H);
        ctx.restore();
      },
      nodeDimensions: { width: W, height: H },
    };
  };
}

export function makeCircleRenderer(colorKey) {
  return function ({ ctx, x, y, id, state: visState, label }) {
    const { W, rotation, labelRotation, textAlign, textValign, fontSize, c } =
      nodeData(id, 55, 55, colorKey);
    const R = W / 2;
    return {
      drawNode() {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);
        ctx.strokeStyle = visState.selected ? "#f97316" : c.border;
        ctx.fillStyle = visState.selected ? c.hbg : c.bg;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, R, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        drawLabel(
          ctx,
          label,
          fontSize,
          c.font,
          textAlign,
          textValign,
          W,
          W,
          labelRotation,
        );
        drawLinkIndicator(ctx, id, W, W);
        ctx.restore();
      },
      nodeDimensions: { width: W, height: W },
    };
  };
}

export function makeDatabaseRenderer(colorKey) {
  return function ({ ctx, x, y, id, state: visState, label }) {
    const {
      W,
      H,
      rotation,
      labelRotation,
      textAlign,
      textValign,
      fontSize,
      c,
    } = nodeData(id, 50, 70, colorKey);
    const rx = W / 2;
    const ry = Math.max(H * 0.12, 6);
    const bodyTop = -H / 2 + ry;
    const bodyBottom = H / 2 - ry;
    return {
      drawNode() {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);
        ctx.strokeStyle = visState.selected ? "#f97316" : c.border;
        ctx.fillStyle = visState.selected ? c.hbg : c.bg;
        ctx.lineWidth = 1.5;
        ctx.fillRect(-rx, bodyTop, W, bodyBottom - bodyTop);
        ctx.beginPath();
        ctx.ellipse(0, bodyBottom, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-rx, bodyTop);
        ctx.lineTo(-rx, bodyBottom);
        ctx.moveTo(rx, bodyTop);
        ctx.lineTo(rx, bodyBottom);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(0, bodyTop, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        drawLabel(
          ctx,
          label,
          fontSize,
          c.font,
          textAlign,
          textValign,
          W,
          H,
          labelRotation,
        );
        drawLinkIndicator(ctx, id, W, H);
        ctx.restore();
      },
      nodeDimensions: { width: W, height: H },
    };
  };
}

// Post-IT: sticky note with folded top-right corner.
export function makePostItRenderer(colorKey) {
  return function ({ ctx, x, y, id, state: visState, label }) {
    const {
      W,
      H,
      rotation,
      labelRotation,
      textAlign,
      textValign,
      fontSize,
      c,
    } = nodeData(id, 120, 100, colorKey || "c-amber");
    const fold = Math.min(W, H) * 0.18;
    return {
      drawNode() {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);
        ctx.strokeStyle = visState.selected ? "#f97316" : c.border;
        ctx.fillStyle = visState.selected ? c.hbg : c.bg;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-W / 2, -H / 2);
        ctx.lineTo(W / 2 - fold, -H / 2);
        ctx.lineTo(W / 2, -H / 2 + fold);
        ctx.lineTo(W / 2, H / 2);
        ctx.lineTo(-W / 2, H / 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = c.border;
        ctx.beginPath();
        ctx.moveTo(W / 2 - fold, -H / 2);
        ctx.lineTo(W / 2, -H / 2 + fold);
        ctx.lineTo(W / 2 - fold, -H / 2 + fold);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.moveTo(W / 2 - fold, -H / 2);
        ctx.lineTo(W / 2 - fold, -H / 2 + fold);
        ctx.lineTo(W / 2, -H / 2 + fold);
        ctx.stroke();
        drawLabel(
          ctx,
          label,
          fontSize,
          c.font,
          textAlign,
          textValign,
          W,
          H,
          labelRotation,
        );
        drawLinkIndicator(ctx, id, W, H);
        ctx.restore();
      },
      nodeDimensions: { width: W, height: H },
    };
  };
}

// Free Text: no visible border or background — just the label.
export function makeTextFreeRenderer(colorKey) {
  return function ({ ctx, x, y, id, state: visState, label }) {
    const {
      W,
      H,
      rotation,
      labelRotation,
      textAlign,
      textValign,
      fontSize,
      c,
    } = nodeData(id, 80, 30, colorKey);
    return {
      drawNode() {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);
        if (visState.selected || visState.hover) {
          ctx.strokeStyle = "#f97316";
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 3]);
          roundRect(ctx, -W / 2, -H / 2, W, H, 3);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        drawLabel(
          ctx,
          label,
          fontSize,
          c.font,
          textAlign,
          textValign,
          W,
          H,
          labelRotation,
        );
        drawLinkIndicator(ctx, id, W, H);
        ctx.restore();
      },
      nodeDimensions: { width: W, height: H },
    };
  };
}

// ── Actor (stick figure) ──────────────────────────────────────────────────────
const ACTOR_W0 = 30;
const ACTOR_H0 = 52;

export function makeActorRenderer(colorKey) {
  return function ({ ctx, x, y, id, state: visState, label }) {
    const { W, H, rotation, labelRotation, fontSize, c } = nodeData(
      id,
      ACTOR_W0,
      ACTOR_H0,
      colorKey,
    );
    const sx = W / ACTOR_W0;
    const sy = H / ACTOR_H0;
    return {
      drawNode() {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);
        ctx.strokeStyle = visState.selected ? "#f97316" : c.border;
        ctx.fillStyle = visState.selected ? c.hbg : c.bg;
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(0, -20 * sy, 8 * sy, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, -12 * sy);
        ctx.lineTo(0, 8 * sy);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-13 * sx, 0 * sy);
        ctx.lineTo(13 * sx, 0 * sy);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, 8 * sy);
        ctx.lineTo(-10 * sx, 24 * sy);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, 8 * sy);
        ctx.lineTo(10 * sx, 24 * sy);
        ctx.stroke();
        // Label below figure (rotates with the actor)
        if (label) {
          ctx.save();
          if (labelRotation) ctx.rotate(labelRotation);
          ctx.font = `${fontSize}px system-ui,-apple-system,sans-serif`;
          ctx.fillStyle = c.font;
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          const lines = String(label).split("\n");
          const lineH = fontSize * 1.3;
          const startY = 24 * sy + 4;
          lines.forEach((line, i) => ctx.fillText(line, 0, startY + i * lineH));
          ctx.restore();
        }
        drawLinkIndicator(ctx, id, W, H);
        ctx.restore();
      },
      nodeDimensions: { width: W, height: H },
    };
  };
}

// ── Image node ────────────────────────────────────────────────────────────────
// Images are loaded once and cached. When still loading a placeholder is drawn;
// once the image is ready network.redraw() is called so the frame updates.

const _imgCache = new Map(); // src → HTMLImageElement | 'loading' | 'error'

function getCachedImage(src, redrawFn) {
  if (!src) return null;
  const cached = _imgCache.get(src);
  if (cached === "loading" || cached === "error") return null;
  if (cached) return cached;
  _imgCache.set(src, "loading");
  const img = new Image();
  img.onload = () => {
    _imgCache.set(src, img);
    redrawFn && redrawFn();
  };
  img.onerror = () => {
    _imgCache.set(src, "error");
  };
  img.src = src;
  return null;
}

export function makeImageRenderer(colorKey) {
  return function ({ ctx, x, y, id, state: visState, label }) {
    const {
      W,
      H,
      rotation,
      labelRotation,
      textAlign,
      textValign,
      fontSize,
      c,
    } = nodeData(id, 160, 120, colorKey || "c-gray");
    const n = st.nodes && st.nodes.get(id);
    const src = n && n.imageSrc;
    const img = getCachedImage(src, () => st.network && st.network.redraw());
    return {
      drawNode() {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);
        // Border (always visible, orange when selected)
        ctx.strokeStyle = visState.selected ? "#f97316" : c.border;
        ctx.lineWidth = visState.selected ? 2 : 1;
        roundRect(ctx, -W / 2, -H / 2, W, H, 4);
        ctx.stroke();

        if (img) {
          // Clip to rounded rect then draw image
          ctx.save();
          roundRect(ctx, -W / 2, -H / 2, W, H, 4);
          ctx.clip();
          ctx.drawImage(img, -W / 2, -H / 2, W, H);
          ctx.restore();
        } else {
          // Placeholder: light fill + icon
          ctx.fillStyle = visState.selected ? c.hbg : c.bg;
          roundRect(ctx, -W / 2, -H / 2, W, H, 4);
          ctx.fill();
          ctx.fillStyle = c.border;
          ctx.font = `${Math.round(Math.min(W, H) * 0.25)}px system-ui`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(src ? "…" : "🖼", 0, 0);
        }

        if (label) {
          const lines = String(label).split("\n");
          const lineH = fontSize * 1.3;
          const pad = 6;
          const stripH = lines.length * lineH + pad * 2 - (lineH - fontSize);
          ctx.save();
          ctx.font = `${fontSize}px system-ui,-apple-system,sans-serif`;
          const maxTextW = Math.max(
            ...lines.map((l) => ctx.measureText(l).width),
          );
          const stripW = maxTextW + pad * 2;
          const M = 5; // margin from image edge
          // Horizontal position based on textAlign
          let stripX;
          if (textAlign === "left") stripX = -W / 2 + M;
          else if (textAlign === "right") stripX = W / 2 - stripW - M;
          else stripX = -stripW / 2;
          // Vertical position based on textValign
          let stripY;
          if (textValign === "top") stripY = -H / 2 + M;
          else if (textValign === "bottom") stripY = H / 2 - stripH - M;
          else stripY = -stripH / 2;
          ctx.globalAlpha = 0.7;
          ctx.fillStyle = "#000";
          roundRect(ctx, stripX, stripY, stripW, stripH, 4);
          ctx.fill();
          ctx.globalAlpha = 1;
          // Draw text centered inside the box
          if (labelRotation) ctx.rotate(labelRotation);
          ctx.fillStyle = "#fff";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          const textCX = stripX + stripW / 2;
          const startY = stripY + pad + fontSize / 2;
          lines.forEach((line, i) =>
            ctx.fillText(line, textCX, startY + i * lineH),
          );
          ctx.restore();
        }
        drawLinkIndicator(ctx, id, W, H);
        ctx.restore();
      },
      nodeDimensions: { width: W, height: H },
    };
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

// Returns the rendered height from vis-network internals (used by node-panel
// for vadjust calculations — legacy, kept for API compat).
export function getActualNodeHeight(id) {
  if (!st.network) return null;
  const bn = st.network.body.nodes[id];
  return bn && bn.shape && bn.shape.height ? bn.shape.height : null;
}

// Kept for backward compat (called by node-panel but irrelevant for ctxRenderers).
export function computeVadjust() {
  return 0;
}

// ── Anchor renderer — small dot endpoint for free-floating edges ──────────────
// nodeDimensions matches the visual radius so vis-network places the arrowhead
// exactly at the dot's border ("planted" effect).
// The dot is filled with the canvas background colour to mask the line that
// vis-network draws from the arrowhead to the node centre.
function makeAnchorRenderer() {
  return ({ ctx, x, y, state: { selected, hover } }) => {
    const r = 4;
    return {
      drawNode() {
        if (!selected && !hover) return; // invisible at rest
        ctx.save();
        ctx.translate(x, y);
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = "#f97316";
        ctx.fill();
        ctx.restore();
      },
      nodeDimensions: { width: 0, height: 0 },
    };
  };
}

const RENDERER_MAP = {
  box: makeBoxRenderer,
  ellipse: makeEllipseRenderer,
  circle: makeCircleRenderer,
  database: makeDatabaseRenderer,
  "post-it": makePostItRenderer,
  "text-free": makeTextFreeRenderer,
  actor: makeActorRenderer,
  image: makeImageRenderer,
  anchor: makeAnchorRenderer,
};

// Default dimensions per shape type (used when nodeWidth/nodeHeight are null).
export const SHAPE_DEFAULTS = {
  box: [100, 40],
  ellipse: [110, 50],
  circle: [55, 55],
  database: [50, 70],
  actor: [30, 52],
  "post-it": [120, 100],
  "text-free": [80, 30],
  image: [160, 120],
  anchor: [8, 8],
};

// Builds the full vis.js node property object.
// All shapes are rendered via ctxRenderer so rotation works uniformly.
export function visNodeProps(
  shapeType,
  colorKey,
  nodeWidth,
  nodeHeight,
  fontSize,
  textAlign,
  _textValign,
) {
  const c = NODE_COLORS[colorKey] || NODE_COLORS["c-gray"];
  const size = fontSize || 13;
  const align = textAlign || "center";

  const colorP = {
    color: {
      background: c.bg,
      border: c.border,
      highlight: { background: c.hbg, border: c.hborder },
      hover: { background: c.hbg, border: c.hborder },
    },
    font: {
      color: c.font,
      size,
      face: "system-ui,-apple-system,sans-serif",
      align,
    },
  };

  const sizeP = {};
  if (nodeWidth)
    sizeP.widthConstraint = { minimum: nodeWidth, maximum: nodeWidth };
  if (nodeHeight)
    sizeP.heightConstraint = { minimum: nodeHeight, maximum: nodeHeight };

  const factory = RENDERER_MAP[shapeType];
  if (factory) {
    return {
      shape: "custom",
      ctxRenderer: factory(colorKey),
      ...colorP,
      ...sizeP,
    };
  }
  // Unknown shape — fall back to box
  return {
    shape: "custom",
    ctxRenderer: makeBoxRenderer(colorKey),
    ...colorP,
    ...sizeP,
  };
}
