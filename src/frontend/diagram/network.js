// ── Network initialisation & vis.js event handlers ────────────────────────────
// Creates the vis.js Network, patches _drawNodes for canonical z-order,
// and wires all network-level events.

import { st, markDirty } from './state.js';
import { visNodeProps, SHAPE_DEFAULTS }   from './node-rendering.js';
import { visEdgeProps }   from './edge-rendering.js';
import { showNodePanel, hideNodePanel } from './node-panel.js';
import { showEdgePanel, hideEdgePanel } from './edge-panel.js';
import { startLabelEdit, startEdgeLabelEdit, commitLabelEdit, hideLabelInput } from './label-editor.js';
import { updateSelectionOverlay, hideSelectionOverlay } from './selection-overlay.js';
import { drawGrid, onDragEnd } from './grid.js';
import { drawDebugOverlay }    from './debug.js';
import { updateZoomDisplay }   from './zoom.js';

export function initNetwork(savedNodes, savedEdges) {
  const container = document.getElementById('vis-canvas');

  st.nodes = new vis.DataSet(
    savedNodes.map((n) => ({
      ...n,
      ...visNodeProps(n.shapeType || 'box', n.colorKey || 'c-gray', n.nodeWidth, n.nodeHeight, n.fontSize, n.textAlign, n.textValign),
    }))
  );
  st.edges = new vis.DataSet(
    savedEdges.map((e) => ({
      ...e,
      ...visEdgeProps(e.arrowDir ?? 'to', e.dashes ?? false),
      ...(e.fontSize ? { font: { size: e.fontSize, align: 'middle', color: '#6b7280' } } : {}),
    }))
  );

  const options = {
    physics: {
      enabled: st.physicsEnabled,
      stabilization: { enabled: false },
      barnesHut: { gravitationalConstant: -3000, centralGravity: 0.3, springLength: 150, springConstant: 0.04, damping: 0.09 },
    },
    interaction: { hover: true, navigationButtons: false, keyboard: false, multiselect: true },
    nodes: { font: { size: 13, face: 'system-ui,-apple-system,sans-serif' }, borderWidth: 1.5, borderWidthSelected: 2.5, shadow: false, widthConstraint: { minimum: 60 }, heightConstraint: { minimum: 28 } },
    edges: { smooth: { type: 'continuous' }, color: { color: '#a8a29e', highlight: '#f97316', hover: '#f97316' }, width: 1.5, selectionWidth: 2.5, font: { size: 11, align: 'middle', color: '#6b7280' } },
    manipulation: {
      enabled: false,
      addEdge(data, callback) {
        data.id       = 'e' + Date.now();
        data.arrowDir = 'to';
        data.dashes   = false;
        Object.assign(data, visEdgeProps('to', false));
        callback(data);
        markDirty();
        setTimeout(() => st.network.addEdgeMode(), 0);
      },
    },
  };

  if (st.network) st.network.destroy();
  st.network = new vis.Network(container, { nodes: st.nodes, edges: st.edges }, options);

  // ── Z-order patch ──────────────────────────────────────────────────────────
  // vis.js renders in 3 passes (normal → selected → hovered), which breaks
  // user-defined stacking. We replace _drawNodes with a single pass in
  // canonicalOrder so hover/selection never override the user's z-order.
  st.canonicalOrder = [...st.network.body.nodeIndices];
  st.network.renderer._drawNodes = function (ctx, alwaysShow = false) {
    const bodyNodes = this.body.nodes;
    const margin    = 20;
    const topLeft     = this.canvas.DOMtoCanvas({ x: -margin, y: -margin });
    const bottomRight = this.canvas.DOMtoCanvas({ x: this.canvas.frame.canvas.clientWidth + margin, y: this.canvas.frame.canvas.clientHeight + margin });
    const viewableArea = { top: topLeft.y, left: topLeft.x, bottom: bottomRight.y, right: bottomRight.x };
    const drawExternalLabelCallbacks = [];

    for (const id of st.canonicalOrder) {
      const node = bodyNodes[id];
      if (!node) continue;
      if (alwaysShow === true || node.isBoundingBoxOverlappingWith(viewableArea) === true) {
        const r = node.draw(ctx);
        // All shapes are ctxRenderer (shape:'custom') and draw their own labels.
        // Skip drawExternalLabel entirely to avoid double-rendering.
      } else {
        node.updateBoundingBox(ctx, node.selected);
      }
    }
    return { drawExternalLabels() { for (const draw of drawExternalLabelCallbacks) draw(); } };
  };

  // Keep canonicalOrder in sync with DataSet add/remove events
  st.nodes.on('add', (_, { items }) => {
    const existing = new Set(st.canonicalOrder);
    items.forEach((id) => { if (!existing.has(id)) st.canonicalOrder.push(id); });
  });
  st.nodes.on('remove', (_, { items }) => {
    const removed = new Set(items);
    st.canonicalOrder = st.canonicalOrder.filter((id) => !removed.has(id));
  });

  st.network.on('doubleClick',  onDoubleClick);
  st.network.on('selectNode',   onSelectNode);
  st.network.on('deselectNode', onDeselectAll);
  st.network.on('selectEdge',   onSelectEdge);
  st.network.on('deselectEdge', onDeselectAll);
  st.network.on('zoom',         updateZoomDisplay);
  st.network.on('dragEnd',      onDragEnd);
  st.network.on('beforeDrawing', drawGrid);
  st.network.on('afterDrawing',  updateSelectionOverlay);
  st.network.on('afterDrawing',  () => drawDebugOverlay());

  document.getElementById('emptyState').classList.add('hidden');
  updateZoomDisplay();
}

