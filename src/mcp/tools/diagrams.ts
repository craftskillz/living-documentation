import fs from 'fs';
import path from 'path';

interface StoredNode {
  id: string;
  label: string;
  shape: string;
  shapeType: string;
  colorKey: string;
  [key: string]: unknown;
}

interface StoredEdge {
  id: string;
  from: string;
  to?: string;
  label?: string;
  [key: string]: unknown;
}

interface StoredDiagram {
  id: string;
  title: string;
  nodes: StoredNode[];
  edges: StoredEdge[];
  edgesStraight?: boolean;
  gridEnabled?: boolean;
  alignGuides?: boolean;
}

type PortKey = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';
type ArrowDir = 'to' | 'from' | 'both' | 'none';

interface DiagramNodeInput {
  name: string;
  type?: string;
  kind?: string;
  renderAs?: string;
  description?: string;
  color?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fontSize?: number | null;
  textAlign?: string | null;
  textValign?: string | null;
  bgOpacity?: number | null;
  rotation?: number | null;
  labelRotation?: number | null;
  locked?: boolean;
  linkedDiagramId?: string;
  imageSrc?: string | null;
  groupId?: string | null;
  nodeLink?: { type?: unknown; value?: unknown } | null;
  evidence?: EvidenceInput[];
}

interface DiagramEdgeInput {
  from: string;
  to?: string;
  label?: string;
  arrowDir?: string;
  dashes?: boolean;
  fontSize?: number | null;
  labelRotation?: number | null;
  edgeLabelOffsetX?: number | null;
  edgeLabelOffsetY?: number | null;
  fromPort?: string | null;
  toPort?: string | null;
  edgeColor?: string | null;
  edgeWidth?: number | null;
  edgeLocked?: boolean;
  edgeLabelWidth?: number | null;
  evidence?: EvidenceInput[];
}

interface EvidenceInput {
  documentId?: unknown;
  section?: unknown;
  summary?: unknown;
}

const VALID_PORTS = new Set<PortKey>(['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']);
const VALID_ARROW_DIRS = new Set<ArrowDir>(['to', 'from', 'both', 'none']);

const KIND_DEFAULTS: Record<string, { renderAs: string; color: string; labelType: string }> = {
  person:          { renderAs: 'actor',    color: 'c-gray',   labelType: 'Person' },
  software_system: { renderAs: 'box',      color: 'c-blue',   labelType: 'Software System' },
  external_system: { renderAs: 'box',      color: 'c-slate',  labelType: 'External System' },
  container:       { renderAs: 'box',      color: 'c-sky',    labelType: 'Container' },
  component:       { renderAs: 'box',      color: 'c-indigo', labelType: 'Component' },
  database:        { renderAs: 'database', color: 'c-teal',   labelType: 'Database' },
  object_storage:  { renderAs: 'database', color: 'c-teal',   labelType: 'Object Storage' },
  queue:           { renderAs: 'ellipse',  color: 'c-amber',  labelType: 'Queue' },
  device:          { renderAs: 'box',      color: 'c-sky',    labelType: 'Device' },
  api:             { renderAs: 'box',      color: 'c-cyan',   labelType: 'API' },
  cloud_service:   { renderAs: 'box',      color: 'c-slate',  labelType: 'Cloud Service' },
  browser_app:     { renderAs: 'box',      color: 'c-sky',    labelType: 'Browser App' },
  mobile_app:      { renderAs: 'box',      color: 'c-sky',    labelType: 'Mobile App' },
  backend_service: { renderAs: 'box',      color: 'c-sky',    labelType: 'Backend Service' },
  job:             { renderAs: 'box',      color: 'c-amber',  labelType: 'Job' },
  unknown:         { renderAs: 'box',      color: 'c-gray',   labelType: 'Unknown' },
};

const NODE_STYLE_KEYS = [
  'kind',
  'renderAs',
  'description',
  'evidence',
  'fontSize',
  'textAlign',
  'textValign',
  'bgOpacity',
  'rotation',
  'labelRotation',
  'imageSrc',
  'groupId',
  'nodeLink',
  'locked',
] as const;

