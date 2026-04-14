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
  alignGuides: true,
  gridEnabled: true,
  debugMode: false,
  isDirty: false,
  sidebarOpen: true,
  editingNodeId: null,
  editingEdgeId: null,
  resizeDrag: null,
  rotateDrag: null,        // { startX, nodeAngles: [{id, initRotation}] }
  labelRotateDrag: null,   // { startX, nodeAngles: [{id, initLabelRotation}] }
  activeStamp: null,       // 'color' | 'rotation' | 'fontSize' | null
  stampTargetIds: [],      // node IDs waiting to receive the stamped property
  clipboard: null,        // { nodes: [], edges: [] }
  canonicalOrder: [],     // user-defined z-order, immune to vis.js hover reordering
  edgesStraight: false,  // when true, all edges use smooth: disabled (straight lines)
  resizeSymmetric: false, // when true, center is fixed during resize; when false, opposite corner is fixed
  nodeColorOverrides: {}, // colorKey → {bg, border, font, hbg, hborder} — set from config at boot
};

export function markDirty() {
  st.isDirty = true;
  document.getElementById('btnSave').disabled = false;
}
