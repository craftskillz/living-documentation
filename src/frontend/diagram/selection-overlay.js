// ── Selection / resize / rotate overlay ───────────────────────────────────────
// Dashed selection box, corner resize handles, and top-centre rotation handle.

import { st, markDirty } from './state.js';
import { visNodeProps, SHAPE_DEFAULTS } from './node-rendering.js';

// ── Bounding box helper (works for all shapes including ctxRenderer) ──────────
function nodeBounds(id) {
  const n        = st.nodes.get(id);
  const bodyNode = st.network.body.nodes[id];
  if (!bodyNode) return null;
  const cx = bodyNode.x, cy = bodyNode.y;
  const shape    = n && n.shapeType || 'box';
  const defaults = SHAPE_DEFAULTS[shape] || [60, 28];
  const W = (n && n.nodeWidth)  || defaults[0];
  const H = (n && n.nodeHeight) || defaults[1];
  // Use the axis-aligned envelope of the (possibly rotated) bounding box.
  const rot = (n && n.rotation) || 0;
  if (rot === 0) {
    return { minX: cx - W / 2, minY: cy - H / 2, maxX: cx + W / 2, maxY: cy + H / 2 };
  }
  const cos = Math.abs(Math.cos(rot));
  const sin = Math.abs(Math.sin(rot));
  const hw  = (W * cos + H * sin) / 2;
  const hh  = (W * sin + H * cos) / 2;
  // Actor: head extends above cy - H/2 when unrotated
  const headExtra = shape === 'actor' ? (28 * (H / 52) - H / 2) : 0;
  return { minX: cx - hw, minY: cy - hh - headExtra, maxX: cx + hw, maxY: cy + hh };
}

// ── Overlay position ──────────────────────────────────────────────────────────
export function updateSelectionOverlay() {
  if (!st.network || !st.selectedNodeIds.length) { hideSelectionOverlay(); return; }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const id of st.selectedNodeIds) {
    try {
      const b = nodeBounds(id);
      if (!b) continue;
      minX = Math.min(minX, b.minX); minY = Math.min(minY, b.minY);
      maxX = Math.max(maxX, b.maxX); maxY = Math.max(maxY, b.maxY);
    } catch (_) { /* node still being created */ }
  }
  if (minX === Infinity) { hideSelectionOverlay(); return; }

  const PAD = 10;
  const tl  = st.network.canvasToDOM({ x: minX, y: minY });
  const br  = st.network.canvasToDOM({ x: maxX, y: maxY });
  const ov  = document.getElementById('selectionOverlay');
  ov.style.display = 'block';
  ov.style.left    = tl.x - PAD + 'px';
  ov.style.top     = tl.y - PAD + 'px';
  ov.style.width   = br.x - tl.x + PAD * 2 + 'px';
  ov.style.height  = br.y - tl.y + PAD * 2 + 'px';

  // Position rotation handle: top-centre of the overlay, 28px above it.
  const rh = document.getElementById('rh-rotate');
  rh.style.left = (br.x - tl.x) / 2 + PAD - 8 + 'px';
  rh.style.top  = '-28px';
}

export function hideSelectionOverlay() {
  document.getElementById('selectionOverlay').style.display = 'none';
}

// ── Resize ────────────────────────────────────────────────────────────────────
function onResizeStart(e, corner) {
  if (!st.selectedNodeIds.length || !st.network) return;
  e.preventDefault();
  e.stopPropagation();

  const startBBs = st.selectedNodeIds.map((id) => {
    const n = st.nodes.get(id);
    const b = nodeBounds(id);
    const shape    = (n && n.shapeType) || 'box';
    const defaults = SHAPE_DEFAULTS[shape] || [60, 28];
    const initW = (n && n.nodeWidth)  || (b ? Math.round(b.maxX - b.minX) : defaults[0]);
    const initH = (n && n.nodeHeight) || (b ? Math.round(b.maxY - b.minY) : defaults[1]);
    return { id, node: n, initW, initH };
  });

  const initBoxW = startBBs.reduce((m, b) => Math.max(m, b.initW), 0);
  const initBoxH = startBBs.reduce((m, b) => Math.max(m, b.initH), 0);

  st.resizeDrag = { corner, startMouse: { x: e.clientX, y: e.clientY }, startBBs, initBoxW, initBoxH };
  st.selectedNodeIds.forEach((id) => st.nodes.update({ id, fixed: true }));
  document.getElementById('vis-canvas').style.pointerEvents = 'none';
  document.addEventListener('mousemove', onResizeDrag);
  document.addEventListener('mouseup',   onResizeEnd);
}