// ── Network event handlers ────────────────────────────────────────────────────

function onDoubleClick(params) {
  if (params.nodes.length > 0) {
    st.selectedNodeIds = params.nodes;
    st.network.selectNodes(st.selectedNodeIds);
    showNodePanel();
    startLabelEdit();
  } else if (params.edges.length > 0 && params.nodes.length === 0) {
    st.selectedEdgeIds = [params.edges[0]];
    showEdgePanel();
    startEdgeLabelEdit();
  } else if (st.currentTool === 'addNode') {
    const id       = 'n' + Date.now();
    const defaults = SHAPE_DEFAULTS[st.pendingShape] || [100, 40];
    const defaultColor = st.pendingShape === 'post-it' ? 'c-amber' : 'c-gray';
    st.nodes.add({
      id, label: st.pendingShape === 'text-free' ? 'Texte' : 'Node',
      shapeType: st.pendingShape, colorKey: defaultColor,
      nodeWidth: defaults[0], nodeHeight: defaults[1],
      fontSize: null, rotation: 0, labelRotation: 0,
      x: params.pointer.canvas.x, y: params.pointer.canvas.y,
      ...visNodeProps(st.pendingShape, defaultColor, defaults[0], defaults[1], null, null, null),
    });
    markDirty();
    setTimeout(() => {
      st.network.selectNodes([id]);
      st.selectedNodeIds = [id];
      showNodePanel();
      startLabelEdit();
    }, 50);
  }
}

function onSelectNode(params) {
  st.selectedNodeIds = params.nodes;
  st.selectedEdgeIds = [];
  hideEdgePanel();
  showNodePanel();
}

function onSelectEdge(params) {
  if (st.selectedNodeIds.length > 0) return; // node takes priority
  st.selectedEdgeIds = params.edges;
  st.selectedNodeIds = [];
  hideNodePanel();
  showEdgePanel();
}

function onDeselectAll() {
  st.selectedNodeIds = [];
  st.selectedEdgeIds = [];
  hideNodePanel();
  hideEdgePanel();
  commitLabelEdit();
  hideLabelInput();
  hideSelectionOverlay();
}
