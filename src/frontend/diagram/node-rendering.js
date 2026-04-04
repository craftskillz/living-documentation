// ── Node rendering ────────────────────────────────────────────────────────────
// All shapes are ctxRenderers so rotation (ctx.rotate) works uniformly.
// Each renderer reads live node data from st.nodes.get(id) on every draw call
// (vis-network caches the ctxRenderer reference and never re-reads it from the
// DataSet, so dimensions/rotation/alignment must be fetched at draw time).

import { NODE_COLORS } from './constants.js';
import { st } from './state.js';

// ── Drawing helpers ───────────────────────────────────────────────────────────

// Draw multi-line label centred at (0,0) in the current (possibly rotated) ctx.
// textAlign : 'left' | 'center' | 'right'
// textValign: 'top'  | 'middle' | 'bottom'
function drawLabel(ctx, label, fontSize, color, textAlign, textValign, W, H) {
  if (!label) return;
  const pad = 8;
  ctx.save();
  ctx.font         = `${fontSize}px system-ui,-apple-system,sans-serif`;
  ctx.fillStyle    = color;
  ctx.textBaseline = 'middle';

  let xPos = 0;
  if (textAlign === 'left')  { ctx.textAlign = 'left';  xPos = W ? -W / 2 + pad : -40; }
  else if (textAlign === 'right') { ctx.textAlign = 'right'; xPos = W ? W / 2 - pad : 40; }
  else                       { ctx.textAlign = 'center'; xPos = 0; }

  let yOff = 0;
  if (W && H) {
    if (textValign === 'top')    yOff = -(H / 2 - fontSize / 2 - pad);
    else if (textValign === 'bottom') yOff = H / 2 - fontSize / 2 - pad;
  }

  const lines  = String(label).split('\n');
  const lineH  = fontSize * 1.3;
  const startY = yOff - (lines.length - 1) * lineH / 2;
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
  const n        = st.nodes && st.nodes.get(id);
  const colorKey = (n && n.colorKey) || defaultColorKey || 'c-gray';
  return {
    W:         (n && n.nodeWidth)   || defaultW,
    H:         (n && n.nodeHeight)  || defaultH,
    rotation:  (n && n.rotation)    || 0,
    textAlign: (n && n.textAlign)   || 'center',
    textValign:(n && n.textValign)  || 'middle',
    fontSize:  (n && n.fontSize)    || 13,
    colorKey,
    c: NODE_COLORS[colorKey] || NODE_COLORS['c-gray'],
  };
}

// ── Shape renderers ───────────────────────────────────────────────────────────

export function makeBoxRenderer(colorKey) {
  return function ({ ctx, x, y, id, state: visState, label }) {
    const { W, H, rotation, textAlign, textValign, fontSize, c } = nodeData(id, 100, 40, colorKey);
    return {
      drawNode() {
        ctx.save(); ctx.translate(x, y); ctx.rotate(rotation);
        ctx.strokeStyle = visState.selected ? '#f97316' : c.border;
        ctx.fillStyle   = visState.selected ? c.hbg     : c.bg;
        ctx.lineWidth   = 1.5;
        roundRect(ctx, -W / 2, -H / 2, W, H, 4);
        ctx.fill(); ctx.stroke();
        drawLabel(ctx, label, fontSize, c.font, textAlign, textValign, W, H);
        ctx.restore();
      },
      nodeDimensions: { width: W, height: H },
    };
  };
}