function onResizeDrag(e) {
  if (!st.resizeDrag || !st.network) return;
  const scale = st.network.getScale();
  const cdx   = (e.clientX - st.resizeDrag.startMouse.x) / scale;
  const cdy   = (e.clientY - st.resizeDrag.startMouse.y) / scale;
  const MIN   = 20;
  const c     = st.resizeDrag.corner;
  const updatedIds = [];

  if (st.resizeDrag.startBBs.length === 1) {
    const { id, node, initW, initH } = st.resizeDrag.startBBs[0];
    let nW = initW, nH = initH;
    if (c === 'br') { nW = initW + cdx; nH = initH + cdy; }
    if (c === 'bl') { nW = initW - cdx; nH = initH + cdy; }
    if (c === 'tr') { nW = initW + cdx; nH = initH - cdy; }
    if (c === 'tl') { nW = initW - cdx; nH = initH - cdy; }
    nW = Math.max(MIN, Math.round(nW));
    nH = Math.max(MIN, Math.round(nH));
    st.nodes.update({ id, nodeWidth: nW, nodeHeight: nH, ...visNodeProps(node.shapeType || 'box', node.colorKey || 'c-gray', nW, nH, node.fontSize, node.textAlign, node.textValign) });
    updatedIds.push(id);
  } else {
    const { initBoxW, initBoxH } = st.resizeDrag;
    let sx = 1, sy = 1;
    if (c === 'br') { sx = (initBoxW + cdx) / initBoxW; sy = (initBoxH + cdy) / initBoxH; }
    if (c === 'bl') { sx = (initBoxW - cdx) / initBoxW; sy = (initBoxH + cdy) / initBoxH; }
    if (c === 'tr') { sx = (initBoxW + cdx) / initBoxW; sy = (initBoxH - cdy) / initBoxH; }
    if (c === 'tl') { sx = (initBoxW - cdx) / initBoxW; sy = (initBoxH - cdy) / initBoxH; }
    sx = Math.max(0.1, sx); sy = Math.max(0.1, sy);
    for (const { id, node, initW, initH } of st.resizeDrag.startBBs) {
      const nW = Math.max(MIN, Math.round(initW * sx));
      const nH = Math.max(MIN, Math.round(initH * sy));
      st.nodes.update({ id, nodeWidth: nW, nodeHeight: nH, ...visNodeProps(node.shapeType || 'box', node.colorKey || 'c-gray', nW, nH, node.fontSize, node.textAlign, node.textValign) });
      updatedIds.push(id);
    }
  }

  updatedIds.forEach((id) => { const bn = st.network.body.nodes[id]; if (bn) bn.refreshNeeded = true; });
  st.network.redraw();
  updateSelectionOverlay();
}

function onResizeEnd() {
  if (!st.resizeDrag) return;
  st.selectedNodeIds.forEach((id) => st.nodes.update({ id, fixed: false }));
  document.getElementById('vis-canvas').style.pointerEvents = '';
  document.removeEventListener('mousemove', onResizeDrag);
  document.removeEventListener('mouseup',   onResizeEnd);
  st.resizeDrag = null;
  markDirty();
}

// ── Rotation ──────────────────────────────────────────────────────────────────
function onRotateStart(e) {
  if (!st.selectedNodeIds.length || !st.network) return;
  e.preventDefault();
  e.stopPropagation();

  // Compute the centre of the selection in DOM coordinates.
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  st.selectedNodeIds.forEach((id) => {
    const b = nodeBounds(id); if (!b) return;
    minX = Math.min(minX, b.minX); minY = Math.min(minY, b.minY);
    maxX = Math.max(maxX, b.maxX); maxY = Math.max(maxY, b.maxY);
  });
  const centreCanvas = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  const centreDOM    = st.network.canvasToDOM(centreCanvas);

  const startAngle = Math.atan2(e.clientY - centreDOM.y, e.clientX - centreDOM.x);
  const nodeAngles = st.selectedNodeIds.map((id) => {
    const n = st.nodes.get(id);
    return { id, initRotation: (n && n.rotation) || 0 };
  });

  st.rotateDrag = { startAngle, nodeAngles, centreDOM };
  document.getElementById('vis-canvas').style.pointerEvents = 'none';
  document.addEventListener('mousemove', onRotateDrag);
  document.addEventListener('mouseup',   onRotateEnd);
}

function onRotateDrag(e) {
  if (!st.rotateDrag || !st.network) return;
  const { startAngle, nodeAngles, centreDOM } = st.rotateDrag;
  const currentAngle = Math.atan2(e.clientY - centreDOM.y, e.clientX - centreDOM.x);
  const delta        = currentAngle - startAngle;

  nodeAngles.forEach(({ id, initRotation }) => {
    const newRotation = initRotation + delta;
    st.nodes.update({ id, rotation: newRotation });
    const bn = st.network.body.nodes[id];
    if (bn) bn.refreshNeeded = true;
  });
  st.network.redraw();
  updateSelectionOverlay();
}

function onRotateEnd() {
  if (!st.rotateDrag) return;
  document.getElementById('vis-canvas').style.pointerEvents = '';
  document.removeEventListener('mousemove', onRotateDrag);
  document.removeEventListener('mouseup',   onRotateEnd);
  st.rotateDrag = null;
  markDirty();
}

// ── Wire handles ──────────────────────────────────────────────────────────────
['tl', 'tr', 'bl', 'br'].forEach((corner) => {
  document.getElementById('rh-' + corner).addEventListener('mousedown', (e) => onResizeStart(e, corner));
});
document.getElementById('rh-rotate').addEventListener('mousedown', onRotateStart);
