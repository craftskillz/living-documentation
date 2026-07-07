import fs from 'node:fs';
import path from 'node:path';
import type { APIRequestContext } from '@playwright/test';
import { test, expect } from '../helpers/ld-fixture';
import { callTool, getPrompt, listTools, listPrompts } from '../helpers/mcp';

type McpDocumentSummary = { id: string; title: string; category: string; folder: string | null };
type ListDocumentsResult = {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  nextPage: number | null;
  folder: string | null;
  documents: McpDocumentSummary[];
};

async function listDocuments(
  request: APIRequestContext,
  baseURL: string,
  args: Record<string, unknown> = {},
): Promise<ListDocumentsResult> {
  return callTool<ListDocumentsResult>(request, baseURL, 'list_documents', args);
}

test('tools/list exposes the expected tool set', async ({ request, ld }) => {
  const tools = await listTools(request, ld.baseURL);
  const names = tools.map((t) => t.name).sort();
  expect(names).toEqual(
    expect.arrayContaining([
      'list_documents',
      'read_document',
      'create_document',
      'generate_image',
      'list_diagrams',
      'read_diagram',
      'create_diagram',
      'list_blueprint_box',
      'list_source_files',
      'read_source_file',
      'search_source',
      'list_metadata',
      'get_accuracy',
      'review_adr_relevance',
      'list_adrs_below_accuracy',
      'add_metadata',
      'refresh_metadata',
      'retrodocument_adrs_from_git',
      'build_context',
    ]),
  );
});

test('prompts/list exposes the workflow and diagram-generation prompts over Streamable HTTP', async ({ request, ld }) => {
  const prompts = await listPrompts(request, ld.baseURL);
  const names = prompts.map((p) => p.name);
  expect(names).toEqual(
    expect.arrayContaining([
      'audit-adrs-drift',
      'review-adr-relevance',
      'create-adr',
      'generate-context-diagram',
      'generate-container-diagram',
      'generate-uml-diagram',
      'generate-screen-guide',
      'flow',
      'erd',
    ]),
  );
});

test('prompts/get returns the create-adr and audit-adrs-drift templates over Streamable HTTP', async ({ request, ld }) => {
  const createAdr = await getPrompt(request, ld.baseURL, 'create-adr', {
    featureSummary: 'Neon browser obstacle game',
    modifiedFiles: 'index.html',
  });
  expect(createAdr.messages[0].content.text).toContain('record an **ADR');
  expect(createAdr.messages[0].content.text).toContain('Neon browser obstacle game');
  expect(createAdr.messages[0].content.text).toContain('create_document');
  expect(createAdr.messages[0].content.text).toContain('add_metadata');

  const audit = await getPrompt(request, ld.baseURL, 'audit-adrs-drift');
  expect(audit.messages[0].content.text).toContain('list_adrs_below_accuracy');
  expect(audit.messages[0].content.text).toContain('review_adr_relevance');
  expect(audit.messages[0].content.text).toContain('refresh_metadata');
  expect(audit.messages[0].content.text).toContain('update_document');

  const reviewAdr = await getPrompt(request, ld.baseURL, 'review-adr-relevance', {
    id: 'ADRS/2026_01_02_10_00_[ARCHITECTURE]_sample_metadata_adr',
  });
  expect(reviewAdr.messages[0].content.text).toContain('review_adr_relevance');
  expect(reviewAdr.messages[0].content.text).toContain('read_source_file');
  expect(reviewAdr.messages[0].content.text).toContain('Never supersede without explicit user confirmation');
});

test('list_documents returns the three fixture docs', async ({ request, ld }) => {
  const result = await listDocuments(request, ld.baseURL);
  expect(result).toEqual(expect.objectContaining({
    total: 3,
    page: 1,
    pageSize: 50,
    totalPages: 1,
    hasNextPage: false,
    nextPage: null,
    folder: null,
  }));
  const titles = result.documents.map((d) => d.title).sort();
  expect(titles).toEqual(['Advanced', 'Intro', 'Quickstart']);
});

test('read_document returns raw markdown content for a specific doc', async ({ request, ld }) => {
  const { documents } = await listDocuments(request, ld.baseURL);
  const intro = documents.find((d) => d.title === 'Intro');
  expect(intro).toBeDefined();
  // read_document returns the raw markdown as a text-content response, not JSON.
  const content = await callTool<string>(request, ld.baseURL, 'read_document', {
    id: intro?.id,
  });
  expect(content).toContain('# Introduction');
});

