import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { Router, Request, Response } from 'express';
import { toolListDocuments, toolReadDocument, toolCreateDocument } from './tools/documents';
import { toolListDiagrams, toolCreateDiagram } from './tools/diagrams';

const TOOLS = [
  {
    name: 'list_documents',
    description: 'List all documents with their id, title, category and folder.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'read_document',
    description: 'Read the raw Markdown content of a document by its id.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Document id as returned by list_documents' },
      },
      required: ['id'],
    },
  },
  {
    name: 'create_document',
    description: [
      'Create a new Markdown document. The filename is generated automatically',
      'from the configured pattern (date + category + title slug).',
      'Pass content as full Markdown; omit it to create an empty stub.',
    ].join(' '),
    inputSchema: {
      type: 'object',
      properties: {
        title:    { type: 'string', description: 'Human-readable document title' },
        category: { type: 'string', description: 'Category extracted from the filename, e.g. "Architecture", "Guide"' },
        folder:   { type: 'string', description: 'Optional subfolder relative to the docs root, e.g. "adrs" or "adrs/backend"' },
        content:  { type: 'string', description: 'Full Markdown content. Omit to create an empty document.' },
      },
      required: ['title', 'category'],
    },
  },
  {
    name: 'list_diagrams',
    description: 'List all saved diagrams with their id and title.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'create_diagram',
    description: [
      'Create a new diagram from a high-level description.',
      'Nodes are positioned automatically by the physics engine when opened in the editor.',
      '',
      'Available node types: box, actor (person), database, ellipse, circle, post-it.',
      'Available colors: c-blue, c-green, c-gray, c-teal, c-amber, c-orange, c-rose,',
      'c-purple, c-cyan, c-indigo, c-pink, c-lime, c-red, c-sky, c-slate.',
      'Short aliases also work: blue, green, gray, teal, orange, red, purple…',
    ].join(' '),
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Diagram title' },
        nodes: {
          type: 'array',
          description: 'List of nodes (boxes, actors, databases…)',
          items: {
            type: 'object',
            properties: {
              name:  { type: 'string', description: 'Node label shown in the diagram' },
              type:  { type: 'string', description: 'Shape type: box | actor | database | ellipse | circle | post-it' },
              color: { type: 'string', description: 'Color key, e.g. c-blue or just "blue"' },
              x:     { type: 'number', description: 'Canvas X position (0 = center). Use multiples of 40 for grid alignment.' },
              y:     { type: 'number', description: 'Canvas Y position (0 = center, positive = down). Use multiples of 40.' },
            },
            required: ['name', 'type'],
          },
        },
        edges: {
          type: 'array',
          description: 'List of directed edges between nodes',
          items: {
            type: 'object',
            properties: {
              from:  { type: 'string', description: 'Name of the source node' },
              to:    { type: 'string', description: 'Name of the target node' },
              label: { type: 'string', description: 'Optional label on the edge' },
            },
            required: ['from', 'to'],
          },
        },
      },
      required: ['title', 'nodes', 'edges'],
    },
  },
] as const;

// ── MCP Prompts ────────────────────────────────────────────────────────────────
// These prompt templates guide the LLM to produce well-structured create_diagram
// calls. All layout work (choosing positions, types, colors) happens on the
// caller's side — zero tokens consumed by the living-documentation server.

const PROMPTS = [
  {
    name: 'c4-context',
    description: 'C4 Context diagram — one system in the center, surrounding users and external systems.',
  },
  {
    name: 'c4-container',
    description: 'C4 Container diagram — internal containers of a single system (frontend, backend, database…).',
  },
  {
    name: 'flow',
    description: 'Left-to-right linear flow diagram — steps or stages in a process.',
  },
  {
    name: 'erd',
    description: 'Entity-Relationship Diagram — entities as boxes, relationships as labeled edges.',
  },
] as const;

type PromptName = typeof PROMPTS[number]['name'];