const EDGE_STYLE_KEYS = [
  'arrowDir',
  'dashes',
  'fontSize',
  'labelRotation',
  'edgeLabelOffsetX',
  'edgeLabelOffsetY',
  'fromPort',
  'toPort',
  'edgeColor',
  'edgeWidth',
  'edgeLocked',
  'edgeLabelWidth',
  'evidence',
] as const;

// Estimates node dimensions from label content (font ~13px, lineH ~17px, pad 16px).
// Used to size MCP-created nodes so multiline labels are not clipped.
function estimateNodeSize(label: string, shapeType: string): { nodeWidth: number; nodeHeight: number } {
  const FONT_PX = 13;
  const LINE_H  = Math.round(FONT_PX * 1.3);  // ~17
  const H_PAD   = 24;  // top + bottom padding
  const W_PAD   = 24;  // left + right padding
  const CHAR_W  = 7.5; // approximate px per character at 13px system-ui

  // Actor shape has a fixed aspect ratio — never resize it.
  if (shapeType === 'actor') return { nodeWidth: 30, nodeHeight: 52 };

  const lines      = label.split('\n');
  const lineCount  = lines.length;
  const maxChars   = Math.max(...lines.map(l => l.length));

  const rawW = Math.max(120, Math.round(maxChars * CHAR_W) + W_PAD);
  const rawH = Math.max(40,  lineCount * LINE_H + H_PAD);

  // Round to nearest 8px for a tidier look
  const nodeWidth = Math.round(rawW / 8) * 8;

  // Database caps consume ≈ H×0.12 at each end (ry = max(H×0.12, 6) in node-rendering.js).
  // Divide by 0.76 so the body area fits the required text height.
  const rawHFinal = shapeType === 'database' ? rawH / (1 - 0.24) : rawH;
  const nodeHeight = Math.round(rawHFinal / 8) * 8;

  return { nodeWidth, nodeHeight };
}

function estimateEdgeLabelWidth(label: string): number {
  if (label.length <= 24) return 80;
  if (label.length <= 36) return 95;
  return 105;
}

function estimateEdgeFontSize(label: string): number {
  return label.length > 36 ? 11 : 12;
}

function normalizeArrowDir(raw: string | undefined): ArrowDir {
  if (!raw) return 'to';
  const dir = raw.toLowerCase();
  if (!VALID_ARROW_DIRS.has(dir as ArrowDir)) {
    throw new Error(`Invalid arrowDir "${raw}". Allowed: to, from, both, none.`);
  }
  return dir as ArrowDir;
}

function normalizePort(raw: string | null | undefined, fieldName: string): PortKey | null | undefined {
  if (raw === null) return null;
  if (raw === undefined) return undefined;
  const port = raw.toUpperCase();
  if (!VALID_PORTS.has(port as PortKey)) {
    throw new Error(`Invalid ${fieldName} "${raw}". Allowed: ${Array.from(VALID_PORTS).join(', ')}.`);
  }
  return port as PortKey;
}

function numberOrNull(value: number | null | undefined, fallback: number | null): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function stringOrNull(value: string | null | undefined): string | null {
  return typeof value === 'string' ? value : null;
}

function normalizeEvidence(raw: EvidenceInput[] | undefined): Array<{ documentId: string; section: string | null; summary: string | null }> | null {
  if (raw === undefined) return null;
  if (!Array.isArray(raw)) throw new Error('evidence must be an array when provided.');
  return raw
    .map((item, index) => {
      if (!item || typeof item !== 'object') {
        throw new Error(`evidence[${index}] must be an object.`);
      }
      if (typeof item.documentId !== 'string' || !item.documentId.trim()) {
        throw new Error(`evidence[${index}].documentId is required and must be a non-empty string.`);
      }
      return {
        documentId: item.documentId,
        section: typeof item.section === 'string' && item.section.trim() ? item.section : null,
        summary: typeof item.summary === 'string' && item.summary.trim() ? item.summary : null,
      };
    });
}

function hasEvidence(items: Array<Record<string, unknown>>): boolean {
  return items.some(item => Array.isArray(item.evidence) && item.evidence.length > 0);
}

function resolveNodeLink(n: DiagramNodeInput): { type: string; value: string } | null {
  if (n.linkedDiagramId) return { type: 'diagram', value: n.linkedDiagramId };
  if (
    n.nodeLink &&
    typeof n.nodeLink.type === 'string' &&
    typeof n.nodeLink.value === 'string'
  ) {
    return { type: n.nodeLink.type, value: n.nodeLink.value };
  }
  return null;
}

