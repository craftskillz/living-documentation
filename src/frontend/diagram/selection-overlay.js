// ── Selection / resize / rotate overlay ───────────────────────────────────────
// Dashed selection box, corner resize handles, and top-centre rotation handle.

import { st, markDirty } from './state.js';
import { visNodeProps, SHAPE_DEFAULTS } from './node-rendering.js';
import { t }             from './t.js';
import { pushSnapshot }  from './history.js';

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
  // Anchor-only selections (free arrow drag) have no meaningful bounding box.
  const hasNonAnchor = st.selectedNodeIds.some((id) => { const n = st.nodes && st.nodes.get(id); return !(n && n.shapeType === 'anchor'); });
  if (!hasNonAnchor) { hideSelectionOverlay(); return; }

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

  // Hide resize/rotate handles when any selected node is locked.
  const anyLocked = st.selectedNodeIds.some((id) => { const n = st.nodes && st.nodes.get(id); return n && n.locked; });
  ['rh-tl','rh-tr','rh-bl','rh-br','rh-rotate','rh-label-rotate'].forEach((id) => {
    document.getElementById(id).style.display = anyLocked ? 'none' : '';
  });

  // Position rotation handle: top-centre of the overlay, 28px above it.
  const rh = document.getElementById('rh-rotate');
  rh.style.left = (br.x - tl.x) / 2 + PAD - 8 + 'px';
  rh.style.top  = '-28px';

  // Position label rotation handle: top-centre offset left by 24px to avoid overlap.
  const lrh = document.getElementById('rh-label-rotate');
  lrh.style.left = (br.x - tl.x) / 2 + PAD - 8 - 24 + 'px';
  lrh.style.top  = '-28px';
}

export function hideSelectionOverlay() {
  document.getElementById('selectionOverlay').style.display = 'none';
}