// Prepended to every diagram prompt — enforces ADR-first information gathering.
const PREAMBLE = `
## Before anything else — mine the existing documentation

Living Documentation is a tool where knowledge lives primarily in Markdown documents (ADRs, guides, decisions).
**Do not ask the user questions you can answer yourself by reading the docs.**

1. Call \`list_documents\` to get the full document list.
2. Read documents that look architecturally significant regardless of their folder name — look for ADR-style frontmatter (lines starting with \`**status:**\`, \`**description:**\`, \`**tags:**\`), README files, and any document whose title or category suggests architecture, integration, or domain knowledge.
3. **Ignore any document whose frontmatter contains \`status: SuperSeeded\`** — it is deprecated and must not be used as a source of truth.
4. Read the frontmatter (\`description\` and \`tags\` fields) of each relevant document with \`read_document\` to find answers to the diagram-specific questions below.
5. Only ask the user for information that cannot be found in any active (non-superseded) document.

## Node label format — mandatory

Every node label must follow the Simon Brown C4 convention using \\n for line breaks:

\`\`\`
Name\\n[Type]\\nShort description of role or responsibility
\`\`\`

Examples:
- \`"DriveBox\\n[Software System]\\nManages ad campaigns\\ndisplayed on taxi tablets"\`
- \`"Advertiser\\n[Person]\\nUploads media and\\npays for campaigns"\`
- \`"Stripe\\n[External System]\\nCard payment and\\npre-authorization"\`

Types to use: \`[Person]\`, \`[Software System]\`, \`[External System]\`, \`[Database]\`, \`[Device]\`
Keep descriptions short — 1 to 2 lines maximum.
`.trim();

const PROMPT_TEMPLATES: Record<PromptName, string> = {
  'c4-context': `
${PREAMBLE}

---

You are about to create a **C4 System Context Diagram** following Simon Brown's C4 model.

## Step 1 — Answer these three questions first (ask the user only if not found in docs)

1. **Scope** — What is the software system we are describing? What is its name and primary responsibility?
2. **Users** — Who uses it? For each type of user: what are they doing with the system?
3. **Integrations** — What external systems does it need to integrate with? What data or interactions flow between them?

Do not proceed to the diagram until you have clear answers to all three.

## Step 2 — Build the diagram

### Layout rules (grid = 40 units, physics is disabled — positions are final)
- **Main system** → center: x: 0, y: 0. Type: box. Color: c-blue.
- **Human users (actors)** → left: x: -320, y: 0. Spread vertically by ±160 if several. Type: actor. Color: c-gray.
- **External systems** → right: x: 320, y: 0. Spread vertically by ±160 if several. Type: box. Color: c-slate.
- **External databases / datastores** → below: x: 0, y: 240. Type: database. Color: c-teal.
- All positions must be multiples of 40.

### Edge rules
- Direction: actor → system, system → external system, system → datastore.
- Every edge must have a label describing the interaction in plain language (e.g. "submits orders", "reads customer data", "sends notifications via").

### Color palette
| Element | Color |
|---|---|
| Main system | c-blue |
| Human actor | c-gray |
| External system | c-slate |
| Datastore | c-teal |

## Step 3 — Call \`create_diagram\` with the result.
`.trim(),

  'c4-container': `
${PREAMBLE}

---

You are about to create a **C4 Container Diagram** following Simon Brown's C4 model.

## Step 1 — Answer these questions first (ask the user only if not found in docs)

1. **System** — Which system are we zooming into?
2. **Containers** — What are its internal containers (web app, mobile app, API, background worker, database, cache…)?
3. **Users** — Which users interact directly with which containers?
4. **Integrations** — Which external systems do the containers communicate with?

## Step 2 — Build the diagram

### Layout rules (grid = 40 units)
Place containers in a logical left-to-right or top-to-bottom flow:
- **Frontend / Browser / Mobile**: x: -320, y: 0. Type: box. Color: c-sky.
- **API / Backend**: x: 0, y: 0. Type: box. Color: c-blue.
- **Database**: x: 320, y: 80. Type: database. Color: c-teal.
- **Cache / Queue**: x: 320, y: -80. Type: database. Color: c-amber.
- **External actor** (user): x: -560, y: 0. Type: actor. Color: c-gray.
- **External system**: x: 0, y: 240. Type: box. Color: c-slate.
- Spread additional containers vertically by multiples of 160.
- All positions must be multiples of 40.

### Edge rules
- Label every edge with the protocol or action: "HTTPS", "SQL", "REST", "publishes", "subscribes"…

## Step 3 — Call \`create_diagram\` with the result.
`.trim(),

  'flow': `
${PREAMBLE}

---

You are about to create a **linear flow diagram**.

## Step 1 — Answer these questions first (ask the user only if not found in docs)

1. **Process** — What process or workflow are we representing?
2. **Steps** — What are the steps or stages in order?
3. **Actors** — Are there human actors or external systems involved at any step?
4. **Branches** — Are there decision points or alternative paths?

## Step 2 — Build the diagram

### Layout rules (grid = 40 units)
- Steps are laid out **left to right**, each separated by 240 units on X.
- All nodes at y: 0 unless a branch is needed (branch at y: ±160).
- First step: x: -480. Then x: -240, x: 0, x: 240, x: 480… (adjust origin to center the flow).
- Use type: box for process steps (color: c-blue), type: actor for human actors (color: c-gray), type: database for stores (color: c-teal).
- Decision diamonds are not a native shape — use ellipse (color: c-amber) to indicate a decision point.
- All positions must be multiples of 40.

### Edge rules
- Edges are directional left-to-right.
- Label branches: "yes / no", "success / error", etc.

## Step 3 — Call \`create_diagram\` with the result.
`.trim(),

  'erd': `
${PREAMBLE}

---

You are about to create an **Entity-Relationship Diagram**.

## Step 1 — Answer these questions first (ask the user only if not found in docs)

1. **Domain** — What domain or bounded context does this ERD cover?
2. **Entities** — What are the main entities (tables, aggregates)?
3. **Relationships** — What are the relationships between them and their cardinalities (1:1, 1:N, N:M)?
4. **Key attributes** — Are there important attributes worth labeling on the edges?

## Step 2 — Build the diagram

### Layout rules (grid = 40 units)
- Each entity is a box. Place them so related entities are close together.
- Suggested starting positions for up to 6 entities:
    - top-left:    x: -320, y: -200
    - top-center:  x:    0, y: -200
    - top-right:   x:  320, y: -200
    - bottom-left: x: -320, y:  200
    - bottom-center: x:  0, y:  200
    - bottom-right: x:  320, y:  200
- All positions must be multiples of 40.
- Color: c-blue for main entities, c-green for junction/pivot tables, c-slate for lookup/reference tables.

### Edge rules
- Label every edge with the cardinality and nature of the relationship:
  "1:N", "N:M", "has many", "belongs to", "references", etc.
- Edges are undirected by convention in ERDs — leave \`label\` descriptive.

## Step 3 — Call \`create_diagram\` with the result.
`.trim(),
};