function inferPorts(fromNode: StoredNode, toNode: StoredNode | undefined): { fromPort: PortKey; toPort: PortKey | null } {
  if (!toNode) return { fromPort: 'E', toPort: null };

  const fromX = typeof fromNode.x === 'number' ? fromNode.x : undefined;
  const fromY = typeof fromNode.y === 'number' ? fromNode.y : undefined;
  const toX = typeof toNode.x === 'number' ? toNode.x : undefined;
  const toY = typeof toNode.y === 'number' ? toNode.y : undefined;

  if (fromX === undefined || fromY === undefined || toX === undefined || toY === undefined) {
    return { fromPort: 'E', toPort: 'W' };
  }

  const dx = toX - fromX;
  const dy = toY - fromY;
  if (Math.abs(dx) >= Math.abs(dy) && dx !== 0) {
    return dx > 0 ? { fromPort: 'E', toPort: 'W' } : { fromPort: 'W', toPort: 'E' };
  }
  if (dy !== 0) {
    return dy > 0 ? { fromPort: 'S', toPort: 'N' } : { fromPort: 'N', toPort: 'S' };
  }
  return { fromPort: 'E', toPort: 'W' };
}

function normalizeAlignedExternalSystemWidths(nodes: StoredNode[]): void {
  const columns = new Map<number, StoredNode[]>();
  for (const node of nodes) {
    const isExternalSystem = node.shapeType === 'box' && /\[External System\]/i.test(node.label);
    if (!isExternalSystem || typeof node.x !== 'number') continue;
    const column = columns.get(node.x) ?? [];
    column.push(node);
    columns.set(node.x, column);
  }
  for (const column of columns.values()) {
    if (column.length < 2) continue;
    const maxWidth = Math.max(...column.map(n => Number(n.nodeWidth) || 0));
    for (const node of column) node.nodeWidth = maxWidth;
  }
}

function nodeKind(node: StoredNode): string {
  return typeof node.kind === 'string' ? node.kind : '';
}

function nodeLabel(node: StoredNode): string {
  return typeof node.label === 'string' ? node.label : '';
}

function isActorNode(node: StoredNode): boolean {
  return node.shapeType === 'actor' || nodeKind(node) === 'person';
}

function isDatabaseNode(node: StoredNode): boolean {
  return node.shapeType === 'database' || ['database', 'object_storage'].includes(nodeKind(node));
}

function isCentralSystemNode(node: StoredNode): boolean {
  const kind = nodeKind(node);
  return ['software_system', 'container', 'component', 'api', 'backend_service'].includes(kind);
}

function isExternalSystemNode(node: StoredNode): boolean {
  const kind = nodeKind(node);
  return kind === 'external_system' || /\[External System\]/i.test(nodeLabel(node));
}

function hasPosition(node: StoredNode): boolean {
  return typeof node.x === 'number' && typeof node.y === 'number';
}

function spreadAtX(nodes: StoredNode[], x: number, step = 280, centerY = 0): void {
  const startY = centerY - ((nodes.length - 1) * step) / 2;
  nodes.forEach((node, index) => {
    if (!hasPosition(node)) {
      node.x = x;
      node.y = Math.round((startY + index * step) / 40) * 40;
    }
  });
}

function gridPlace(nodes: StoredNode[], columns: number, startX: number, startY: number, stepX: number, stepY: number): void {
  nodes.forEach((node, index) => {
    if (hasPosition(node)) return;
    node.x = startX + (index % columns) * stepX;
    node.y = startY + Math.floor(index / columns) * stepY;
  });
}