test('update_document overwrites an existing document with multiline markdown', async ({ request, ld }) => {
  const { documents } = await listDocuments(request, ld.baseURL);
  const intro = documents.find((d) => d.title === 'Intro');
  expect(intro).toBeDefined();

  const updatedContent = [
    '---',
    '**date:** 2026-01-01',
    '**status:** To be validated',
    '**description:** Update document MCP regression coverage.',
    '**tags:** mcp, update_document, markdown, regression',
    '---',
    '',
    '# Updated through MCP',
    '',
    'This body contains shell-sensitive characters that must stay data:',
    '',
    '- backticks: `publish.yml` and `zizmor: ignore[cache-poisoning]`',
    '- brackets: [CI] and [cache-poisoning]',
    '- quotes: "double" and \'single\'',
    '',
  ].join('\n');

  const result = await callTool<{ success: boolean; id: string; bytes: number }>(
    request,
    ld.baseURL,
    'update_document',
    { id: intro?.id, content: updatedContent },
  );

  expect(result).toEqual({
    success: true,
    id: intro?.id,
    bytes: Buffer.byteLength(updatedContent, 'utf-8'),
  });

  const reread = await callTool<string>(request, ld.baseURL, 'read_document', {
    id: intro?.id,
  });
  expect(reread).toBe(updatedContent);
  expect(fs.readFileSync(path.join(ld.docsAbs, `${decodeURIComponent(intro?.id)}.md`), 'utf-8')).toBe(updatedContent);
});

test('create_document writes a new .md file through the MCP server', async ({
  request,
  ld,
}) => {
  await callTool(request, ld.baseURL, 'create_document', {
    title: 'Via MCP',
    category: 'MCP',
    content: '# Via MCP\n\nHello from the tool call.\n',
  });
  const newFile = fs
    .readdirSync(ld.docsAbs)
    .find((f: string) => f.includes('via_mcp') && f.endsWith('.md'));
  expect(newFile).toBeDefined();
  expect(fs.readFileSync(path.join(ld.docsAbs, newFile!), 'utf-8')).toContain('Hello from the tool call');
});

test('list_blueprint_box returns immediate folder and file names with source paths', async ({
  request,
  ld,
}) => {
  const sourceRoot = path.dirname(ld.docsAbs);
  fs.mkdirSync(path.join(sourceRoot, 'tests/api/fixtures'), { recursive: true });
  fs.mkdirSync(path.join(sourceRoot, 'tests/api/helpers'), { recursive: true });
  fs.mkdirSync(path.join(sourceRoot, 'tests/api/.cache'), { recursive: true });
  fs.writeFileSync(path.join(sourceRoot, 'tests/api/documents.spec.ts'), 'export const docs = true;\n', 'utf-8');
  fs.writeFileSync(path.join(sourceRoot, 'tests/api/mcp.spec.ts'), 'export const mcp = true;\n', 'utf-8');
  fs.writeFileSync(path.join(sourceRoot, 'tests/api/.hidden'), 'hidden\n', 'utf-8');

  const result = await callTool<{
    sourceRoot: string;
    path: string;
    folders: Array<{ name: string; path: string }>;
    files: Array<{ name: string; path: string }>;
  }>(request, ld.baseURL, 'list_blueprint_box', { path: 'tests/api' });

  expect(result.sourceRoot).toBe(sourceRoot);
  expect(result.path).toBe('tests/api');
  expect(result.folders).toEqual([
    { name: 'fixtures', path: 'tests/api/fixtures' },
    { name: 'helpers', path: 'tests/api/helpers' },
  ]);
  expect(result.files).toEqual([
    { name: 'documents.spec.ts', path: 'tests/api/documents.spec.ts' },
    { name: 'mcp.spec.ts', path: 'tests/api/mcp.spec.ts' },
  ]);
});

test('list_blueprint_box rejects paths outside sourceRoot', async ({ request, ld }) => {
  await expect(callTool(request, ld.baseURL, 'list_blueprint_box', { path: '../outside' }))
    .rejects.toThrow(/path escapes sourceRoot|MCP tool error/i);
});

