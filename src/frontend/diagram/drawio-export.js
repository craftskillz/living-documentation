// ── drawio (mxGraph) XML export ───────────────────────────────────────────────
// Serialises the current diagram into a self-contained .drawio file.
//
// Mapping conventions:
//  - vis-network coordinates are (cx, cy) centred; drawio uses top-left corner.
//  - vis-network rotation is in radians; drawio uses degrees.
//  - Port keys (N/NE/E/SE/S/SW/W/NW or custom anchor ids) become drawio
//    exitX/exitY/entryX/entryY normalised from the node's top-left (0..1).
//  - Free arrows (edges between two `shapeType: 'anchor'` pseudo-nodes) are
//    emitted as drawio floating edges with explicit sourcePoint/targetPoint and
//    no source/target attributes; the anchor pseudo-nodes themselves are dropped.
//  - imageSrc paths (e.g. /images/foo.png) are inlined as data URIs at export
//    time so the resulting file is self-contained outside the server.

import { st } from './state.js';
import { NODE_COLORS } from './constants.js';
import { SHAPE_DEFAULTS } from './node-rendering.js';
import {
  CUSTOM_SHAPE_TYPE,
  getCustomShapeDefinition,
  getCustomShapeAnchors,
  getCustomShapeLabelPlacement,
} from './custom-shapes.js';
import { showToast } from './toast.js';
import { t } from './t.js';

const DRAWIO_ROOT_PARENT = '1';
const DRAWIO_LAYER = '1';
const ANCHOR_SHAPE = 'anchor';

// ── Public entry point ────────────────────────────────────────────────────────

export async function exportCurrentDiagramAsDrawio() {
  if (!st.network || !st.nodes || !st.edges) return;
  try {
    const data = snapshotCurrentDiagram();
    const imageMap = await buildImageMap(data);
    const { xml, droppedLabelRotations } = diagramToDrawioXml(data, imageMap);
    triggerDownload(xml, sanitiseFilename(data.title) + '.drawio');
    showToast(t('diagram.toast.drawio_exported'));
    if (droppedLabelRotations > 0) {
      showToast(t('diagram.toast.drawio_label_rotation_dropped').replace('{count}', droppedLabelRotations));
    }
  } catch (err) {
    console.error('[drawio-export]', err);
    showToast(t('diagram.toast.drawio_export_error') + (err && err.message ? ': ' + err.message : ''));
  }
}

// ── Snapshot current diagram (same shape as persistence.saveDiagram) ──────────

function snapshotCurrentDiagram() {
  const positions = st.network.getPositions();
  const nodes = (st.canonicalOrder || [])
    .map((id) => st.nodes.get(id))
    .filter(Boolean)
    .map((n) => ({ ...n, x: positions[n.id]?.x ?? n.x, y: positions[n.id]?.y ?? n.y }));
  const edges = st.edges.get().map((e) => ({ ...e }));
  const titleEl = document.getElementById('diagramTitle');
  const title = (titleEl && titleEl.value) || t('diagram.toast.untitled');
  return { title, nodes, edges, edgesStraight: !!st.edgesStraight };
}

// ── Inline images as data URIs ────────────────────────────────────────────────

async function buildImageMap({ nodes }) {
  const urls = new Set();
  for (const n of nodes) {
    if (n.imageSrc) urls.add(n.imageSrc);
    if (n.shapeType === CUSTOM_SHAPE_TYPE) {
      const def = getCustomShapeDefinition(n.customShapeId);
      if (def && def.imageSrc) urls.add(def.imageSrc);
    }
  }
  const map = new Map();
  await Promise.all([...urls].map(async (url) => {
    if (/^data:/i.test(url)) { map.set(url, url); return; }
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const blob = await res.blob();
      const dataUri = await blobToDataUri(blob);
      map.set(url, dataUri);
    } catch (_err) {
      // Fallback: keep the original URL (will work only if server is reachable when drawio opens).
      map.set(url, url);
    }
  }));
  return map;
}

function blobToDataUri(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('FileReader failed'));
    reader.readAsDataURL(blob);
  });
}

// ── XML generation ────────────────────────────────────────────────────────────

