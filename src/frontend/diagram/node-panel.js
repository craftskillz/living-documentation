// ── Node panel ────────────────────────────────────────────────────────────────
// Floating formatting toolbar for selected nodes (color, font, alignment, z-order).

import { st, markDirty } from './state.js';

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
}

export function hideNodePanel() {
  document.getElementById('nodePanel').classList.add('hidden');
}

export function setNodeColor(colorKey) {
  if (!st.selectedNodeIds.length) return;
  st.selectedNodeIds.forEach((id) => {
    const n = st.nodes.get(id);
    if (!n) return;
    st.nodes.update({ id, colorKey });
  });
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
  forceRedraw();
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
