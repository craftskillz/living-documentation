// ── Node panel ────────────────────────────────────────────────────────────────
// Floating formatting toolbar for selected nodes (color, font, alignment, z-order).

import { st, markDirty } from './state.js';
import { SHAPE_DEFAULTS } from './node-rendering.js';

// ── Last-used style persistence (per shape type) ──────────────────────────────
// Saves colorKey/fontSize/textAlign/textValign per shapeType to localStorage so
// the next shape of that type is created with the same style.

function persistNodeStyle() {
  st.selectedNodeIds.forEach((id) => {
    const n = st.nodes && st.nodes.get(id);
    if (!n || !n.shapeType || n.shapeType === 'anchor') return;
    localStorage.setItem('ld-node-style-' + n.shapeType, JSON.stringify({
      colorKey:   n.colorKey   || 'c-gray',
      fontSize:   n.fontSize   || null,
      textAlign:  n.textAlign  || null,
      textValign: n.textValign || null,
    }));
  });
}

export function getLastNodeStyle(shapeType) {
  try { return JSON.parse(localStorage.getItem('ld-node-style-' + shapeType)) || {}; }
  catch { return {}; }
}

// All shapes are ctxRenderers — vis-network never re-reads the closure after
// nodes.update(). Force refreshNeeded + redraw so the new colorKey/fontSize/
// textAlign/textValign values are picked up on the next draw call via st.nodes.get(id).
function forceRedraw() {
  st.selectedNodeIds.forEach((id) => {
    const bn = st.network && st.network.body.nodes[id];
    if (bn) bn.refreshNeeded = true;
  });
  if (st.network) st.network.redraw();
}

export function showNodePanel() {
  document.getElementById('nodePanel').classList.remove('hidden');
  // If ALL selected nodes are locked, hide the formatting controls and show lock button only.
  const allLocked = st.selectedNodeIds.length > 0 &&
    st.selectedNodeIds.every((id) => { const n = st.nodes && st.nodes.get(id); return n && n.locked; });
  document.getElementById('nodePanelControls').classList.toggle('hidden', allLocked);
  // Update lock button appearance
  document.getElementById('btnNodeLock').classList.toggle('tool-active', allLocked);
}

export function hideNodePanel() {
  document.getElementById('nodePanel').classList.add('hidden');
}

export function toggleNodeLock() {
  if (!st.selectedNodeIds.length) return;
  // If all are locked → unlock; otherwise → lock all.
  const allLocked = st.selectedNodeIds.every((id) => { const n = st.nodes && st.nodes.get(id); return n && n.locked; });
  const nextLocked = !allLocked;
  st.selectedNodeIds.forEach((id) => {
    st.nodes.update({ id, locked: nextLocked, fixed: nextLocked ? { x: true, y: true } : false, draggable: !nextLocked });
    const bn = st.network && st.network.body.nodes[id];
    if (bn) bn.refreshNeeded = true;
  });
  if (st.network) st.network.redraw();
  showNodePanel();
  markDirty();
}

export function setNodeColor(colorKey) {
  if (!st.selectedNodeIds.length) return;
  st.selectedNodeIds.forEach((id) => {
    const n = st.nodes.get(id);
    if (!n) return;
    st.nodes.update({ id, colorKey });
  });
  persistNodeStyle();
  forceRedraw();
  markDirty();
}

export function changeNodeFontSize(delta) {
  if (!st.selectedNodeIds.length) return;
  st.selectedNodeIds.forEach((id) => {
    const n = st.nodes.get(id);
    if (!n) return;
    const newSize = Math.max(8, Math.min(48, (n.fontSize || 13) + delta));
    st.nodes.update({ id, fontSize: newSize });
  });
  persistNodeStyle();
  forceRedraw();
  markDirty();
}

export function setTextAlign(align) {
  if (!st.selectedNodeIds.length) return;
  st.selectedNodeIds.forEach((id) => {
    const n = st.nodes.get(id);
    if (!n) return;
    st.nodes.update({ id, textAlign: align });
  });
  persistNodeStyle();
  forceRedraw();
  markDirty();
}

export function setTextValign(valign) {
  if (!st.selectedNodeIds.length) return;
  st.selectedNodeIds.forEach((id) => {
    const n = st.nodes.get(id);
    if (!n) return;
    st.nodes.update({ id, textValign: valign });
  });
  persistNodeStyle();
  forceRedraw();
  markDirty();
}

// ── Stamp (format painter) ────────────────────────────────────────────────────
// Uses a transparent DOM overlay (#stampOverlay) that intercepts canvas clicks
// during stamp mode. This bypasses vis-network's event system entirely, avoiding
// the deselectNode/click ordering problems that make st.activeStamp unreliable.

