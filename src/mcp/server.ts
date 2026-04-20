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
import { toolListDiagrams, toolReadDiagram, toolCreateDiagram } from './tools/diagrams';
import { toolListSourceFiles, toolReadSourceFile, toolSearchSource } from './tools/source';

// ── Server guide ──────────────────────────────────────────────────────────────
// Shared by the `instructions` field (sent on MCP initialize) and the
// `get_server_guide` tool (explicit retrieval for clients that don't surface
// server instructions to the model).
const SERVER_GUIDE = `# Living Documentation — Server Guide

This server maintains a living documentation system composed of:
- **Documents** (Markdown) — the source of truth.
- **Diagrams** — visual derivations of documents.

## Document ↔ diagram contract
Documents are authoritative. Diagrams are derived views and must not introduce
information that is absent from the documents. If a diagram needs a concept
that isn't documented yet, create or update the document first.

## Default diagram scope
- When documenting the project big picture, generate a **context diagram**.
- Do NOT generate container diagrams, component diagrams, or UML diagrams
  unless the user explicitly asks for them by name.
- If the user asks for "a diagram", "the big picture", or "documentation",
  produce a context diagram.

## Mandatory workflow before creating or updating any diagram
1. Call \`list_documents\` to see what exists.
2. Call \`read_document\` on the documents relevant to the requested diagram.
3. Call \`list_diagrams\` to check whether the diagram already exists
   (update rather than duplicate by passing its \`id\` back to \`create_diagram\`).
4. Only then call \`create_diagram\`, using node/edge content grounded in the
   documents you read.

Never invent actors, systems, or relationships that are not present in the
documents.

## Conventions by diagram type
### Context diagram (default)
- Central system as \`box\` (c-blue).
- Users / roles as \`actor\` (c-gray).
- External systems as \`box\` (c-slate).
- Persistence / datastores as \`database\` (c-teal).
- Keep to ~10 nodes maximum.

### Container diagram (explicit request only)
- Each deployable unit as \`box\`.
- Databases as \`database\`.
- Queues as \`ellipse\`.

### UML diagram (explicit request only)
- Follow the requested UML variant's conventions (class, sequence, state,
  activity, use-case …).

### Screen-guide diagram (explicit request only)
- Annotated UI screenshot. One \`image\` node as the background + \`post-it\` nodes
  naming each first-level feature, with arrows (edges) from each post-it to the
  image.
- The **source code is the reference** for this type, not the Markdown docs.
  Use \`read_source_file\` / \`search_source\` to identify features.
- **First-level feature** = visible without interaction + changes behavior
  significantly when used. Typical count: 4–10. The LLM decides the list.
- Post-it labels are short names (2–5 words, title-cased). No multi-line
  description; no full sentence.
- Palette: rotate \`c-lime, c-amber, c-sky, c-rose, c-teal, c-green\`. Never
  reuse the same color on adjacent post-its.
- Image node must set \`imageSrc\` (URL returned by \`POST /api/images/upload\`)
  and \`name: "screenshot"\` (used as edge anchor; not displayed).
- Edge labels are empty on this type (the arrow speaks). Warnings about
  missing edge labels are disabled for screen-guide.

### Edges
- Every edge MUST have a \`label\` describing the interaction as a verb phrase
  ("authenticates", "publishes events to", "reads from", "sends notifications via").
- Exception: screen-guide diagrams may have unlabeled edges.

## Node label format (C4 convention)
Use \`\\n\` line breaks:
\`\`\`
Name\\n[Type]\\nShort description of role or responsibility
\`\`\`
Types: \`[Person]\`, \`[Software System]\`, \`[External System]\`, \`[Database]\`, \`[Device]\`.
Keep descriptions to 1–2 short lines.

## Coordinate system (when positions are provided)
- Origin \`(0, 0)\` is the canvas center.
- \`+x\` is right, \`+y\` is down.
- Use multiples of **40** for grid alignment.
- \`x\` and \`y\` are **optional**: omit them to let the editor auto-lay out
  nodes. Only provide coordinates when you want a fixed layout (e.g., following
  a C4 convention).

## Source code access (fallback only)
Three tools expose read-only access to the project source under \`sourceRoot\`
(configurable in \`.living-doc.json\`; defaults to the parent folder of
\`docsFolder\`):

- \`list_source_files(pattern?, maxResults?)\`
- \`read_source_file(path)\`
- \`search_source(query, pattern?, maxResults?, caseSensitive?)\`

**Rules**:
1. Documentation tools come first. Use source tools only when the docs do not
   carry the required detail (typical case: screen-guide diagrams, or
   low-level code documentation with no ADR).
2. If you find yourself reading more than 3 source files for the same
   diagram, stop and update the documentation first.
3. Common ignored folders (\`node_modules\`, \`dist\`, \`.git\`, \`build\`,
   \`target\`, …) are skipped automatically.

## Guardrails (enforced server-side in create_diagram)
- \`diagramType\` is required.
- Non-context types (\`container\`, \`component\`, \`uml\`, \`screen-guide\`) are
  rejected unless \`userRequestedExplicitly: true\` is also passed.
- \`image\` nodes without \`imageSrc\` are rejected.
- A response \`warnings\` array flags missing edge labels (except for
  screen-guide) or oversized context diagrams.
`;

