// ── Connection ports (attachment points) ──────────────────────────────────────
// Each node exposes 8 attachment points: N, NE, E, SE, S, SW, W, NW.
// Port edges bypass vis-network's centre-to-centre rendering with custom bezier
// curves rooted at the chosen port positions.
//
// Backwards-compatible: edges without fromPort/toPort continue to use
// vis-network's native rendering unchanged.

import { st } from './state.js';
import { SHAPE_DEFAULTS } from './node-rendering.js';

export const PORT_KEYS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

const SQRT2_INV = 1 / Math.sqrt(2);

// Offset fraction [ox, oy] from node centre, in units of half-width / half-height.
// Rectangular shapes: corners reach [±1, ±1], mid-sides [0, ±1] or [±1, 0].
const PORT_OFFSETS_RECT = {
  N:  [ 0,  -1], NE: [ 1,  -1], E:  [ 1,   0], SE: [ 1,   1],
  S:  [ 0,   1], SW: [-1,   1], W:  [-1,   0], NW: [-1,  -1],
};

// Circular / elliptical shapes: all points lie on the circumference.
const PORT_OFFSETS_CIRC = {
  N:  [ 0,            -1          ], NE: [ SQRT2_INV,  -SQRT2_INV ],
  E:  [ 1,             0          ], SE: [ SQRT2_INV,   SQRT2_INV ],
  S:  [ 0,             1          ], SW: [-SQRT2_INV,   SQRT2_INV ],
  W:  [-1,             0          ], NW: [-SQRT2_INV,  -SQRT2_INV ],
};

// Outward-pointing unit normals used to compute bezier control points.
const PORT_NORMALS = {
  N:  [ 0,            -1          ], NE: [ SQRT2_INV,  -SQRT2_INV ],
  E:  [ 1,             0          ], SE: [ SQRT2_INV,   SQRT2_INV ],
  S:  [ 0,             1          ], SW: [-SQRT2_INV,   SQRT2_INV ],
  W:  [-1,             0          ], NW: [-SQRT2_INV,  -SQRT2_INV ],
};

const CIRCULAR_SHAPES = new Set(['circle', 'ellipse']);

// ── Geometry helpers ──────────────────────────────────────────────────────────

function nodeGeometry(nodeId) {
  const n = st.nodes && st.nodes.get(nodeId);
  if (!n) return null;
  const pos = st.network && st.network.getPositions([nodeId])[nodeId];
  if (!pos) return null;
  const shapeType = n.shapeType || 'box';
  const defaults  = SHAPE_DEFAULTS[shapeType] || [100, 40];
  const W = n.nodeWidth  || defaults[0];
  const H = CIRCULAR_SHAPES.has(shapeType) ? W : (n.nodeHeight || defaults[1]);
  return { cx: pos.x, cy: pos.y, W, H, rotation: n.rotation || 0, shapeType };
}

/** Returns the world-space {x, y} of a port on a node. */
export function getPortPosition(nodeId, portKey) {
  const geo = nodeGeometry(nodeId);
  if (!geo) return null;
  const { cx, cy, W, H, rotation, shapeType } = geo;
  const offsets = CIRCULAR_SHAPES.has(shapeType) ? PORT_OFFSETS_CIRC : PORT_OFFSETS_RECT;
  const [ox, oy] = offsets[portKey] || [0, 0];
  let dx = ox * W / 2;
  let dy = oy * H / 2;
  if (rotation) {
    const cos = Math.cos(rotation), sin = Math.sin(rotation);
    [dx, dy] = [dx * cos - dy * sin, dx * sin + dy * cos];
  }
  return { x: cx + dx, y: cy + dy };
}

/** Returns the port key whose position is closest to `canvasPos` (world coords). */
export function getNearestPort(nodeId, canvasPos) {
  let minD2 = Infinity, nearest = 'N';
  for (const key of PORT_KEYS) {
    const p = getPortPosition(nodeId, key);
    if (!p) continue;
    const d2 = (canvasPos.x - p.x) ** 2 + (canvasPos.y - p.y) ** 2;
    if (d2 < minD2) { minD2 = d2; nearest = key; }
  }
  return nearest;
}

