import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
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

function createMcpServer(docsPath: string): Server {
  const server = new Server(
    { name: 'living-documentation', version: '1.0.0' },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

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
    });
  });

  return router;
}
