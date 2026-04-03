// ── Node rendering ────────────────────────────────────────────────────────────
// Actor canvas renderer + vis.js node property builder.

import { NODE_COLORS } from './constants.js';
import { st } from './state.js';

// Reference dimensions of the actor figure at scale 1.
const ACTOR_W0 = 30;
const ACTOR_H0 = 52;

// Factory: returns a vis.js ctxRenderer for the "actor" custom shape.
//
// Key design: this is a STABLE function — it is created ONCE per colorKey and
// never replaced. vis-network caches the ctxRenderer reference inside its
// CustomShape object and does NOT re-read it from the DataSet after updates,
// so rebuilding the closure on every resize would have no effect.
//
// Instead, the renderer reads live dimensions on every draw call via the node
// `id` that vis-network passes to ctxRenderer. `st.nodes.get(id)` always
// returns the latest nodeWidth / nodeHeight written by the resize handler.
export function makeActorRenderer(colorKey) {
  const c = NODE_COLORS[colorKey] || NODE_COLORS['c-gray'];

  return function ({ ctx, x, y, id, state: visState, label, style }) {
    // Read the current dimensions from the DataSet on every draw.
    const n  = st.nodes && st.nodes.get(id);
    const W  = (n && n.nodeWidth)  || ACTOR_W0;
    const H  = (n && n.nodeHeight) || ACTOR_H0;
    const sx = W / ACTOR_W0;
    const sy = H / ACTOR_H0;
    const fontSize = (style && style.font && style.font.size) ? style.font.size : 13;

    return {
      drawNode() {
        // ── Scaled stick figure ───────────────────────────────────────────────
        ctx.save();
        ctx.strokeStyle = visState.selected ? '#f97316' : c.border;
        ctx.fillStyle   = visState.selected ? c.hbg : c.bg;
        ctx.lineWidth   = 2;
        ctx.lineCap     = 'round';
        ctx.beginPath(); ctx.arc(x, y - 20*sy, 8*sy, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, y - 12*sy); ctx.lineTo(x, y + 8*sy);                ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x - 13*sx, y - 3*sy); ctx.lineTo(x + 13*sx, y - 3*sy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, y + 8*sy); ctx.lineTo(x - 10*sx, y + 24*sy);        ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, y + 8*sy); ctx.lineTo(x + 10*sx, y + 24*sy);        ctx.stroke();
        ctx.restore();

        // ── Label below the figure ────────────────────────────────────────────
        if (label) {
          ctx.save();
          ctx.font         = `${fontSize}px system-ui,-apple-system,sans-serif`;
          ctx.fillStyle    = c.font;
          ctx.textAlign    = 'center';
          ctx.textBaseline = 'top';
          const lines  = String(label).split('\n');
          const lineH  = fontSize * 1.3;
          const startY = y + 24*sy + 4; // 4 px gap below scaled leg tips
          lines.forEach((line, i) => ctx.fillText(line, x, startY + i * lineH));
          ctx.restore();
        }
      },
      // nodeDimensions must also reflect the current size so vis-network uses
      // the right bounding box for collision detection and layout.
      nodeDimensions: { width: W, height: H },
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
    // The renderer reads dimensions from st.nodes at draw time — never recreated.
    return { shape: 'custom', ctxRenderer: makeActorRenderer(colorKey), ...colorP, ...sizeP };
  }
  return { shape: shapeType, ...colorP, ...sizeP };
}