test.describe('diagram MCP tools on the with-diagrams fixture', () => {
  test.use({ fixtureName: 'with-diagrams' });

  test('list_diagrams returns id/title pairs from .diagrams.json', async ({ request, ld }) => {
    const diagrams = await callTool<Array<{ id: string; title: string }>>(
      request,
      ld.baseURL,
      'list_diagrams',
    );
    expect(diagrams).toEqual([{ id: 'diag-1', title: 'Sample Diagram' }]);
  });

  test('read_diagram returns nodes, edges, and persisted editor style fields', async ({
    request,
    ld,
  }) => {
    const result = await callTool<{
      edgesStraight: boolean;
      gridEnabled: boolean;
      alignGuides: boolean;
      nodes: Array<{ name: string }>;
      edges: Array<unknown>;
    }>(
      request,
      ld.baseURL,
      'read_diagram',
      { id: 'diag-1' },
    );
    expect(result.edgesStraight).toBe(false);
    expect(result.gridEnabled).toBe(true);
    expect(result.alignGuides).toBe(true);
    expect(result.nodes.map((n) => n.name).sort()).toEqual(['End', 'Start']);
    expect(result.edges).toHaveLength(1);
  });

  test('create_diagram applies MCP editor style defaults and inferred ports', async ({
    request,
    ld,
  }) => {
    await callTool(request, ld.baseURL, 'create_diagram', {
      id: 'mcp-style-defaults',
      title: 'MCP Style Defaults',
      diagramType: 'context',
      nodes: [
        { name: 'App\n[Software System]\nRuns work', type: 'box', color: 'c-blue', x: 0, y: 0 },
        { name: 'Billing\n[External System]\nCharges cards', type: 'box', color: 'c-slate', x: 240, y: 0 },
        { name: 'CRM\n[External System]\nStores a deliberately longer business profile', type: 'box', color: 'c-slate', x: 240, y: 160 },
        { name: 'Store\n[Database]\nPersists state', type: 'database', color: 'c-teal', x: 0, y: 160 },
      ],
      edges: [
        { from: 'App\n[Software System]\nRuns work', to: 'Billing\n[External System]\nCharges cards', label: 'charges via' },
        { from: 'App\n[Software System]\nRuns work', to: 'Store\n[Database]\nPersists state', label: 'reads and writes documents to' },
        {
          from: 'CRM\n[External System]\nStores a deliberately longer business profile',
          to: 'App\n[Software System]\nRuns work',
          label: 'synchronizes account lifecycle and segmentation data with',
          arrowDir: 'both',
        },
      ],
    });

    const diagrams = JSON.parse(fs.readFileSync(path.join(ld.docsAbs, '.diagrams.json'), 'utf-8'));
    const diagram = diagrams.find((d: { id: string }) => d.id === 'mcp-style-defaults');
    expect(diagram).toMatchObject({
      edgesStraight: false,
      gridEnabled: false,
      alignGuides: true,
    });

    expect(diagram.nodes[0]).toMatchObject({
      fontSize: null,
      textAlign: null,
      textValign: null,
      bgOpacity: null,
      rotation: 0,
      labelRotation: 0,
      imageSrc: null,
      groupId: null,
      nodeLink: null,
      locked: false,
    });
    expect(diagram.nodes[1].nodeWidth).toBe(diagram.nodes[2].nodeWidth);

    expect(diagram.edges[0]).toMatchObject({
      arrowDir: 'to',
      dashes: false,
      fontSize: 12,
      fromPort: 'E',
      toPort: 'W',
      edgeLabelWidth: 80,
      edgeLabelOffsetX: 0,
      edgeLabelOffsetY: 0,
      edgeColor: null,
      edgeWidth: null,
      edgeLocked: false,
    });
    expect(diagram.edges[1]).toMatchObject({
      fromPort: 'S',
      toPort: 'N',
      edgeLabelWidth: 95,
    });
    expect(diagram.edges[2]).toMatchObject({
      arrowDir: 'both',
      fontSize: 11,
      edgeLabelWidth: 105,
    });

    const readBack = await callTool<{
      gridEnabled: boolean;
      edges: Array<{ arrowDir: string; edgeLabelWidth: number; fromPort: string; toPort: string }>;
    }>(
      request,
      ld.baseURL,
      'read_diagram',
      { id: 'mcp-style-defaults' },
    );
    expect(readBack.gridEnabled).toBe(false);
    expect(readBack.edges[2]).toMatchObject({
      arrowDir: 'both',
      edgeLabelWidth: 105,
      fromPort: 'W',
      toPort: 'E',
    });
  });

  test('create_diagram assigns deterministic context positions when coordinates are omitted', async ({
    request,
    ld,
  }) => {
    await callTool(request, ld.baseURL, 'create_diagram', {
      id: 'mcp-deterministic-context-layout',
      title: 'MCP Deterministic Context Layout',
      diagramType: 'context',
      nodes: [
        { name: 'Customer', kind: 'person', description: 'Uses the service' },
        { name: 'Admin', kind: 'person', description: 'Operates the backoffice' },
        { name: 'App', kind: 'software_system', description: 'Coordinates work' },
        { name: 'Billing', kind: 'external_system', description: 'Charges cards' },
        { name: 'CRM', kind: 'external_system', description: 'Stores customer profiles' },
        { name: 'Store', kind: 'database', description: 'Persists state' },
      ],
      edges: [
        { from: 'Customer', to: 'App', label: 'uses' },
        { from: 'Admin', to: 'App', label: 'operates' },
        { from: 'App', to: 'Billing', label: 'charges cards via' },
        { from: 'App', to: 'CRM', label: 'syncs accounts with' },
        { from: 'App', to: 'Store', label: 'persists state in' },
      ],
    });

    const diagrams = JSON.parse(fs.readFileSync(path.join(ld.docsAbs, '.diagrams.json'), 'utf-8'));
    const diagram = diagrams.find((d: { id: string }) => d.id === 'mcp-deterministic-context-layout');
    const positions = Object.fromEntries(
      diagram.nodes.map((node: { label: string; x: number; y: number; nodeWidth: number }) => [
        node.label.split('\n')[0],
        { x: node.x, y: node.y, nodeWidth: node.nodeWidth },
      ]),
    );

    expect(positions.Customer).toMatchObject({ x: -880, y: -120 });
    expect(positions.Admin).toMatchObject({ x: -880, y: 160 });
    expect(positions.App).toMatchObject({ x: -280, y: 0 });
    expect(positions.Billing.x).toBe(920);
    expect(positions.CRM.x).toBe(920);
    expect(positions.Store.x).toBe(920);
    expect(positions.Billing.nodeWidth).toBe(positions.CRM.nodeWidth);

    expect(diagram.edges[0]).toMatchObject({ fromPort: 'E', toPort: 'W' });
    expect(diagram.edges[2]).toMatchObject({ fromPort: 'E', toPort: 'W' });
  });

  test('create_diagram assigns deterministic flow positions when coordinates are omitted', async ({
    request,
    ld,
  }) => {
    await callTool(request, ld.baseURL, 'create_diagram', {
      id: 'mcp-deterministic-flow-layout',
      title: 'MCP Deterministic Flow Layout',
      diagramType: 'flow',
      nodes: [
        { name: 'Upload', type: 'box' },
        { name: 'Pay', type: 'box' },
        { name: 'Moderate', type: 'box' },
        { name: 'Publish', type: 'box' },
      ],
      edges: [
        { from: 'Upload', to: 'Pay', label: 'continues to' },
        { from: 'Pay', to: 'Moderate', label: 'submits for' },
        { from: 'Moderate', to: 'Publish', label: 'approves' },
      ],
    });

    const diagrams = JSON.parse(fs.readFileSync(path.join(ld.docsAbs, '.diagrams.json'), 'utf-8'));
    const diagram = diagrams.find((d: { id: string }) => d.id === 'mcp-deterministic-flow-layout');
    expect(diagram.nodes.map((node: { x: number; y: number }) => ({ x: node.x, y: node.y }))).toEqual([
      { x: -480, y: 0 },
      { x: -160, y: 0 },
      { x: 160, y: 0 },
      { x: 480, y: 0 },
    ]);
    expect(diagram.edges[0]).toMatchObject({ fromPort: 'E', toPort: 'W' });
  });

  test('create_diagram accepts architectural kind separately from visual renderAs', async ({
    request,
    ld,
  }) => {
    await callTool(request, ld.baseURL, 'create_diagram', {
      id: 'mcp-kind-render',
      title: 'MCP Kind Render',
      diagramType: 'context',
      nodes: [
        {
          name: 'Stripe',
          kind: 'external_system',
          description: 'Preauthorizes and captures card payments',
          x: 240,
          y: 0,
        },
        {
          name: 'Campaign API',
          kind: 'api',
          renderAs: 'ellipse',
          description: 'Accepts scheduling commands',
          x: 0,
          y: 0,
        },
        {
          name: 'Legacy Type Node',
          type: 'database',
          color: 'c-teal',
          x: 0,
          y: 160,
        },
      ],
      edges: [
        { from: 'Campaign API', to: 'Stripe', label: 'preauthorizes payments with' },
      ],
    });

    const diagrams = JSON.parse(fs.readFileSync(path.join(ld.docsAbs, '.diagrams.json'), 'utf-8'));
    const diagram = diagrams.find((d: { id: string }) => d.id === 'mcp-kind-render');
    expect(diagram.nodes[0]).toMatchObject({
      label: 'Stripe\n[External System]\nPreauthorizes and captures card payments',
      kind: 'external_system',
      renderAs: 'box',
      shapeType: 'box',
      colorKey: 'c-slate',
      description: 'Preauthorizes and captures card payments',
    });
    expect(diagram.nodes[1]).toMatchObject({
      label: 'Campaign API\n[API]\nAccepts scheduling commands',
      kind: 'api',
      renderAs: 'ellipse',
      shapeType: 'ellipse',
      colorKey: 'c-cyan',
    });
    expect(diagram.nodes[2]).toMatchObject({
      label: 'Legacy Type Node',
      kind: null,
      renderAs: 'database',
      shapeType: 'database',
      colorKey: 'c-teal',
    });

    const readBack = await callTool<{
      nodes: Array<{ name: string; kind: string | null; renderAs: string; description: string | null }>;
      edges: Array<{ from: string; to: string }>;
    }>(
      request,
      ld.baseURL,
      'read_diagram',
      { id: 'mcp-kind-render' },
    );
    expect(readBack.nodes[0]).toMatchObject({
      name: 'Stripe\n[External System]\nPreauthorizes and captures card payments',
      kind: 'external_system',
      renderAs: 'box',
      description: 'Preauthorizes and captures card payments',
    });
    expect(readBack.edges[0]).toMatchObject({
      from: 'Campaign API\n[API]\nAccepts scheduling commands',
      to: 'Stripe\n[External System]\nPreauthorizes and captures card payments',
    });
  });

  test('create_diagram persists documentary evidence on nodes and edges', async ({
    request,
    ld,
  }) => {
    const result = await callTool<{ warnings?: string[] }>(request, ld.baseURL, 'create_diagram', {
      id: 'mcp-evidence',
      title: 'MCP Evidence',
      diagramType: 'context',
      nodes: [
        {
          name: 'DriveBox',
          kind: 'software_system',
          description: 'Coordinates campaigns',
          x: 0,
          y: 0,
          evidence: [
            {
              documentId: '2026_01_01_%5BARCHITECTURE%5D_drivebox_context',
              section: 'Decision',
              summary: 'DriveBox is the central software system.',
            },
          ],
        },
        {
          name: 'Stripe',
          kind: 'external_system',
          description: 'Handles card preauthorization',
          x: 240,
          y: 0,
        },
      ],
      edges: [
        {
          from: 'DriveBox',
          to: 'Stripe',
          label: 'preauthorizes payments via',
          evidence: [
            {
              documentId: '2026_01_02_%5BINTEGRATION%5D_stripe_payment_flow',
              section: 'Flow',
              summary: 'Stripe preauthorization happens before moderation.',
            },
          ],
        },
      ],
    });
    expect(result.warnings ?? []).not.toContain(
      'Diagram has no evidence metadata. Consider adding document references for auditability.',
    );

    const diagrams = JSON.parse(fs.readFileSync(path.join(ld.docsAbs, '.diagrams.json'), 'utf-8'));
    const diagram = diagrams.find((d: { id: string }) => d.id === 'mcp-evidence');
    expect(diagram.nodes[0].evidence).toEqual([
      {
        documentId: '2026_01_01_%5BARCHITECTURE%5D_drivebox_context',
        section: 'Decision',
        summary: 'DriveBox is the central software system.',
      },
    ]);
    expect(diagram.edges[0].evidence).toEqual([
      {
        documentId: '2026_01_02_%5BINTEGRATION%5D_stripe_payment_flow',
        section: 'Flow',
        summary: 'Stripe preauthorization happens before moderation.',
      },
    ]);

    const readBack = await callTool<{
      nodes: Array<{ evidence: Array<{ documentId: string }> }>;
      edges: Array<{ evidence: Array<{ documentId: string }> }>;
    }>(
      request,
      ld.baseURL,
      'read_diagram',
      { id: 'mcp-evidence' },
    );
    expect(readBack.nodes[0].evidence[0].documentId).toBe('2026_01_01_%5BARCHITECTURE%5D_drivebox_context');
    expect(readBack.edges[0].evidence[0].documentId).toBe('2026_01_02_%5BINTEGRATION%5D_stripe_payment_flow');
  });

  test('create_diagram warns when an architectural diagram has no evidence metadata', async ({
    request,
    ld,
  }) => {
    const result = await callTool<{ warnings?: string[] }>(request, ld.baseURL, 'create_diagram', {
      id: 'mcp-no-evidence-warning',
      title: 'MCP No Evidence Warning',
      diagramType: 'context',
      nodes: [
        { name: 'App\n[Software System]\nRuns work', type: 'box', x: 0, y: 0 },
        { name: 'Store\n[Database]\nPersists state', type: 'database', x: 240, y: 0 },
      ],
      edges: [
        { from: 'App\n[Software System]\nRuns work', to: 'Store\n[Database]\nPersists state', label: 'reads from' },
      ],
    });
    expect(result.warnings).toContain(
      'Diagram has no evidence metadata. Consider adding document references for auditability.',
    );
  });
});