// ── Tool definitions ──────────────────────────────────────────────────────────

const SHAPE_LIST  = 'box, actor (person), database, ellipse, circle, post-it, text-free, image';
const COLOR_LIST  = 'c-blue, c-green, c-gray, c-teal, c-amber, c-orange, c-rose, c-purple, c-cyan, c-indigo, c-pink, c-lime, c-red, c-sky, c-slate (short aliases like "blue", "teal" also work)';
const GUIDE_HINT  = 'If unsure of the workflow, call `get_server_guide` first.';

const CREATE_DIAGRAM_DESCRIPTION = [
  'Create or overwrite a diagram from a high-level description.',
  '',
  '## Required workflow (do ALL of these before calling)',
  '1. `list_documents` — see what exists.',
  '2. `read_document` on documents relevant to the diagram.',
  '3. `list_diagrams` — if the diagram already exists, pass its `id` back to update in place (do not duplicate).',
  'Do not invent actors, systems, or relationships absent from the documents.',
  '',
  '## Scope rule',
  'The default diagram for a project is a **context diagram**. Container, component, and UML diagrams are produced ONLY when the user explicitly requests them by name. If the user asks for "a diagram", "the big picture", or "documentation", produce a context diagram.',
  '',
  '## Conventions by diagram type',
  '- Context (default): central system as `box` (c-blue); users as `actor` (c-gray); external systems as `box` (c-slate); datastores as `database` (c-teal). Max ~10 nodes.',
  '- Container (explicit-only): deployables as `box`, databases as `database`, queues as `ellipse`.',
  '- UML (explicit-only): follow the requested UML variant (class, sequence, state, …).',
  '- Every edge MUST have a `label` describing the interaction as a verb phrase ("authenticates", "publishes events to", "reads from").',
  '',
  '## Source-of-truth contract',
  'Documents are authoritative. A diagram must not contain information absent from the documents. If a diagram needs a concept that isn\'t documented, create or update the document first (via `create_document`).',
  '',
  '## Positioning',
  '`x` and `y` are **optional**. Omit them and the editor auto-lays out nodes. Provide coordinates only when a fixed layout is required (e.g., following a C4 convention). When provided: origin `(0,0)` is the canvas center, `+x` = right, `+y` = down; use multiples of 40.',
  '',
  '## Guardrails (enforced)',
  '- `diagramType` is required.',
  '- For `container`, `component`, or `uml`, `userRequestedExplicitly: true` is required — confirms the user asked for that type by name. Otherwise the call is rejected.',
  '- Missing edge labels and oversized context diagrams produce warnings.',
  '',
  '## Worked example (context diagram, derived from an ADR)',
  '```json',
  '{',
  '  "diagramType": "context",',
  '  "title": "Living Documentation — system context",',
  '  "nodes": [',
  '    { "name": "Living Documentation\\n[Software System]\\nServes Markdown docs\\nand diagrams", "type": "box",    "color": "c-blue" },',
  '    { "name": "Developer\\n[Person]\\nBrowses and edits\\nproject docs",                        "type": "actor",  "color": "c-gray" },',
  '    { "name": "Local filesystem\\n[Datastore]\\nHosts .md files and\\ndiagrams.json",           "type": "database","color": "c-teal" }',
  '  ],',
  '  "edges": [',
  '    { "from": "Developer\\n[Person]\\nBrowses and edits\\nproject docs",                         "to": "Living Documentation\\n[Software System]\\nServes Markdown docs\\nand diagrams", "label": "reads and edits docs via" },',
  '    { "from": "Living Documentation\\n[Software System]\\nServes Markdown docs\\nand diagrams", "to": "Local filesystem\\n[Datastore]\\nHosts .md files and\\ndiagrams.json",         "label": "reads from / writes to" }',
  '  ]',
  '}',
  '```',
  '',
  `## Available shapes and colors`,
  `Shapes: ${SHAPE_LIST}.`,
  `Colors: ${COLOR_LIST}.`,
  '',
  GUIDE_HINT,
].join('\n');

