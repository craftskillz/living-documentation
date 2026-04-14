// ── Label editor ──────────────────────────────────────────────────────────────
// Floating textarea for in-place editing of node and edge labels.

import { st, markDirty } from './state.js';
import { pushSnapshot }  from './history.js';

export function autoResizeTextarea(ta) {
  ta.style.height = 'auto';
  ta.style.height = ta.scrollHeight + 'px';
}

export function startLabelEdit() {
  if (!st.selectedNodeIds.length || !st.network) return;
  const nodeId = st.selectedNodeIds[0];
  const n = st.nodes.get(nodeId);
  if (!n) return;

  st.editingNodeId = nodeId;
  st.editingEdgeId = null;

  const pos    = st.network.getPositions([nodeId])[nodeId] || { x: 0, y: 0 };
  const dom    = st.network.canvasToDOM(pos);
  const bn     = st.network.body.nodes[nodeId];
  const scale  = st.network.getScale();
  // Use the node's actual rendered canvas width scaled to DOM pixels.
  // bn.shape.width is set by shape.resize() on every draw — correct for all shapes.
  const canvasW = (bn && bn.shape && bn.shape.width) || (n.nodeWidth || 150);
  const domW    = Math.max(120, Math.round(canvasW * scale));
  const ta  = document.getElementById('labelInput');
  ta.value       = n.label || '';
  ta.style.left  = dom.x - domW / 2 + 'px';
  ta.style.top   = dom.y - 30 + 'px';
  ta.style.width = domW + 'px';
  ta.classList.remove('hidden');
  autoResizeTextarea(ta);
  ta.focus();
  ta.select();
}

export function startEdgeLabelEdit() {
  if (!st.selectedEdgeIds.length || !st.network) return;
  const edgeId = st.selectedEdgeIds[0];
  const e = st.edges.get(edgeId);
  if (!e) return;

  st.editingEdgeId = edgeId;
  st.editingNodeId = null;

  const positions = st.network.getPositions([e.from, e.to]);
  const fp  = positions[e.from] || { x: 0, y: 0 };
  const tp  = positions[e.to]   || { x: 0, y: 0 };
  const mid = st.network.canvasToDOM({ x: (fp.x + tp.x) / 2, y: (fp.y + tp.y) / 2 });

  const ta  = document.getElementById('labelInput');
  ta.value       = e.label || '';
  ta.style.left  = mid.x - 60 + 'px';
  ta.style.top   = mid.y - 14 + 'px';
  ta.style.width = '120px';
  ta.classList.remove('hidden');
  autoResizeTextarea(ta);
  ta.focus();
  ta.select();
}

export function commitLabelEdit() {
  const ta = document.getElementById('labelInput');
  if (st.editingNodeId) {
    const n = st.nodes.get(st.editingNodeId);
    if (n && ta.value !== (n.label || '')) {
      pushSnapshot();
      st.nodes.update({ id: st.editingNodeId, label: ta.value });
      markDirty();
    }
  } else if (st.editingEdgeId) {
    const e = st.edges.get(st.editingEdgeId);
    if (e && ta.value !== (e.label || '')) {
      pushSnapshot();
      st.edges.update({ id: st.editingEdgeId, label: ta.value });
      markDirty();
    }
  }
  st.editingNodeId = null;
  st.editingEdgeId = null;
}

export function hideLabelInput() {
  document.getElementById('labelInput').classList.add('hidden');
  st.editingNodeId = null;
  st.editingEdgeId = null;
}

// ── Wire labelInput DOM events ────────────────────────────────────────────────
const labelInput = document.getElementById('labelInput');

labelInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    commitLabelEdit();
    hideLabelInput();
    e.preventDefault();
  } else if (e.key === 'Escape') {
    hideLabelInput();
  }
});
labelInput.addEventListener('input',  (e) => autoResizeTextarea(e.target));
labelInput.addEventListener('blur',   ()  => { commitLabelEdit(); hideLabelInput(); });