function createMcpServer(docsPath: string): Server {
  const server = new Server(
    { name: 'living-documentation', version: '1.0.0' },
    { capabilities: { tools: {}, prompts: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

  server.setRequestHandler(ListPromptsRequestSchema, async () => ({ prompts: PROMPTS }));

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const name = request.params.name as PromptName;
    const template = PROMPT_TEMPLATES[name];
    if (!template) throw new Error(`Unknown prompt: ${name}`);
    return {
      description: PROMPTS.find(p => p.name === name)?.description ?? name,
      messages: [{ role: 'user' as const, content: { type: 'text' as const, text: template } }],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;
    try {
      switch (name) {
        case 'list_documents':
          return toolListDocuments(docsPath);
        case 'read_document':
          return toolReadDocument(docsPath, args as { id: string });
        case 'create_document':
          return toolCreateDocument(docsPath, args as {
            title: string; category: string; folder?: string; content?: string;
          });
        case 'list_diagrams':
          return toolListDiagrams(docsPath);
        case 'create_diagram':
          return toolCreateDiagram(docsPath, args as {
            title: string;
            nodes: Array<{ name: string; type: string; color?: string }>;
            edges: Array<{ from: string; to: string; label?: string }>;
          });
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  });

  return server;
}

export function mcpRouter(docsPath: string): Router {
  const router = Router();

  // Main MCP endpoint — stateless: one Server + Transport per request
  router.post('/', async (req: Request, res: Response) => {
    const server = createMcpServer(docsPath);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } finally {
      await server.close();
    }
  });

  // GET — surface a helpful message (Claude Desktop / browser landing)
  router.get('/', (_req: Request, res: Response) => {
    res.json({
      mcp: 'living-documentation',
      version: '1.0.0',
      transport: 'streamable-http',
      endpoint: 'POST /mcp',
      tools: TOOLS.map(t => t.name),
      prompts: PROMPTS.map(p => ({ name: p.name, description: p.description })),
    });
  });

  return router;
}