function diagramToDrawioXml(data, imageMap) {
  const counters = { droppedLabelRotations: 0 };
  const idMap = new Map();
  let nextId = 2; // 0 and 1 are reserved for drawio root + layer
  for (const n of data.nodes) {
    if (n.shapeType === ANCHOR_SHAPE) continue;
    idMap.set(n.id, String(nextId++));
  }

  // Group containers: one drawio cell per unique groupId, hosting its members.
  const groups = buildGroups(data.nodes);
  for (const g of groups.values()) {
    g.cellId = String(nextId++);
  }

  const cells = [];
  cells.push(`<mxCell id="0"/>`);
  cells.push(`<mxCell id="${DRAWIO_LAYER}" parent="0"/>`);

  // Group container cells (placed before their children so they're behind in z-order).
  for (const g of groups.values()) {
    cells.push(
      `<mxCell id="${g.cellId}" value="" style="group;" vertex="1" connectable="0" parent="${DRAWIO_LAYER}">` +
      `<mxGeometry x="${num(g.minX)}" y="${num(g.minY)}" width="${num(g.maxX - g.minX)}" height="${num(g.maxY - g.minY)}" as="geometry"/>` +
      `</mxCell>`
    );
  }

  // Nodes (in canonical z-order, oldest first).
  for (const n of data.nodes) {
    if (n.shapeType === ANCHOR_SHAPE) continue;
    cells.push(nodeToCell(n, idMap, groups, imageMap, counters));
  }

  // Edges.
  for (const e of data.edges) {
    cells.push(edgeToCell(e, data, idMap, data.edgesStraight));
  }

  const diagramId = 'd' + Math.random().toString(36).slice(2, 12);
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<mxfile host="living-documentation" type="device">` +
    `<diagram id="${diagramId}" name="${xmlAttr(data.title)}">` +
    `<mxGraphModel dx="1422" dy="757" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1169" pageHeight="826" math="0" shadow="0">` +
    `<root>${cells.join('')}</root>` +
    `</mxGraphModel></diagram></mxfile>`;

  return { xml, droppedLabelRotations: counters.droppedLabelRotations };
}

// ── Groups ────────────────────────────────────────────────────────────────────

function buildGroups(nodes) {
  const map = new Map();
  for (const n of nodes) {
    if (!n.groupId || n.shapeType === ANCHOR_SHAPE) continue;
    const { W, H } = nodeSize(n);
    const left = n.x - W / 2, top = n.y - H / 2;
    const right = left + W, bottom = top + H;
    const g = map.get(n.groupId) || { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity, memberIds: [] };
    g.minX = Math.min(g.minX, left);
    g.minY = Math.min(g.minY, top);
    g.maxX = Math.max(g.maxX, right);
    g.maxY = Math.max(g.maxY, bottom);
    g.memberIds.push(n.id);
    map.set(n.groupId, g);
  }
  return map;
}

// ── Node → cell ───────────────────────────────────────────────────────────────

function nodeToCell(n, idMap, groups, imageMap, counters) {
  const id = idMap.get(n.id);
  const { W, H } = nodeSize(n);
  const group = n.groupId && groups.get(n.groupId);
  const parent = group ? group.cellId : DRAWIO_LAYER;
  // drawio coords: top-left, relative to parent (group container or root layer).
  const absX = n.x - W / 2;
  const absY = n.y - H / 2;
  const x = group ? absX - group.minX : absX;
  const y = group ? absY - group.minY : absY;

  const style = nodeStyle(n, imageMap, counters);
  const label = n.label || '';
  const hasMeta = hasLdMetadata(n);

  const geom = `<mxGeometry x="${num(x)}" y="${num(y)}" width="${num(W)}" height="${num(H)}" as="geometry"/>`;

  if (hasMeta) {
    const attrs = ldAttributes(n);
    return (
      `<UserObject id="${id}" label="${xmlAttr(label)}"${attrs}>` +
      `<mxCell style="${xmlAttr(style)}" vertex="1" parent="${parent}">${geom}</mxCell>` +
      `</UserObject>`
    );
  }
  return (
    `<mxCell id="${id}" value="${xmlAttr(label)}" style="${xmlAttr(style)}" vertex="1" parent="${parent}">${geom}</mxCell>`
  );
}

function nodeSize(n) {
  const defaults = SHAPE_DEFAULTS[n.shapeType] || [100, 40];
  const W = n.nodeWidth || defaults[0];
  const H = n.shapeType === 'circle' ? W : (n.nodeHeight || defaults[1]);
  return { W, H };
}