function applyContextLayout(nodes: StoredNode[]): void {
  const unpositioned = nodes.filter(node => !hasPosition(node));
  if (!unpositioned.length) return;

  const actors = unpositioned.filter(isActorNode);
  const stores = unpositioned.filter(isDatabaseNode);
  const externals = unpositioned.filter(node => isExternalSystemNode(node) && !isDatabaseNode(node));
  const centralCandidates = unpositioned.filter(node =>
    isCentralSystemNode(node) &&
    !isActorNode(node) &&
    !isDatabaseNode(node) &&
    !isExternalSystemNode(node),
  );
  const central = centralCandidates.slice(0, Math.max(1, Math.min(centralCandidates.length, 2)));
  const centralSet = new Set(central);
  const remaining = unpositioned.filter(node =>
    !actors.includes(node) &&
    !stores.includes(node) &&
    !externals.includes(node) &&
    !centralSet.has(node),
  );

  spreadAtX(actors, -880, 280);
  spreadAtX(central, -280, 280);
  spreadAtX(remaining, 360, 280);

  const rightColumn = [...externals, ...stores];
  if (rightColumn.length <= 3) {
    spreadAtX(rightColumn, 920, 280);
  } else {
    gridPlace(rightColumn, 2, 760, -280, 360, 280);
  }
}

function applyFlowLayout(nodes: StoredNode[]): void {
  const unpositioned = nodes.filter(node => !hasPosition(node));
  if (!unpositioned.length) return;

  const stepX = 320;
  const startX = -Math.round(((unpositioned.length - 1) * stepX) / 2 / 40) * 40;
  unpositioned.forEach((node, index) => {
    node.x = startX + index * stepX;
    node.y = 0;
  });
}

function applyGridLayout(nodes: StoredNode[]): void {
  const unpositioned = nodes.filter(node => !hasPosition(node));
  if (!unpositioned.length) return;

  const columns = Math.min(3, Math.max(1, Math.ceil(Math.sqrt(unpositioned.length))));
  const startX = -Math.round(((columns - 1) * 360) / 2 / 40) * 40;
  gridPlace(unpositioned, columns, startX, -240, 360, 240);
}

function applyDeterministicLayout(diagramType: string, nodes: StoredNode[]): void {
  if (!nodes.some(node => !hasPosition(node))) return;

  if (diagramType === 'screen-guide') return;
  if (diagramType === 'context') {
    applyContextLayout(nodes);
    return;
  }
  if (diagramType === 'flow') {
    applyFlowLayout(nodes);
    return;
  }
  applyGridLayout(nodes);
}

function copyExistingFields(
  source: Record<string, unknown>,
  target: Record<string, unknown>,
  keys: readonly string[],
): Record<string, unknown> {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(source, key)) target[key] = source[key];
  }
  return target;
}

// Maps semantic type names → vis-network shape properties.
// All shapes are rendered via the frontend's ctxRenderer (shape: 'custom'),
// but we keep `shape` here for backward compatibility with older stored diagrams.
const SHAPE_MAP: Record<string, { shape: string; shapeType: string }> = {
  box:         { shape: 'box',      shapeType: 'box'       },
  rectangle:   { shape: 'box',      shapeType: 'box'       },
  system:      { shape: 'box',      shapeType: 'box'       },
  container:   { shape: 'box',      shapeType: 'box'       },
  component:   { shape: 'box',      shapeType: 'box'       },
  actor:       { shape: 'custom',   shapeType: 'actor'     },
  person:      { shape: 'custom',   shapeType: 'actor'     },
  user:        { shape: 'custom',   shapeType: 'actor'     },
  database:    { shape: 'database', shapeType: 'database'  },
  db:          { shape: 'database', shapeType: 'database'  },
  datastore:   { shape: 'database', shapeType: 'database'  },
  ellipse:     { shape: 'ellipse',  shapeType: 'ellipse'   },
  circle:      { shape: 'circle',   shapeType: 'circle'    },
  'post-it':   { shape: 'custom',   shapeType: 'post-it'   },
  postit:      { shape: 'custom',   shapeType: 'post-it'   },
  note:        { shape: 'custom',   shapeType: 'post-it'   },
  'text-free': { shape: 'custom',   shapeType: 'text-free' },
  text:        { shape: 'custom',   shapeType: 'text-free' },
  image:       { shape: 'custom',   shapeType: 'image'     },
  screenshot:  { shape: 'custom',   shapeType: 'image'     },
  anchor:      { shape: 'custom',   shapeType: 'anchor'    },
};

