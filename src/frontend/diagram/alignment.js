// ── Alignment guides ───────────────────────────────────────────────────────────
// Detects center-to-center horizontal/vertical alignment during drag.
// Priority: same shapeType. Fallback: any shapeType if no same-type match found on that axis.

import { st, markDirty } from './state.js';
import { t }             from './t.js';

const THRESHOLD = 6; // world units — snap detection distance
const EXT       = 40; // world units — line extension beyond both centers

export let activeGuides = [];

export function applyAlignGuidesState(enabled) {
  st.alignGuides = enabled;
  const btn = document.getElementById('btnAlign');
  btn.classList.toggle('tool-active', enabled);
  btn.title = t('diagram.toolbar.align_guides');
  if (!enabled) activeGuides = [];
}

export function toggleAlignGuides() {
  applyAlignGuidesState(!st.alignGuides);
  markDirty();
  if (!st.alignGuides && st.network) st.network.redraw();
}

// Among candidates on the same axis, pick the closest to the dragged center.
// Tiebreak: for H axis (same Y) prefer rightmost (largest ox);
//           for V axis (same X) prefer lowest   (largest oy).
function pickBest(candidates, dx, dy, axis) {
  if (!candidates.length) return null;
  return candidates.reduce((best, curr) => {
    const dBest = axis === 'h' ? Math.abs(dx - best.ox) : Math.abs(dy - best.oy);
    const dCurr = axis === 'h' ? Math.abs(dx - curr.ox) : Math.abs(dy - curr.oy);
    if (dCurr < dBest) return curr;
    if (dCurr === dBest)
      return axis === 'h' ? (curr.ox > best.ox ? curr : best)
                          : (curr.oy > best.oy ? curr : best);
    return best;
  });
}

// Collects all candidates per axis, separated by same-type / any-type.
function collectCandidates(draggedBody, draggedType, draggedIds) {
  const dx = draggedBody.x, dy = draggedBody.y;
  const sameH = [], sameV = [], anyH = [], anyV = [];

  for (const otherId of st.nodes.getIds()) {
    if (draggedIds.has(otherId)) continue;
    const other = st.nodes.get(otherId);
    if (!other) continue;
    const otherBody = st.network.body.nodes[otherId];
    if (!otherBody) continue;
    const ox = otherBody.x, oy = otherBody.y;
    const sameType = other.shapeType === draggedType;
    const c = { ox, oy };

    if (Math.abs(dy - oy) <= THRESHOLD) (sameType ? sameH : anyH).push(c);
    if (Math.abs(dx - ox) <= THRESHOLD) (sameType ? sameV : anyV).push(c);
  }

  return { sameH, sameV, anyH, anyV };
}

// Returns the best snap target Y (H axis) and X (V axis) for a dragged node.
// Same-type nodes take priority; any-type is used as fallback if no same-type match found.
function findSnapAxes(draggedBody, draggedType, draggedIds) {
  const dx = draggedBody.x, dy = draggedBody.y;
  const { sameH, sameV, anyH, anyV } = collectCandidates(draggedBody, draggedType, draggedIds);

  const hMatch = pickBest(sameH.length ? sameH : anyH, dx, dy, 'h');
  const vMatch = pickBest(sameV.length ? sameV : anyV, dx, dy, 'v');

  return {
    snapX: vMatch ? vMatch.ox : dx,
    snapY: hMatch ? hMatch.oy : dy,
  };
}

// Called at dragEnd — snaps each dragged node onto the guide axis when active.
export function snapToAlignGuides(params) {
  if (!st.alignGuides || !params.nodes || !params.nodes.length || !st.network) return;

  const draggedIds = new Set(params.nodes);

  for (const draggedId of params.nodes) {
    const draggedNode = st.nodes.get(draggedId);
    if (!draggedNode) continue;
    const draggedBody = st.network.body.nodes[draggedId];
    if (!draggedBody) continue;

    const { snapX, snapY } = findSnapAxes(draggedBody, draggedNode.shapeType, draggedIds);
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

    const { sameH, sameV, anyH, anyV } = collectCandidates(draggedBody, draggedType, draggedIds);

    const hMatch = pickBest(sameH.length ? sameH : anyH, dx, dy, 'h');
    const vMatch = pickBest(sameV.length ? sameV : anyV, dx, dy, 'v');

    if (hMatch) newGuides.push({ type: 'h', y: (dy + hMatch.oy) / 2, x1: Math.min(dx, hMatch.ox) - EXT, x2: Math.max(dx, hMatch.ox) + EXT });
    if (vMatch) newGuides.push({ type: 'v', x: (dx + vMatch.ox) / 2, y1: Math.min(dy, vMatch.oy) - EXT, y2: Math.max(dy, vMatch.oy) + EXT });
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