const CREATE_DOCUMENT_DESCRIPTION = [
  'Create a new Markdown document. The filename is generated automatically from the configured pattern (date + category + title slug). Pass `content` as full Markdown; omit to create an empty stub.',
  '',
  '## Source-of-truth contract',
  'Documents are the source of truth. Diagrams are derived views. If a diagram needs a concept that isn\'t documented, create or update the document first (here) before calling `create_diagram`.',
  '',
  '## Worked example',
  '```json',
  '{',
  '  "title":    "Payment system context",',
  '  "category": "Architecture",',
  '  "folder":   "adrs",',
  '  "content":  "# Payment system context\\n\\n**status:** Accepted\\n**tags:** context, payment\\n\\nThe system integrates with Stripe for card capture and pre-authorization..."',
  '}',
  '```',
  '',
  GUIDE_HINT,
].join('\n');

const TOOLS = [
  {
    name: 'get_server_guide',
    description: 'Return the living-documentation server guide: purpose, mandatory workflow, scope rules (context vs container/UML), diagram conventions, node/edge format, and coordinate system. Call this first whenever you are unsure how to use the server.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'list_documents',
    description: `List all documents with their id, title, category, and folder. Documents are the source of truth — read them before creating or updating any diagram. ${GUIDE_HINT}`,
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'read_document',
    description: `Read the raw Markdown content of a document by its id. Use this to gather facts (actors, systems, flows) before creating a diagram. Ignore documents whose frontmatter contains \`status: SuperSeeded\`. ${GUIDE_HINT}`,
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
    description: CREATE_DOCUMENT_DESCRIPTION,
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
    description: `List all saved diagrams with their id and title. Always call this before \`create_diagram\` — if a relevant diagram already exists, pass its id back to \`create_diagram\` to update rather than duplicate. ${GUIDE_HINT}`,
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'read_diagram',
    description: `Read the nodes and edges of an existing diagram by its id. Returns the diagram in the same format accepted by \`create_diagram\`, ready to be modified and passed back. ${GUIDE_HINT}`,
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Diagram id as returned by list_diagrams' },
      },
      required: ['id'],
    },
  },
  {
    name: 'create_diagram',
    description: CREATE_DIAGRAM_DESCRIPTION,
    inputSchema: {
      type: 'object',
      properties: {
        id:    { type: 'string', description: 'Optional: existing diagram id to overwrite. If omitted, a new diagram is created.' },
        title: { type: 'string', description: 'Diagram title' },
        diagramType: {
          type: 'string',
          enum: ['context', 'container', 'component', 'uml', 'flow', 'erd', 'screen-guide', 'other'],
          description: 'Type of diagram. "context" is the default. "container", "component", "uml", and "screen-guide" require explicit user request — set `userRequestedExplicitly: true` alongside them.',
        },
        userRequestedExplicitly: {
          type: 'boolean',
          description: 'Set to true only when the user explicitly asked for a container, component, UML, or screen-guide diagram by name. Required for those diagramType values; ignored for "context".',
        },
        nodes: {
          type: 'array',
          description: 'List of nodes. Node labels should follow the C4 convention: "Name\\n[Type]\\nShort description".',
          items: {
            type: 'object',
            properties: {
              name:            { type: 'string', description: 'Node label shown in the diagram. Use \\n for line breaks. C4 format: "Name\\n[Type]\\nDescription".' },
              type:            { type: 'string', description: `Shape type: ${SHAPE_LIST}.` },
              color:           { type: 'string', description: `Color key, e.g. c-blue or "blue". Available: ${COLOR_LIST}.` },
              x:               { type: 'number', description: 'Optional canvas X (0 = center). Omit to auto-lay out. When provided, use multiples of 40.' },
              y:               { type: 'number', description: 'Optional canvas Y (0 = center, positive = down). Omit to auto-lay out. When provided, use multiples of 40.' },
              linkedDiagramId: { type: 'string', description: 'Optional: id of another diagram to navigate to when clicking this node (C4 drill-down).' },
              imageSrc:        { type: 'string', description: 'Required when `type` is "image". URL path returned by POST /api/images/upload (e.g. "/images/foo.png").' },
            },
            required: ['name', 'type'],
          },
        },
        edges: {
          type: 'array',
          description: 'List of directed edges between nodes. Every edge should have a `label` describing the interaction (verb phrase).',
          items: {
            type: 'object',
            properties: {
              from:  { type: 'string', description: 'Name of the source node (must match a node `name` exactly)' },
              to:    { type: 'string', description: 'Name of the target node (must match a node `name` exactly)' },
              label: { type: 'string', description: 'Edge label — verb phrase describing the interaction. Strongly recommended; missing labels produce warnings.' },
            },
            required: ['from', 'to'],
          },
        },
      },
      required: ['title', 'diagramType', 'nodes', 'edges'],
    },
  },
  {
    name: 'list_source_files',
    description: [
      'List files under the project `sourceRoot` (configured in `.living-doc.json`, defaults to the parent folder of the docs directory).',
      '',
      'Use this tool as a **fallback** when the Markdown documentation lacks a specific low-level detail needed for a diagram — for example, when generating a screen-guide diagram or when documenting a piece of code that has no ADR. For architectural facts, read documents first.',
      '',
      'Common ignored folders are skipped automatically (`node_modules`, `dist`, `.git`, `build`, `target`, etc.).',
    ].join('\n'),
    inputSchema: {
      type: 'object',
      properties: {
        pattern:    { type: 'string', description: 'Optional glob-like pattern matched against the relative path. Supports `*` (within a segment) and `**` (across segments). Example: `src/**/*.ts`.' },
        maxResults: { type: 'number', description: 'Max number of files to return (default 500, hard cap 2000).' },
      },
    },
  },
  {
    name: 'read_source_file',
    description: [
      'Read a source file under the project `sourceRoot`. Path must be relative to `sourceRoot`.',
      '',
      'Use this **only after** you have tried the documentation tools (`list_documents` / `read_document`). If you find yourself reading more than 3 source files for the same diagram, stop and update the documentation first — the docs are the source of truth.',
      '',
      'Files larger than 512 KB are rejected; use `search_source` to locate the relevant section.',
    ].join('\n'),
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path relative to `sourceRoot`, e.g. `src/frontend/index.html`.' },
      },
      required: ['path'],
    },
  },
  {
    name: 'search_source',
    description: [
      'Grep-like text search across files under the project `sourceRoot`.',
      '',
      'Preferred over `read_source_file` when you only need to locate a symbol, identifier, or string. Returns `{ file, line, text }` matches.',
    ].join('\n'),
    inputSchema: {
      type: 'object',
      properties: {
        query:         { type: 'string',  description: 'Substring to match (plain text, not regex).' },
        pattern:       { type: 'string',  description: 'Optional glob to restrict the search (e.g. `src/**/*.ts`).' },
        caseSensitive: { type: 'boolean', description: 'Default false.' },
        maxResults:    { type: 'number',  description: 'Max number of matches to return (default 200, hard cap 1000).' },
      },
      required: ['query'],
    },
  },
] as const;