test.describe('source MCP tools on the with-metadata fixture', () => {
  test.use({ fixtureName: 'with-metadata' });

  test('list_source_files walks sourceRoot and returns relative paths', async ({
    request,
    ld,
  }) => {
    const result = await callTool<{ files: string[] }>(
      request,
      ld.baseURL,
      'list_source_files',
      {},
    );
    expect(result.files).toContain('sample.ts');
  });

  test('read_source_file returns the content of a file under sourceRoot', async ({
    request,
    ld,
  }) => {
    const result = await callTool<{ content: string }>(
      request,
      ld.baseURL,
      'read_source_file',
      { path: 'sample.ts' },
    );
    expect(result.content).toContain('export function greet');
  });

  test('search_source grep-matches across source files', async ({ request, ld }) => {
    const result = await callTool<{ matches: Array<{ file: string; line: number }> }>(
      request,
      ld.baseURL,
      'search_source',
      { query: 'greet' },
    );
    expect(result.matches.some((m) => m.file === 'sample.ts')).toBe(true);
  });
});

test.describe('metadata MCP tools are read-only on SuperSeeded documents', () => {
  test.use({ fixtureName: 'with-metadata' });

  const SUPERSEEDED_ID = '2026_01_02_10_00_[ADR]_superseded';
  const ENCODED = encodeURIComponent(SUPERSEEDED_ID);

  test('list_metadata stays open: viewing bindings is always allowed', async ({ request, ld }) => {
    const listed = await callTool<{ items: Array<{ path: string }> }>(
      request,
      ld.baseURL,
      'list_metadata',
      { id: ENCODED },
    );
    expect(listed.items.map((i) => i.path)).toEqual(['sample.ts']);
  });

  test('add_metadata throws DocumentSuperSeededError without touching state', async ({
    request,
    ld,
  }) => {
    fs.writeFileSync(path.resolve(ld.parent, 'src/another.ts'), 'export const z = 0;\n');
    await expect(
      callTool(request, ld.baseURL, 'add_metadata', { id: ENCODED, path: 'another.ts' }),
    ).rejects.toThrow(/SuperSeeded/);

    // Bindings unchanged.
    const after = await callTool<{ items: Array<{ path: string }> }>(
      request,
      ld.baseURL,
      'list_metadata',
      { id: ENCODED },
    );
    expect(after.items.map((i) => i.path)).toEqual(['sample.ts']);
  });

  test('remove_metadata throws DocumentSuperSeededError without removing the entry', async ({
    request,
    ld,
  }) => {
    await expect(
      callTool(request, ld.baseURL, 'remove_metadata', { id: ENCODED, path: 'sample.ts' }),
    ).rejects.toThrow(/SuperSeeded/);

    const after = await callTool<{ items: Array<{ path: string }> }>(
      request,
      ld.baseURL,
      'list_metadata',
      { id: ENCODED },
    );
    expect(after.items.map((i) => i.path)).toEqual(['sample.ts']);
  });

  test('refresh_metadata throws and the stored hash is never re-baselined', async ({
    request,
    ld,
  }) => {
    // Drift the source file: the stored hash should NOT change after the rejected refresh.
    fs.writeFileSync(
      path.resolve(ld.parent, 'src/sample.ts'),
      'export const x = 77; // drift\n',
    );
    await expect(
      callTool(request, ld.baseURL, 'refresh_metadata', { id: ENCODED }),
    ).rejects.toThrow(/SuperSeeded/);

    // Accuracy reflects the drift exactly because no refresh happened.
    const report = await callTool<{ items: Array<{ status: string }>; accuracy: number }>(
      request,
      ld.baseURL,
      'get_accuracy',
      { id: ENCODED },
    );
    expect(report.items[0].status).toBe('modified');
    expect(report.accuracy).toBe(0);
  });
});

