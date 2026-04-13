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

  // Show/hide the clear-ports button based on whether this edge has ports.
  const hasPorts = !!(e.fromPort || e.toPort);
  document.getElementById('btnEdgeClearPorts').classList.toggle('edge-btn-active', hasPorts);

  document.getElementById('edgePanel').classList.remove('hidden');
}

export function clearEdgePorts() {
  if (!st.selectedEdgeIds.length) return;
  st.selectedEdgeIds.forEach((id) => {
    const e = st.edges.get(id);
    if (!e) return;
    // Restore vis-network's default edge rendering (color + arrows).
    st.edges.update({
      id,
      fromPort: null,
      toPort: null,
      color: { color: '#a8a29e', highlight: '#f97316', hover: '#f97316' },
      ...visEdgeProps(e.arrowDir ?? 'to', e.dashes ?? false),
    });
  });
  showEdgePanel();
  markDirty();
}

export function hideEdgePanel() {
  document.getElementById('edgePanel').classList.add('hidden');
}

export function setEdgeArrow(dir) {
  if (!st.selectedEdgeIds.length) return;
  st.selectedEdgeIds.forEach((id) => {
    const e = st.edges.get(id);
    if (!e) return;
    const update = { id, arrowDir: dir };
    // For port edges, vis-network arrows stay disabled; drawPortEdge handles them.
    if (!(e.fromPort || e.toPort)) Object.assign(update, visEdgeProps(dir, e.dashes ?? false));
    st.edges.update(update);
  });
  showEdgePanel();
  markDirty();
}

export function setEdgeDashes(dashes) {
  if (!st.selectedEdgeIds.length) return;
  st.selectedEdgeIds.forEach((id) => {
    const e = st.edges.get(id);
    if (!e) return;
    const update = { id, dashes };
    // For port edges, vis-network arrows stay disabled; drawPortEdge handles them.
    if (!(e.fromPort || e.toPort)) Object.assign(update, visEdgeProps(e.arrowDir ?? 'to', dashes));
    st.edges.update(update);
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
    const isRotated = Math.abs(e.labelRotation || 0) > 0.001;
    st.edges.update({ id, fontSize: newSize, font: { size: newSize, align: 'middle', color: isRotated ? 'rgba(0,0,0,0)' : '#6b7280' } });
  });
  markDirty();
}

export function stepEdgeLabelRotation(delta) {
  if (!st.selectedEdgeIds.length) return;
  st.selectedEdgeIds.forEach((id) => {
    const e = st.edges.get(id);
    if (!e) return;
    const newRotation = (e.labelRotation || 0) + delta;
    const isRotated = Math.abs(newRotation) > 0.001;
    st.edges.update({
      id,
      labelRotation: newRotation,
      font: { size: e.fontSize || 11, align: 'middle', color: isRotated ? 'rgba(0,0,0,0)' : '#6b7280' },
    });
  });
  markDirty();
}
