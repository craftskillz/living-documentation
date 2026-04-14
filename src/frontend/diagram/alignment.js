// ── Alignment guides ───────────────────────────────────────────────────────────
// Detects center-to-center horizontal/vertical alignment between nodes of the
// same shapeType during drag and draws dashed guide lines on the canvas.

import { st } from './state.js';
import { t }  from './t.js';

const THRESHOLD = 6; // world units — snap detection distance
const EXT       = 40; // world units — line extension beyond both centers

export let activeGuides = [];

export function toggleAlignGuides() {
  st.alignGuides = !st.alignGuides;
  const btn = document.getElementById('btnAlign');
  btn.classList.toggle('tool-active', st.alignGuides);
  btn.title = t('diagram.toolbar.align_guides');
  if (!st.alignGuides) {
    activeGuides = [];
    if (st.network) st.network.redraw();
  }
}

// Called at dragEnd — snaps each dragged node onto the guide axis when active.
export function snapToAlignGuides(params) {
  if (!st.alignGuides || !params.nodes || !params.nodes.length || !st.network) return;

  const draggedIds = new Set(params.nodes);

  for (const draggedId of params.nodes) {
    const draggedNode = st.nodes.get(draggedId);
    if (!draggedNode) continue;
    const draggedType = draggedNode.shapeType;
    const draggedBody = st.network.body.nodes[draggedId];
    if (!draggedBody) continue;

    let snapX = draggedBody.x;
    let snapY = draggedBody.y;
    let snappedH = false;
    let snappedV = false;

    for (const otherId of st.nodes.getIds()) {
      if (draggedIds.has(otherId)) continue;
      const other = st.nodes.get(otherId);
      if (!other || other.shapeType !== draggedType) continue;
      const otherBody = st.network.body.nodes[otherId];
      if (!otherBody) continue;

      if (!snappedH && Math.abs(draggedBody.y - otherBody.y) <= THRESHOLD) {
        snapY = otherBody.y;
        snappedH = true;
      }
      if (!snappedV && Math.abs(draggedBody.x - otherBody.x) <= THRESHOLD) {
        snapX = otherBody.x;
        snappedV = true;
      }
      if (snappedH && snappedV) break;
    }

    if (snapX !== draggedBody.x || snapY !== draggedBody.y) {
      st.network.moveNode(draggedId, snapX, snapY);
    }
  }
}

export function clearAlignGuides() {
  if (activeGuides.length) {
    activeGuides = [];
    if (st.network) st.network.redraw();
  }
}

export function onDragging(params) {
  if (!st.alignGuides || !params.nodes || !params.nodes.length) {
    clearAlignGuides();
    return;
  }

  const draggedIds = new Set(params.nodes);
  const newGuides  = [];

  for (const draggedId of params.nodes) {
    const draggedNode = st.nodes.get(draggedId);
    if (!draggedNode) continue;
    const draggedType = draggedNode.shapeType;
    const draggedBody = st.network.body.nodes[draggedId];
    if (!draggedBody) continue;
    const dx = draggedBody.x;
    const dy = draggedBody.y;

    for (const otherId of st.nodes.getIds()) {
      if (draggedIds.has(otherId)) continue;
      const other = st.nodes.get(otherId);
      if (!other || other.shapeType !== draggedType) continue;
      const otherBody = st.network.body.nodes[otherId];
      if (!otherBody) continue;
      const ox = otherBody.x;
      const oy = otherBody.y;

      // Horizontal alignment: centers share the same Y
      if (Math.abs(dy - oy) <= THRESHOLD) {
        const avgY = (dy + oy) / 2;
        newGuides.push({
          type: 'h',
          y:  avgY,
          x1: Math.min(dx, ox) - EXT,
          x2: Math.max(dx, ox) + EXT,
        });
      }
      // Vertical alignment: centers share the same X
      if (Math.abs(dx - ox) <= THRESHOLD) {
        const avgX = (dx + ox) / 2;
        newGuides.push({
          type: 'v',
          x:  avgX,
          y1: Math.min(dy, oy) - EXT,
          y2: Math.max(dy, oy) + EXT,
        });
      }
    }
  }

  activeGuides = newGuides;
  if (st.network) st.network.redraw();
}

// Called on network "afterDrawing" — draws guides in canvas (world) coordinates.
export function drawAlignmentGuides(ctx) {
  if (!st.alignGuides || !activeGuides.length) return;

  const isDark = document.documentElement.classList.contains('dark');
  ctx.save();
  ctx.strokeStyle = isDark ? 'rgba(210, 210, 210, 0.9)' : 'rgba(50, 50, 50, 0.85)';
  ctx.lineWidth   = 0.5;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();

  for (const guide of activeGuides) {
    if (guide.type === 'h') {
      ctx.moveTo(guide.x1, guide.y);
      ctx.lineTo(guide.x2, guide.y);
    } else {
      ctx.moveTo(guide.x,  guide.y1);
      ctx.lineTo(guide.x,  guide.y2);
    }
  }

  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}
