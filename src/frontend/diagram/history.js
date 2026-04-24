// ── Undo / Redo history ────────────────────────────────────────────────────────
// Snapshot-based undo/redo. Captures semantic node/edge data (same format as
// saveDiagram) so vis-network rendering props are reconstructed cleanly on
// restore. History is scoped to the current diagram — call resetHistory() on
// every diagram switch so stacks don't bleed across diagrams.

import { st, markDirty } from './state.js';
import { visNodeProps }   from './node-rendering.js';
import { visEdgeProps }   from './edge-rendering.js';

const MAX_HISTORY = 50;

let _undoStack = [];
let _redoStack = [];

// ── State capture ──────────────────────────────────────────────────────────────

function captureState() {
  if (!st.nodes || !st.edges || !st.network) return null;
  const positions = st.network.getPositions();
  const nodes = st.nodes.get().map((n) => ({
    id: n.id, label: n.label,
    shapeType: n.shapeType || 'box', colorKey: n.colorKey || 'c-gray',
    nodeWidth: n.nodeWidth || null, nodeHeight: n.nodeHeight || null,
    fontSize: n.fontSize || null, textAlign: n.textAlign || null, textValign: n.textValign || null,
    bgOpacity: n.bgOpacity ?? null,
    rotation: n.rotation || 0, labelRotation: n.labelRotation || 0,
    imageSrc: n.imageSrc || null, groupId: n.groupId || null,
    nodeLink: n.nodeLink || null, locked: n.locked || false,
    x: positions[n.id]?.x ?? n.x, y: positions[n.id]?.y ?? n.y,
  }));
  const edges = st.edges.get().map((e) => ({
    id: e.id, from: e.from, to: e.to,
    label: e.label || '', arrowDir: e.arrowDir || 'to',
    dashes: e.dashes || false, fontSize: e.fontSize || null,
    labelRotation: e.labelRotation || 0,
    fromPort: e.fromPort || null, toPort: e.toPort || null,
    edgeColor: e.edgeColor || null, edgeWidth: e.edgeWidth || null,
    edgeLocked: e.edgeLocked || false,
  }));
  return {
    nodes,
    edges,
    canonicalOrder: [...st.canonicalOrder],
    edgesStraight: st.edgesStraight,
  };
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Call BEFORE any mutating operation to record the current state for undo.
 * Clears the redo stack (new action invalidates any undone future).
 */
export function pushSnapshot() {
  const snap = captureState();
  if (!snap) return;
  _undoStack.push(snap);
  if (_undoStack.length > MAX_HISTORY) _undoStack.shift();
  _redoStack = [];
}

/** Reset both stacks — call whenever a new diagram is opened. */
export function resetHistory() {
  _undoStack = [];
  _redoStack = [];
}

/** Undo the last action. No-op if stack is empty. */
export function undo() {
  if (!_undoStack.length) return;
  const before  = _undoStack.pop();
  const current = captureState();
  if (current) _redoStack.push(current);
  _restoreState(before);
}

/** Redo the last undone action. No-op if stack is empty. */
export function redo() {
  if (!_redoStack.length) return;
  const after   = _redoStack.pop();
  const current = captureState();
  if (current) _undoStack.push(current);
  _restoreState(after);
}

// ── State restore ──────────────────────────────────────────────────────────────

function _restoreState(snapshot) {
  if (!st.network || !st.nodes || !st.edges || !snapshot) return;

  const pos   = st.network.getViewPosition();
  const scale = st.network.getScale();

  // Clear edges first: the edge-remove listener detects orphaned anchors and
  // removes them from st.nodes, which avoids cascade issues when clearing nodes.
  st.edges.clear();
  st.nodes.clear();

  // Restore edge-straight flag + toolbar button
  if (snapshot.edgesStraight !== undefined) {
    st.edgesStraight = snapshot.edgesStraight;
    document.getElementById('btnEdgeStraight').classList.toggle('tool-active', st.edgesStraight);
  }
  const edgeSmooth = st.edgesStraight ? { enabled: false } : { type: 'continuous' };

  st.nodes.add(snapshot.nodes.map((n) => ({
    ...n,
    ...visNodeProps(
      n.shapeType || 'box', n.colorKey || 'c-gray',
      n.nodeWidth, n.nodeHeight, n.fontSize, n.textAlign, n.textValign,
    ),
    ...(n.locked ? { fixed: { x: true, y: true }, draggable: false } : {}),
  })));

  st.edges.add(snapshot.edges.map((e) => {
    const toNode   = snapshot.nodes.find((n) => n.id === e.to);
    const isAnchor = toNode && toNode.shapeType === 'anchor';
    const edgeObj  = {
      ...e,
      ...visEdgeProps(e.arrowDir ?? 'to', e.dashes ?? false),
      smooth: isAnchor ? { enabled: false } : edgeSmooth,
      ...(e.edgeColor ? { color: { color: e.edgeColor, highlight: '#f97316', hover: '#f97316' } } : {}),
      ...(e.edgeWidth ? { width: e.edgeWidth } : {}),
      ...(e.fontSize || e.labelRotation ? {
        font: {
          size: e.fontSize || 11,
          align: 'middle',
          color: (e.labelRotation && Math.abs(e.labelRotation) > 0.001) ? 'rgba(0,0,0,0)' : '#6b7280',
        },
      } : {}),
    };
    if (e.fromPort || e.toPort) {
      edgeObj.color  = { color: 'rgba(0,0,0,0)', highlight: 'rgba(0,0,0,0)', hover: 'rgba(0,0,0,0)' };
      edgeObj.arrows = { to: { enabled: false }, from: { enabled: false } };
    }
    return edgeObj;
  }));

  // Override the canonical order that the add-listener built in insertion order
  st.canonicalOrder = [...snapshot.canonicalOrder];

  // Force all nodes to re-render (custom shapes cache ctx closures)
  Object.keys(st.network.body.nodes).forEach((id) => {
    const bn = st.network.body.nodes[id];
    if (bn) bn.refreshNeeded = true;
  });

  // Restore viewport without animation
  st.network.moveTo({ position: pos, scale, animation: false });
  markDirty();
  st.network.redraw();
}
