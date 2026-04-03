// ── Node panel ────────────────────────────────────────────────────────────────
// Floating formatting toolbar for selected nodes (color, font, alignment, z-order).

import { st, markDirty } from './state.js';
import { visNodeProps, getActualNodeHeight } from './node-rendering.js';

export function showNodePanel() {
  document.getElementById('nodePanel').classList.remove('hidden');
}

export function hideNodePanel() {
  document.getElementById('nodePanel').classList.add('hidden');
}

export function setNodeColor(colorKey) {
  if (!st.selectedNodeIds.length) return;
  st.selectedNodeIds.forEach((id) => {
    const n = st.nodes.get(id);
    if (!n) return;
    st.nodes.update({ id, colorKey, ...visNodeProps(n.shapeType || 'box', colorKey, n.nodeWidth, n.nodeHeight, n.fontSize, n.textAlign, n.textValign) });
  });
  markDirty();
}

export function changeNodeFontSize(delta) {
  if (!st.selectedNodeIds.length) return;
  st.selectedNodeIds.forEach((id) => {
    const n = st.nodes.get(id);
    if (!n) return;
    const newSize = Math.max(8, Math.min(48, (n.fontSize || 13) + delta));
    const ah = getActualNodeHeight(id);
    st.nodes.update({ id, fontSize: newSize, ...visNodeProps(n.shapeType || 'box', n.colorKey || 'c-gray', n.nodeWidth, n.nodeHeight, newSize, n.textAlign, n.textValign, ah) });
  });
  markDirty();
}

export function setTextAlign(align) {
  if (!st.selectedNodeIds.length) return;
  st.selectedNodeIds.forEach((id) => {
    const n  = st.nodes.get(id);
    if (!n) return;
    const ah = getActualNodeHeight(id);
    st.nodes.update({ id, textAlign: align, ...visNodeProps(n.shapeType || 'box', n.colorKey || 'c-gray', n.nodeWidth, n.nodeHeight, n.fontSize, align, n.textValign, ah) });
  });
  markDirty();
}

export function setTextValign(valign) {
  if (!st.selectedNodeIds.length) return;
  st.selectedNodeIds.forEach((id) => {
    const n  = st.nodes.get(id);
    if (!n) return;
    const ah = getActualNodeHeight(id);
    st.nodes.update({ id, textValign: valign, ...visNodeProps(n.shapeType || 'box', n.colorKey || 'c-gray', n.nodeWidth, n.nodeHeight, n.fontSize, n.textAlign, valign, ah) });
  });
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
