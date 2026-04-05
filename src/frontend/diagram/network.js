// ── Network initialisation & vis.js event handlers ────────────────────────────
// Creates the vis.js Network, patches _drawNodes for canonical z-order,
// and wires all network-level events.

import { st, markDirty } from './state.js';
import { visNodeProps, SHAPE_DEFAULTS }   from './node-rendering.js';
import { uploadImageFile } from './image-upload.js';
import { promptImageName } from './image-name-modal.js';
import { showToast }       from './toast.js';
import { visEdgeProps }   from './edge-rendering.js';
import { showNodePanel, hideNodePanel } from './node-panel.js';
import { showEdgePanel, hideEdgePanel } from './edge-panel.js';
import { startLabelEdit, startEdgeLabelEdit, commitLabelEdit, hideLabelInput } from './label-editor.js';
import { updateSelectionOverlay, hideSelectionOverlay } from './selection-overlay.js';
import { drawGrid, onDragEnd } from './grid.js';
import { drawDebugOverlay }    from './debug.js';
import { updateZoomDisplay }   from './zoom.js';
import { expandSelectionToGroup, drawGroupOutlines } from './groups.js';
import { navigateNodeLink, hideLinkPanel }           from './link-panel.js';

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
    const bodyEdges = this.body.edges;
    const margin    = 20;
    const topLeft     = this.canvas.DOMtoCanvas({ x: -margin, y: -margin });
    const bottomRight = this.canvas.DOMtoCanvas({ x: this.canvas.frame.canvas.clientWidth + margin, y: this.canvas.frame.canvas.clientHeight + margin });
    const viewableArea = { top: topLeft.y, left: topLeft.x, bottom: bottomRight.y, right: bottomRight.x };

    // Build a map: canonical index → list of edges whose topmost endpoint is at that index.
    const orderMap = new Map();
    st.canonicalOrder.forEach((id, i) => orderMap.set(id, i));

    const edgesByLevel = new Map(); // canonicalIndex → edge[]
    for (const edgeId of Object.keys(bodyEdges)) {
      const edge = bodyEdges[edgeId];
      if (!edge.connected) continue;
      const level = Math.min(orderMap.get(edge.fromId) ?? 0, orderMap.get(edge.toId) ?? 0);
      if (!edgesByLevel.has(level)) edgesByLevel.set(level, []);
      edgesByLevel.get(level).push(edge);
    }

    for (let i = 0; i < st.canonicalOrder.length; i++) {
      const id   = st.canonicalOrder[i];
      // Draw edges whose topmost node is at this level, before drawing the node.
      const edges = edgesByLevel.get(i);
      if (edges) edges.forEach((e) => e.draw(ctx));

      const node = bodyNodes[id];
      if (!node) continue;
      if (alwaysShow === true || node.isBoundingBoxOverlappingWith(viewableArea) === true) {
        node.draw(ctx);
      } else {
        node.updateBoundingBox(ctx, node.selected);
      }
    }
    return { drawExternalLabels() {} };
  };

  // ── Z-order patch for edges ────────────────────────────────────────────────
  // vis.js draws all edges before all nodes in separate passes.
  // We neutralise _drawEdges (make it a no-op) and instead draw each edge
  // inside _drawNodes, just before the node whose canonical index equals the
  // max index of its two endpoints. This guarantees true z-order interleaving.
  st.network.renderer._drawEdges = function () { /* no-op — edges drawn in _drawNodes */ };

  // Keep canonicalOrder in sync with DataSet add/remove events
  st.nodes.on('add', (_, { items }) => {
    const existing = new Set(st.canonicalOrder);
    items.forEach((id) => { if (!existing.has(id)) st.canonicalOrder.push(id); });
  });
  st.nodes.on('remove', (_, { items }) => {
    const removed = new Set(items);
    st.canonicalOrder = st.canonicalOrder.filter((id) => !removed.has(id));
  });

  st.network.on('click',        onClickNode);
  st.network.on('doubleClick',  onDoubleClick);
  st.network.on('dragStart',    onDragStart);
  st.network.on('selectNode',   onSelectNode);
  st.network.on('deselectNode', onDeselectAll);
  st.network.on('selectEdge',   onSelectEdge);
  st.network.on('deselectEdge', onDeselectAll);
  st.network.on('zoom',         updateZoomDisplay);
  st.network.on('dragEnd',      onDragEnd);
  st.network.on('beforeDrawing', drawGrid);
  st.network.on('afterDrawing',  updateSelectionOverlay);
  st.network.on('afterDrawing',  (ctx) => drawGroupOutlines(ctx));
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
  } else if (st.currentTool === 'addNode' && st.pendingShape === 'image') {
    const canvasPos = params.pointer.canvas;
    pickAndCreateImageNode(canvasPos.x, canvasPos.y);
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

// ── Image node creation ───────────────────────────────────────────────────────

function pickAndCreateImageNode(canvasX, canvasY) {
  const input = document.createElement('input');
  input.type   = 'file';
  input.accept = 'image/*';
  input.onchange = async () => {
    const file = input.files && input.files[0];
    if (!file) return;
    const name = await promptImageName();
    if (name === null) return; // user cancelled
    try {
      const src = await uploadImageFile(file, name);
      createImageNode(src, canvasX, canvasY);
    } catch {
      showToast('Impossible d\'importer l\'image', 'error');
    }
  };
  input.click();
}

export function createImageNode(imageSrc, canvasX, canvasY) {
  if (!st.network) return;
  const id      = 'n' + Date.now();
  const captionId = id + 'c';

  const addNode = (nW, nH) => {
    const filename   = imageSrc.split('/').pop() || '';
    const textDefs   = SHAPE_DEFAULTS['text-free'];
    const captionH   = textDefs[1];
    const GAP        = 8;

    const groupId = 'g' + Date.now();
    st.nodes.add({
      id, label: '', imageSrc, groupId,
      shapeType: 'image', colorKey: 'c-gray',
      nodeWidth: nW, nodeHeight: nH,
      fontSize: null, rotation: 0, labelRotation: 0,
      x: canvasX, y: canvasY,
      ...visNodeProps('image', 'c-gray', nW, nH, null, null, null),
    });
    st.nodes.add({
      id: captionId, label: filename, groupId,
      shapeType: 'text-free', colorKey: 'c-gray',
      nodeWidth: nW, nodeHeight: captionH,
      fontSize: null, rotation: 0, labelRotation: 0,
      x: canvasX, y: canvasY + nH / 2 + GAP + captionH / 2,
      ...visNodeProps('text-free', 'c-gray', nW, captionH, null, null, null),
    });
    markDirty();
    setTimeout(() => {
      st.network.selectNodes([id]);
      st.selectedNodeIds = [id];
      showNodePanel();
    }, 50);
  };

  const img = new Image();
  img.onload = () => {
    const MAX = 300;
    const ratio = img.naturalWidth / img.naturalHeight;
    let nW = img.naturalWidth, nH = img.naturalHeight;
    if (nW > MAX) { nW = MAX; nH = Math.round(MAX / ratio); }
    addNode(nW, nH);
  };
  img.onerror = () => {
    const d = SHAPE_DEFAULTS['image'];
    addNode(d[0], d[1]);
  };
  img.src = imageSrc;
}

function onClickNode(params) {
  if (params.nodes.length === 1 && params.event.srcEvent.shiftKey) {
    navigateNodeLink(params.nodes[0]);
  }
}

// Expand group selection at dragStart so vis-network moves all members together.
// dragStart fires before the move, unlike selectNode which fires after mouseup.
function onDragStart(params) {
  if (!params.nodes.length) return;
  const expanded = expandSelectionToGroup(params.nodes);
  if (expanded.length > params.nodes.length) {
    st.network.selectNodes(expanded);
    st.selectedNodeIds = expanded;
  }
}

let _expandingGroup = false;
function onSelectNode(params) {
  if (_expandingGroup) return;
  const expanded = expandSelectionToGroup(params.nodes);
  if (expanded.length > params.nodes.length) {
    _expandingGroup = true;
    st.network.selectNodes(expanded);
    _expandingGroup = false;
    st.selectedNodeIds = expanded;
  } else {
    st.selectedNodeIds = params.nodes;
  }
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
  hideLinkPanel();
  st.selectedNodeIds = [];
  st.selectedEdgeIds = [];
  hideNodePanel();
  hideEdgePanel();
  commitLabelEdit();
  hideLabelInput();
  hideSelectionOverlay();
}