// ── Resize ────────────────────────────────────────────────────────────────────
function onResizeStart(e, corner) {
  if (!st.selectedNodeIds.length || !st.network) return;
  // Skip if any selected node is locked.
  if (st.selectedNodeIds.some((id) => { const n = st.nodes && st.nodes.get(id); return n && n.locked; })) return;
  pushSnapshot();
  e.preventDefault();
  e.stopPropagation();

  const positions = st.network.getPositions(st.selectedNodeIds);
  const startBBs = st.selectedNodeIds.map((id) => {
    const n = st.nodes.get(id);
    const b = nodeBounds(id);
    const shape    = (n && n.shapeType) || 'box';
    const defaults = SHAPE_DEFAULTS[shape] || [60, 28];
    const initW = (n && n.nodeWidth)  || (b ? Math.round(b.maxX - b.minX) : defaults[0]);
    const initH = (n && n.nodeHeight) || (b ? Math.round(b.maxY - b.minY) : defaults[1]);
    const pos = positions[id] || { x: 0, y: 0 };
    return { id, node: n, initW, initH, initX: pos.x, initY: pos.y };
  });

  // True bounding box of the whole selection (for scale reference and pivot)
  let bbMinX = Infinity, bbMinY = Infinity, bbMaxX = -Infinity, bbMaxY = -Infinity;
  for (const { id } of startBBs) {
    const b = nodeBounds(id);
    if (!b) continue;
    bbMinX = Math.min(bbMinX, b.minX); bbMinY = Math.min(bbMinY, b.minY);
    bbMaxX = Math.max(bbMaxX, b.maxX); bbMaxY = Math.max(bbMaxY, b.maxY);
  }
  const initBoxW = (bbMaxX - bbMinX) || 1;
  const initBoxH = (bbMaxY - bbMinY) || 1;

  st.resizeDrag = { corner, startMouse: { x: e.clientX, y: e.clientY }, startBBs, initBoxW, initBoxH, bbMinX, bbMinY, bbMaxX, bbMaxY };
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
    const { id, node, initW, initH, initX, initY } = st.resizeDrag.startBBs[0];
    let nW = initW, nH = initH;
    if (c === 'br') { nW = initW + cdx; nH = initH + cdy; }
    if (c === 'bl') { nW = initW - cdx; nH = initH + cdy; }
    if (c === 'tr') { nW = initW + cdx; nH = initH - cdy; }
    if (c === 'tl') { nW = initW - cdx; nH = initH - cdy; }
    if (e.shiftKey && initW > 0 && initH > 0) {
      const s = Math.max(nW / initW, nH / initH);
      nW = initW * s;
      nH = initH * s;
    }
    nW = Math.max(MIN, Math.round(nW));
    nH = Math.max(MIN, Math.round(nH));
    st.nodes.update({ id, nodeWidth: nW, nodeHeight: nH, ...visNodeProps(node.shapeType || 'box', node.colorKey || 'c-gray', nW, nH, node.fontSize, node.textAlign, node.textValign) });
    if (!st.resizeSymmetric) {
      // Anchor the opposite corner: move center so that the fixed corner stays put.
      let nx = initX, ny = initY;
      if (c === 'br') { nx = initX - initW / 2 + nW / 2; ny = initY - initH / 2 + nH / 2; }
      if (c === 'bl') { nx = initX + initW / 2 - nW / 2; ny = initY - initH / 2 + nH / 2; }
      if (c === 'tr') { nx = initX - initW / 2 + nW / 2; ny = initY + initH / 2 - nH / 2; }
      if (c === 'tl') { nx = initX + initW / 2 - nW / 2; ny = initY + initH / 2 - nH / 2; }
      st.network.moveNode(id, nx, ny);
    }
    updatedIds.push(id);
  } else {
    const { initBoxW, initBoxH, bbMinX, bbMinY, bbMaxX, bbMaxY } = st.resizeDrag;
    let sx = 1, sy = 1;
    if (c === 'br') { sx = (initBoxW + cdx) / initBoxW; sy = (initBoxH + cdy) / initBoxH; }
    if (c === 'bl') { sx = (initBoxW - cdx) / initBoxW; sy = (initBoxH + cdy) / initBoxH; }
    if (c === 'tr') { sx = (initBoxW + cdx) / initBoxW; sy = (initBoxH - cdy) / initBoxH; }
    if (c === 'tl') { sx = (initBoxW - cdx) / initBoxW; sy = (initBoxH - cdy) / initBoxH; }
    sx = Math.max(0.1, sx); sy = Math.max(0.1, sy);
    if (e.shiftKey) { const s = Math.max(sx, sy); sx = s; sy = s; }

    // Pivot = corner opposite to the drag corner (stays fixed during scale)
    const pivotX = (c === 'br' || c === 'tr') ? bbMinX : bbMaxX;
    const pivotY = (c === 'br' || c === 'bl') ? bbMinY : bbMaxY;

    for (const { id, node, initW, initH, initX, initY } of st.resizeDrag.startBBs) {
      const nW = Math.max(MIN, Math.round(initW * sx));
      const nH = Math.max(MIN, Math.round(initH * sy));
      st.nodes.update({ id, nodeWidth: nW, nodeHeight: nH, ...visNodeProps(node.shapeType || 'box', node.colorKey || 'c-gray', nW, nH, node.fontSize, node.textAlign, node.textValign) });
      st.network.moveNode(id, pivotX + (initX - pivotX) * sx, pivotY + (initY - pivotY) * sy);
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
  // Skip if any selected node is locked.
  if (st.selectedNodeIds.some((id) => { const n = st.nodes && st.nodes.get(id); return n && n.locked; })) return;
  pushSnapshot();
  e.preventDefault();
  e.stopPropagation();

  // Barycentre of the selection in canvas coordinates.
  const positions = st.network.getPositions(st.selectedNodeIds);
  const ids = st.selectedNodeIds;
  const cx = ids.reduce((s, id) => s + (positions[id] ? positions[id].x : 0), 0) / ids.length;
  const cy = ids.reduce((s, id) => s + (positions[id] ? positions[id].y : 0), 0) / ids.length;

  const nodeAngles = ids.map((id) => {
    const n = st.nodes.get(id);
    const pos = positions[id] || { x: 0, y: 0 };
    return {
      id,
      initRotation: (n && n.rotation) || 0,
      // Position relative to barycentre at drag start
      relX: pos.x - cx,
      relY: pos.y - cy,
    };
  });

  // Horizontal drag → rotation: right = clockwise, left = counter-clockwise.
  // 1 px = 1 degree.
  st.rotateDrag = { startX: e.clientX, nodeAngles, cx, cy };
  document.getElementById('vis-canvas').style.pointerEvents = 'none';
  document.addEventListener('mousemove', onRotateDrag);
  document.addEventListener('mouseup',   onRotateEnd);
}

function onRotateDrag(e) {
  if (!st.rotateDrag || !st.network) return;
  const { startX, nodeAngles, cx, cy } = st.rotateDrag;
  const dx    = e.clientX - startX;
  const delta = dx * (Math.PI / 180); // 1 px = 1 degree
  const cos   = Math.cos(delta);
  const sin   = Math.sin(delta);

  nodeAngles.forEach(({ id, initRotation, relX, relY }) => {
    // Rotate the node's position around the barycentre
    const newX = cx + relX * cos - relY * sin;
    const newY = cy + relX * sin + relY * cos;
    st.network.moveNode(id, newX, newY);
    // Rotate the node's own orientation
    st.nodes.update({ id, rotation: initRotation + delta });
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

// ── Label rotation ────────────────────────────────────────────────────────────
function onLabelRotateStart(e) {
  if (!st.selectedNodeIds.length || !st.network) return;
  pushSnapshot();
  e.preventDefault();
  e.stopPropagation();

  const nodeAngles = st.selectedNodeIds.map((id) => {
    const n = st.nodes.get(id);
    return { id, initLabelRotation: (n && n.labelRotation) || 0 };
  });

  st.labelRotateDrag = { startX: e.clientX, nodeAngles };
  document.getElementById('vis-canvas').style.pointerEvents = 'none';
  document.addEventListener('mousemove', onLabelRotateDrag);
  document.addEventListener('mouseup',   onLabelRotateEnd);
}

function onLabelRotateDrag(e) {
  if (!st.labelRotateDrag || !st.network) return;
  const { startX, nodeAngles } = st.labelRotateDrag;
  const dx    = e.clientX - startX;
  const delta = dx * (Math.PI / 180); // 1 px = 1 degree

  nodeAngles.forEach(({ id, initLabelRotation }) => {
    st.nodes.update({ id, labelRotation: initLabelRotation + delta });
    const bn = st.network.body.nodes[id];
    if (bn) bn.refreshNeeded = true;
  });
  st.network.redraw();
}

function onLabelRotateEnd() {
  if (!st.labelRotateDrag) return;
  document.getElementById('vis-canvas').style.pointerEvents = '';
  document.removeEventListener('mousemove', onLabelRotateDrag);
  document.removeEventListener('mouseup',   onLabelRotateEnd);
  st.labelRotateDrag = null;
  markDirty();
}

// ── Wire handles ──────────────────────────────────────────────────────────────
['tl', 'tr', 'bl', 'br'].forEach((corner) => {
  document.getElementById('rh-' + corner).addEventListener('mousedown', (e) => onResizeStart(e, corner));
});
document.getElementById('rh-rotate').addEventListener('mousedown', onRotateStart);
document.getElementById('rh-label-rotate').addEventListener('mousedown', onLabelRotateStart);

// ── Resize mode toggle ────────────────────────────────────────────────────────
export function toggleResizeMode() {
  st.resizeSymmetric = !st.resizeSymmetric;
  const btn        = document.getElementById('btnResizeMode');
  const iconCorner = document.getElementById('icon-resize-corner');
  const iconCenter = document.getElementById('icon-resize-center');
  if (st.resizeSymmetric) {
    btn.title = t('diagram.toolbar.resize_center');
    btn.classList.remove('active-tool');
    iconCorner.classList.add('hidden');
    iconCenter.classList.remove('hidden');
  } else {
    btn.title = t('diagram.toolbar.resize_corner');
    btn.classList.add('active-tool');
    iconCorner.classList.remove('hidden');
    iconCenter.classList.add('hidden');
  }
}