// Maps short color names → colorKey values from constants.js
const COLOR_ALIASES: Record<string, string> = {
  blue: 'c-blue', green: 'c-green', gray: 'c-gray', grey: 'c-gray',
  amber: 'c-amber', rose: 'c-rose', purple: 'c-purple', teal: 'c-teal',
  orange: 'c-orange', cyan: 'c-cyan', indigo: 'c-indigo', pink: 'c-pink',
  lime: 'c-lime', red: 'c-red', sky: 'c-sky', slate: 'c-slate',
  white: 'c-gray',
};

const VALID_COLOR_KEYS = new Set([
  'c-gray','c-blue','c-green','c-amber','c-rose','c-purple',
  'c-teal','c-orange','c-cyan','c-indigo','c-pink','c-lime',
  'c-red','c-sky','c-slate',
]);

function resolveColor(raw: string | undefined): string {
  if (!raw) return 'c-blue';
  const key = raw.toLowerCase();
  if (VALID_COLOR_KEYS.has(key)) return key;
  return COLOR_ALIASES[key] ?? 'c-blue';
}

function normalizeKind(raw: string | undefined): string | null {
  if (!raw) return null;
  const kind = raw.toLowerCase();
  if (!KIND_DEFAULTS[kind]) {
    throw new Error(`Invalid kind "${raw}". Allowed: ${Object.keys(KIND_DEFAULTS).join(', ')}.`);
  }
  return kind;
}

function resolveRenderAs(n: DiagramNodeInput, kind: string | null): string {
  return n.renderAs ?? (kind ? KIND_DEFAULTS[kind].renderAs : n.type ?? 'box');
}

function resolveNodeColor(n: DiagramNodeInput, kind: string | null): string {
  return resolveColor(n.color ?? (kind ? KIND_DEFAULTS[kind].color : undefined));
}

function buildNodeLabel(n: DiagramNodeInput, kind: string | null): string {
  if (!kind || n.name.includes('\n')) return n.name;

  const lines = [n.name, `[${KIND_DEFAULTS[kind].labelType}]`];
  if (n.description && n.description.trim()) lines.push(n.description.trim());
  return lines.join('\n');
}

function diagramsFilePath(docsPath: string): string {
  return path.join(docsPath, '.diagrams.json');
}

function loadDiagrams(docsPath: string): StoredDiagram[] {
  const fp = diagramsFilePath(docsPath);
  if (!fs.existsSync(fp)) return [];
  try { return JSON.parse(fs.readFileSync(fp, 'utf-8')); }
  catch { return []; }
}

function saveDiagrams(docsPath: string, diagrams: StoredDiagram[]): void {
  fs.writeFileSync(diagramsFilePath(docsPath), JSON.stringify(diagrams, null, 2), 'utf-8');
}

// ── Tool handlers ─────────────────────────────────────────────────────────────

export function toolListDiagrams(docsPath: string) {
  const list = loadDiagrams(docsPath).map(({ id, title }) => ({ id, title }));
  return { content: [{ type: 'text' as const, text: JSON.stringify(list, null, 2) }] };
}

export function toolReadDiagram(docsPath: string, args: { id: string }) {
  const all = loadDiagrams(docsPath);
  const diagram = all.find(d => d.id === args.id);
  if (!diagram) throw new Error(`Diagram not found: "${args.id}"`);

  // Build id→label map for edge resolution
  const idToLabel: Record<string, string> = {};
  for (const n of diagram.nodes) idToLabel[n.id] = n.label;

  const nodes = diagram.nodes.map(n => copyExistingFields(n, {
    name:  n.label,
    type:  n.shapeType,
    color: n.colorKey,
    ...(n.x !== undefined ? { x: n.x } : {}),
    ...(n.y !== undefined ? { y: n.y } : {}),
    ...(n.nodeWidth !== undefined ? { width: n.nodeWidth } : {}),
    ...(n.nodeHeight !== undefined ? { height: n.nodeHeight } : {}),
  }, NODE_STYLE_KEYS));

  const edges = diagram.edges.map(e => copyExistingFields(e, {
    from: idToLabel[e.from] ?? e.from,
    ...(e.to !== undefined ? { to: idToLabel[e.to] ?? e.to } : {}),
    ...(e.label !== undefined ? { label: e.label } : {}),
  }, EDGE_STYLE_KEYS));

  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({
        id: diagram.id,
        title: diagram.title,
        ...(diagram.edgesStraight !== undefined ? { edgesStraight: diagram.edgesStraight } : {}),
        ...(diagram.gridEnabled !== undefined ? { gridEnabled: diagram.gridEnabled } : {}),
        ...(diagram.alignGuides !== undefined ? { alignGuides: diagram.alignGuides } : {}),
        nodes,
        edges,
      }, null, 2),
    }],
  };
}

