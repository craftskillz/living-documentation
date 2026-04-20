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
  to: string;
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
  const nodeWidth  = Math.round(rawW / 8) * 8;
  const nodeHeight = Math.round(rawH / 8) * 8;

  return { nodeWidth, nodeHeight };
}

// Maps semantic type names → vis-network shape properties
const SHAPE_MAP: Record<string, { shape: string; shapeType: string }> = {
  box:       { shape: 'box',    shapeType: 'box'      },
  rectangle: { shape: 'box',    shapeType: 'box'      },
  system:    { shape: 'box',    shapeType: 'box'      },
  container: { shape: 'box',    shapeType: 'box'      },
  component: { shape: 'box',    shapeType: 'box'      },
  actor:     { shape: 'custom', shapeType: 'actor'    },
  person:    { shape: 'custom', shapeType: 'actor'    },
  user:      { shape: 'custom', shapeType: 'actor'    },
  database:  { shape: 'database', shapeType: 'database' },
  db:        { shape: 'database', shapeType: 'database' },
  datastore: { shape: 'database', shapeType: 'database' },
  ellipse:   { shape: 'ellipse', shapeType: 'ellipse' },
  circle:    { shape: 'circle', shapeType: 'circle'   },
  'post-it': { shape: 'custom', shapeType: 'post-it'  },
  note:      { shape: 'custom', shapeType: 'post-it'  },
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

export function toolCreateDiagram(docsPath: string, args: {
  title: string;
  nodes: Array<{ name: string; type: string; color?: string; x?: number; y?: number }>;
  edges: Array<{ from: string; to: string; label?: string }>;
}) {
  const id = `d${Date.now()}`;

  // Build name→id map for edge resolution
  const nameToId: Record<string, string> = {};

  const nodes: StoredNode[] = args.nodes.map((n, i) => {
    const nodeId = `n${i + 1}`;
    nameToId[n.name] = nodeId;
    const shapeInfo = SHAPE_MAP[n.type.toLowerCase()] ?? { shape: 'box', shapeType: 'box' };
    const { nodeWidth, nodeHeight } = estimateNodeSize(n.name, shapeInfo.shapeType);
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
    return node;
  });

  const edges: StoredEdge[] = args.edges.map((e, i) => {
    const fromId = nameToId[e.from];
    const toId = nameToId[e.to];
    if (!fromId) throw new Error(`Edge references unknown node: "${e.from}"`);
    if (!toId) throw new Error(`Edge references unknown node: "${e.to}"`);
    const edge: StoredEdge = { id: `e${i + 1}`, from: fromId, to: toId };
    if (e.label) edge.label = e.label;
    return edge;
  });

  const diagram: StoredDiagram = { id, title: args.title, nodes, edges };
  const all = loadDiagrams(docsPath);
  all.push(diagram);
  saveDiagrams(docsPath, all);

  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({
        success: true,
        id,
        title: args.title,
        nodeCount: nodes.length,
        edgeCount: edges.length,
        editorUrl: `/diagram?id=${id}`,
      }, null, 2),
    }],
  };
}