function nodeStyle(n, imageMap, counters) {
  const parts = [];
  const colors = NODE_COLORS[n.colorKey] || NODE_COLORS['c-gray'];
  let suppressFill = false;

  switch (n.shapeType) {
    case 'box':
      // default rounded rectangle in drawio looks closer to ours with rounded=0.
      parts.push('rounded=0', 'whiteSpace=wrap', 'html=1');
      break;
    case 'ellipse':
      parts.push('ellipse', 'whiteSpace=wrap', 'html=1');
      break;
    case 'circle':
      parts.push('ellipse', 'whiteSpace=wrap', 'html=1');
      break;
    case 'database':
      parts.push('shape=cylinder3', 'whiteSpace=wrap', 'html=1', 'boundedLbl=1', 'backgroundOutline=1', 'size=15');
      break;
    case 'actor':
      parts.push('shape=actor', 'whiteSpace=wrap', 'html=1');
      break;
    case 'post-it':
      parts.push('shape=note', 'whiteSpace=wrap', 'html=1', 'size=12');
      break;
    case 'text-free':
      parts.push('text', 'html=1', 'strokeColor=none', 'fillColor=none', 'whiteSpace=wrap');
      suppressFill = true;
      break;
    case 'image': {
      const src = n.imageSrc && imageMap.get(n.imageSrc);
      if (src) parts.push('shape=image', 'imageAspect=0', 'image=' + drawioImageValue(src));
      else      parts.push('rounded=0', 'whiteSpace=wrap', 'html=1');
      suppressFill = true;
      break;
    }
    case CUSTOM_SHAPE_TYPE: {
      const def = getCustomShapeDefinition(n.customShapeId);
      const src = def && def.imageSrc && imageMap.get(def.imageSrc);
      if (src) parts.push('shape=image', 'imageAspect=0', 'image=' + drawioImageValue(src));
      else      parts.push('rounded=0', 'whiteSpace=wrap', 'html=1');
      suppressFill = true;
      applyCustomShapeLabelPlacement(n, parts);
      break;
    }
    default:
      parts.push('rounded=0', 'whiteSpace=wrap', 'html=1');
  }

  if (!suppressFill) {
    parts.push(`fillColor=${colors.bg}`, `strokeColor=${colors.border}`, `fontColor=${colors.font}`);
  } else if (n.shapeType === 'text-free') {
    parts.push(`fontColor=${colors.font}`);
  }

  if (typeof n.bgOpacity === 'number' && n.bgOpacity !== 1) {
    parts.push(`opacity=${Math.round(n.bgOpacity * 100)}`);
  }
  if (n.fontSize) parts.push(`fontSize=${n.fontSize}`);
  if (n.textAlign && !parts.some((p) => p.startsWith('align='))) parts.push(`align=${n.textAlign}`);
  if (n.textValign && !parts.some((p) => p.startsWith('verticalAlign='))) parts.push(`verticalAlign=${n.textValign}`);
  if (n.rotation) parts.push(`rotation=${num(radToDeg(n.rotation))}`);

  // Arbitrage (b): labelRotation independent of rotation is dropped — count for the user toast.
  if (n.labelRotation && Math.abs((n.labelRotation || 0) - (n.rotation || 0)) > 1e-3) {
    counters.droppedLabelRotations++;
  }

  if (n.locked) parts.push('editable=0', 'movable=0', 'resizable=0', 'rotatable=0', 'deletable=0');

  return parts.join(';') + ';';
}

function applyCustomShapeLabelPlacement(n, parts) {
  const placement = n.labelPlacement || getCustomShapeLabelPlacement(n.customShapeId);
  switch (placement) {
    case 'above':
      parts.push('verticalLabelPosition=top', 'verticalAlign=bottom', 'labelPosition=center', 'align=center');
      break;
    case 'below':
      parts.push('verticalLabelPosition=bottom', 'verticalAlign=top', 'labelPosition=center', 'align=center');
      break;
    case 'left':
      parts.push('labelPosition=left', 'align=right', 'verticalLabelPosition=middle', 'verticalAlign=middle');
      break;
    case 'right':
      parts.push('labelPosition=right', 'align=left', 'verticalLabelPosition=middle', 'verticalAlign=middle');
      break;
    case 'center':
    default:
      parts.push('verticalLabelPosition=middle', 'verticalAlign=middle', 'labelPosition=center', 'align=center');
  }
}

// ── Edge → cell ───────────────────────────────────────────────────────────────