const VALID_DIAGRAM_TYPES = new Set(['context', 'container', 'component', 'uml', 'flow', 'erd', 'screen-guide', 'other']);
const EXPLICIT_ONLY_TYPES = new Set(['container', 'component', 'uml', 'screen-guide']);
const CONTEXT_NODE_SOFT_LIMIT = 10;

export function toolCreateDiagram(docsPath: string, args: {
  id?: string;
  title: string;
  diagramType?: string;
  userRequestedExplicitly?: boolean;
  edgesStraight?: boolean;
  gridEnabled?: boolean;
  alignGuides?: boolean;
  nodes: DiagramNodeInput[];
  edges: DiagramEdgeInput[];
}) {
  const diagramType = (args.diagramType ?? '').toLowerCase();
  if (!diagramType) {
    throw new Error(
      'diagramType is required. Use "context" for the default big-picture diagram; ' +
      '"container", "component", or "uml" only when the user explicitly asked for that type ' +
      '(and pass userRequestedExplicitly: true). Other values: "flow", "erd", "other".',
    );
  }
  if (!VALID_DIAGRAM_TYPES.has(diagramType)) {
    throw new Error(
      `Unknown diagramType "${args.diagramType}". Allowed: ${Array.from(VALID_DIAGRAM_TYPES).join(', ')}.`,
    );
  }
  if (EXPLICIT_ONLY_TYPES.has(diagramType) && !args.userRequestedExplicitly) {
    throw new Error(
      `diagramType "${diagramType}" requires explicit user request. ` +
      `Only set userRequestedExplicitly: true if the user asked for a "${diagramType} diagram" by name. ` +
      `If the request was generic ("a diagram", "the big picture", "documentation"), use diagramType: "context" instead.`,
    );
  }

  const id = args.id ?? `d${Date.now()}`;

  // Build name→id map for edge resolution
  const nameToId: Record<string, string> = {};

  const nodes: StoredNode[] = args.nodes.map((n, i) => {
    const nodeId = `n${i + 1}`;
    const kind = normalizeKind(n.kind);
    const renderAs = resolveRenderAs(n, kind);
    const label = buildNodeLabel(n, kind);
    nameToId[n.name] = nodeId;
    nameToId[label] = nodeId;
    const shapeInfo = SHAPE_MAP[renderAs.toLowerCase()] ?? { shape: 'box', shapeType: 'box' };
    if (shapeInfo.shapeType === 'image' && !n.imageSrc) {
      throw new Error(
        `Node "${n.name || `#${i + 1}`}" uses type "image" but is missing \`imageSrc\`. ` +
        `Upload the image via POST /api/images/upload and pass the returned URL (e.g. "/images/foo.png").`,
      );
    }
    const estimated = estimateNodeSize(label, shapeInfo.shapeType);
    const nodeWidth  = n.width  ?? estimated.nodeWidth;
    const nodeHeight = n.height ?? estimated.nodeHeight;
    const node: StoredNode = {
      id: nodeId,
      label,
      shape: shapeInfo.shape,
      shapeType: shapeInfo.shapeType,
      kind,
      renderAs: shapeInfo.shapeType,
      description: stringOrNull(n.description),
      evidence: normalizeEvidence(n.evidence),
      colorKey: resolveNodeColor(n, kind),
      nodeWidth,
      nodeHeight,
      fontSize: numberOrNull(n.fontSize, null),
      textAlign: stringOrNull(n.textAlign),
      textValign: stringOrNull(n.textValign),
      bgOpacity: numberOrNull(n.bgOpacity, null),
      rotation: numberOrNull(n.rotation, 0),
      labelRotation: numberOrNull(n.labelRotation, 0),
      imageSrc: stringOrNull(n.imageSrc),
      groupId: stringOrNull(n.groupId),
      nodeLink: resolveNodeLink(n),
      locked: n.locked === true,
    };
    if (n.x !== undefined) node.x = n.x;
    if (n.y !== undefined) node.y = n.y;
    return node;
  });
  normalizeAlignedExternalSystemWidths(nodes);
  applyDeterministicLayout(diagramType, nodes);
  normalizeAlignedExternalSystemWidths(nodes);

  const edges: StoredEdge[] = args.edges.map((e, i) => {
    const fromId = nameToId[e.from];
    if (!fromId) throw new Error(`Edge references unknown node: "${e.from}"`);
    const fromNode = nodes.find(n => n.id === fromId);
    if (!fromNode) throw new Error(`Edge references unknown node: "${e.from}"`);
    const label = e.label ?? '';
    const edge: StoredEdge = {
      id: `e${i + 1}`,
      from: fromId,
      to: '',
      label,
      arrowDir: normalizeArrowDir(e.arrowDir),
      dashes: e.dashes === true,
      fontSize: numberOrNull(e.fontSize, estimateEdgeFontSize(label)),
      labelRotation: numberOrNull(e.labelRotation, 0),
      edgeLabelOffsetX: numberOrNull(e.edgeLabelOffsetX, 0),
      edgeLabelOffsetY: numberOrNull(e.edgeLabelOffsetY, 0),
      edgeColor: stringOrNull(e.edgeColor),
      edgeWidth: numberOrNull(e.edgeWidth, null),
      edgeLocked: e.edgeLocked === true,
      edgeLabelWidth: numberOrNull(e.edgeLabelWidth, estimateEdgeLabelWidth(label)),
      evidence: normalizeEvidence(e.evidence),
    };
    let toNode: StoredNode | undefined;
    if (e.to !== undefined && e.to !== '') {
      const toId = nameToId[e.to];
      if (!toId) throw new Error(`Edge references unknown node: "${e.to}"`);
      edge.to = toId;
      toNode = nodes.find(n => n.id === toId);
    } else {
      delete (edge as Partial<StoredEdge>).to;
    }
    const inferredPorts = inferPorts(fromNode, toNode);
    const fromPort = normalizePort(e.fromPort, 'fromPort') ?? inferredPorts.fromPort;
    const toPort = normalizePort(e.toPort, 'toPort') ?? inferredPorts.toPort;
    edge.fromPort = fromPort;
    edge.toPort = toPort;
    return edge;
  });

  const diagram: StoredDiagram = {
    id,
    title: args.title,
    nodes,
    edges,
    edgesStraight: args.edgesStraight ?? false,
    gridEnabled: args.gridEnabled ?? false,
    alignGuides: args.alignGuides ?? true,
  };
  const all = loadDiagrams(docsPath);
  const existingIndex = all.findIndex(d => d.id === id);
  if (existingIndex !== -1) {
    all[existingIndex] = diagram;
  } else {
    all.push(diagram);
  }
  saveDiagrams(docsPath, all);

  const warnings: string[] = [];
  if (diagramType !== 'screen-guide') {
    const unlabeledEdges = args.edges.filter(e => !e.label || !e.label.trim()).length;
    if (unlabeledEdges > 0) {
      warnings.push(
        `${unlabeledEdges} edge(s) have no label. Every edge should describe the interaction as a verb phrase ` +
        `("authenticates", "publishes events to", "reads from").`,
      );
    }
  }
  if (diagramType === 'context' && nodes.length > CONTEXT_NODE_SOFT_LIMIT) {
    warnings.push(
      `Context diagram has ${nodes.length} nodes — keep it ≤ ${CONTEXT_NODE_SOFT_LIMIT} for readability. ` +
      `If the system is too large, create a container diagram for the detailed view instead.`,
    );
  }
  if (
    ['context', 'container', 'component', 'uml'].includes(diagramType) &&
    !hasEvidence(nodes) &&
    !hasEvidence(edges)
  ) {
    warnings.push(
      'Diagram has no evidence metadata. Consider adding document references for auditability.',
    );
  }

  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({
        success: true,
        id,
        title: args.title,
        diagramType,
        nodeCount: nodes.length,
        edgeCount: edges.length,
        editorUrl: `/diagram?id=${id}`,
        ...(warnings.length ? { warnings } : {}),
      }, null, 2),
    }],
  };
}
