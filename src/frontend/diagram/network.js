// ── Network initialisation & vis.js event handlers ────────────────────────────
// Creates the vis.js Network, patches _drawNodes for canonical z-order,
// and wires all network-level events.

import { st, markDirty } from './state.js';
import { pushSnapshot }  from './history.js';
import { visNodeProps, SHAPE_DEFAULTS }   from './node-rendering.js';
import { uploadImageFile } from './image-upload.js';
import { promptImageName } from './image-name-modal.js';
import { showToast }       from './toast.js';
import { t }               from './t.js';
import { visEdgeProps }   from './edge-rendering.js';
import { showNodePanel, hideNodePanel } from './node-panel.js';
import { showEdgePanel, hideEdgePanel } from './edge-panel.js';
import { startLabelEdit, startEdgeLabelEdit, commitLabelEdit, hideLabelInput } from './label-editor.js';
import { updateSelectionOverlay, hideSelectionOverlay } from './selection-overlay.js';
import { drawGrid, onDragEnd, snapToGrid }           from './grid.js';
import { onDragging, drawAlignmentGuides, clearAlignGuides } from './alignment.js';
import { drawDebugOverlay }    from './debug.js';
import { updateZoomDisplay }   from './zoom.js';
import { expandSelectionToGroup, drawGroupOutlines } from './groups.js';
import { navigateNodeLink, hideLinkPanel }           from './link-panel.js';
import { getNearestPort, getPortPosition, drawPortDots, drawPortEdge, distanceToPortEdge, wrapText } from './ports.js';
import { getLastFreeArrowStyle } from './edge-panel.js';
import { getLastNodeStyle } from './node-panel.js';
import { installUnlockHold } from './unlock-hold.js';

// Module-level port-hover state — shared between initNetwork event handlers and
// module-level helpers (_onAnchorSnapConnect).
let _hoveredPortNodeId = null;
let _hoveredPortKey    = null;
let _draggingAnchorIds = new Set();
// Rehook state: tracks which port is hovered while a port edge is selected.
let _rehookEdgeId      = null;
let _rehookHoveredNodeId  = null;
let _rehookHoveredPortKey = null;

