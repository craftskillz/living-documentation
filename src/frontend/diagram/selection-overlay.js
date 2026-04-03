// ── Selection / resize overlay ────────────────────────────────────────────────
// Dashed selection box + corner resize handles for selected nodes.

import { st, markDirty } from './state.js';
import { visNodeProps } from './node-rendering.js';

export function updateSelectionOverlay() {
  if (!st.network || !st.selectedNodeIds.length) { hideSelectionOverlay(); return; }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const id of st.selectedNodeIds) {
    try {
      const n = st.nodes.get(id);
      if (n && n.shapeType === 'actor') {
        // getBoundingBox() returns wrong values for custom ctxRenderer shapes.
        // Compute the visual bounds from the node's centre + scaled actor geometry.
        const bodyNode = st.network.body.nodes[id];
        if (!bodyNode) continue;
        const cx = bodyNode.x, cy = bodyNode.y;
        const W  = n.nodeWidth  || 30;
        const H  = n.nodeHeight || 52;
        const sy = H / 52;
        minX = Math.min(minX, cx - W / 2);
        minY = Math.min(minY, cy - 28 * sy); // head top
        maxX = Math.max(maxX, cx + W / 2);
        maxY = Math.max(maxY, cy + 24 * sy); // legs bottom
      } else {
        const bb = st.network.getBoundingBox(id);
        minX = Math.min(minX, bb.left);
        minY = Math.min(minY, bb.top);
        maxX = Math.max(maxX, bb.right);
        maxY = Math.max(maxY, bb.bottom);
      }
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

}

export function hideSelectionOverlay() {
  document.getElementById('selectionOverlay').style.display = 'none';
}

function onResizeStart(e, corner) {
  if (!st.selectedNodeIds.length || !st.network) return;
  e.preventDefault();
  e.stopPropagation();

  const startBBs = st.selectedNodeIds.map((id) => {
    const n  = st.nodes.get(id);
    // getBoundingBox() returns wrong values for custom ctxRenderer shapes (actor).
    // Fall back to the actor's reference dimensions when no resize has happened yet.
    let initW, initH;
    if (n && n.shapeType === 'actor') {
      initW = n.nodeWidth  || 30;
      initH = n.nodeHeight || 52;
    } else {
      const bb = st.network.getBoundingBox(id);
      initW = n.nodeWidth  || Math.round(bb.right  - bb.left);
      initH = n.nodeHeight || Math.round(bb.bottom - bb.top);
    }
    return { id, node: n, initW, initH };
  });

  const initBoxW = startBBs.reduce((max, b) => Math.max(max, b.initW), 0);
  const initBoxH = startBBs.reduce((max, b) => Math.max(max, b.initH), 0);

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
  const MIN   = 40;
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
    st.nodes.update({ id, nodeWidth: nW, nodeHeight: nH, ...visNodeProps(node.shapeType || 'box', node.colorKey || 'c-gray', nW, nH, node.fontSize, node.textAlign, node.textValign, nH) });
    updatedIds.push(id);
  } else {
    const { initBoxW, initBoxH } = st.resizeDrag;
    let sx = 1, sy = 1;
    if (c === 'br') { sx = (initBoxW + cdx) / initBoxW; sy = (initBoxH + cdy) / initBoxH; }
    if (c === 'bl') { sx = (initBoxW - cdx) / initBoxW; sy = (initBoxH + cdy) / initBoxH; }
    if (c === 'tr') { sx = (initBoxW + cdx) / initBoxW; sy = (initBoxH - cdy) / initBoxH; }
    if (c === 'tl') { sx = (initBoxW - cdx) / initBoxW; sy = (initBoxH - cdy) / initBoxH; }
    sx = Math.max(0.1, sx);
    sy = Math.max(0.1, sy);
    for (const { id, node, initW, initH } of st.resizeDrag.startBBs) {
      const nW = Math.max(MIN, Math.round(initW * sx));
      const nH = Math.max(MIN, Math.round(initH * sy));
      st.nodes.update({ id, nodeWidth: nW, nodeHeight: nH, ...visNodeProps(node.shapeType || 'box', node.colorKey || 'c-gray', nW, nH, node.fontSize, node.textAlign, node.textValign, nH) });
      updatedIds.push(id);
    }
  }

  // vis-network's needsRefresh() can return false for certain shapes (e.g. database)
  // when only widthConstraint or heightConstraint changes, because the check is based
  // on label/font state, not constraints. Force the internal refresh flag and redraw.
  updatedIds.forEach((id) => {
    const bn = st.network.body.nodes[id];
    if (bn) bn.refreshNeeded = true;
  });
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

// ── Wire corner handle mouse events ───────────────────────────────────────────
['tl', 'tr', 'bl', 'br'].forEach((corner) => {
  document.getElementById('rh-' + corner).addEventListener('mousedown', (e) => onResizeStart(e, corner));
});