test.describe('metadata MCP tools on the with-metadata fixture', () => {
  test.use({ fixtureName: 'with-metadata' });

  test('list_metadata + get_accuracy mirror the REST responses', async ({ request, ld }) => {
    const { documents } = await listDocuments(request, ld.baseURL);
    const intro = documents.find((d) => d.title === 'Intro')!;
    const listed = await callTool<{ items: Array<unknown> }>(
      request,
      ld.baseURL,
      'list_metadata',
      { id: intro.id },
    );
    expect(listed.items).toHaveLength(1);
    const accuracy = await callTool<{ accuracy: number }>(
      request,
      ld.baseURL,
      'get_accuracy',
      { id: intro.id },
    );
    expect(accuracy.accuracy).toBe(1);
  });

  test('add_metadata binds a new source file and bumps the accuracy report', async ({
    request,
    ld,
  }) => {
    // Create a second source file in sourceRoot before attaching it.
    const secondPath = path.resolve(ld.parent, 'src/second.ts');
    fs.writeFileSync(secondPath, 'export const y = 1;\n');

    const { documents } = await listDocuments(request, ld.baseURL);
    const intro = documents.find((d) => d.title === 'Intro')!;
    // toolAddMetadata returns { id, added, total, accuracy } — verify the added entry,
    // then cross-check the full list via list_metadata.
    const add = await callTool<{ added: { path: string }; total: number }>(
      request,
      ld.baseURL,
      'add_metadata',
      { id: intro.id, path: 'second.ts' },
    );
    expect(add.added.path).toBe('second.ts');
    expect(add.total).toBe(2);

    const listed = await callTool<{ items: Array<{ path: string }> }>(
      request,
      ld.baseURL,
      'list_metadata',
      { id: intro.id },
    );
    expect(listed.items.map((i) => i.path).sort()).toEqual(['sample.ts', 'second.ts']);
  });

  test('refresh_metadata re-baselines modified entries to unchanged', async ({
    request,
    ld,
  }) => {
    // Mutate the source file so the current hash no longer matches.
    fs.writeFileSync(
      path.resolve(ld.parent, 'src/sample.ts'),
      'export const x = 99; // drift\n',
    );

    const { documents } = await listDocuments(request, ld.baseURL);
    const intro = documents.find((d) => d.title === 'Intro')!;
    const beforeRefresh = await callTool<{ items: Array<{ status: string }> }>(
      request,
      ld.baseURL,
      'get_accuracy',
      { id: intro.id },
    );
    expect(beforeRefresh.items[0].status).toBe('modified');

    const afterRefresh = await callTool<{ items: Array<{ status: string }>; accuracy: number }>(
      request,
      ld.baseURL,
      'refresh_metadata',
      { id: intro.id },
    );
    expect(afterRefresh.items[0].status).toBe('unchanged');
    expect(afterRefresh.accuracy).toBe(1);
  });

  test('review_adr_relevance reports the ADR document and drifted source files', async ({
    request,
    ld,
  }) => {
    const adrDir = path.join(ld.docsAbs, 'ADRS');
    fs.mkdirSync(adrDir, { recursive: true });
    const adrId = 'ADRS/2026_01_02_10_00_[ARCHITECTURE]_sample_metadata_adr';
    fs.writeFileSync(
      path.join(adrDir, '2026_01_02_10_00_[ARCHITECTURE]_sample_metadata_adr.md'),
      [
        '---',
        '**date:** 2026-01-02',
        '**status:** To be validated',
        '**description:** Sample ADR describes the metadata-bound sample source file.',
        '**tags:** mcp, metadata, adr, sample',
        '---',
        '',
        '# Sample metadata ADR',
        '',
        'The ADR documents `sample.ts`.',
        '',
      ].join('\n'),
      'utf-8',
    );

    await callTool(request, ld.baseURL, 'add_metadata', { id: adrId, path: 'sample.ts' });
    fs.writeFileSync(path.resolve(ld.parent, 'src/sample.ts'), 'export const x = 99; // drift\n');

    const result = await callTool<{
      state: string;
      document: { decodedId: string; description: string; content: string };
      metadata: { accuracy: number; sourceFilesToReread: Array<{ path: string; status: string }> };
    }>(request, ld.baseURL, 'review_adr_relevance', { id: adrId });

    expect(result.state).toBe('needs_llm_review');
    expect(result.document.decodedId).toBe(adrId);
    expect(result.document.description).toBe('Sample ADR describes the metadata-bound sample source file.');
    expect(result.document.content).toContain('# Sample metadata ADR');
    expect(result.metadata.accuracy).toBe(0);
    expect(result.metadata.sourceFilesToReread).toEqual([
      expect.objectContaining({ path: 'sample.ts', status: 'modified' }),
    ]);
  });

  test('review_adr_relevance rejects non-ADR documents', async ({ request, ld }) => {
    const { documents } = await listDocuments(request, ld.baseURL);
    const intro = documents.find((d) => d.title === 'Intro')!;

    await expect(
      callTool(request, ld.baseURL, 'review_adr_relevance', { id: intro.id }),
    ).rejects.toThrow(/not an ADR/i);
  });

  test('read_source_file rejects an absolute path', async ({ request, ld }) => {
    await expect(
      callTool(request, ld.baseURL, 'read_source_file', { path: '/abs/foo.ts' }),
    ).rejects.toThrow(/relative/i);
  });

  test('search_source rejects a missing query', async ({ request, ld }) => {
    await expect(
      callTool(request, ld.baseURL, 'search_source', {}),
    ).rejects.toThrow(/query/i);
  });

  test('list_source_files accepts a pattern filter', async ({ request, ld }) => {
    // Add an extra file in sourceRoot so we can filter it out.
    fs.writeFileSync(path.resolve(ld.parent, 'src/readme.md'), '# hi\n');
    const result = await callTool<{ files: string[] }>(
      request,
      ld.baseURL,
      'list_source_files',
      { pattern: '*.ts' },
    );
    expect(result.files).toContain('sample.ts');
    expect(result.files).not.toContain('readme.md');
  });

  test('remove_metadata unbinds a source file and updates the total count', async ({
    request,
    ld,
  }) => {
    const { documents } = await listDocuments(request, ld.baseURL);
    const intro = documents.find((d) => d.title === 'Intro')!;
    const result = await callTool<{ removed: { path: string } | null; total: number }>(
      request,
      ld.baseURL,
      'remove_metadata',
      { id: intro.id, path: 'sample.ts' },
    );
    expect(result.removed?.path).toBe('sample.ts');
    expect(result.total).toBe(0);

    const listed = await callTool<{ items: Array<unknown> }>(
      request,
      ld.baseURL,
      'list_metadata',
      { id: intro.id },
    );
    expect(listed.items).toHaveLength(0);
  });

  test('remove_metadata on a path that is not bound returns removed: null', async ({
    request,
    ld,
  }) => {
    const { documents } = await listDocuments(request, ld.baseURL);
    const intro = documents.find((d) => d.title === 'Intro')!;
    const result = await callTool<{ removed: null; total: number }>(
      request,
      ld.baseURL,
      'remove_metadata',
      { id: intro.id, path: 'not-bound.ts' },
    );
    expect(result.removed).toBeNull();
    expect(result.total).toBe(1);
  });

  test('add_metadata rejects a path that points to a directory, not a file', async ({
    request,
    ld,
  }) => {
    // Create a directory inside sourceRoot and try to bind it.
    fs.mkdirSync(path.resolve(ld.parent, 'src/adirectory'), { recursive: true });
    const { documents } = await listDocuments(request, ld.baseURL);
    const intro = documents.find((d) => d.title === 'Intro')!;
    await expect(
      callTool(request, ld.baseURL, 'add_metadata', {
        id: intro.id,
        path: 'adirectory',
      }),
    ).rejects.toThrow(/Not a readable file/i);
  });

  test('list_metadata throws when id is missing', async ({ request, ld }) => {
    await expect(callTool(request, ld.baseURL, 'list_metadata', {})).rejects.toThrow(
      /Missing required parameter 'id'/i,
    );
  });

  test('list_adrs_below_accuracy surfaces only ADRs whose source files have drifted', async ({
    request,
    ld,
  }) => {
    const adrDir = path.join(ld.docsAbs, 'ADRS');
    fs.mkdirSync(adrDir, { recursive: true });
    const adrId = 'ADRS/2026_01_03_10_00_[ARCHITECTURE]_drifting_sample_adr';
    fs.writeFileSync(
      path.join(adrDir, '2026_01_03_10_00_[ARCHITECTURE]_drifting_sample_adr.md'),
      [
        '---',
        '**date:** 2026-01-03',
        '**status:** To be validated',
        '**description:** Sample ADR tracks sample.ts.',
        '**tags:** mcp, metadata, adr, sample',
        '---',
        '',
        '# Drifting sample ADR',
        '',
      ].join('\n'),
      'utf-8',
    );
    await callTool(request, ld.baseURL, 'add_metadata', { id: adrId, path: 'sample.ts' });

    // Mutate the bound source file so both the fixture's non-ADR doc and the ADR drift.
    fs.writeFileSync(path.resolve(ld.parent, 'src/sample.ts'), 'export const x = 99; // drift\n');

    const result = await callTool<{
      items: Array<{ title: string; accuracy: number }>;
      totalBelowThreshold: number;
    }>(request, ld.baseURL, 'list_adrs_below_accuracy');
    expect(result.totalBelowThreshold).toBe(1);
    expect(result.items[0].title).toBe('Drifting Sample Adr');
    expect(result.items[0].accuracy).toBe(0);
  });

  test('list_adrs_below_accuracy excludes ADRs with frontmatter status: SuperSeeded', async ({
    request,
    ld,
  }) => {
    const adrDir = path.join(ld.docsAbs, 'ADRS');
    fs.mkdirSync(adrDir, { recursive: true });
    const adrId = 'ADRS/2026_01_04_10_00_[ARCHITECTURE]_superseeded_sample_adr';
    fs.writeFileSync(
      path.join(adrDir, '2026_01_04_10_00_[ARCHITECTURE]_superseeded_sample_adr.md'),
      [
        '---',
        '**date:** 2026-01-04',
        '**status:** To be validated',
        '**description:** Sample ADR tracks sample.ts.',
        '**tags:** mcp, metadata, adr, sample',
        '---',
        '',
        '# Superseeded sample ADR',
        '',
      ].join('\n'),
      'utf-8',
    );
    await callTool(request, ld.baseURL, 'add_metadata', { id: adrId, path: 'sample.ts' });

    // Same drift as above, but mark the ADR as SuperSeeded via frontmatter.
    fs.writeFileSync(path.resolve(ld.parent, 'src/sample.ts'), 'drift\n');
    fs.writeFileSync(
      path.join(adrDir, '2026_01_04_10_00_[ARCHITECTURE]_superseeded_sample_adr.md'),
      '---\n**date:** 2026-01-04\n**status:** SuperSeeded\n**description:** Sample ADR tracks sample.ts.\n**tags:** mcp, metadata, adr, sample\n---\n\n# Superseeded sample ADR\n',
    );
    const result = await callTool<{ items: Array<unknown>; totalBelowThreshold: number }>(
      request,
      ld.baseURL,
      'list_adrs_below_accuracy',
    );
    expect(result.items).toHaveLength(0);
    expect(result.totalBelowThreshold).toBe(0);
  });
});
