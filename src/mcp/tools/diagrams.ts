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
}

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

  const nodes = diagram.nodes.map(n => ({
    name:  n.label,
    type:  n.shapeType,
    color: n.colorKey,
    ...(n.x !== undefined ? { x: n.x } : {}),
    ...(n.y !== undefined ? { y: n.y } : {}),
  }));

  const edges = diagram.edges.map(e => ({
    from: idToLabel[e.from] ?? e.from,
    ...(e.to !== undefined ? { to: idToLabel[e.to] ?? e.to } : {}),
    ...(e.label ? { label: e.label } : {}),
  }));

  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({ id: diagram.id, title: diagram.title, nodes, edges }, null, 2),
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
  nodes: Array<{
    name: string;
    type: string;
    color?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    bgOpacity?: number;
    locked?: boolean;
    linkedDiagramId?: string;
    imageSrc?: string;
  }>;
  edges: Array<{ from: string; to?: string; label?: string }>;
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
    nameToId[n.name] = nodeId;
    const shapeInfo = SHAPE_MAP[n.type.toLowerCase()] ?? { shape: 'box', shapeType: 'box' };
    if (shapeInfo.shapeType === 'image' && !n.imageSrc) {
      throw new Error(
        `Node "${n.name || `#${i + 1}`}" uses type "image" but is missing \`imageSrc\`. ` +
        `Upload the image via POST /api/images/upload and pass the returned URL (e.g. "/images/foo.png").`,
      );
    }
    const estimated = estimateNodeSize(n.name, shapeInfo.shapeType);
    const nodeWidth  = n.width  ?? estimated.nodeWidth;
    const nodeHeight = n.height ?? estimated.nodeHeight;
    const node: StoredNode = {
      id: nodeId,
      label: n.name,
      shape: shapeInfo.shape,
      shapeType: shapeInfo.shapeType,
      colorKey: resolveColor(n.color),
      nodeWidth,
      nodeHeight,
    };
    if (n.x !== undefined) node.x = n.x;
    if (n.y !== undefined) node.y = n.y;
    if (n.bgOpacity !== undefined) node.bgOpacity = n.bgOpacity;
    if (n.locked !== undefined) node.locked = n.locked;
    if (n.linkedDiagramId) node.nodeLink = { type: 'diagram', value: n.linkedDiagramId };
    if (n.imageSrc) node.imageSrc = n.imageSrc;
    return node;
  });

  const edges: StoredEdge[] = args.edges.map((e, i) => {
    const fromId = nameToId[e.from];
    if (!fromId) throw new Error(`Edge references unknown node: "${e.from}"`);
    const edge: StoredEdge = { id: `e${i + 1}`, from: fromId, to: '' };
    if (e.to !== undefined && e.to !== '') {
      const toId = nameToId[e.to];
      if (!toId) throw new Error(`Edge references unknown node: "${e.to}"`);
      edge.to = toId;
    } else {
      delete (edge as Partial<StoredEdge>).to;
    }
    if (e.label) {
      edge.label = e.label;
      edge.edgeLabelWidth = 80;
    }
    return edge;
  });

  const diagram: StoredDiagram = { id, title: args.title, nodes, edges };
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