function edgeToCell(e, data, idMap, edgesStraight) {
  const fromNode = data.nodes.find((n) => n.id === e.from);
  const toNode   = data.nodes.find((n) => n.id === e.to);
  const fromIsAnchor = fromNode && fromNode.shapeType === ANCHOR_SHAPE;
  const toIsAnchor   = toNode   && toNode.shapeType   === ANCHOR_SHAPE;
  const isFreeArrow  = fromIsAnchor && toIsAnchor;

  const id = 'e' + e.id;
  const parts = ['edgeStyle=none', 'rounded=0', 'html=1', 'jettySize=auto', 'orthogonalLoop=1'];

  // Curved vs straight — drawio's `curved=1` enables Bezier; we accept the
  // cosmetic drift versus our custom port-normal control points.
  if (!edgesStraight) parts.push('curved=1');

  // Arrow direction.
  const dir = e.arrowDir || 'to';
  if (dir === 'to')        parts.push('endArrow=classic', 'startArrow=none');
  else if (dir === 'from') parts.push('endArrow=none', 'startArrow=classic');
  else if (dir === 'both') parts.push('endArrow=classic', 'startArrow=classic');
  else                     parts.push('endArrow=none', 'startArrow=none');

  if (e.dashes)    parts.push('dashed=1');
  if (e.edgeColor) parts.push(`strokeColor=${e.edgeColor}`);
  if (e.edgeWidth) parts.push(`strokeWidth=${e.edgeWidth}`);
  if (e.fontSize)  parts.push(`fontSize=${e.fontSize}`);
  if (e.edgeLocked) parts.push('editable=0', 'movable=0', 'deletable=0');

  // Port-anchored attachment (exit/entry normalised 0..1 from node top-left).
  if (e.fromPort && fromNode && !fromIsAnchor) {
    const p = portToEntryExit(fromNode, e.fromPort);
    if (p) parts.push(`exitX=${num(p.x)}`, `exitY=${num(p.y)}`, 'exitDx=0', 'exitDy=0', 'exitPerimeter=0');
  }
  if (e.toPort && toNode && !toIsAnchor) {
    const p = portToEntryExit(toNode, e.toPort);
    if (p) parts.push(`entryX=${num(p.x)}`, `entryY=${num(p.y)}`, 'entryDx=0', 'entryDy=0', 'entryPerimeter=0');
  }

  const style = parts.join(';') + ';';

  const sourceAttr = !isFreeArrow && fromNode ? ` source="${idMap.get(e.from)}"` : '';
  const targetAttr = !isFreeArrow && toNode   ? ` target="${idMap.get(e.to)}"`   : '';

  let geometryInner = '';
  if (isFreeArrow) {
    // Floating endpoints — use the anchor pseudo-node positions directly.
    geometryInner =
      `<mxPoint x="${num(fromNode.x)}" y="${num(fromNode.y)}" as="sourcePoint"/>` +
      `<mxPoint x="${num(toNode.x)}"   y="${num(toNode.y)}"   as="targetPoint"/>`;
  }
  const geometry = `<mxGeometry relative="1" as="geometry">${geometryInner}</mxGeometry>`;

  const value = e.label ? xmlAttr(e.label) : '';
  const edgeCell =
    `<mxCell id="${id}" value="${value}" style="${xmlAttr(style)}" edge="1" parent="${DRAWIO_LAYER}"${sourceAttr}${targetAttr}>` +
    geometry +
    `</mxCell>`;

  // Edge label child cell — only needed when we have a fixed wrap width, an
  // explicit offset, or a non-zero label rotation. Otherwise the label rides
  // on the parent edge directly (above).
  const needsChildLabel = !!(
    e.label &&
    (e.edgeLabelWidth || e.edgeLabelOffsetX || e.edgeLabelOffsetY ||
      (e.labelRotation && Math.abs(e.labelRotation) > 1e-3))
  );

  if (!needsChildLabel) return edgeCell;

  // When using a child label, clear the parent edge's value so it's not drawn twice.
  const edgeCellNoValue = edgeCell.replace(` value="${value}"`, ` value=""`);

  const labelStyleParts = ['edgeLabel', 'html=1', 'align=center', 'verticalAlign=middle', 'resizable=0', 'points=[]'];
  if (e.edgeLabelWidth) labelStyleParts.push('whiteSpace=wrap');
  if (e.labelRotation)   labelStyleParts.push(`rotation=${num(radToDeg(e.labelRotation))}`);
  const labelStyle = labelStyleParts.join(';') + ';';

  const labelWidth  = e.edgeLabelWidth || 0;
  const labelGeom =
    `<mxGeometry x="0" y="0" relative="1" as="geometry">` +
    `<mxPoint x="${num(e.edgeLabelOffsetX || 0)}" y="${num(e.edgeLabelOffsetY || 0)}" as="offset"/>` +
    (labelWidth ? `<mxRectangle width="${num(labelWidth)}" height="20" as="alternateBounds"/>` : '') +
    `</mxGeometry>`;

  const labelCell =
    `<mxCell id="${id}-lbl" value="${value}" style="${xmlAttr(labelStyle)}" vertex="1" connectable="0" parent="${id}">` +
    labelGeom +
    `</mxCell>`;

  return edgeCellNoValue + labelCell;
}