// ── MCP Prompts ────────────────────────────────────────────────────────────────
// Prompt templates guide the LLM to produce well-structured create_diagram
// calls. Layout work (positions, types, colors) happens on the caller's side —
// zero tokens consumed by the server.

const PROMPTS = [
  {
    name: 'generate-context-diagram',
    description: 'DEFAULT. Generate a C4 System Context diagram — one system in the center, surrounding users and external systems. Safe to auto-invoke when the user asks for "a diagram", "the big picture", or "documentation".',
    arguments: [
      { name: 'scope', description: 'Optional: name of the system to put at the center. Inferred from the docs if omitted.', required: false },
    ],
  },
  {
    name: 'generate-container-diagram',
    description: 'EXPLICIT-ONLY. Generate a C4 Container diagram (internal containers of a single system). Invoke this only when the user explicitly asks for a "container diagram".',
  },
  {
    name: 'generate-uml-diagram',
    description: 'EXPLICIT-ONLY. Generate a UML diagram. Invoke this only when the user explicitly asks for a "UML diagram" by name.',
    arguments: [
      { name: 'umlType', description: 'UML variant: class, sequence, state, activity, or use-case.', required: true },
    ],
  },
  {
    name: 'update-diagram-from-docs',
    description: 'Re-read source documents and update existing diagrams so they reflect the current state of the documentation. Accepts an optional diagramId to target a single diagram.',
    arguments: [
      { name: 'diagramId', description: 'Optional: id of a single diagram to update. If omitted, all diagrams are inspected.', required: false },
    ],
  },
  {
    name: 'generate-screen-guide',
    description: 'EXPLICIT-ONLY. Generate an annotated UI guide: a screenshot image as the background with post-it notes describing each UI element. Reads the source code of the screen (HTML/JSX/template). Invoke only when the user explicitly asks for a "screen guide", "UI guide", or "annotated screenshot".',
    arguments: [
      { name: 'screenFile',    description: 'Relative path (under sourceRoot) of the screen source file to document, e.g. `src/frontend/index.html`.', required: true },
      { name: 'screenshotUrl', description: 'Optional: URL of the uploaded screenshot (e.g. `/images/index-2026.png`). If omitted, the prompt will instruct the user to upload one via the Admin UI first.', required: false },
    ],
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

## C4 progression — mandatory ordering

C4 diagrams must be created in strict order:

1. **Context first** — the entry point when scanning a project's docs for the first time.
   It answers: what is the system, who uses it, what external systems does it integrate with?
2. **Container after** — a drill-down created only when a Context diagram already exists
   **and** the reader explicitly asks to go deeper into a specific system.
3. **Component after that** — same rule, only after a Container exists.

**When reading docs for the first time, always create the Context diagram.**
Never jump to Container or Component as the first diagram for a system.

## Linked diagrams — C4 drill-down

Any node can link to an **already-existing** diagram for navigation (e.g. Context → Container → Component).

**Workflow:**
1. Call \`list_diagrams\`.
2. If a relevant child diagram already exists, add \`linkedDiagramId: "<id>"\` on the matching node.
3. If no child diagram exists, leave \`linkedDiagramId\` unset.

**RULE — never create child diagrams automatically.**
Container and Component diagrams are only created on explicit user request for a specific scope.
Do not create them as a side effect of creating a Context diagram.

Clicking a linked node in the editor navigates directly to the child diagram.
`.trim();

function buildPromptTemplate(name: PromptName, args: Record<string, string>): string {
  switch (name) {
    case 'generate-context-diagram':
      return `
${PREAMBLE}

---

You are about to create a **C4 System Context Diagram** following Simon Brown's C4 model.

## Step 1 — Answer these three questions first (ask the user only if not found in docs)

1. **Scope** — What is the software system we are describing?${args.scope ? ` (The user specified: **${args.scope}**.)` : ' What is its name and primary responsibility?'}
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
- Keep the diagram under ~10 nodes total.

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

## Step 3 — Call \`create_diagram\` with \`diagramType: "context"\`.
`.trim();

    case 'generate-container-diagram':
      return `
${PREAMBLE}

---

You are about to create a **C4 Container Diagram** following Simon Brown's C4 model.

## ⚠️ Explicit-request check
Only proceed if the user explicitly asked for a *container* diagram. If the request was generic ("a diagram", "the big picture"), stop and use \`generate-context-diagram\` instead.

## ⚠️ Pre-flight check — mandatory before anything else

1. Call \`list_diagrams\`.
2. If **no C4 Context diagram exists** for the target system → **stop here**.
   - Inform the user that a Context diagram must be created first.
   - Create the Context diagram using the \`generate-context-diagram\` prompt rules.
   - Do not create the Container diagram in this session.
3. Only proceed to the Container diagram if a Context diagram already exists.

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
- **Cache / Queue**: x: 320, y: -80. Type: ellipse. Color: c-amber.
- **External actor** (user): x: -560, y: 0. Type: actor. Color: c-gray.
- **External system**: x: 0, y: 240. Type: box. Color: c-slate.
- Spread additional containers vertically by multiples of 160.
- All positions must be multiples of 40.

### Edge rules
- Label every edge with the protocol or action: "HTTPS", "SQL", "REST", "publishes", "subscribes"…

## Step 3 — Call \`create_diagram\` with \`diagramType: "container"\` and \`userRequestedExplicitly: true\`.
`.trim();

    case 'generate-uml-diagram': {
      const umlType = (args.umlType || '').trim().toLowerCase() || 'class';
      return `
${PREAMBLE}

---

You are about to create a **UML ${umlType} diagram**.

## ⚠️ Explicit-request check
Only proceed if the user explicitly asked for a *UML* diagram by name. Otherwise use \`generate-context-diagram\` instead.

## Step 1 — Gather the facts from docs

Read the documents relevant to the UML ${umlType} diagram. For each element you plan to put on the diagram, make sure it exists in the documentation. Do not invent classes, states, or actors absent from the docs.

## Step 2 — Apply the UML ${umlType} conventions

${umlTypeGuidance(umlType)}

### Common rules (all UML variants)
- Each edge must have a label describing the relationship or transition.
- Keep labels short; use C4-style multi-line labels for class/component descriptions when helpful.
- Use multiples of 40 for positions. Origin (0,0) = canvas center.

## Step 3 — Call \`create_diagram\` with \`diagramType: "uml"\` and \`userRequestedExplicitly: true\`.
`.trim();
    }

    case 'update-diagram-from-docs':
      return `
${PREAMBLE}

---

You are about to **update ${args.diagramId ? `diagram \`${args.diagramId}\`` : 'all existing diagrams'}** to reflect the current state of the documentation.

## Step 1 — Inventory existing diagrams

${args.diagramId
  ? `1. Call \`read_diagram\` with id \`${args.diagramId}\` to load its current nodes and edges.`
  : `1. Call \`list_diagrams\` to get all diagrams with their id and title.
2. For each diagram, call \`read_diagram\` to load its current nodes and edges.`}

## Step 2 — Gather current architecture knowledge

1. Call \`list_documents\` to get all documents.
2. Read the documents that are architecturally significant (ADRs, README, guides with integration or architecture tags).
3. Ignore any document whose frontmatter contains \`status: SuperSeeded\`.

## Step 3 — Compare and update

For each diagram in scope:

1. **Identify the diagram type** from its title and content (Context, Container, Flow, ERD, UML…).
2. **Compare** its nodes and edges against the current documentation:
   - New containers, systems, or actors mentioned in the docs but missing?
   - Nodes that no longer exist or have been renamed?
   - Edge labels still accurate?
3. **If up to date** → skip it, report "no changes needed".
4. **If changes are needed** → call \`create_diagram\` with:
   - The **same \`id\`** as the existing diagram (overwrites it in place).
   - The same \`diagramType\`. For non-context types, include \`userRequestedExplicitly: true\` since the user is explicitly updating that diagram.
   - The same title unless a rename is warranted.
   - Updated nodes and edges, preserving \`x\`/\`y\` positions of unchanged nodes.

## Step 4 — Report

Summarize which diagrams were updated (and what changed) and which were skipped (already up to date).
`.trim();

    case 'flow':
      return `
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

## Step 3 — Call \`create_diagram\` with \`diagramType: "flow"\`.
`.trim();

    case 'erd':
      return `
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

## Step 3 — Call \`create_diagram\` with \`diagramType: "erd"\`.
`.trim();

    case 'generate-screen-guide': {
      const screenFile = (args.screenFile || '').trim();
      const screenshotUrl = (args.screenshotUrl || '').trim();
      return `
## Screen-guide diagram — source code IS the reference

A screen guide documents a concrete UI screen with post-it annotations overlaid on a screenshot. **The source code is the authoritative reference**, not the Markdown documentation. No ADR describes every button.

## ⚠️ Explicit-request check
Only proceed if the user explicitly asked for a *screen guide*, *UI guide*, or *annotated screenshot*.

## Step 1 — Resolve the screen source

${screenFile
  ? `The user specified \`${screenFile}\`. Call \`read_source_file\` with \`path: "${screenFile}"\`.`
  : `Ask the user which screen to document (e.g. \`src/frontend/index.html\`). Then call \`read_source_file\` on it.`}

If the screen pulls in components or partials, use \`search_source\` + \`read_source_file\` to follow them. Cap at ~5 files total — you only need enough to identify first-level features, not to trace every dependency.

## Step 2 — Detect first-level features (YOU decide the list, do not ask the user)

A **first-level feature** is:
- **Visible on screen** without any interaction (a button, toggle, input, primary navigation element, filter).
- **Changes user-facing behavior significantly** when used (navigates, filters, toggles mode, opens a panel, searches).

NOT a first-level feature:
- Decorative elements (logos, dividers, icons without action).
- Controls nested inside a panel/modal that only appears after clicking something.
- Pure labels / static text.
- Duplicate controls (if the same action has two buttons, count it once).

Typical count: **4–10** features. Do not pad with minor buttons; do not omit obvious ones.

For each feature, capture:
- \`name\` — short label, **2–5 words**, title-cased ("Collapsible Drawer", "Dark / Light Mode", "Text Search in all documents"). No multi-line description.
- \`targets\` — a quick note of which UI element it points to (used later for placement).

## Step 3 — Request the screenshot and WAIT

Once you have the feature list, tell the user:

> I identified N first-level features in \`<file>\`: [comma-separated names].
> I now need a screenshot of this screen. Two options:
> (a) Save the PNG into \`./documentation/images/<name>.png\` inside your docs folder.
> (b) Paste or drop the image into any existing diagram in the editor — it uploads automatically and gives you a URL like \`/images/xxx.png\`.
> Reply with the resulting URL.

**Then stop.** Do not call \`create_diagram\` yet. Wait for the user to reply with the URL.

${screenshotUrl
  ? `(The user already provided \`${screenshotUrl}\` as an argument — you can skip the wait and use that URL directly.)`
  : ''}

## Step 4 — Build the diagram

### Nodes

**1. One image node**, serving as the background:
- \`type: "image"\`
- \`name: "screenshot"\` (used as edge anchor; not displayed — the image renderer ignores the label)
- \`imageSrc: "<URL provided by the user>"\`
- \`x: 0\`, \`y: 0\`
- Size: match or exceed the natural screenshot size (e.g. 900×600 or larger). Bigger is fine — arrows will still read correctly.

**2. One post-it node per first-level feature** from Step 2:
- \`type: "post-it"\`
- \`name\`: the 2–5 word feature name from Step 2 (no description, no line breaks)
- \`color\`: rotate through \`c-lime, c-amber, c-sky, c-rose, c-teal, c-green\`. Never give two adjacent post-its the same color.
- **Placement**: around the image, roughly aligned with the target UI element on the screenshot so the arrow reads naturally:
  - Features in the top area of the screen → post-its above the image (\`y ≈ -320\` to \`-400\`)
  - Features in the bottom area → below (\`y ≈ 320\` to \`400\`)
  - Left sidebar features → left column (\`x ≈ -560\`, spread on y)
  - Right-side features → right column (\`x ≈ 560\`, spread on y)
- Spread x positions by \`240\` steps, y positions by \`160\` steps. All positions are multiples of 40.

### Edges

- One directed edge **per post-it**, \`from: "<post-it name>"\` → \`to: "screenshot"\`.
- \`label\`: leave empty. The arrow alone points to the UI element. Screen-guide edges are exempt from the "must have label" warning.

## Step 5 — Call \`create_diagram\`

\`\`\`json
{
  "diagramType": "screen-guide",
  "userRequestedExplicitly": true,
  "title": "Screen guide — <screen name>",
  "nodes": [ /* image + post-its */ ],
  "edges": [ /* one post-it → screenshot per feature */ ]
}
\`\`\`
`.trim();
    }
  }
}