export function makeEllipseRenderer(colorKey) {
  return function ({ ctx, x, y, id, state: visState, label }) {
    const { W, H, rotation, textAlign, textValign, fontSize, c } = nodeData(id, 110, 50, colorKey);
    return {
      drawNode() {
        ctx.save(); ctx.translate(x, y); ctx.rotate(rotation);
        ctx.strokeStyle = visState.selected ? '#f97316' : c.border;
        ctx.fillStyle   = visState.selected ? c.hbg     : c.bg;
        ctx.lineWidth   = 1.5;
        ctx.beginPath(); ctx.ellipse(0, 0, W / 2, H / 2, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        drawLabel(ctx, label, fontSize, c.font, textAlign, textValign, W, H);
        ctx.restore();
      },
      nodeDimensions: { width: W, height: H },
    };
  };
}

export function makeCircleRenderer(colorKey) {
  return function ({ ctx, x, y, id, state: visState, label }) {
    const { W, rotation, textAlign, textValign, fontSize, c } = nodeData(id, 55, 55, colorKey);
    const R = W / 2;
    return {
      drawNode() {
        ctx.save(); ctx.translate(x, y); ctx.rotate(rotation);
        ctx.strokeStyle = visState.selected ? '#f97316' : c.border;
        ctx.fillStyle   = visState.selected ? c.hbg     : c.bg;
        ctx.lineWidth   = 1.5;
        ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        drawLabel(ctx, label, fontSize, c.font, textAlign, textValign, W, W);
        ctx.restore();
      },
      nodeDimensions: { width: W, height: W },
    };
  };
}

export function makeDatabaseRenderer(colorKey) {
  return function ({ ctx, x, y, id, state: visState, label }) {
    const { W, H, rotation, textAlign, textValign, fontSize, c } = nodeData(id, 50, 70, colorKey);
    const rx = W / 2;
    const ry = Math.max(H * 0.12, 6);
    const bodyTop    = -H / 2 + ry;
    const bodyBottom =  H / 2 - ry;
    return {
      drawNode() {
        ctx.save(); ctx.translate(x, y); ctx.rotate(rotation);
        ctx.strokeStyle = visState.selected ? '#f97316' : c.border;
        ctx.fillStyle   = visState.selected ? c.hbg     : c.bg;
        ctx.lineWidth   = 1.5;
        ctx.fillRect(-rx, bodyTop, W, bodyBottom - bodyTop);
        ctx.beginPath(); ctx.ellipse(0, bodyBottom, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-rx, bodyTop); ctx.lineTo(-rx, bodyBottom);
        ctx.moveTo( rx, bodyTop); ctx.lineTo( rx, bodyBottom);
        ctx.stroke();
        ctx.beginPath(); ctx.ellipse(0, bodyTop, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        drawLabel(ctx, label, fontSize, c.font, textAlign, textValign, W, H);
        ctx.restore();
      },
      nodeDimensions: { width: W, height: H },
    };
  };
}

// Post-IT: sticky note with folded top-right corner.
export function makePostItRenderer(colorKey) {
  return function ({ ctx, x, y, id, state: visState, label }) {
    const { W, H, rotation, textAlign, textValign, fontSize, c } = nodeData(id, 120, 100, colorKey || 'c-amber');
    const fold = Math.min(W, H) * 0.18;
    return {
      drawNode() {
        ctx.save(); ctx.translate(x, y); ctx.rotate(rotation);
        ctx.strokeStyle = visState.selected ? '#f97316' : c.border;
        ctx.fillStyle   = visState.selected ? c.hbg     : c.bg;
        ctx.lineWidth   = 1.5;
        ctx.beginPath();
        ctx.moveTo(-W / 2,        -H / 2);
        ctx.lineTo( W / 2 - fold, -H / 2);
        ctx.lineTo( W / 2,        -H / 2 + fold);
        ctx.lineTo( W / 2,         H / 2);
        ctx.lineTo(-W / 2,         H / 2);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle   = c.border;
        ctx.beginPath();
        ctx.moveTo(W / 2 - fold, -H / 2);
        ctx.lineTo(W / 2,        -H / 2 + fold);
        ctx.lineTo(W / 2 - fold, -H / 2 + fold);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.moveTo(W / 2 - fold, -H / 2);
        ctx.lineTo(W / 2 - fold, -H / 2 + fold);
        ctx.lineTo(W / 2,        -H / 2 + fold);
        ctx.stroke();
        drawLabel(ctx, label, fontSize, c.font, textAlign, textValign, W, H);
        ctx.restore();
      },
      nodeDimensions: { width: W, height: H },
    };
  };
}

// Free Text: no visible border or background — just the label.
export function makeTextFreeRenderer(colorKey) {
  return function ({ ctx, x, y, id, state: visState, label }) {
    const { W, H, rotation, textAlign, textValign, fontSize, c } = nodeData(id, 80, 30, colorKey);
    return {
      drawNode() {
        ctx.save(); ctx.translate(x, y); ctx.rotate(rotation);
        if (visState.selected || visState.hover) {
          ctx.strokeStyle = '#f97316';
          ctx.lineWidth   = 1;
          ctx.setLineDash([4, 3]);
          roundRect(ctx, -W / 2, -H / 2, W, H, 3);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        drawLabel(ctx, label, fontSize, c.font, textAlign, textValign, W, H);
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
    const { W, H, rotation, fontSize, c } = nodeData(id, ACTOR_W0, ACTOR_H0, colorKey);
    const sx = W / ACTOR_W0;
    const sy = H / ACTOR_H0;
    return {
      drawNode() {
        ctx.save(); ctx.translate(x, y); ctx.rotate(rotation);
        ctx.strokeStyle = visState.selected ? '#f97316' : c.border;
        ctx.fillStyle   = visState.selected ? c.hbg     : c.bg;
        ctx.lineWidth   = 2;
        ctx.lineCap     = 'round';
        ctx.beginPath(); ctx.arc(0, -20 * sy, 8 * sy, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -12 * sy); ctx.lineTo(0, 8 * sy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-13 * sx, -3 * sy); ctx.lineTo(13 * sx, -3 * sy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, 8 * sy); ctx.lineTo(-10 * sx, 24 * sy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, 8 * sy); ctx.lineTo( 10 * sx, 24 * sy); ctx.stroke();
        // Label below figure (rotates with the actor)
        if (label) {
          ctx.font         = `${fontSize}px system-ui,-apple-system,sans-serif`;
          ctx.fillStyle    = c.font;
          ctx.textAlign    = 'center';
          ctx.textBaseline = 'top';
          const lines  = String(label).split('\n');
          const lineH  = fontSize * 1.3;
          const startY = 24 * sy + 4;
          lines.forEach((line, i) => ctx.fillText(line, 0, startY + i * lineH));
        }
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
export function computeVadjust() { return 0; }

const RENDERER_MAP = {
  box:        makeBoxRenderer,
  ellipse:    makeEllipseRenderer,
  circle:     makeCircleRenderer,
  database:   makeDatabaseRenderer,
  'post-it':  makePostItRenderer,
  'text-free':makeTextFreeRenderer,
  actor:      makeActorRenderer,
};

// Default dimensions per shape type (used when nodeWidth/nodeHeight are null).
export const SHAPE_DEFAULTS = {
  box:        [100, 40],
  ellipse:    [110, 50],
  circle:     [55,  55],
  database:   [50,  70],
  actor:      [30,  52],
  'post-it':  [120, 100],
  'text-free':[80,  30],
};

// Builds the full vis.js node property object.
// All shapes are rendered via ctxRenderer so rotation works uniformly.
export function visNodeProps(shapeType, colorKey, nodeWidth, nodeHeight, fontSize, textAlign, _textValign) {
  const c    = NODE_COLORS[colorKey] || NODE_COLORS['c-gray'];
  const size = fontSize  || 13;
  const align = textAlign || 'center';

  const colorP = {
    color: {
      background: c.bg,   border: c.border,
      highlight:  { background: c.hbg, border: c.hborder },
      hover:      { background: c.hbg, border: c.hborder },
    },
    font: { color: c.font, size, face: 'system-ui,-apple-system,sans-serif', align },
  };

  const sizeP = {};
  if (nodeWidth)  sizeP.widthConstraint  = { minimum: nodeWidth,  maximum: nodeWidth  };
  if (nodeHeight) sizeP.heightConstraint = { minimum: nodeHeight, maximum: nodeHeight };

  const factory = RENDERER_MAP[shapeType];
  if (factory) {
    return { shape: 'custom', ctxRenderer: factory(colorKey), ...colorP, ...sizeP };
  }
  // Unknown shape — fall back to box
  return { shape: 'custom', ctxRenderer: makeBoxRenderer(colorKey), ...colorP, ...sizeP };
}
