// ── Edge panel ────────────────────────────────────────────────────────────────
// Floating formatting toolbar for selected edges (arrow type, line style, font size).

import { st, markDirty } from './state.js';
import { visEdgeProps }  from './edge-rendering.js';
import { pushSnapshot }  from './history.js';
import { t }             from './t.js';
import { getArrowDefaults } from './defaults-modal.js';
import { openColorPickerPopup } from './color-picker.js';

const DEFAULT_EDGE_COLOR = '#a8a29e';
const FREE_ARROW_STYLE_KEY = 'ld-free-arrow-style';

// Palette is injected at boot by diagram.html via initEdgeColorSwatch().
let _edgePaletteEntries = [];

function syncEdgeFontSizeValue() {
  const el = document.getElementById('edgeFontSizeValue');
  if (!el) return;
  const sizes = (st.selectedEdgeIds || []).map((id) => {
    const e = st.edges && st.edges.get(id);
    return e ? (e.fontSize || 11) : null;
  }).filter((s) => s !== null);
  if (!sizes.length) { el.textContent = '–'; return; }
  const first = sizes[0];
  el.textContent = sizes.every((s) => s === first) ? String(first) : '–';
}

function syncEdgeColorSwatch(hexColor) {
  const swatch = document.getElementById('edgeColorSwatch');
  if (!swatch) return;
  swatch.style.background = hexColor;
  swatch.style.borderColor = hexColor;
  swatch.dataset.currentColor = hexColor;
}

export function initEdgeColorSwatch(palette) {
  _edgePaletteEntries = palette.map((hex) => ({
    value: hex, bg: hex, border: hex, label: hex,
  }));
  const swatch = document.getElementById('edgeColorSwatch');
  if (!swatch) return;
  swatch.addEventListener('click', (e) => {
    e.stopPropagation();
    const current = swatch.dataset.currentColor || DEFAULT_EDGE_COLOR;
    openColorPickerPopup(swatch, _edgePaletteEntries, current, (entry) => {
      setEdgeColor(entry.value);
    }, { columns: _edgePaletteEntries.length });
  });
}

// Persist the style of the first free arrow (anchor→anchor) in the current
// selection so the next double-click creation reuses it.
function persistFreeArrowStyle() {
  // Persist from any selected edge — free arrows (anchor→anchor) take priority,
  // but shape→shape edges also update the style memory.
  const freeId = st.selectedEdgeIds.find((id) => {
    const e = st.edges.get(id);
    if (!e) return false;
    const fromN = st.nodes && st.nodes.get(e.from);
    const toN   = st.nodes && st.nodes.get(e.to);
    return fromN && fromN.shapeType === 'anchor' && toN && toN.shapeType === 'anchor';
  });
  const edgeId = freeId || st.selectedEdgeIds[0];
  if (!edgeId) return;
  const e = st.edges.get(edgeId);
  if (!e) return;
  localStorage.setItem(FREE_ARROW_STYLE_KEY, JSON.stringify({
    arrowDir:  e.arrowDir  || 'to',
    dashes:    e.dashes    || false,
    edgeColor: e.edgeColor || null,
    edgeWidth: e.edgeWidth || null,
    fontSize:  e.fontSize  || null,
  }));
}

export function getLastFreeArrowStyle() {
  try {
    const stored = JSON.parse(localStorage.getItem(FREE_ARROW_STYLE_KEY));
    if (stored) {
      // Merge with defaults: stored values override defaults, but null/undefined
      // values in stored fall back to defaults (handles legacy keys without fontSize).
      const clean = Object.fromEntries(Object.entries(stored).filter(([, v]) => v != null));
      return { ...getArrowDefaults(), ...clean };
    }
  } catch { /* ignore */ }
  return getArrowDefaults();
}

function isEdgeLocked(edge) {
  if (!edge) return false;
  const fromN = st.nodes && st.nodes.get(edge.from);
  const toN   = st.nodes && st.nodes.get(edge.to);
  const isFreeArrow = fromN && fromN.shapeType === 'anchor' && toN && toN.shapeType === 'anchor';
  return isFreeArrow ? !!(fromN.locked && toN.locked) : !!edge.edgeLocked;
}