const STAMP_BTNS = { color: 'btnStampColor', rotation: 'btnStampRotation', fontSize: 'btnStampFontSize' };

export function activateStamp(type) {
  if (!st.stampTargetIds.length) return; // targets were saved on mousedown
  st.activeStamp = type;
  const overlay = document.getElementById('stampOverlay');
  overlay.style.display = 'block';
  Object.entries(STAMP_BTNS).forEach(([t, id]) =>
    document.getElementById(id).classList.toggle('tool-active', t === type)
  );
}

export function cancelStamp() {
  st.activeStamp = null;
  st.stampTargetIds = [];
  document.getElementById('stampOverlay').style.display = 'none';
  Object.values(STAMP_BTNS).forEach((id) =>
    document.getElementById(id).classList.remove('tool-active')
  );
}

function applyStamp(sourceId) {
  const source = st.nodes.get(sourceId);
  if (!source || !st.activeStamp || !st.stampTargetIds.length) return;
  const type    = st.activeStamp;
  const targets = [...st.stampTargetIds]; // snapshot before cancelStamp clears the array
  cancelStamp();

  targets.forEach((id) => {
    if (id === sourceId) return;
    const target = st.nodes.get(id);
    if (!target) return;
    if (type === 'color')    st.nodes.update({ id, colorKey: source.colorKey || 'c-gray' });
    if (type === 'rotation') st.nodes.update({ id, rotation: source.rotation || 0 });
    if (type === 'fontSize') st.nodes.update({ id, fontSize: source.fontSize || 13 });
    const bn = st.network && st.network.body.nodes[id];
    if (bn) bn.refreshNeeded = true;
  });
  if (st.network) st.network.redraw();
  markDirty();
}

// getNodeAt() is unreliable for shape:'custom' (bounding box near-zero).
// Manual AABB hit test using DOMtoCanvas + node dimensions, topmost node first.
function getNodeAtDOMPoint(domX, domY) {
  if (!st.network || !st.nodes) return undefined;
  const cp = st.network.DOMtoCanvas({ x: domX, y: domY });
  for (let i = st.canonicalOrder.length - 1; i >= 0; i--) {
    const id = st.canonicalOrder[i];
    const n  = st.nodes.get(id);
    const bn = st.network.body.nodes[id];
    if (!n || !bn) continue;
    const defaults = SHAPE_DEFAULTS[n.shapeType] || [100, 40];
    const w = n.nodeWidth  || defaults[0];
    const h = n.nodeHeight || defaults[1];
    const rot = n.rotation || 0;
    let hw, hh;
    if (rot === 0) {
      hw = w / 2; hh = h / 2;
    } else {
      const cos = Math.abs(Math.cos(rot)); const sin = Math.abs(Math.sin(rot));
      hw = (w * cos + h * sin) / 2;
      hh = (w * sin + h * cos) / 2;
    }
    if (Math.abs(cp.x - bn.x) <= hw && Math.abs(cp.y - bn.y) <= hh) return id;
  }
  return undefined;
}

// Wire the stamp overlay click.
document.getElementById('stampOverlay').addEventListener('click', (e) => {
  if (!st.activeStamp || !st.network) return;
  const rect   = document.getElementById('vis-canvas').getBoundingClientRect();
  const nodeId = getNodeAtDOMPoint(e.clientX - rect.left, e.clientY - rect.top);
  if (nodeId !== undefined) {
    applyStamp(nodeId);
  } else {
    cancelStamp();
  }
});

// ── Step rotation ─────────────────────────────────────────────────────────────

export function stepRotate(degrees) {
  if (!st.selectedNodeIds.length) return;
  const delta = degrees * (Math.PI / 180);
  st.selectedNodeIds.forEach((id) => {
    const n = st.nodes.get(id);
    if (!n) return;
    st.nodes.update({ id, rotation: (n.rotation || 0) + delta });
    const bn = st.network && st.network.body.nodes[id];
    if (bn) bn.refreshNeeded = true;
  });
  if (st.network) st.network.redraw();
  markDirty();
}

export function changeZOrder(direction) {
  // direction: +1 = bring to front (last in canonicalOrder = drawn on top)
  //            -1 = send to back   (first in canonicalOrder = drawn below)
  if (!st.selectedNodeIds.length) return;
  st.selectedNodeIds.forEach((id) => {
    const idx = st.canonicalOrder.indexOf(id);
    if (idx === -1) return;
    st.canonicalOrder.splice(idx, 1);
    if (direction > 0) st.canonicalOrder.push(id);
    else               st.canonicalOrder.unshift(id);
  });
  st.network.redraw();
  st.network.selectNodes(st.selectedNodeIds);
  markDirty();
}
