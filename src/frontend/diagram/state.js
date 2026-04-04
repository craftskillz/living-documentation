// ── Shared mutable state ──────────────────────────────────────────────────────
// Single object imported by reference so all modules see the same mutations.

export const st = {
  network: null,
  nodes: null,
  edges: null,
  diagrams: [],
  currentDiagramId: null,
  currentTool: 'select',
  pendingShape: 'box',
  selectedNodeIds: [],
  selectedEdgeIds: [],
  physicsEnabled: false,
  gridEnabled: false,
  debugMode: false,
  isDirty: false,
  sidebarOpen: true,
  editingNodeId: null,
  editingEdgeId: null,
  resizeDrag: null,
  rotateDrag: null,   // { startAngle, nodeAngles: [{id, initRotation}], cx, cy }
  clipboard: null,        // { nodes: [], edges: [] }
  canonicalOrder: [],     // user-defined z-order, immune to vis.js hover reordering
};

export function markDirty() {
  st.isDirty = true;
  document.getElementById('btnSave').disabled = false;
}
