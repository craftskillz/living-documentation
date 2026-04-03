// ── Clipboard (copy / paste) ───────────────────────────────────────────────────

import { st, markDirty } from './state.js';
import { visNodeProps }  from './node-rendering.js';
import { visEdgeProps }  from './edge-rendering.js';
import { showNodePanel } from './node-panel.js';

export function copySelected() {
  if (!st.network || !st.selectedNodeIds.length) return;

  const positions   = st.network.getPositions(st.selectedNodeIds);
  const copiedNodes = st.selectedNodeIds.map((id) => {
    const { ctxRenderer, ...rest } = st.nodes.get(id);
    return { ...rest, x: positions[id]?.x ?? rest.x, y: positions[id]?.y ?? rest.y };
  });

  // Only copy edges where both endpoints are in the selection
  const selectedSet = new Set(st.selectedNodeIds);
  const copiedEdges = st.edges.get().filter((e) => selectedSet.has(e.from) && selectedSet.has(e.to));

  st.clipboard = { nodes: copiedNodes, edges: copiedEdges };
}

export function pasteClipboard() {
  if (!st.clipboard || !st.clipboard.nodes.length || !st.network) return;

  const OFFSET = 40;
  const idMap  = {};
  st.clipboard.nodes.forEach((n) => { idMap[n.id] = 'n' + Date.now() + Math.random().toString(36).slice(2); });

  const newNodes = st.clipboard.nodes.map((n) => ({
    ...n, id: idMap[n.id], x: (n.x || 0) + OFFSET, y: (n.y || 0) + OFFSET,
    ...visNodeProps(n.shapeType || 'box', n.colorKey || 'c-gray', n.nodeWidth, n.nodeHeight, n.fontSize, n.textAlign, n.textValign),
  }));
  const newEdges = st.clipboard.edges.map((e) => ({
    ...e,
    id: 'e' + Date.now() + Math.random().toString(36).slice(2),
    from: idMap[e.from], to: idMap[e.to],
    ...visEdgeProps(e.arrowDir ?? 'to', e.dashes ?? false),
    ...(e.fontSize ? { font: { size: e.fontSize, align: 'middle', color: '#6b7280' } } : {}),
  }));

  st.nodes.add(newNodes);
  st.edges.add(newEdges);

  const newIds = newNodes.map((n) => n.id);
  st.network.selectNodes(newIds);
  st.selectedNodeIds = newIds;
  st.selectedEdgeIds = [];
  showNodePanel();
  markDirty();

  // Offset clipboard so each successive paste is staggered
  st.clipboard = {
    nodes: st.clipboard.nodes.map((n) => ({ ...n, x: (n.x || 0) + OFFSET, y: (n.y || 0) + OFFSET })),
    edges: st.clipboard.edges,
  };
}