// ── Port → normalised entry/exit (0..1 from node top-left) ────────────────────

const RECT_PORT_EXIT = {
  N:  [0.5, 0  ], NE: [1,   0  ], E:  [1,   0.5], SE: [1,   1  ],
  S:  [0.5, 1  ], SW: [0,   1  ], W:  [0,   0.5], NW: [0,   0  ],
};
const SQRT2_INV = 1 / Math.sqrt(2);
const CIRC_PORT_EXIT = {
  N:  [0.5,             0                ],
  NE: [0.5 + SQRT2_INV / 2, 0.5 - SQRT2_INV / 2],
  E:  [1,               0.5              ],
  SE: [0.5 + SQRT2_INV / 2, 0.5 + SQRT2_INV / 2],
  S:  [0.5,             1                ],
  SW: [0.5 - SQRT2_INV / 2, 0.5 + SQRT2_INV / 2],
  W:  [0,               0.5              ],
  NW: [0.5 - SQRT2_INV / 2, 0.5 - SQRT2_INV / 2],
};
const DATABASE_PORT_EXIT = {
  N:  [0.5, 0   ], NE: [1,   0.12],
  E:  [1,   0.5 ], SE: [1,   0.88],
  S:  [0.5, 1   ], SW: [0,   0.88],
  W:  [0,   0.5 ], NW: [0,   0.12],
};

function portToEntryExit(node, portKey) {
  if (node.shapeType === CUSTOM_SHAPE_TYPE) {
    const anchor = getCustomShapeAnchors(node.customShapeId).find((a) => a.id === portKey);
    if (!anchor) return null;
    return { x: anchor.x, y: anchor.y };
  }
  const table =
    node.shapeType === 'database'  ? DATABASE_PORT_EXIT :
    (node.shapeType === 'ellipse' || node.shapeType === 'circle') ? CIRC_PORT_EXIT :
    RECT_PORT_EXIT;
  const xy = table[portKey];
  return xy ? { x: xy[0], y: xy[1] } : null;
}

// ── UserObject attributes for semantic metadata + link ────────────────────────

function hasLdMetadata(n) {
  return !!(n.nodeLink || n.description || n.kind || n.renderAs || (Array.isArray(n.evidence) && n.evidence.length));
}

function ldAttributes(n) {
  const out = [];
  if (n.nodeLink)    out.push(` link="${xmlAttr(n.nodeLink)}"`);
  if (n.description) out.push(` ld_description="${xmlAttr(n.description)}"`);
  if (n.kind)        out.push(` ld_kind="${xmlAttr(n.kind)}"`);
  if (n.renderAs)    out.push(` ld_renderAs="${xmlAttr(n.renderAs)}"`);
  if (Array.isArray(n.evidence) && n.evidence.length) {
    out.push(` ld_evidence="${xmlAttr(JSON.stringify(n.evidence))}"`);
  }
  return out.join('');
}

// ── Encoding helpers ──────────────────────────────────────────────────────────

function xmlAttr(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '&#10;')
    .replace(/\r/g, '&#13;');
}

function num(v) {
  if (!Number.isFinite(v)) return '0';
  return Math.abs(v - Math.round(v)) < 1e-6 ? String(Math.round(v)) : v.toFixed(3);
}

function radToDeg(rad) {
  return rad * 180 / Math.PI;
}

// drawio's style parser treats `;` as the property separator, which collides
// with the standard `data:image/png;base64,...` prefix. drawio accepts a
// comma-form (`data:image/png,base64,...`) as a workaround so the value can
// sit unescaped inside the style string.
function drawioImageValue(src) {
  return src.replace(/^data:([^;,]+);base64,/i, 'data:$1,base64,');
}

function sanitiseFilename(s) {
  return String(s || 'diagram').replace(/[^\w.\- ]+/g, '_').replace(/\s+/g, '_').slice(0, 80) || 'diagram';
}

function triggerDownload(content, filename) {
  const blob = new Blob([content], { type: 'application/xml;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
