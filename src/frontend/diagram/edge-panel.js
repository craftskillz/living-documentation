// ── Edge panel ────────────────────────────────────────────────────────────────
// Floating formatting toolbar for selected edges (arrow type, line style, font size).

import { st, markDirty } from './state.js';
import { visEdgeProps } from './edge-rendering.js';

export function showEdgePanel() {
  if (!st.selectedEdgeIds.length) return;
  const e = st.edges.get(st.selectedEdgeIds[0]);
  if (!e) return;
  const dir    = e.arrowDir ?? 'to';
  const dashes = e.dashes   ?? false;

  ['edgeBtnNone', 'edgeBtnTo', 'edgeBtnBoth'].forEach((id) =>
    document.getElementById(id).classList.remove('edge-btn-active'));
  document.getElementById({ none: 'edgeBtnNone', to: 'edgeBtnTo', both: 'edgeBtnBoth' }[dir] || 'edgeBtnTo')
    .classList.add('edge-btn-active');

  ['edgeBtnSolid', 'edgeBtnDashed'].forEach((id) =>
    document.getElementById(id).classList.remove('edge-btn-active'));
  document.getElementById(dashes ? 'edgeBtnDashed' : 'edgeBtnSolid').classList.add('edge-btn-active');

  document.getElementById('edgePanel').classList.remove('hidden');
}

export function hideEdgePanel() {
  document.getElementById('edgePanel').classList.add('hidden');
}

export function setEdgeArrow(dir) {
  if (!st.selectedEdgeIds.length) return;
  st.selectedEdgeIds.forEach((id) => {
    const e = st.edges.get(id);
    if (!e) return;
    st.edges.update({ id, arrowDir: dir, ...visEdgeProps(dir, e.dashes ?? false) });
  });
  showEdgePanel();
  markDirty();
}

export function setEdgeDashes(dashes) {
  if (!st.selectedEdgeIds.length) return;
  st.selectedEdgeIds.forEach((id) => {
    const e = st.edges.get(id);
    if (!e) return;
    st.edges.update({ id, dashes, ...visEdgeProps(e.arrowDir ?? 'to', dashes) });
  });
  showEdgePanel();
  markDirty();
}

export function changeEdgeFontSize(delta) {
  if (!st.selectedEdgeIds.length) return;
  st.selectedEdgeIds.forEach((id) => {
    const e = st.edges.get(id);
    if (!e) return;
    const newSize = Math.max(8, Math.min(48, (e.fontSize || 11) + delta));
    st.edges.update({ id, fontSize: newSize, font: { size: newSize, align: 'middle', color: '#6b7280' } });
  });
  markDirty();
}
