// ── Edge panel ────────────────────────────────────────────────────────────────
// Floating formatting toolbar for selected edges (arrow type, line style, font size).

import { st, markDirty } from './state.js';
import { visEdgeProps } from './edge-rendering.js';

const DEFAULT_EDGE_COLOR = '#a8a29e';
const FREE_ARROW_STYLE_KEY = 'ld-free-arrow-style';

// Persist the style of the first free arrow (anchor→anchor) in the current
// selection so the next double-click creation reuses it.
function persistFreeArrowStyle() {
  const freeId = st.selectedEdgeIds.find((id) => {
    const e = st.edges.get(id);
    if (!e) return false;
    const fromN = st.nodes && st.nodes.get(e.from);
    const toN   = st.nodes && st.nodes.get(e.to);
    return fromN && fromN.shapeType === 'anchor' && toN && toN.shapeType === 'anchor';
  });
  if (!freeId) return;
  const e = st.edges.get(freeId);
  localStorage.setItem(FREE_ARROW_STYLE_KEY, JSON.stringify({
    arrowDir:  e.arrowDir  || 'to',
    dashes:    e.dashes    || false,
    edgeColor: e.edgeColor || null,
    edgeWidth: e.edgeWidth || null,
  }));
}

export function getLastFreeArrowStyle() {
  try { return JSON.parse(localStorage.getItem(FREE_ARROW_STYLE_KEY)) || {}; }
  catch { return {}; }
}

// Returns true if all selected edges are locked (for free arrows: both anchors locked;
// for regular edges: edgeLocked flag set).
function areAllSelectedEdgesLocked() {
  return st.selectedEdgeIds.length > 0 && st.selectedEdgeIds.every((id) => {
    const e = st.edges.get(id);
    if (!e) return false;
    const fromN = st.nodes && st.nodes.get(e.from);
    const toN   = st.nodes && st.nodes.get(e.to);
    const isFreeArrow = fromN && fromN.shapeType === 'anchor' && toN && toN.shapeType === 'anchor';
    return isFreeArrow ? (fromN.locked && toN.locked) : !!e.edgeLocked;
  });
}

export function showEdgePanel() {
  if (!st.selectedEdgeIds.length) return;
  const e = st.edges.get(st.selectedEdgeIds[0]);
  if (!e) return;

  const locked = areAllSelectedEdgesLocked();
  document.getElementById('btnEdgeLock').classList.toggle('tool-active', locked);
  document.getElementById('edgePanelControls').classList.toggle('hidden', locked);

  if (!locked) {
    const dir    = e.arrowDir ?? 'to';
    const dashes = e.dashes   ?? false;

    ['edgeBtnNone', 'edgeBtnTo', 'edgeBtnBoth'].forEach((id) =>
      document.getElementById(id).classList.remove('edge-btn-active'));
    document.getElementById({ none: 'edgeBtnNone', to: 'edgeBtnTo', both: 'edgeBtnBoth' }[dir] || 'edgeBtnTo')
      .classList.add('edge-btn-active');

    ['edgeBtnSolid', 'edgeBtnDashed'].forEach((id) =>
      document.getElementById(id).classList.remove('edge-btn-active'));
    document.getElementById(dashes ? 'edgeBtnDashed' : 'edgeBtnSolid').classList.add('edge-btn-active');

    // Highlight active color dot.
    const activeColor = (e.edgeColor || DEFAULT_EDGE_COLOR).toLowerCase();
    document.querySelectorAll('#edgePanel [data-edge-color]').forEach((btn) => {
      const isActive = btn.dataset.edgeColor.toLowerCase() === activeColor;
      btn.style.outline       = isActive ? '2px solid #f97316' : '';
      btn.style.outlineOffset = isActive ? '2px' : '';
    });

    // Show/hide the clear-ports button based on whether this edge has ports.
    const hasPorts = !!(e.fromPort || e.toPort);
    document.getElementById('btnEdgeClearPorts').classList.toggle('edge-btn-active', hasPorts);
  }

  document.getElementById('edgePanel').classList.remove('hidden');
}

export function toggleEdgeLock() {
  if (!st.selectedEdgeIds.length) return;
  const nextLocked = !areAllSelectedEdgesLocked();
  st.selectedEdgeIds.forEach((id) => {
    const e = st.edges.get(id);
    if (!e) return;
    const fromN = st.nodes && st.nodes.get(e.from);
    const toN   = st.nodes && st.nodes.get(e.to);
    const isFreeArrow = fromN && fromN.shapeType === 'anchor' && toN && toN.shapeType === 'anchor';
    if (isFreeArrow) {
      // Lock/unlock via the anchor nodes.
      [e.from, e.to].forEach((nodeId) => {
        st.nodes.update({ id: nodeId, locked: nextLocked, fixed: nextLocked ? { x: true, y: true } : false, draggable: !nextLocked });
        const bn = st.network && st.network.body.nodes[nodeId];
        if (bn) bn.refreshNeeded = true;
      });
    } else {
      st.edges.update({ id, edgeLocked: nextLocked });
    }
  });
  if (st.network) st.network.redraw();
  showEdgePanel();
  markDirty();
}

export function clearEdgePorts() {
  if (!st.selectedEdgeIds.length) return;
  st.selectedEdgeIds.forEach((id) => {
    const e = st.edges.get(id);
    if (!e) return;
    const color = e.edgeColor || DEFAULT_EDGE_COLOR;
    // Restore vis-network's default edge rendering, preserving custom color/width.
    st.edges.update({
      id,
      fromPort: null,
      toPort: null,
      color: { color, highlight: '#f97316', hover: '#f97316' },
      width: e.edgeWidth || 1.5,
      ...visEdgeProps(e.arrowDir ?? 'to', e.dashes ?? false),
    });
  });
  showEdgePanel();
  markDirty();
}

export function setEdgeColor(hex) {
  if (!st.selectedEdgeIds.length) return;
  st.selectedEdgeIds.forEach((id) => {
    const e = st.edges.get(id);
    if (!e) return;
    const update = { id, edgeColor: hex };
    // For non-port edges, also update vis-network's native color property.
    if (!(e.fromPort || e.toPort)) {
      update.color = { color: hex, highlight: '#f97316', hover: '#f97316' };
    }
    st.edges.update(update);
  });
  persistFreeArrowStyle();
  showEdgePanel();
  markDirty();
}

export function changeEdgeWidth(delta) {
  if (!st.selectedEdgeIds.length) return;
  st.selectedEdgeIds.forEach((id) => {
    const e = st.edges.get(id);
    if (!e) return;
    const newWidth = Math.max(1, Math.min(8, (e.edgeWidth || 1.5) + delta));
    const update = { id, edgeWidth: newWidth };
    // For non-port edges, also update vis-network's native width property.
    if (!(e.fromPort || e.toPort)) {
      update.width = newWidth;
    }
    st.edges.update(update);
  });
  persistFreeArrowStyle();
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
  persistFreeArrowStyle();
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
  persistFreeArrowStyle();
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