function selectedEdgeLockState() {
  const edgeIds = (st.selectedEdgeIds || []).filter((id) => st.edges && st.edges.get(id));
  if (!edgeIds.length) return { allLocked: false, edgeIds };
  return {
    allLocked: edgeIds.every((id) => isEdgeLocked(st.edges.get(id))),
    edgeIds,
  };
}

function syncEdgeLockButton() {
  const btn = document.getElementById('btnEdgeLock');
  if (!btn) return;
  const { allLocked } = selectedEdgeLockState();
  btn.textContent = allLocked ? '🔓' : '🔒';
  btn.title = t(allLocked ? 'diagram.edge_panel.unlock' : 'diagram.edge_panel.lock');
  btn.setAttribute('aria-label', btn.title);
  btn.classList.toggle('tool-active', allLocked);
}

function setEdgeLocked(edge, locked) {
  if (!edge) return;
  const fromN = st.nodes && st.nodes.get(edge.from);
  const toN   = st.nodes && st.nodes.get(edge.to);
  const isFreeArrow = fromN && fromN.shapeType === 'anchor' && toN && toN.shapeType === 'anchor';
  if (isFreeArrow) {
    [edge.from, edge.to].forEach((nodeId) => {
      st.nodes.update({ id: nodeId, locked, fixed: locked ? { x: true, y: true } : false, draggable: !locked });
      const bn = st.network && st.network.body.nodes[nodeId];
      if (bn) bn.refreshNeeded = true;
    });
  } else {
    st.edges.update({ id: edge.id, edgeLocked: locked });
  }
}

export function showEdgePanel() {
  if (!st.selectedEdgeIds.length) return;
  const e = st.edges.get(st.selectedEdgeIds[0]);
  if (!e) return;

  syncEdgeLockButton();
  document.getElementById('edgePanelControls').classList.remove('hidden');

  const dir    = e.arrowDir ?? 'to';
  const dashes = e.dashes   ?? false;

  ['edgeBtnNone', 'edgeBtnFrom', 'edgeBtnTo', 'edgeBtnBoth'].forEach((id) =>
    document.getElementById(id).classList.remove('edge-btn-active'));
  document.getElementById({ none: 'edgeBtnNone', from: 'edgeBtnFrom', to: 'edgeBtnTo', both: 'edgeBtnBoth' }[dir] || 'edgeBtnTo')
    .classList.add('edge-btn-active');

  ['edgeBtnSolid', 'edgeBtnDashed'].forEach((id) =>
    document.getElementById(id).classList.remove('edge-btn-active'));
  document.getElementById(dashes ? 'edgeBtnDashed' : 'edgeBtnSolid').classList.add('edge-btn-active');

  // Sync edge color swatch and font size display.
  const activeColor = (e.edgeColor || DEFAULT_EDGE_COLOR);
  syncEdgeColorSwatch(activeColor);
  syncEdgeFontSizeValue();

  // Show/hide the clear-ports button based on whether this edge has ports.
  const hasPorts = !!(e.fromPort || e.toPort);
  document.getElementById('btnEdgeClearPorts').classList.toggle('edge-btn-active', hasPorts);

  document.getElementById('edgePanel').classList.remove('hidden');
}

export function toggleEdgeLock() {
  const { allLocked, edgeIds } = selectedEdgeLockState();
  if (!edgeIds.length) return;
  const nextLocked = !allLocked;
  pushSnapshot();
  edgeIds.forEach((id) => setEdgeLocked(st.edges.get(id), nextLocked));
  if (st.network) {
    st.network.redraw();
    if (nextLocked) st.network.unselectAll();
  }
  if (nextLocked) {
    st.selectedNodeIds = [];
    st.selectedEdgeIds = [];
    hideEdgePanel();
  } else {
    syncEdgeLockButton();
  }
  markDirty();
}

export function resetEdgeLabelWidth() {
  if (!st.selectedEdgeIds.length) return;
  pushSnapshot();
  st.selectedEdgeIds.forEach((id) => {
    st.edges.update({ id, edgeLabelWidth: null });
  });
  markDirty();
}

