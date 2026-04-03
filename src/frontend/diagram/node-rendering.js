// ── Node rendering ────────────────────────────────────────────────────────────
// Actor canvas renderer + vis.js node property builder.

import { NODE_COLORS } from './constants.js';
import { st } from './state.js';

// Factory: returns a vis.js ctxRenderer for the "actor" custom shape.
export function makeActorRenderer(colorKey) {
  return function ({ ctx, x, y, state: visState }) {
    const c = NODE_COLORS[colorKey] || NODE_COLORS['c-gray'];
    return {
      drawNode() {
        ctx.save();
        ctx.strokeStyle = visState.selected ? '#f97316' : c.border;
        ctx.fillStyle   = visState.selected ? c.hbg : c.bg;
        ctx.lineWidth   = 2;
        ctx.lineCap     = 'round';
        ctx.beginPath(); ctx.arc(x, y - 20, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, y - 12); ctx.lineTo(x, y + 8); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x - 13, y - 3); ctx.lineTo(x + 13, y - 3); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, y + 8); ctx.lineTo(x - 10, y + 24); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, y + 8); ctx.lineTo(x + 10, y + 24); ctx.stroke();
        ctx.restore();
      },
      nodeDimensions: { width: 30, height: 52 },
    };
  };
}

// Vertical text offset for top/middle/bottom alignment inside a node.
export function computeVadjust(textValign, nodeHeight, fontSize) {
  if (!textValign || textValign === 'middle') return 0;
  const h  = nodeHeight || 50;
  const fs = fontSize   || 13;
  const pad = 8;
  if (textValign === 'top')    return -(h / 2 - fs / 2 - pad);
  if (textValign === 'bottom') return   h / 2 - fs / 2 - pad;
  return 0;
}

// Returns the rendered height of a node from vis.js internals, or null.
export function getActualNodeHeight(id) {
  if (!st.network) return null;
  const bn = st.network.body.nodes[id];
  return bn && bn.shape && bn.shape.height ? bn.shape.height : null;
}

// Builds the full vis.js node property object (color, font, size constraints, shape).
export function visNodeProps(shapeType, colorKey, nodeWidth, nodeHeight, fontSize, textAlign, textValign, vadjustHeight) {
  const c      = NODE_COLORS[colorKey] || NODE_COLORS['c-gray'];
  const size   = fontSize  || 13;
  const align  = textAlign || 'center';
  const vadjust = computeVadjust(textValign, vadjustHeight || nodeHeight, size);

  const colorP = {
    color: {
      background: c.bg,
      border: c.border,
      highlight: { background: c.hbg, border: c.hborder },
      hover:     { background: c.hbg, border: c.hborder },
    },
    font: { color: c.font, size, face: 'system-ui,-apple-system,sans-serif', align, vadjust },
  };

  const sizeP = {};
  if (nodeWidth)  sizeP.widthConstraint  = { minimum: nodeWidth,  maximum: nodeWidth  };
  if (nodeHeight) sizeP.heightConstraint = { minimum: nodeHeight, maximum: nodeHeight };

  if (shapeType === 'actor') {
    return { shape: 'custom', ctxRenderer: makeActorRenderer(colorKey), ...colorP, ...sizeP };
  }
  return { shape: shapeType, ...colorP, ...sizeP };
}