function umlTypeGuidance(umlType: string): string {
  switch (umlType) {
    case 'class':
      return `### UML class diagram
- Each class is a \`box\` (c-blue for domain classes, c-green for value objects, c-slate for interfaces).
- Node label: \`ClassName\\n[Class]\\n+ attr: Type\\n+ method(): Type\`.
- Edges: label relationships as "extends", "implements", "has 1", "has *", "uses".`;
    case 'sequence':
      return `### UML sequence diagram
- Each participant is a \`box\` (c-blue for systems, c-gray for actors).
- Arrange participants left-to-right at the same y (spacing 200).
- Edges are messages; the label is the method/event name and uses arrows top-down by ordering the edges in the array chronologically.`;
    case 'state':
      return `### UML state diagram
- Each state is an \`ellipse\` (c-amber).
- Start and end states are \`circle\` (c-slate for end, c-green for start).
- Edges are transitions; label with the event/trigger.`;
    case 'activity':
      return `### UML activity diagram
- Activities are \`box\` (c-blue).
- Decision nodes are \`ellipse\` (c-amber).
- Start/end are \`circle\` (c-green/c-slate).
- Edges labeled with the guard or action.`;
    case 'use-case':
    case 'usecase':
      return `### UML use-case diagram
- Actors are \`actor\` (c-gray) on the left (x: -320).
- Use cases are \`ellipse\` (c-blue) in the center.
- The system boundary is implied by grouping — no explicit box needed.
- Edges between actor and use case labeled with the action ("initiates", "participates in").`;
    default:
      return `### UML ${umlType} diagram\nFollow the standard UML conventions for \`${umlType}\` diagrams. Use \`box\`, \`ellipse\`, \`actor\`, \`circle\`, or \`database\` shapes as appropriate; label every edge.`;
  }
}