export function clearEdgePorts() {
  if (!st.selectedEdgeIds.length) return;
  pushSnapshot();
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
  pushSnapshot();
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

export async function saveEdgeAsDefault() {
  const freeId = st.selectedEdgeIds.find((id) => {
    const e = st.edges.get(id);
    if (!e) return false;
    const fromN = st.nodes && st.nodes.get(e.from);
    const toN   = st.nodes && st.nodes.get(e.to);
    return fromN && fromN.shapeType === 'anchor' && toN && toN.shapeType === 'anchor';
  });
  const edgeId = freeId || st.selectedEdgeIds[0];
  if (!edgeId) return;
  const e = st.edges.get(edgeId);
  if (!e) return;

  const { getDiagramDefaults, initDiagramDefaults } = await import('./defaults-modal.js');
  const current = getDiagramDefaults() || {};
  const arrows = {
    arrowDir: e.arrowDir  || 'to',
    dashes:   e.dashes    || false,
    fontSize: e.fontSize  || 11,
  };
  const updated = { arrows, shapes: current.shapes || null };

  try {
    const res = await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ diagramDefaults: updated }),
    });
    if (!res.ok) throw new Error(await res.text());
    initDiagramDefaults({ diagramDefaults: updated });
    // Sync localStorage so the next arrow creation uses the new default immediately
    localStorage.setItem(FREE_ARROW_STYLE_KEY, JSON.stringify({
      arrowDir:  arrows.arrowDir,
      dashes:    arrows.dashes,
      fontSize:  arrows.fontSize,
      edgeColor: null,
      edgeWidth: null,
    }));
    const btn = document.getElementById('btnSaveEdgeDefault');
    if (btn) {
      btn.classList.add('tool-active');
      setTimeout(() => btn.classList.remove('tool-active'), 800);
    }
  } catch (err) {
    console.error('Failed to save edge default', err);
  }
}

export function changeEdgeWidth(delta) {
  if (!st.selectedEdgeIds.length) return;
  pushSnapshot();
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
  pushSnapshot();
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
  pushSnapshot();
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
  pushSnapshot();
  st.selectedEdgeIds.forEach((id) => {
    const e = st.edges.get(id);
    if (!e) return;
    const newSize = Math.max(8, Math.min(48, (e.fontSize || 11) + delta));
    // Keep native label transparent — drawEdgeLabels() is the single render path.
    st.edges.update({ id, fontSize: newSize, font: { size: newSize, align: 'middle', color: 'rgba(0,0,0,0)' } });
  });
  syncEdgeFontSizeValue();
  markDirty();
}

export function stepEdgeLabelRotation(delta) {
  if (!st.selectedEdgeIds.length) return;
  pushSnapshot();
  st.selectedEdgeIds.forEach((id) => {
    const e = st.edges.get(id);
    if (!e) return;
    const newRotation = (e.labelRotation || 0) + delta;
    // Keep native label transparent — drawEdgeLabels() is the single render path.
    st.edges.update({
      id,
      labelRotation: newRotation,
      font: { size: e.fontSize || 11, align: 'middle', color: 'rgba(0,0,0,0)' },
    });
  });
  markDirty();
}

const LABEL_OFFSET_STEP = 5;

export function stepEdgeLabelOffset(dx, dy) {
  if (!st.selectedEdgeIds.length) return;
  pushSnapshot();
  st.selectedEdgeIds.forEach((id) => {
    const e = st.edges.get(id);
    if (!e) return;
    st.edges.update({
      id,
      edgeLabelOffsetX: (e.edgeLabelOffsetX || 0) + dx * LABEL_OFFSET_STEP,
      edgeLabelOffsetY: (e.edgeLabelOffsetY || 0) + dy * LABEL_OFFSET_STEP,
    });
  });
  if (st.network) st.network.redraw();
  markDirty();
}

export function resetEdgeLabelOffset() {
  if (!st.selectedEdgeIds.length) return;
  pushSnapshot();
  st.selectedEdgeIds.forEach((id) => {
    st.edges.update({ id, edgeLabelOffsetX: 0, edgeLabelOffsetY: 0 });
  });
  if (st.network) st.network.redraw();
  markDirty();
}