// ── Port dot visualisation ────────────────────────────────────────────────────

/**
 * Draws 8 port hint dots for `nodeId` in the vis-network afterDrawing context.
 * `highlightedPort` (if any) is rendered larger and fully orange.
 */
export function drawPortDots(ctx, nodeId, highlightedPort) {
  for (const key of PORT_KEYS) {
    const p = getPortPosition(nodeId, key);
    if (!p) continue;
    const hl = key === highlightedPort;
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, hl ? 6 : 4, 0, Math.PI * 2);
    ctx.fillStyle   = hl ? '#f97316' : 'rgba(249,115,22,0.45)';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth   = 1.5;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Custom edge rendering ─────────────────────────────────────────────────────

function bezierAt(p0, cp1, cp2, p3, t) {
  const mt = 1 - t;
  return {
    x: mt ** 3 * p0.x + 3 * mt ** 2 * t * cp1.x + 3 * mt * t ** 2 * cp2.x + t ** 3 * p3.x,
    y: mt ** 3 * p0.y + 3 * mt ** 2 * t * cp1.y + 3 * mt * t ** 2 * cp2.y + t ** 3 * p3.y,
  };
}

function drawArrowhead(ctx, x, y, angle, size) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-size * 1.6, -size * 0.55);
  ctx.lineTo(-size * 1.6,  size * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function centerPos(nodeId) {
  const p = st.network && st.network.getPositions([nodeId])[nodeId];
  return p || null;
}

function isAnchorNode(nodeId) {
  const n = st.nodes && st.nodes.get(nodeId);
  return !!(n && n.shapeType === 'anchor');
}

/**
 * Draws a port-anchored edge on the vis-network canvas context (world coordinates).
 * Called from the _drawNodes patch instead of vis-network's native e.draw(ctx).
 *
 * Handles:
 *  - Bezier curve (when both ports are set and not in straight mode)
 *  - Straight line fallback
 *  - Arrowheads (to / both / none)
 *  - Dashes
 *  - Label (rotated or plain) at the curve midpoint
 */
export function drawPortEdge(ctx, edgeData) {
  const fromIsAnchor = isAnchorNode(edgeData.from);
  const toIsAnchor   = isAnchorNode(edgeData.to);

  const fromPos = (edgeData.fromPort && !fromIsAnchor)
    ? getPortPosition(edgeData.from, edgeData.fromPort)
    : centerPos(edgeData.from);
  const toPos = (edgeData.toPort && !toIsAnchor)
    ? getPortPosition(edgeData.to, edgeData.toPort)
    : centerPos(edgeData.to);

  if (!fromPos || !toPos) return;

  const selected  = st.selectedEdgeIds && st.selectedEdgeIds.includes(edgeData.id);
  const baseColor = edgeData.edgeColor || '#a8a29e';
  const color     = selected ? '#f97316' : baseColor;
  const lw        = selected ? Math.max(2.5, (edgeData.edgeWidth || 1.5) + 1) : (edgeData.edgeWidth || 1.5);
  const arrSz     = lw * 5;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle   = color;
  ctx.lineWidth   = lw;
  if (edgeData.dashes) ctx.setLineDash([6, 4]);

  // Bezier control points: only when both endpoints are real ports and not in straight mode.
  let cp1, cp2;
  const useBezier =
    !st.edgesStraight &&
    edgeData.fromPort && !fromIsAnchor &&
    edgeData.toPort   && !toIsAnchor;

  if (useBezier) {
    const dist    = Math.hypot(toPos.x - fromPos.x, toPos.y - fromPos.y);
    const tension = Math.max(60, dist * 0.4);
    const fn = PORT_NORMALS[edgeData.fromPort];
    const tn = PORT_NORMALS[edgeData.toPort];
    cp1 = { x: fromPos.x + fn[0] * tension, y: fromPos.y + fn[1] * tension };
    cp2 = { x: toPos.x   + tn[0] * tension, y: toPos.y   + tn[1] * tension };
  }

  // ── Path ──────────────────────────────────────────────────────────────────
  ctx.beginPath();
  ctx.moveTo(fromPos.x, fromPos.y);
  if (cp1 && cp2) ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, toPos.x, toPos.y);
  else            ctx.lineTo(toPos.x, toPos.y);
  ctx.stroke();

  // ── Arrowheads ─────────────────────────────────────────────────────────────
  const arrowDir = edgeData.arrowDir ?? 'to';
  const drawTo   = arrowDir === 'to'   || arrowDir === 'both';
  const drawFrom = arrowDir === 'both';

  if (drawTo) {
    const a = cp2
      ? Math.atan2(toPos.y - cp2.y, toPos.x - cp2.x)
      : Math.atan2(toPos.y - fromPos.y, toPos.x - fromPos.x);
    drawArrowhead(ctx, toPos.x, toPos.y, a, arrSz);
  }
  if (drawFrom) {
    const a = cp1
      ? Math.atan2(fromPos.y - cp1.y, fromPos.x - cp1.x)
      : Math.atan2(fromPos.y - toPos.y, fromPos.x - toPos.x);
    drawArrowhead(ctx, fromPos.x, fromPos.y, a, arrSz);
  }

  // ── Label ─────────────────────────────────────────────────────────────────
  if (edgeData.label) {
    const mid = (cp1 && cp2)
      ? bezierAt(fromPos, cp1, cp2, toPos, 0.5)
      : { x: (fromPos.x + toPos.x) / 2, y: (fromPos.y + toPos.y) / 2 };
    ctx.save();
    ctx.translate(mid.x, mid.y);
    if (edgeData.labelRotation && Math.abs(edgeData.labelRotation) > 0.001) {
      ctx.rotate(edgeData.labelRotation);
    }
    ctx.font         = `${edgeData.fontSize || 11}px system-ui,-apple-system,sans-serif`;
    ctx.fillStyle    = '#6b7280';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(edgeData.label, 0, 0);
    ctx.restore();
  }

  ctx.setLineDash([]);
  ctx.restore();
}