// Returns true when an edge can enter rehook mode (at least one non-anchor endpoint).
// Works for both port edges and native vis-network edges.
function isRehookable(edgeData) {
  if (!edgeData) return false;
  const fromNode = st.nodes.get(edgeData.from);
  const toNode   = st.nodes.get(edgeData.to);
  return !!(fromNode && fromNode.shapeType !== 'anchor') || !!(toNode && toNode.shapeType !== 'anchor');
}

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
        // Edge labels are always drawn by drawEdgeLabels() in afterDrawing
        // (gives us positioning + rotation control). Hide vis-network's native
        // label text entirely so it never appears alongside ours.
        ...(e.label
          ? { font: { size: e.fontSize || 11, align: 'middle', color: 'rgba(0,0,0,0)' } }
          : e.fontSize
            ? { font: { size: e.fontSize,      align: 'middle', color: '#6b7280' } }
            : {}
        ),
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
    physics: { enabled: false },
    interaction: { hover: true, navigationButtons: false, keyboard: false, multiselect: true },
    nodes: { font: { size: 13, face: 'system-ui,-apple-system,sans-serif' }, borderWidth: 1.5, borderWidthSelected: 2.5, shadow: false, widthConstraint: { minimum: 60 }, heightConstraint: { minimum: 28 } },
    edges: { smooth: edgeSmooth, color: { color: '#a8a29e', highlight: '#f97316', hover: '#f97316' }, width: 1.5, selectionWidth: 2.5, font: { size: 11, align: 'middle', color: 'rgba(0,0,0,0)', strokeColor: 'rgba(0,0,0,0)', background: 'rgba(0,0,0,0)' } },
    manipulation: {
      enabled: false,
      addEdge(data, callback) {
        // Block edges from/to locked nodes or anchors (free-arrow endpoints).
        const fromNode = st.nodes.get(data.from) || {};
        const toNode   = st.nodes.get(data.to)   || {};
        if (fromNode.locked || toNode.locked || fromNode.shapeType === 'anchor' || toNode.shapeType === 'anchor') {
          _addEdgeFromPort = null;
          setTimeout(() => { if (st.currentTool === 'addEdge') st.network.addEdgeMode(); }, 0);
          return;
        }
        pushSnapshot();
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
        setTimeout(() => { if (st.currentTool === 'addEdge') st.network.addEdgeMode(); }, 0);
      },
    },
  };

  if (st.network) st.network.destroy();
  st.network = new vis.Network(container, { nodes: st.nodes, edges: st.edges }, options);

  // ── Lock interception ───────────────────────────────────────────────────────
  // Must be registered BEFORE any other capture-phase mousedown listeners on
  // the container so it can stopImmediatePropagation for locked targets.
  installUnlockHold(container);

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
      // Always draw every node — no viewport culling.
      // Culling would skip draw() for off-screen nodes, leaving shape.width/height
      // at vis-network's default of 50, which breaks getNodeAt() hit-testing.
      node.draw(ctx);
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
  st.network.on('dragging',      onDragging);
  st.network.on('dragEnd',       (p) => { _draggingAnchorIds.clear(); _hoveredPortNodeId = null; _hoveredPortKey = null; _onAnchorSnapConnect(p); onDragEnd(p); clearAlignGuides(); });
  st.network.on('beforeDrawing', drawGrid);
  st.network.on('afterDrawing',  updateSelectionOverlay);
  st.network.on('afterDrawing',  drawAlignmentGuides);
  st.network.on('afterDrawing',  (ctx) => drawGroupOutlines(ctx));
  st.network.on('afterDrawing',  () => drawDebugOverlay());
  st.network.on('afterDrawing',  drawEdgeLabels);
  st.network.on('afterDrawing',  (ctx) => {
    if (_hoveredPortNodeId && (st.currentTool === 'addEdge' || _draggingAnchorIds.size > 0)) {
      drawPortDots(ctx, _hoveredPortNodeId, _hoveredPortKey);
    }
    // Rehook: show port dots on both endpoints of the selected port edge so
    // the user can click a different port to reconnect that end of the arrow.
    if (_rehookEdgeId && st.currentTool !== 'addEdge' && _draggingAnchorIds.size === 0) {
      const edgeData = st.edges.get(_rehookEdgeId);
      if (isRehookable(edgeData)) {
        const fromNode = st.nodes.get(edgeData.from);
        if (fromNode && fromNode.shapeType !== 'anchor') {
          drawPortDots(ctx, edgeData.from, _rehookHoveredNodeId === edgeData.from ? _rehookHoveredPortKey : null);
        }
        const toNode = st.nodes.get(edgeData.to);
        if (toNode && toNode.shapeType !== 'anchor') {
          drawPortDots(ctx, edgeData.to, _rehookHoveredNodeId === edgeData.to ? _rehookHoveredPortKey : null);
        }
      }
    }
  });
  // Two-click free-arrow: draw an orange dot at the pending first-click origin.
  st.network.on('afterDrawing', (ctx) => {
    if (st.currentTool !== 'addEdge' || !st.freeArrowFirstPoint) return;
    const { x, y } = st.freeArrowFirstPoint;
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#f97316';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  // ── Edge label resize ─────────────────────────────────────────────────────────
  // When a single edge is selected and has a label, draw two orange resize handles
  // at the left and right sides of the dashed label box.  Dragging either handle
  // resizes the box symmetrically (centre fixed).  On release the edge's
  // edgeLabelWidth is committed and the text wraps accordingly.
  //
  // Key design: _hoverHandle is computed during mousemove (before any mousedown).
  // The mousedown handler reads this pre-computed state rather than doing its own
  // hit-detection — this avoids a race with vis-network's capture-phase handlers
  // which may run first and alter selection state before our mousedown fires.
  {
    let _lr             = null; // active resize: { edgeId, bboxCx, bboxCy, rotation }
    let _hoverHandle    = null; // { edgeId, bboxCx, bboxCy, rotation } | null
    let _ld             = null; // active label drag: { edgeId, startMouse, startOffsetX, startOffsetY, dragging }
    let _hoverLabelDrag = null; // { edgeId } | null

    // Draw handles for the selected edge label.
    st.network.on('afterDrawing', (ctx) => {
      if (!st.selectedEdgeIds || st.selectedEdgeIds.length !== 1) return;
      const edgeId = st.selectedEdgeIds[0];
      const e = st.edges.get(edgeId);
      if (!e || !e.label) return;
      const bbox = st.edgeLabelBBox && st.edgeLabelBBox[edgeId];
      if (!bbox) return;

      ctx.save();
      ctx.translate(bbox.cx, bbox.cy);
      if (bbox.rotation) ctx.rotate(bbox.rotation);
      for (const hx of [-bbox.w / 2, bbox.w / 2]) {
        ctx.beginPath();
        ctx.arc(hx, 0, 5, 0, Math.PI * 2);
        ctx.fillStyle   = '#f97316';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth   = 1.5;
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    });

    // Track hover during mousemove — computed before any mousedown fires.
    container.addEventListener('mousemove', (e) => {
      if (!st.network || !st.edgeLabelBBox) return;
      const cp = st.network.DOMtoCanvas({ x: e.offsetX, y: e.offsetY });
      const hr = 8 / st.network.getScale();

      // ── Resize handle detection ──────────────────────────────────────────────
      let found = null;
      for (const edgeId of (st.selectedEdgeIds || [])) {
        const edge = st.edges && st.edges.get(edgeId);
        if (!edge || !edge.label) continue;
        const bbox = st.edgeLabelBBox[edgeId];
        if (!bbox) continue;

        const r  = -(bbox.rotation || 0);
        const dx = cp.x - bbox.cx, dy = cp.y - bbox.cy;
        const lx = dx * Math.cos(r) - dy * Math.sin(r);
        const ly = dx * Math.sin(r) + dy * Math.cos(r);

        if (Math.hypot(lx - (-bbox.w / 2), ly) < hr || Math.hypot(lx - (bbox.w / 2), ly) < hr) {
          found = { edgeId, bboxCx: bbox.cx, bboxCy: bbox.cy, rotation: bbox.rotation || 0 };
          break;
        }
      }
      if (Boolean(found) !== Boolean(_hoverHandle)) {
        container.style.cursor = found ? 'ew-resize' : (_hoverLabelDrag ? 'grab' : '');
      }
      _hoverHandle = found;

      // ── Label box hover detection (drag) — only when no handle hovered ───────
      let labelFound = null;
      if (!found && st.selectedEdgeIds && st.selectedEdgeIds.length === 1) {
        const edgeId = st.selectedEdgeIds[0];
        const edge = st.edges && st.edges.get(edgeId);
        if (edge && edge.label) {
          const bbox = st.edgeLabelBBox && st.edgeLabelBBox[edgeId];
          if (bbox) {
            const r  = -(bbox.rotation || 0);
            const dx = cp.x - bbox.cx, dy = cp.y - bbox.cy;
            const lx = dx * Math.cos(r) - dy * Math.sin(r);
            const ly = dx * Math.sin(r) + dy * Math.cos(r);
            if (Math.abs(lx) <= bbox.w / 2 && Math.abs(ly) <= bbox.h / 2) {
              labelFound = { edgeId };
            }
          }
        }
      }
      if (Boolean(labelFound) !== Boolean(_hoverLabelDrag)) {
        if (!found) container.style.cursor = labelFound ? 'grab' : '';
      }
      _hoverLabelDrag = labelFound;
    });

    // Mousedown: start resize (handles take priority) or label drag.
    container.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      if (_hoverHandle) {
        _lr = { ..._hoverHandle, dragging: false };
        st.network.setOptions({ interaction: { dragView: false } });
      } else if (_hoverLabelDrag) {
        const edge = st.edges && st.edges.get(_hoverLabelDrag.edgeId);
        if (!edge) return;
        _ld = {
          edgeId: _hoverLabelDrag.edgeId,
          startMouse: { x: e.clientX, y: e.clientY },
          startOffsetX: edge.edgeLabelOffsetX || 0,
          startOffsetY: edge.edgeLabelOffsetY || 0,
          dragging: false,
        };
        st.network.setOptions({ interaction: { dragView: false } });
      }
    }, { capture: true });

    // Update width (resize) or offset (label drag) while dragging.
    document.addEventListener('mousemove', (e) => {
      if (!st.network) return;
      if (_lr) {
        if (!_lr.dragging) { _lr.dragging = true; pushSnapshot(); }
        const rect = container.getBoundingClientRect();
        const cp   = st.network.DOMtoCanvas({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        const r    = -_lr.rotation;
        const dx   = cp.x - _lr.bboxCx, dy = cp.y - _lr.bboxCy;
        const lx   = dx * Math.cos(r) - dy * Math.sin(r);
        st.edges.update({ id: _lr.edgeId, edgeLabelWidth: Math.max(40, Math.abs(lx) * 2) });
        st.network.redraw();
      }
      if (_ld) {
        if (!_ld.dragging) {
          if (Math.hypot(e.clientX - _ld.startMouse.x, e.clientY - _ld.startMouse.y) < 4) return;
          _ld.dragging = true;
          pushSnapshot();
        }
        const scale = st.network.getScale();
        st.edges.update({
          id: _ld.edgeId,
          edgeLabelOffsetX: _ld.startOffsetX + (e.clientX - _ld.startMouse.x) / scale,
          edgeLabelOffsetY: _ld.startOffsetY + (e.clientY - _ld.startMouse.y) / scale,
        });
        st.network.redraw();
      }
    });

    // Commit on mouseup.
    document.addEventListener('mouseup', () => {
      if (_lr) {
        st.network.setOptions({ interaction: { dragView: true } });
        if (_lr.dragging) markDirty();
        _lr = null;
      }
      if (_ld) {
        st.network.setOptions({ interaction: { dragView: true } });
        if (_ld.dragging) markDirty();
        _ld = null;
      }
      container.style.cursor = _hoverHandle ? 'ew-resize' : (_hoverLabelDrag ? 'grab' : '');
    });
  }

  // ── Free-arrow body drag ──────────────────────────────────────────────────────
  // Dragging the body of a free arrow (anchor-anchor edge) should move the whole
  // arrow. vis-network pans the canvas instead (no node at the body position).
  // Fix: capture mousedown on the edge body, disable dragView, move anchors manually.
  {
    let _fad = null; // free-arrow drag state
    container.addEventListener('mousedown', (e) => {
      if (e.button !== 0 || !st.network) return;
      const domPos = { x: e.offsetX, y: e.offsetY };
      // If the click landed on a node (including an anchor endpoint), don't intercept:
      // the user wants to move only that endpoint (pivot), not the whole arrow.
      if (st.network.getNodeAt(domPos)) return;
      const edgeId = st.network.getEdgeAt(domPos);
      if (!edgeId) return;
      const edge  = st.edges.get(edgeId);
      if (!edge)  return;
      const fromN = st.nodes.get(edge.from);
      const toN   = st.nodes.get(edge.to);
      if (!(fromN && fromN.shapeType === 'anchor' && toN && toN.shapeType === 'anchor')) return;
      const startPos = st.network.getPositions([edge.from, edge.to]);
      _fad = { edgeId, fromId: edge.from, toId: edge.to,
               startMouse: { x: e.clientX, y: e.clientY }, startPos, dragging: false };
    }, { capture: true });

    document.addEventListener('mousemove', (e) => {
      if (!_fad || !st.network) return;
      const dx = e.clientX - _fad.startMouse.x;
      const dy = e.clientY - _fad.startMouse.y;
      if (!_fad.dragging) {
        if (Math.hypot(dx, dy) < 4) return;
        _fad.dragging = true;
        pushSnapshot();
        st.network.setOptions({ interaction: { dragView: false } });
      }
      const scale = st.network.getScale();
      const fp = _fad.startPos[_fad.fromId];
      const tp = _fad.startPos[_fad.toId];
      const snap = (x, y) => st.gridEnabled ? snapToGrid(x, y) : { x, y };
      if (fp) { const p = snap(fp.x + dx / scale, fp.y + dy / scale); st.network.moveNode(_fad.fromId, p.x, p.y); }
      if (tp) { const p = snap(tp.x + dx / scale, tp.y + dy / scale); st.network.moveNode(_fad.toId,   p.x, p.y); }
      st.network.redraw();
    });

    document.addEventListener('mouseup', () => {
      if (!_fad) return;
      if (_fad.dragging) {
        st.network.setOptions({ interaction: { dragView: true } });
        markDirty();
      }
      _fad = null;
    });
  }

  // ── Free-floating edge: two interaction paths ─────────────────────────────────
  // Path A — drag from a real node to empty canvas → node→anchor endpoint.
  //          Intercepted via raw DOM mousedown/mouseup (vis-network's addEdge
  //          callback only fires when releasing ON an existing node).
  // Path B — two successive CLICKS on empty canvas → free-standing anchor→anchor.
  //          Uses vis-network's own 'click' event: Hammer.js fires 'click' only
  //          for taps, NOT for drags, so Path A drags never bleed into Path B.
  let _addEdgeFromId   = null;
  let _addEdgeFromPort = null;  // port key on the source node (null = no port)
  // _hoveredPortNodeId, _hoveredPortKey, _draggingAnchorIds are module-level.
  const visCanvas = document.getElementById('vis-canvas');

  // Track hovered node + nearest port while in addEdge mode OR while dragging an anchor.
  visCanvas.addEventListener('mousemove', (e) => {
    const inAddEdge    = st.currentTool === 'addEdge';
    const anchorDragging = _draggingAnchorIds.size > 0;
    if ((!inAddEdge && !anchorDragging) || !st.network) return;

    const pos = { x: e.offsetX, y: e.offsetY };
    const cp  = st.network.DOMtoCanvas(pos);

    let newPortNodeId = null;

    if (inAddEdge) {
      // addEdge mode: use getNodeAt as before
      const nodeId   = st.network.getNodeAt(pos) || null;
      const nodeData = nodeId && st.nodes.get(nodeId);
      const isAnchor = nodeData && nodeData.shapeType === 'anchor';
      const isLocked = nodeData && nodeData.locked;
      newPortNodeId  = (nodeId && !isAnchor && !isLocked) ? nodeId : null;
    } else {
      // Anchor drag: getNodeAt returns the dragged anchor itself — do a canvas-space
      // bounding-box search for any non-anchor node that contains the cursor.
      const SNAP_THRESHOLD = 30;
      let bestId   = null;
      let bestDist = Infinity;
      for (const [candidateId, candidatePos] of Object.entries(st.network.getPositions())) {
        if (_draggingAnchorIds.has(candidateId)) continue;
        const candidate = st.nodes.get(candidateId);
        if (!candidate || candidate.shapeType === 'anchor') continue;
        const bodyNode = st.network.body.nodes[candidateId];
        if (!bodyNode) continue;
        const w = (bodyNode.shape && bodyNode.shape.width)  || SHAPE_DEFAULTS[candidate.shapeType]?.width  || 120;
        const h = (bodyNode.shape && bodyNode.shape.height) || SHAPE_DEFAULTS[candidate.shapeType]?.height || 60;
        const inBox = cp.x >= candidatePos.x - w / 2 - SNAP_THRESHOLD &&
                      cp.x <= candidatePos.x + w / 2 + SNAP_THRESHOLD &&
                      cp.y >= candidatePos.y - h / 2 - SNAP_THRESHOLD &&
                      cp.y <= candidatePos.y + h / 2 + SNAP_THRESHOLD;
        if (inBox) {
          const dist = Math.hypot(candidatePos.x - cp.x, candidatePos.y - cp.y);
          if (dist < bestDist) { bestDist = dist; bestId = candidateId; }
        }
      }
      newPortNodeId = bestId;
    }

    const newPortKey = newPortNodeId ? getNearestPort(newPortNodeId, cp) : null;
    if (newPortNodeId !== _hoveredPortNodeId || newPortKey !== _hoveredPortKey) {
      _hoveredPortNodeId = newPortNodeId;
      _hoveredPortKey    = newPortKey;
      st.network.redraw();
    }
  });

  // Rehook hover: track the nearest port on the from/to nodes of the selected port edge.
  visCanvas.addEventListener('mousemove', (e) => {
    if (!st.network || st.currentTool === 'addEdge' || _draggingAnchorIds.size > 0) return;
    const selectedEdge = st.selectedEdgeIds.length === 1 ? st.edges.get(st.selectedEdgeIds[0]) : null;
    if (!isRehookable(selectedEdge)) {
      if (_rehookEdgeId !== null) {
        _rehookEdgeId = _rehookHoveredNodeId = _rehookHoveredPortKey = null;
        st.network.redraw();
      }
      return;
    }

    _rehookEdgeId = selectedEdge.id;
    const cp = st.network.DOMtoCanvas({ x: e.offsetX, y: e.offsetY });
    const REHOOK_THRESHOLD = 15; // world units
    let newNodeId   = null;
    let newPortKey  = null;
    let closestDist = Infinity;

    for (const nodeId of [selectedEdge.from, selectedEdge.to]) {
      const nodeData = st.nodes.get(nodeId);
      if (!nodeData || nodeData.shapeType === 'anchor') continue;
      const portKey = getNearestPort(nodeId, cp);
      const portPos = getPortPosition(nodeId, portKey);
      if (!portPos) continue;
      const dist = Math.hypot(cp.x - portPos.x, cp.y - portPos.y);
      if (dist <= REHOOK_THRESHOLD && dist < closestDist) {
        closestDist = dist;
        newNodeId  = nodeId;
        newPortKey = portKey;
      }
    }

    if (newNodeId !== _rehookHoveredNodeId || newPortKey !== _rehookHoveredPortKey) {
      _rehookHoveredNodeId  = newNodeId;
      _rehookHoveredPortKey = newPortKey;
      st.network.redraw();
    }
  });

  // Path A – capture source node on mousedown.
  visCanvas.addEventListener('mousedown', (e) => {
    if (st.currentTool !== 'addEdge') return;
    const nodeId   = st.network.getNodeAt({ x: e.offsetX, y: e.offsetY }) || null;
    const nodeData = nodeId && st.nodes.get(nodeId);
    // Block starting an edge from a locked node or an anchor (free-arrow endpoint).
    if (nodeData && (nodeData.locked || nodeData.shapeType === 'anchor')) { _addEdgeFromId = null; return; }
    // Dragging from a real node cancels any pending two-click origin.
    if (nodeId) st.freeArrowFirstPoint = null;
    _addEdgeFromId   = nodeId;
    _addEdgeFromPort = _hoveredPortKey;
  });

  // Path A – release on empty canvas creates the anchor endpoint.
  visCanvas.addEventListener('mouseup', (e) => {
    if (st.currentTool !== 'addEdge' || !_addEdgeFromId) { _addEdgeFromId = null; return; }
    const pos        = { x: e.offsetX, y: e.offsetY };
    const targetId   = st.network.getNodeAt(pos);
    const targetData = targetId && st.nodes.get(targetId);
    if (targetData && targetData.locked) { _addEdgeFromId = null; return; }
    if (!targetId) {
      pushSnapshot();
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
      st.freeArrowFirstPoint = null;
      setTimeout(() => { if (st.currentTool === 'addEdge') st.network.addEdgeMode(); }, 0);
    }
    _addEdgeFromId = null;
  });

  // Path B – two successive clicks on empty canvas → free-standing anchor→anchor arrow.
  // vis-network's 'click' event (via Hammer.js) only fires for taps, never for drags,
  // so Path A drag gestures cannot accidentally trigger Path B.
  st.network.on('click', (params) => {
    if (st.currentTool !== 'addEdge') return;
    // Only handle clicks that landed on empty canvas (no node, no edge).
    if (params.nodes.length > 0 || params.edges.length > 0) return;
    const cp = params.pointer.canvas;
    if (!st.freeArrowFirstPoint) {
      // First click: record the origin and show the orange indicator dot.
      st.freeArrowFirstPoint = { x: cp.x, y: cp.y };
      st.network.redraw();
    } else {
      // Second click: create the free-standing anchor→anchor arrow.
      pushSnapshot();
      const t           = Date.now();
      const fromId      = 'a' + t;
      const toId        = 'a' + (t + 1);
      const anchorProps = visNodeProps('anchor', 'c-gray', 8, 8, null, null, null);
      st.nodes.add([
        { id: fromId, label: '', shapeType: 'anchor', colorKey: 'c-gray', nodeWidth: 8, nodeHeight: 8, fontSize: null, rotation: 0, labelRotation: 0, x: st.freeArrowFirstPoint.x, y: st.freeArrowFirstPoint.y, ...anchorProps },
        { id: toId,   label: '', shapeType: 'anchor', colorKey: 'c-gray', nodeWidth: 8, nodeHeight: 8, fontSize: null, rotation: 0, labelRotation: 0, x: cp.x, y: cp.y, ...anchorProps },
      ]);
      const edgeId    = 'e' + t;
      const lastStyle = getLastFreeArrowStyle();
      const arrowDir  = lastStyle.arrowDir  || 'to';
      const dashes    = lastStyle.dashes    || false;
      st.edges.add({
        id: edgeId, from: fromId, to: toId,
        arrowDir, dashes,
        edgeColor: lastStyle.edgeColor || null,
        edgeWidth: lastStyle.edgeWidth || null,
        smooth: { enabled: false },
        ...visEdgeProps(arrowDir, dashes),
        ...(lastStyle.edgeColor ? { color: { color: lastStyle.edgeColor, highlight: '#f97316', hover: '#f97316' } } : {}),
        ...(lastStyle.edgeWidth ? { width: lastStyle.edgeWidth } : {}),
      });
      st.freeArrowFirstPoint = null;
      markDirty();
      setTimeout(() => {
        st.network.setSelection({ nodes: [fromId, toId], edges: [edgeId] });
        st.selectedNodeIds = [fromId, toId];
        st.selectedEdgeIds = [edgeId];
        showEdgePanel();
        st.network.addEdgeMode();
      }, 0);
    }
  });

  document.getElementById('emptyState').classList.add('hidden');
  updateZoomDisplay();

  // vis-network initialises shape.width/height to 50 (not undefined), so
  // needsRefresh() returns false and resize() never runs on the first render.
  // Fix: reset shape.width/height to undefined so needsRefresh() returns true
  // and vis-network's own render loop runs resize() with the correct context.
  st.network.once('afterDrawing', () => {
    for (const id of st.network.body.nodeIndices) {
      const bn = st.network.body.nodes[id];
      if (!bn || !bn.shape) continue;
      bn.shape.width  = undefined;
      bn.shape.height = undefined;
    }
    // Patch CustomShape.distanceToBorder so anchor nodes report 0: arrow tips
    // land at the anchor centre instead of 8 canvas units away (half the 16×16
    // hit-box). Without this, short free arrows render with reversed or
    // overlapping arrowheads because the 8+8 boundary offset exceeds the
    // segment length, and the visible dot sits far from the arrow tip.
    for (const id of st.network.body.nodeIndices) {
      const bn = st.network.body.nodes[id];
      if (!bn || !bn.shape) continue;
      const proto = Object.getPrototypeOf(bn.shape);
      if (proto.__ldAnchorDistancePatched) break;
      const orig = proto.distanceToBorder;
      proto.distanceToBorder = function (ctx, angle) {
        const data = st.nodes && st.nodes.get(this.options && this.options.id);
        if (data && data.shapeType === 'anchor') return 0;
        return orig.call(this, ctx, angle);
      };
      proto.__ldAnchorDistancePatched = true;
      break;
    }
    st.network.redraw();
  });
}

// ── Anchor snap-to-connect ────────────────────────────────────────────────────
// When a free-arrow anchor endpoint is dropped near/onto another node or anchor,
// reconnect the edge to that target and remove the orphaned anchor.
function _onAnchorSnapConnect(params) {
  if (!params.nodes || params.nodes.length === 0) return;
  if (!st.network || !st.nodes || !st.edges) return;

  const SNAP_THRESHOLD = 30; // canvas units

  let snapped = false;

  for (const anchorId of params.nodes) {
    const anchor = st.nodes.get(anchorId);
    if (!anchor || anchor.shapeType !== 'anchor') continue;

    // Find the edge this anchor belongs to (as from or to)
    const connectedEdges = st.edges.get().filter(e => e.from === anchorId || e.to === anchorId);
    if (connectedEdges.length === 0) continue;

    // Current position of dragged anchor
    const pos = st.network.getPositions([anchorId])[anchorId];
    if (!pos) continue;

    // Find best snap target: any node except this anchor itself and the other
    // endpoint of the same edge (avoid self-loop on anchor→anchor)
    const siblingIds = new Set();
    for (const e of connectedEdges) {
      siblingIds.add(e.from);
      siblingIds.add(e.to);
    }
    siblingIds.delete(anchorId); // keep sibling (other endpoint) in set to block self-loop

    let bestId   = null;
    let bestDist = Infinity;

    for (const [candidateId, candidatePos] of Object.entries(st.network.getPositions())) {
      if (candidateId === anchorId) continue;
      if (siblingIds.has(candidateId)) continue; // would create a self-loop

      const candidate = st.nodes.get(candidateId);
      if (!candidate) continue;

      const dist = Math.hypot(candidatePos.x - pos.x, candidatePos.y - pos.y);

      if (candidate.shapeType === 'anchor') {
        // Snap to another anchor if within threshold
        if (dist < SNAP_THRESHOLD && dist < bestDist) {
          bestId   = candidateId;
          bestDist = dist;
        }
      } else {
        // Snap to a regular node if anchor falls within its bounding box (padded by threshold)
        const bodyNode = st.network.body.nodes[candidateId];
        if (!bodyNode) continue;
        const w = (bodyNode.shape && bodyNode.shape.width)  || SHAPE_DEFAULTS[candidate.shapeType]?.width  || 120;
        const h = (bodyNode.shape && bodyNode.shape.height) || SHAPE_DEFAULTS[candidate.shapeType]?.height || 60;
        const cx = candidatePos.x;
        const cy = candidatePos.y;
        const inBox = pos.x >= cx - w / 2 - SNAP_THRESHOLD &&
                      pos.x <= cx + w / 2 + SNAP_THRESHOLD &&
                      pos.y >= cy - h / 2 - SNAP_THRESHOLD &&
                      pos.y <= cy + h / 2 + SNAP_THRESHOLD;
        if (inBox && dist < bestDist) {
          bestId   = candidateId;
          bestDist = dist;
        }
      }
    }

    if (!bestId) continue;

    if (!snapped) { pushSnapshot(); snapped = true; }

    // Determine which port to attach to on the target node (non-anchor targets only).
    const targetNode = st.nodes.get(bestId);
    const isAnchorTarget = targetNode && targetNode.shapeType === 'anchor';
    // Use the hovered port (computed by mousemove) when available; fall back to nearest port.
    let portKey = null;
    if (!isAnchorTarget) {
      portKey = (_hoveredPortNodeId === bestId && _hoveredPortKey)
        ? _hoveredPortKey
        : getNearestPort(bestId, pos);
    }

    // Reconnect every edge that uses this anchor as an endpoint
    for (const e of connectedEdges) {
      if (e.from === anchorId) {
        const update = { id: e.id, from: bestId };
        if (portKey) update.fromPort = portKey;
        // Port edges must be transparent ghosts so only drawPortEdge is visible.
        if (portKey || e.toPort) {
          update.color  = { color: 'rgba(0,0,0,0)', highlight: 'rgba(0,0,0,0)', hover: 'rgba(0,0,0,0)' };
          update.arrows = { to: { enabled: false }, from: { enabled: false } };
        }
        st.edges.update(update);
      }
      if (e.to === anchorId) {
        const update = { id: e.id, to: bestId };
        if (portKey) update.toPort = portKey;
        // Port edges must be transparent ghosts so only drawPortEdge is visible.
        if (portKey || e.fromPort) {
          update.color  = { color: 'rgba(0,0,0,0)', highlight: 'rgba(0,0,0,0)', hover: 'rgba(0,0,0,0)' };
          update.arrows = { to: { enabled: false }, from: { enabled: false } };
        }
        st.edges.update(update);
      }
    }

    // Remove the orphaned anchor
    st.nodes.remove(anchorId);
    markDirty();
  }
}

// ── Edge label rendering ──────────────────────────────────────────────────────
// All edge labels (with or without rotation) are drawn here in afterDrawing.
// vis-network's native edge label is always made transparent so only this
// renderer is visible — eliminating the dual-rendering issue that caused
// labels to appear twice at different positions.
function drawEdgeLabels(ctx) {
  try {
  if (!st.edges || !st.network) return;

  const m   = ctx.getTransform();
  const dpr = window.devicePixelRatio || 1;
  const canvasEl      = ctx.canvas;
  const container     = document.getElementById('vis-canvas').parentElement;
  const canvasRect    = canvasEl.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  const offsetX = canvasRect.left - containerRect.left;
  const offsetY = canvasRect.top  - containerRect.top;

  st.edges.get().forEach((e) => {
    // Port edges draw their own labels inside drawPortEdge — skip here.
    if (e.fromPort || e.toPort) return;

    // Compute bezier midpoint in layout space for every edge (labeled or not)
    // so the label editor always has an accurate DOM position to open at.
    const bodyEdge = st.network.body.edges[e.id];
    let mx, my;
    if (bodyEdge && bodyEdge.edgeType && typeof bodyEdge.edgeType.getPoint === 'function') {
      const pt = bodyEdge.edgeType.getPoint(0.5);
      mx = pt.x;
      my = pt.y;
    } else {
      const positions = st.network.getPositions([e.from, e.to]);
      const fp = positions[e.from];
      const tp = positions[e.to];
      if (!fp || !tp) return;
      mx = (fp.x + tp.x) / 2;
      my = (fp.y + tp.y) / 2;
    }

    const ox = e.edgeLabelOffsetX || 0;
    const oy = e.edgeLabelOffsetY || 0;
    const lx = mx + ox;
    const ly = my + oy;

    st.edgeLabelCanvasPos[e.id] = {
      x: (m.a * lx + m.e) / dpr + offsetX,
      y: (m.d * ly + m.f) / dpr + offsetY,
    };

    // Only draw the label text for edges that have one.
    if (!e.label) return;

    const fontSize   = e.fontSize || 11;
    const lineHeight = fontSize * 1.5;
    const PAD_X = 6, PAD_Y = 4;

    ctx.save();
    ctx.translate(lx, ly);
    if (e.labelRotation && Math.abs(e.labelRotation) > 0.001) {
      ctx.rotate(e.labelRotation);
    }
    ctx.font = `${fontSize}px system-ui,-apple-system,sans-serif`;

    const fixedW = e.edgeLabelWidth || null;
    const innerW = fixedW ? fixedW - PAD_X * 2 : null;
    const lines  = fixedW ? wrapText(ctx, e.label, innerW) : [e.label];
    const textW  = fixedW ? innerW : ctx.measureText(e.label).width;
    const boxW   = textW + PAD_X * 2;
    const boxH   = lines.length * lineHeight + PAD_Y * 2;

    // Always store bbox (needed for resize handles, even when not selected)
    st.edgeLabelBBox[e.id] = {
      cx: lx, cy: ly,
      w: boxW, h: boxH,
      rotation: e.labelRotation || 0,
    };

    const totalH   = lines.length * lineHeight;
    const TEXT_PAD = 3;
    const isDark   = document.documentElement.classList.contains('dark');
    const bgFill   = isDark ? 'rgba(3,7,18,0.82)' : 'rgba(249,250,251,0.82)';

    // Opaque background tight around the text — makes the arrow appear to pass behind.
    ctx.save();
    ctx.fillStyle = bgFill;
    ctx.fillRect(-textW / 2 - TEXT_PAD, -totalH / 2 - TEXT_PAD,
                  textW + TEXT_PAD * 2,   totalH + TEXT_PAD * 2);
    ctx.restore();

    // Dashed border box — only when the edge is selected
    if (st.selectedEdgeIds && st.selectedEdgeIds.includes(e.id)) {
      ctx.save();
      ctx.strokeStyle = '#9ca3af';
      ctx.lineWidth   = 0.8;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(-boxW / 2, -boxH / 2, boxW, boxH);
      ctx.setLineDash([]);
      ctx.restore();
    }

    ctx.fillStyle    = '#6b7280';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    lines.forEach((line, i) => {
      const y = -totalH / 2 + i * lineHeight + lineHeight / 2;
      ctx.fillText(line, 0, y);
    });

    ctx.restore();
  });
  } catch(err) { console.error('[draw] EXCEPTION:', err); }
}

// ── Network event handlers ────────────────────────────────────────────────────

// Distance from point (px,py) to segment (ax,ay)-(bx,by) in canvas space.
function _distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}


// Returns the topmost (highest z-order) node whose bounding box contains canvasPos.
// Ignores anchor nodes and respects st.canonicalOrder.
function topmostNodeAt(canvasPos) {
  let topmost = null;
  let topmostIdx = -1;
  for (const id of st.canonicalOrder) {
    const n  = st.nodes.get(id);
    const bn = st.network && st.network.body.nodes[id];
    if (!n || !bn || n.shapeType === 'anchor') continue;
    const defaults = SHAPE_DEFAULTS[n.shapeType || 'box'] || [60, 28];
    const W  = n.nodeWidth  || defaults[0];
    const H  = n.nodeHeight || defaults[1];
    const cx = bn.x, cy = bn.y;
    if (canvasPos.x >= cx - W / 2 && canvasPos.x <= cx + W / 2 &&
        canvasPos.y >= cy - H / 2 && canvasPos.y <= cy + H / 2) {
      const idx = st.canonicalOrder.indexOf(id);
      if (idx > topmostIdx) { topmostIdx = idx; topmost = id; }
    }
  }
  return topmost;
}

function onDoubleClick(params) {
  // Locked nodes never intercept double-click — filter them out first.
  const unlockedNodes = params.nodes.filter(id => { const n = st.nodes.get(id); return n && !n.locked; });

  // When nodes and edges both match the click position, honour z-order:
  // only give the click to a node if it is truly the topmost element there.
  // Otherwise fall through to edge handling.
  let effectiveNodes = unlockedNodes;
  if (unlockedNodes.length > 0 && params.edges.length > 0) {
    const top = topmostNodeAt(params.pointer.canvas);
    effectiveNodes = (top && unlockedNodes.includes(top)) ? [top] : [];
  }

  if (effectiveNodes.length > 0) {
    st.selectedNodeIds = effectiveNodes;
    st.network.selectNodes(st.selectedNodeIds);
    showNodePanel();
    startLabelEdit();
  } else if (params.edges.length > 0) {
    st.selectedEdgeIds = [params.edges[0]];
    showEdgePanel();
    startEdgeLabelEdit();
  } else if (st.currentTool === 'addNode' && st.pendingShape === 'image') {
    const canvasPos = params.pointer.canvas;
    pickAndCreateImageNode(canvasPos.x, canvasPos.y);
  } else if (st.currentTool === 'addNode') {
    pushSnapshot();
    const id         = 'n' + Date.now();
    const defaults   = SHAPE_DEFAULTS[st.pendingShape] || [100, 40];
    const fallbackColor = st.pendingShape === 'post-it' ? 'c-amber' : 'c-gray';
    const lastStyle  = getLastNodeStyle(st.pendingShape);
    const colorKey   = lastStyle.colorKey  || fallbackColor;
    const fontSize   = lastStyle.fontSize  || null;
    const textAlign  = lastStyle.textAlign  || null;
    const textValign = lastStyle.textValign || null;
    const rawPos     = params.pointer.canvas;
    const pos        = st.gridEnabled ? snapToGrid(rawPos.x, rawPos.y) : rawPos;
    st.nodes.add({
      id, label: st.pendingShape === 'text-free' ? t('diagram.label_input.placeholder') : 'Node',
      shapeType: st.pendingShape, colorKey,
      nodeWidth: defaults[0], nodeHeight: defaults[1],
      fontSize, textAlign, textValign,
      rotation: 0, labelRotation: 0,
      x: pos.x, y: pos.y,
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
      showToast(t('diagram.toast.image_import_error'), 'error');
    }
  };
  input.click();
}

export function createImageNode(imageSrc, canvasX, canvasY) {
  if (!st.network) return;
  const id      = 'n' + Date.now();
  const captionId = id + 'c';

  const addNode = (nW, nH) => {
    pushSnapshot();
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
  pushSnapshot();
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

  // ── Edge rehook ──────────────────────────────────────────────────────────────
  // When a port edge is selected and the user clicks a port dot on one of its
  // endpoint nodes, reconnect that end to the new port without losing selection.
  if (_rehookEdgeId && _rehookHoveredNodeId && _rehookHoveredPortKey) {
    const edgeData = st.edges.get(_rehookEdgeId);
    if (edgeData && (edgeData.from === _rehookHoveredNodeId || edgeData.to === _rehookHoveredNodeId)) {
      const wasPortEdge = !!(edgeData.fromPort || edgeData.toPort);
      const update = { id: edgeData.id };
      if (edgeData.from === _rehookHoveredNodeId) update.fromPort = _rehookHoveredPortKey;
      else                                         update.toPort   = _rehookHoveredPortKey;
      // First port assigned on a native edge: hide vis-network's rendering so
      // drawPortEdge() takes over without double-rendering.
      if (!wasPortEdge) {
        update.color  = { color: 'rgba(0,0,0,0)', highlight: 'rgba(0,0,0,0)', hover: 'rgba(0,0,0,0)' };
        update.arrows = { to: { enabled: false }, from: { enabled: false } };
      }
      st.edges.update(update);
      pushSnapshot();
      markDirty();
      const edgeId = edgeData.id;
      _rehookHoveredNodeId = _rehookHoveredPortKey = null;
      setTimeout(() => {
        st.network.setSelection({ nodes: [], edges: [edgeId] });
        st.selectedEdgeIds = [edgeId];
        st.selectedNodeIds = [];
        showEdgePanel();
      }, 0);
      return;
    }
  }

  // When a node is reported, params.edges is always empty — vis-network short-circuits
  // edge detection once a node is found. Fix: call getEdgeAt() directly with CLIENT
  // coordinates. params.pointer.DOM is already offset-relative to the container, so
  // passing it to getEdgeAt() causes a double-subtraction of the container rect and
  // returns null. Passing clientX/Y lets vis-network do its own pixel-perfect detection.
  if (params.nodes.length > 0) {
    const clientPos = { x: params.event.srcEvent.clientX, y: params.event.srcEvent.clientY };
    const edgeId = st.network.getEdgeAt(clientPos);
    if (edgeId) {
      const edge  = st.edges.get(edgeId);
      const fromN = edge && st.nodes.get(edge.from);
      const toN   = edge && st.nodes.get(edge.to);
      const isFreeArrow = fromN && fromN.shapeType === 'anchor' && toN && toN.shapeType === 'anchor';
      // If the user clicked directly on an anchor node (not the edge body), keep only
      // that single anchor selected so dragging pivots the arrow instead of moving it whole.
      const clickedAnAnchor = params.nodes.some(id => { const n = st.nodes.get(id); return n && n.shapeType === 'anchor'; });
      if (isFreeArrow && clickedAnAnchor) return;
      setTimeout(() => {
        const sel = isFreeArrow
          ? { nodes: [edge.from, edge.to], edges: [edgeId] }
          : { nodes: [], edges: [edgeId] };
        st.network.setSelection(sel);
        st.selectedNodeIds = sel.nodes;
        st.selectedEdgeIds = [edgeId];
        const e2 = st.edges.get(edgeId);
        _rehookEdgeId = isRehookable(e2) ? edgeId : null;
        _rehookHoveredNodeId = _rehookHoveredPortKey = null;
        hideNodePanel();
        showEdgePanel();
      }, 0);
      return;
    }
    // No edge at click position — apply z-order correction for the topmost node.
    const top = topmostNodeAt(params.pointer.canvas);
    const clickable = params.nodes.filter(id => {
      const n = st.nodes.get(id);
      return n && !n.locked && n.shapeType !== 'anchor';
    });
    if (!top || !clickable.includes(top)) {
      const fallbackEdgeId = params.edges.length > 0 ? params.edges[0] : null;
      if (fallbackEdgeId) {
        setTimeout(() => {
          st.network.setSelection({ nodes: [], edges: [fallbackEdgeId] });
          st.selectedNodeIds = [];
          st.selectedEdgeIds = [fallbackEdgeId];
          const fe = st.edges.get(fallbackEdgeId);
          _rehookEdgeId = isRehookable(fe) ? fallbackEdgeId : null;
          _rehookHoveredNodeId = _rehookHoveredPortKey = null;
          hideNodePanel();
          showEdgePanel();
        }, 0);
        return;
      }
    }
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
      _rehookEdgeId = nearest.id;
      _rehookHoveredNodeId = _rehookHoveredPortKey = null;
      hideNodePanel();
      showEdgePanel();
      return;
    }
  }
  // Click landed on empty space (no node, no edge, no rehook) — clear stale rehook state.
  _rehookEdgeId = _rehookHoveredNodeId = _rehookHoveredPortKey = null;
}

// Expand group selection at dragStart so vis-network moves all members together.
// dragStart fires before the move, unlike selectNode which fires after mouseup.
function onDragStart(params) {
  if (!params.nodes.length) return;
  // Track dragged anchors so the port-dot overlay activates during the drag.
  _draggingAnchorIds.clear();
  for (const id of params.nodes) {
    const n = st.nodes && st.nodes.get(id);
    if (n && n.shapeType === 'anchor') _draggingAnchorIds.add(id);
  }
  const expanded = expandSelectionToGroup(params.nodes);
  if (expanded.length > params.nodes.length) {
    st.network.selectNodes(expanded);
    st.selectedNodeIds = expanded;
  }
}

let _expandingGroup = false;
let _addingEdgesToSelection = false;
function onSelectNode(params) {
  if (_expandingGroup || _addingEdgesToSelection) return;
  // Filter out anchor nodes — they have no formatting panel.
  const nonAnchors = params.nodes.filter((id) => { const n = st.nodes.get(id); return !(n && n.shapeType === 'anchor'); });
  // Drop locked nodes: they are non-interactive until unlocked via long-press.
  const usable = nonAnchors.filter((id) => { const n = st.nodes.get(id); return n && !n.locked; });
  if (usable.length !== nonAnchors.length) {
    _addingEdgesToSelection = true;
    const anchorIds = params.nodes.filter((id) => { const n = st.nodes.get(id); return n && n.shapeType === 'anchor'; });
    st.network.setSelection({ nodes: [...usable, ...anchorIds], edges: st.network.getSelectedEdges() });
    _addingEdgesToSelection = false;
  }
  if (!usable.length) {
    const anchorIds = params.nodes.filter((id) => { const n = st.nodes.get(id); return n && n.shapeType === 'anchor'; });
    if (anchorIds.length) {
      // Only anchors selected (individual endpoint drag) — keep selection but no panel.
      st.selectedNodeIds = anchorIds;
      st.selectedEdgeIds = [];
      hideEdgePanel();
      return;
    }
    st.selectedNodeIds = [];
    st.selectedEdgeIds = [];
    hideNodePanel();
    hideEdgePanel();
    return;
  }
  const expanded = expandSelectionToGroup(usable).filter((id) => { const n = st.nodes.get(id); return n && !n.locked; });
  if (expanded.length > usable.length) {
    _expandingGroup = true;
    st.network.selectNodes(expanded);
    _expandingGroup = false;
    st.selectedNodeIds = expanded;
  } else {
    st.selectedNodeIds = usable;
  }
  // Include all edges (regular or free-arrow) whose both endpoints are in the selection.
  // This makes rubber-band select and multi-select automatically include connected edges.
  // Exclude locked edges — they are non-interactive.
  const selectedSet = new Set(st.selectedNodeIds);
  st.selectedEdgeIds = st.edges.get().filter((e) => {
    if (!selectedSet.has(e.from) || !selectedSet.has(e.to)) return false;
    const fromN = st.nodes.get(e.from);
    const toN   = st.nodes.get(e.to);
    const isFreeArrow = fromN && fromN.shapeType === 'anchor' && toN && toN.shapeType === 'anchor';
    return isFreeArrow ? !(fromN.locked && toN.locked) : !e.edgeLocked;
  }).map((e) => e.id);
  // Tell vis-network to visually highlight the free-arrow edges.
  // Use a guard to prevent the resulting selectNode event from re-entering.
  if (st.selectedEdgeIds.length > 0) {
    _addingEdgesToSelection = true;
    st.network.setSelection({ nodes: st.network.getSelectedNodes(), edges: st.selectedEdgeIds });
    _addingEdgesToSelection = false;
  }
  hideEdgePanel();
  showNodePanel();
}

function onSelectEdge(params) {
  if (st.selectedNodeIds.length > 0) return; // node takes priority

  // Drop locked edges (edgeLocked or free-arrow with both anchors locked).
  const usable = params.edges.filter((id) => {
    const e = st.edges.get(id);
    if (!e) return false;
    const fromN = st.nodes.get(e.from);
    const toN   = st.nodes.get(e.to);
    const isFreeArrow = fromN && fromN.shapeType === 'anchor' && toN && toN.shapeType === 'anchor';
    return isFreeArrow ? !(fromN.locked && toN.locked) : !e.edgeLocked;
  });
  if (usable.length !== params.edges.length) {
    st.network.setSelection({ nodes: st.network.getSelectedNodes(), edges: usable });
  }
  if (!usable.length) {
    st.selectedEdgeIds = [];
    hideEdgePanel();
    return;
  }
  st.selectedEdgeIds = usable;
  // Activate rehook mode for any edge with at least one non-anchor endpoint.
  const singleEdge = usable.length === 1 ? st.edges.get(usable[0]) : null;
  _rehookEdgeId = isRehookable(singleEdge) ? singleEdge.id : null;
  _rehookHoveredNodeId = _rehookHoveredPortKey = null;

  // For free arrows (anchor→anchor edges), also select both endpoint anchors
  // so the user can drag the whole arrow as a unit via multi-node drag.
  const freeAnchors = [];
  for (const edgeId of usable) {
    const e = st.edges.get(edgeId);
    if (!e) continue;
    const fromN = st.nodes.get(e.from);
    const toN   = st.nodes.get(e.to);
    if (fromN && fromN.shapeType === 'anchor' && toN && toN.shapeType === 'anchor') {
      freeAnchors.push(e.from, e.to);
    }
  }
  if (freeAnchors.length) {
    st.network.setSelection({ nodes: freeAnchors, edges: usable });
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
  // Rehook state is intentionally NOT cleared here: vis-network fires deselectEdge
  // before the click event when the user clicks a port dot on a node, so clearing
  // here would destroy the state that onClickNode needs to process the rehook.
  // The mousemove handler clears it naturally once the edge is no longer selected.
  hideNodePanel();
  hideEdgePanel();
  commitLabelEdit();
  hideLabelInput();
  hideSelectionOverlay();
}