function createMcpServer(docsPath: string): Server {
  const server = new Server(
    { name: 'living-documentation', version: '1.0.0' },
    {
      capabilities: { tools: {}, prompts: {} },
      instructions: SERVER_GUIDE,
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

  server.setRequestHandler(ListPromptsRequestSchema, async () => ({ prompts: PROMPTS }));

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const name = request.params.name as PromptName;
    const prompt = PROMPTS.find(p => p.name === name);
    if (!prompt) throw new Error(`Unknown prompt: ${name}`);
    const args = (request.params.arguments ?? {}) as Record<string, string>;
    const text = buildPromptTemplate(name, args);
    return {
      description: prompt.description,
      messages: [{ role: 'user' as const, content: { type: 'text' as const, text } }],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;
    try {
      switch (name) {
        case 'get_server_guide':
          return { content: [{ type: 'text' as const, text: SERVER_GUIDE }] };
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
        case 'read_diagram':
          return toolReadDiagram(docsPath, args as { id: string });
        case 'create_diagram':
          return toolCreateDiagram(docsPath, args as {
            id?: string;
            title: string;
            diagramType: string;
            userRequestedExplicitly?: boolean;
            nodes: Array<{ name: string; type: string; color?: string; x?: number; y?: number; linkedDiagramId?: string; imageSrc?: string }>;
            edges: Array<{ from: string; to: string; label?: string }>;
          });
        case 'list_source_files':
          return toolListSourceFiles(docsPath, args as { pattern?: string; maxResults?: number });
        case 'read_source_file':
          return toolReadSourceFile(docsPath, args as { path: string });
        case 'search_source':
          return toolSearchSource(docsPath, args as {
            query: string; pattern?: string; maxResults?: number; caseSensitive?: boolean;
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