// ── Hit detection ─────────────────────────────────────────────────────────────

/**
 * Returns the minimum distance (world units) from point `p` to the visual path
 * of a port edge — matching the bezier geometry used by drawPortEdge exactly.
 */
export function distanceToPortEdge(edgeData, p) {
  const fromIsAnch = isAnchorNode(edgeData.from);
  const toIsAnch   = isAnchorNode(edgeData.to);
  const fromPos = (edgeData.fromPort && !fromIsAnch)
    ? getPortPosition(edgeData.from, edgeData.fromPort) : centerPos(edgeData.from);
  const toPos = (edgeData.toPort && !toIsAnch)
    ? getPortPosition(edgeData.to, edgeData.toPort) : centerPos(edgeData.to);
  if (!fromPos || !toPos) return Infinity;

  if (!st.edgesStraight && edgeData.fromPort && !fromIsAnch && edgeData.toPort && !toIsAnch) {
    const dist    = Math.hypot(toPos.x - fromPos.x, toPos.y - fromPos.y);
    const tension = Math.max(60, dist * 0.4);
    const fn = PORT_NORMALS[edgeData.fromPort];
    const tn = PORT_NORMALS[edgeData.toPort];
    const cp1 = { x: fromPos.x + fn[0] * tension, y: fromPos.y + fn[1] * tension };
    const cp2 = { x: toPos.x   + tn[0] * tension, y: toPos.y   + tn[1] * tension };
    return _distToBezier(p, fromPos, cp1, cp2, toPos);
  }
  return _distToSegment(p, fromPos, toPos);
}

function _distToBezier(p, p0, cp1, cp2, p3, samples = 24) {
  let minD = Infinity;
  for (let i = 0; i <= samples; i++) {
    const pt = bezierAt(p0, cp1, cp2, p3, i / samples);
    const d  = Math.hypot(p.x - pt.x, p.y - pt.y);
    if (d < minD) minD = d;
  }
  return minD;
}

function _distToSegment(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

