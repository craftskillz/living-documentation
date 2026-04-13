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
import { getNearestPort, drawPortDots, drawPortEdge, distanceToPortEdge } from './ports.js';
import { getLastFreeArrowStyle } from './edge-panel.js';
import { getLastNodeStyle } from './node-panel.js';

export function initNetwork(savedNodes, savedEdges, edgesStraight = false) {
  const container = document.getElementById('vis-canvas');

  const edgeSmooth = edgesStraight ? { enabled: false } : { type: 'continuous' };

  st.nodes = new vis.DataSet(
    savedNodes.map((n) => ({
      ...n,
      ...visNodeProps(n.shapeType || 'box', n.colorKey || 'c-gray', n.nodeWidth, n.nodeHeight, n.fontSize, n.textAlign, n.textValign),
      ...(n.locked ? { fixed: { x: true, y: true }, draggable: false } : {}),
    }))
  );
  st.edges = new vis.DataSet(
    savedEdges.map((e) => {
      const toNode = savedNodes.find((n) => n.id === e.to);
      const isAnchor = toNode && toNode.shapeType === 'anchor';
      const edgeObj = {
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
      // Port edges: hide vis-network's own rendering (line + arrowhead).
      // drawPortEdge() handles all visual output; vis-network edge is a
      // transparent ghost kept only for hit-detection (click selection).
      if (e.fromPort || e.toPort) {
        edgeObj.color  = { color: 'rgba(0,0,0,0)', highlight: 'rgba(0,0,0,0)', hover: 'rgba(0,0,0,0)' };
        edgeObj.arrows = { to: { enabled: false }, from: { enabled: false } };
      }
      return edgeObj;
    })
  );

  const options = {
    physics: {
      enabled: st.physicsEnabled,
      stabilization: { enabled: false },
      barnesHut: { gravitationalConstant: -3000, centralGravity: 0.3, springLength: 150, springConstant: 0.04, damping: 0.09 },
    },
    interaction: { hover: true, navigationButtons: false, keyboard: false, multiselect: true },
    nodes: { font: { size: 13, face: 'system-ui,-apple-system,sans-serif' }, borderWidth: 1.5, borderWidthSelected: 2.5, shadow: false, widthConstraint: { minimum: 60 }, heightConstraint: { minimum: 28 } },
    edges: { smooth: edgeSmooth, color: { color: '#a8a29e', highlight: '#f97316', hover: '#f97316' }, width: 1.5, selectionWidth: 2.5, font: { size: 11, align: 'middle', color: '#6b7280' } },
    manipulation: {
      enabled: false,
      addEdge(data, callback) {
        // Block edges from/to locked nodes.
        const fromNode = st.nodes.get(data.from) || {};
        const toNode   = st.nodes.get(data.to)   || {};
        if (fromNode.locked || toNode.locked) {
          _addEdgeFromPort = null;
          setTimeout(() => st.network.addEdgeMode(), 0);
          return;
        }
        data.id       = 'e' + Date.now();
        data.arrowDir = 'to';
        data.dashes   = false;
        // Attach captured port selections — skip for anchor nodes.
        const fromIsAnchor = fromNode.shapeType === 'anchor';
        const toIsAnchor   = toNode.shapeType   === 'anchor';
        if (!fromIsAnchor) data.fromPort = _addEdgeFromPort || null;
        if (!toIsAnchor)   data.toPort   = _hoveredPortKey  || null;
        Object.assign(data, visEdgeProps('to', false));
        // Port edges: make vis-network's ghost transparent so only drawPortEdge is visible.
        if (data.fromPort || data.toPort) {
          data.color  = { color: 'rgba(0,0,0,0)', highlight: 'rgba(0,0,0,0)', hover: 'rgba(0,0,0,0)' };
          data.arrows = { to: { enabled: false }, from: { enabled: false } };
        }
        callback(data);
        markDirty();
        _addEdgeFromPort = null;
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
      // Edges are drawn just before the node at their assigned level, so they
      // appear on top of all nodes below that level.
      // Use Math.max so the edge follows the higher-z endpoint — it stays visible
      // above any intermediate nodes between the two endpoints.
      // Anchor nodes are floating endpoints that must not raise the edge above the
      // real source: for anchor edges, use the non-anchor endpoint's level.
      const fromData = st.nodes.get(edge.fromId);
      const toData   = st.nodes.get(edge.toId);
      const fromIsAnchor = fromData && fromData.shapeType === 'anchor';
      const toIsAnchor   = toData   && toData.shapeType   === 'anchor';
      let level;
      if (toIsAnchor && !fromIsAnchor) {
        level = orderMap.get(edge.fromId) ?? 0;
      } else if (fromIsAnchor && !toIsAnchor) {
        level = orderMap.get(edge.toId) ?? 0;
      } else {
        level = Math.min(orderMap.get(edge.fromId) ?? 0, orderMap.get(edge.toId) ?? 0);
      }
      if (!edgesByLevel.has(level)) edgesByLevel.set(level, []);
      edgesByLevel.get(level).push(edge);
    }

    // Build a map: anchorId → the edge(s) that connect to it, so we can draw
    // each anchor dot AFTER its edge (giving the "planted arrowhead" effect).
    const anchorEdgeLevel = new Map(); // anchorId → level at which its edge is drawn
    for (const [level, edges] of edgesByLevel) {
      for (const edge of edges) {
        const fromData = st.nodes.get(edge.fromId);
        const toData   = st.nodes.get(edge.toId);
        if (toData   && toData.shapeType   === 'anchor') anchorEdgeLevel.set(edge.toId,   level);
        if (fromData && fromData.shapeType === 'anchor') anchorEdgeLevel.set(edge.fromId, level);
      }
    }

    // Anchors with no connected edge are drawn at level 0 (bottom).
    for (const id of st.canonicalOrder) {
      const n = st.nodes.get(id);
      if (!n || n.shapeType !== 'anchor') continue;
      if (!anchorEdgeLevel.has(id)) anchorEdgeLevel.set(id, 0);
    }

    for (let i = 0; i < st.canonicalOrder.length; i++) {
      const id = st.canonicalOrder[i];
      const n  = st.nodes.get(id);

      // Draw edges whose level is i, before drawing the node at level i.
      const edges = edgesByLevel.get(i);
      if (edges) {
        edges.forEach((e) => {
          // Always let vis-network draw first.
          // – Non-port edges: fully rendered by vis-network (normal path).
          // – Port edges: transparent ghost (invisible line + arrowhead);
          //   drawPortEdge() overlays the actual bezier path on top.
          e.draw(ctx);
          const edgeData = st.edges.get(e.id);
          if (edgeData && (edgeData.fromPort || edgeData.toPort)) {
            drawPortEdge(ctx, edgeData);
          }
        });
        // Draw any anchor whose edge was just drawn, so the dot appears on top.
        for (const [anchorId, level] of anchorEdgeLevel) {
          if (level !== i) continue;
          const anchorNode = bodyNodes[anchorId];
          if (!anchorNode) continue;
          if (alwaysShow === true || anchorNode.isBoundingBoxOverlappingWith(viewableArea) === true) {
            anchorNode.draw(ctx);
          } else {
            anchorNode.updateBoundingBox(ctx, anchorNode.selected);
          }
        }
      }

      // Skip anchor nodes here — they were drawn right after their edge above.
      if (n && n.shapeType === 'anchor') continue;

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
  st.nodes.on('remove', (_, { items, oldData }) => {
    const removed = new Set(items);
    st.canonicalOrder = st.canonicalOrder.filter((id) => !removed.has(id));
    // If an anchor was deleted directly, also remove its connected edges.
    (oldData || []).forEach((n) => {
      if (n.shapeType !== 'anchor') return;
      const connected = st.edges.get({ filter: (e) => e.from === n.id || e.to === n.id });
      if (connected.length) st.edges.remove(connected.map((e) => e.id));
    });
  });

  // When an edge is removed, delete any anchor node that has no remaining edges.
  st.edges.on('remove', (_, { oldData }) => {
    const anchorsToCheck = new Set();
    (oldData || []).forEach((edge) => {
      const toData   = st.nodes.get(edge.to);
      const fromData = st.nodes.get(edge.from);
      if (toData   && toData.shapeType   === 'anchor') anchorsToCheck.add(edge.to);
      if (fromData && fromData.shapeType === 'anchor') anchorsToCheck.add(edge.from);
    });
    anchorsToCheck.forEach((anchorId) => {
      const remaining = st.edges.get({ filter: (e) => e.from === anchorId || e.to === anchorId });
      if (remaining.length === 0) st.nodes.remove(anchorId);
    });
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
  st.network.on('afterDrawing',  drawRotatedEdgeLabels);
  st.network.on('afterDrawing',  (ctx) => {
    if (st.currentTool === 'addEdge' && _hoveredPortNodeId) {
      drawPortDots(ctx, _hoveredPortNodeId, _hoveredPortKey);
    }
  });

  // ── Free-floating edge: drop on empty canvas creates an anchor node ──────────
  // vis-network only fires addEdge callback when dropping on an existing node.
  // We intercept mousedown (capture source) + mouseup (detect empty-canvas drop).
  let _addEdgeFromId   = null;
  let _addEdgeFromPort = null;  // port key on the source node (null = no port)
  let _hoveredPortNodeId = null; // node whose port dots are currently shown
  let _hoveredPortKey    = null; // nearest port to cursor on that node
  const visCanvas = document.getElementById('vis-canvas');

  // Track hovered node + nearest port while in addEdge mode.
  visCanvas.addEventListener('mousemove', (e) => {
    if (st.currentTool !== 'addEdge' || !st.network) return;
    const pos    = { x: e.offsetX, y: e.offsetY };
    const nodeId = st.network.getNodeAt(pos) || null;
    const nodeData = nodeId && st.nodes.get(nodeId);
    const isAnchor = nodeData && nodeData.shapeType === 'anchor';
    const isLocked = nodeData && nodeData.locked;
    const newPortNodeId = (nodeId && !isAnchor && !isLocked) ? nodeId : null;
    const cp        = newPortNodeId ? st.network.DOMtoCanvas(pos) : null;
    const newPortKey = (newPortNodeId && cp) ? getNearestPort(newPortNodeId, cp) : null;
    if (newPortNodeId !== _hoveredPortNodeId || newPortKey !== _hoveredPortKey) {
      _hoveredPortNodeId = newPortNodeId;
      _hoveredPortKey    = newPortKey;
      st.network.redraw();
    }
  });

  visCanvas.addEventListener('mousedown', (e) => {
    if (st.currentTool !== 'addEdge') return;
    const nodeId = st.network.getNodeAt({ x: e.offsetX, y: e.offsetY }) || null;
    // Block starting an edge from a locked node.
    const nodeData = nodeId && st.nodes.get(nodeId);
    if (nodeData && nodeData.locked) { _addEdgeFromId = null; return; }
    _addEdgeFromId   = nodeId;
    _addEdgeFromPort = _hoveredPortKey; // already computed by mousemove
  });

  visCanvas.addEventListener('mouseup', (e) => {
    if (st.currentTool !== 'addEdge' || !_addEdgeFromId) { _addEdgeFromId = null; return; }
    const pos = { x: e.offsetX, y: e.offsetY };
    // Block dropping onto a locked node.
    const targetId = st.network.getNodeAt(pos);
    const targetData = targetId && st.nodes.get(targetId);
    if (targetData && targetData.locked) { _addEdgeFromId = null; return; }
    if (!targetId) {
      const cp       = st.network.DOMtoCanvas(pos);
      const anchorId = 'a' + Date.now();
      st.nodes.add({
        id: anchorId, label: '', shapeType: 'anchor', colorKey: 'c-gray',
        nodeWidth: 8, nodeHeight: 8, fontSize: null, rotation: 0, labelRotation: 0,
        x: cp.x, y: cp.y,
        ...visNodeProps('anchor', 'c-gray', 8, 8, null, null, null),
      });
      st.edges.add({
        id: 'e' + Date.now(), from: _addEdgeFromId, to: anchorId,
        arrowDir: 'to', dashes: false,
        smooth: { enabled: false },
        ...visEdgeProps('to', false),
      });
      markDirty();
      setTimeout(() => st.network.addEdgeMode(), 0);
    }
    _addEdgeFromId = null;
  });

  document.getElementById('emptyState').classList.add('hidden');
  updateZoomDisplay();
}

// ── Rotated edge label rendering ─────────────────────────────────────────────
// vis-network has no native label rotation for edges. When labelRotation != 0,
// the edge font color is set to transparent and we draw the label ourselves
// in afterDrawing, rotated around the visual midpoint of the edge.
function drawRotatedEdgeLabels(ctx) {
  if (!st.edges || !st.network) return;
  st.edges.get().forEach((e) => {
    if (!e.labelRotation || Math.abs(e.labelRotation) < 0.001 || !e.label) return;
    // Port edges draw their own labels (including rotated) inside drawPortEdge.
    if (e.fromPort || e.toPort) return;
    const positions = st.network.getPositions([e.from, e.to]);
    const fp = positions[e.from];
    const tp = positions[e.to];
    if (!fp || !tp) return;
    const mx = (fp.x + tp.x) / 2;
    const my = (fp.y + tp.y) / 2;
    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(e.labelRotation);
    ctx.font = `${e.fontSize || 11}px system-ui,-apple-system,sans-serif`;
    ctx.fillStyle = '#6b7280';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(e.label, 0, 0);
    ctx.restore();
  });
}

// ── Network event handlers ────────────────────────────────────────────────────

function onDoubleClick(params) {
  if (params.nodes.length > 0) {
    st.selectedNodeIds = params.nodes;
    st.network.selectNodes(st.selectedNodeIds);
    showNodePanel();
    // Skip label edit for locked nodes.
    const isLocked = st.selectedNodeIds.some((id) => { const n = st.nodes.get(id); return n && n.locked; });
    if (isLocked) return;
    startLabelEdit();
  } else if (params.edges.length > 0 && params.nodes.length === 0) {
    st.selectedEdgeIds = [params.edges[0]];
    showEdgePanel();
    startEdgeLabelEdit();
  } else if (st.currentTool === 'addEdge' && params.nodes.length === 0 && params.edges.length === 0) {
    // Double-click on empty canvas in addEdge mode → free-standing arrow between two anchors.
    const cx = params.pointer.canvas.x;
    const cy = params.pointer.canvas.y;
    const t  = Date.now();
    const fromId = 'a' + t;
    const toId   = 'a' + (t + 1);
    const anchorProps = visNodeProps('anchor', 'c-gray', 8, 8, null, null, null);
    st.nodes.add([
      { id: fromId, label: '', shapeType: 'anchor', colorKey: 'c-gray', nodeWidth: 8, nodeHeight: 8, fontSize: null, rotation: 0, labelRotation: 0, x: cx, y: cy - 30, ...anchorProps },
      { id: toId,   label: '', shapeType: 'anchor', colorKey: 'c-gray', nodeWidth: 8, nodeHeight: 8, fontSize: null, rotation: 0, labelRotation: 0, x: cx, y: cy + 30, ...anchorProps },
    ]);
    const edgeId   = 'e' + t;
    const lastStyle = getLastFreeArrowStyle();
    const arrowDir  = lastStyle.arrowDir  || 'to';
    const dashes    = lastStyle.dashes    || false;
    st.edges.add({
      id: edgeId, from: fromId, to: toId,
      arrowDir,
      dashes,
      edgeColor: lastStyle.edgeColor || null,
      edgeWidth: lastStyle.edgeWidth || null,
      smooth: { enabled: false },
      ...visEdgeProps(arrowDir, dashes),
      ...(lastStyle.edgeColor ? { color: { color: lastStyle.edgeColor, highlight: '#f97316', hover: '#f97316' } } : {}),
      ...(lastStyle.edgeWidth ? { width: lastStyle.edgeWidth } : {}),
    });
    markDirty();
    setTimeout(() => {
      st.network.setSelection({ nodes: [fromId, toId], edges: [edgeId] });
      st.selectedNodeIds = [fromId, toId];
      st.selectedEdgeIds = [edgeId];
      showEdgePanel();
      st.network.addEdgeMode();
    }, 0);
  } else if (st.currentTool === 'addNode' && st.pendingShape === 'image') {
    const canvasPos = params.pointer.canvas;
    pickAndCreateImageNode(canvasPos.x, canvasPos.y);
  } else if (st.currentTool === 'addNode') {
    const id         = 'n' + Date.now();
    const defaults   = SHAPE_DEFAULTS[st.pendingShape] || [100, 40];
    const fallbackColor = st.pendingShape === 'post-it' ? 'c-amber' : 'c-gray';
    const lastStyle  = getLastNodeStyle(st.pendingShape);
    const colorKey   = lastStyle.colorKey  || fallbackColor;
    const fontSize   = lastStyle.fontSize  || null;
    const textAlign  = lastStyle.textAlign  || null;
    const textValign = lastStyle.textValign || null;
    st.nodes.add({
      id, label: st.pendingShape === 'text-free' ? 'Texte' : 'Node',
      shapeType: st.pendingShape, colorKey,
      nodeWidth: defaults[0], nodeHeight: defaults[1],
      fontSize, textAlign, textValign,
      rotation: 0, labelRotation: 0,
      x: params.pointer.canvas.x, y: params.pointer.canvas.y,
      ...visNodeProps(st.pendingShape, colorKey, defaults[0], defaults[1], fontSize, textAlign, textValign),
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

// ── Edge straight / curved toggle ────────────────────────────────────────────
export function toggleEdgeStraight() {
  if (!st.network) return;
  st.edgesStraight = !st.edgesStraight;
  const smooth = st.edgesStraight ? { enabled: false } : { type: 'continuous' };
  // Update global network option first (overrides per-edge inherited defaults).
  st.network.setOptions({ edges: { smooth } });
  // Then update each edge individually, keeping anchor edges always straight.
  const updates = st.edges.get().map((e) => {
    const toData = st.nodes.get(e.to);
    const s = (toData && toData.shapeType === 'anchor') ? { enabled: false } : smooth;
    return { id: e.id, smooth: s };
  });
  if (updates.length) st.edges.update(updates);
  document.getElementById('btnEdgeStraight').classList.toggle('tool-active', st.edgesStraight);
  markDirty();
}

function onClickNode(params) {
  if (params.nodes.length === 1 && params.event.srcEvent.shiftKey) {
    navigateNodeLink(params.nodes[0]);
    return;
  }
  // Port edges have a transparent ghost path so vis-network's hit detection
  // misses them when they diverge from the centre-to-centre line.
  // Also check the canvas for port-edge proximity when nothing was hit.
  if (params.nodes.length === 0 && params.edges.length === 0) {
    const cp        = params.pointer.canvas;
    const THRESHOLD = 8;

    // ── Port edge proximity check ──────────────────────────────────────────
    // vis-network's hit detection uses the invisible centre-to-centre ghost,
    // so port edges that diverge visually from that path are not selectable.
    // We scan all port edges and pick the one whose bezier path is closest.
    const portEdges = st.edges.get({ filter: (e) => e.fromPort || e.toPort });
    let nearest = null, nearestDist = Infinity;
    for (const edge of portEdges) {
      const d = distanceToPortEdge(edge, cp);
      if (d < nearestDist) { nearestDist = d; nearest = edge; }
    }
    if (nearest && nearestDist <= THRESHOLD) {
      st.network.selectEdges([nearest.id]);
      st.selectedEdgeIds = [nearest.id];
      st.selectedNodeIds = [];
      hideNodePanel();
      showEdgePanel();
    }
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
  // Filter out anchor nodes — they have no formatting panel.
  const nonAnchors = params.nodes.filter((id) => { const n = st.nodes.get(id); return !(n && n.shapeType === 'anchor'); });
  if (!nonAnchors.length) {
    // Only anchors selected (individual endpoint drag) — keep selection but no panel.
    st.selectedNodeIds = params.nodes;
    st.selectedEdgeIds = [];
    hideEdgePanel();
    return;
  }
  const expanded = expandSelectionToGroup(nonAnchors);
  if (expanded.length > nonAnchors.length) {
    _expandingGroup = true;
    st.network.selectNodes(expanded);
    _expandingGroup = false;
    st.selectedNodeIds = expanded;
  } else {
    st.selectedNodeIds = nonAnchors;
  }
  st.selectedEdgeIds = [];
  hideEdgePanel();
  showNodePanel();
}

function onSelectEdge(params) {
  if (st.selectedNodeIds.length > 0) return; // node takes priority
  st.selectedEdgeIds = params.edges;

  // For free arrows (anchor→anchor edges), also select both endpoint anchors
  // so the user can drag the whole arrow as a unit via multi-node drag.
  const freeAnchors = [];
  for (const edgeId of params.edges) {
    const e = st.edges.get(edgeId);
    if (!e) continue;
    const fromN = st.nodes.get(e.from);
    const toN   = st.nodes.get(e.to);
    if (fromN && fromN.shapeType === 'anchor' && toN && toN.shapeType === 'anchor') {
      freeAnchors.push(e.from, e.to);
    }
  }
  if (freeAnchors.length) {
    st.network.setSelection({ nodes: freeAnchors, edges: params.edges });
    st.selectedNodeIds = freeAnchors; // kept for drag; no panel (all anchors)
  } else {
    st.selectedNodeIds = [];
  }
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
