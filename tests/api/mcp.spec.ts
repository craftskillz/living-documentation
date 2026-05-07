import fs from 'fs';
import path from 'path';
import { test, expect } from '../helpers/ld-fixture';
import { callTool, getPrompt, listTools, listPrompts } from '../helpers/mcp';

test('tools/list exposes the expected tool set', async ({ request, ld }) => {
  const tools = await listTools(request, ld.baseURL);
  const names = tools.map((t) => t.name).sort();
  expect(names).toEqual(
    expect.arrayContaining([
      'list_documents',
      'read_document',
      'create_document',
      'list_diagrams',
      'read_diagram',
      'create_diagram',
      'list_source_files',
      'read_source_file',
      'search_source',
      'list_metadata',
      'get_accuracy',
      'add_metadata',
      'refresh_metadata',
    ]),
  );
});

test('prompts/list exposes the workflow and diagram-generation prompts over Streamable HTTP', async ({ request, ld }) => {
  const prompts = await listPrompts(request, ld.baseURL);
  const names = prompts.map((p) => p.name);
  expect(names).toEqual(
    expect.arrayContaining([
      'audit-doc-drift',
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

test('prompts/get returns the create-adr and audit-doc-drift templates over Streamable HTTP', async ({ request, ld }) => {
  const createAdr = await getPrompt(request, ld.baseURL, 'create-adr', {
    featureSummary: 'Neon browser obstacle game',
    modifiedFiles: 'index.html',
  });
  expect(createAdr.messages[0].content.text).toContain('record an **ADR');
  expect(createAdr.messages[0].content.text).toContain('Neon browser obstacle game');
  expect(createAdr.messages[0].content.text).toContain('create_document');
  expect(createAdr.messages[0].content.text).toContain('add_metadata');

  const audit = await getPrompt(request, ld.baseURL, 'audit-doc-drift');
  expect(audit.messages[0].content.text).toContain('list_documents_below_accuracy');
  expect(audit.messages[0].content.text).toContain('refresh_metadata');
  expect(audit.messages[0].content.text).toContain('update_document');
});

test('list_documents returns the three fixture docs', async ({ request, ld }) => {
  const docs = await callTool<Array<{ title: string }>>(
    request,
    ld.baseURL,
    'list_documents',
  );
  const titles = docs.map((d) => d.title).sort();
  expect(titles).toEqual(['Advanced', 'Intro', 'Quickstart']);
});

test('read_document returns raw markdown content for a specific doc', async ({ request, ld }) => {
  const docs = await callTool<Array<{ id: string; title: string }>>(
    request,
    ld.baseURL,
    'list_documents',
  );
  const intro = docs.find((d) => d.title === 'Intro');
  expect(intro).toBeDefined();
  // read_document returns the raw markdown as a text-content response, not JSON.
  const content = await callTool<string>(request, ld.baseURL, 'read_document', {
    id: intro!.id,
  });
  expect(content).toContain('# Introduction');
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

test.describe('metadata MCP tools on the with-metadata fixture', () => {
  test.use({ fixtureName: 'with-metadata' });

  test('list_metadata + get_accuracy mirror the REST responses', async ({ request, ld }) => {
    const docs = await callTool<Array<{ id: string; title: string }>>(
      request,
      ld.baseURL,
      'list_documents',
    );
    const intro = docs.find((d) => d.title === 'Intro')!;
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

    const docs = await callTool<Array<{ id: string; title: string }>>(
      request,
      ld.baseURL,
      'list_documents',
    );
    const intro = docs.find((d) => d.title === 'Intro')!;
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

    const docs = await callTool<Array<{ id: string; title: string }>>(
      request,
      ld.baseURL,
      'list_documents',
    );
    const intro = docs.find((d) => d.title === 'Intro')!;
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
    const docs = await callTool<Array<{ id: string; title: string }>>(
      request,
      ld.baseURL,
      'list_documents',
    );
    const intro = docs.find((d) => d.title === 'Intro')!;
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
    const docs = await callTool<Array<{ id: string; title: string }>>(
      request,
      ld.baseURL,
      'list_documents',
    );
    const intro = docs.find((d) => d.title === 'Intro')!;
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
    const docs = await callTool<Array<{ id: string; title: string }>>(
      request,
      ld.baseURL,
      'list_documents',
    );
    const intro = docs.find((d) => d.title === 'Intro')!;
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

  test('list_documents_below_accuracy surfaces a doc whose source file has drifted', async ({
    request,
    ld,
  }) => {
    // Mutate the bound source file so accuracy drops from 1.0 to 0.0.
    fs.writeFileSync(path.resolve(ld.parent, 'src/sample.ts'), 'export const x = 99; // drift\n');

    const result = await callTool<{
      items: Array<{ title: string; accuracy: number }>;
      totalBelowThreshold: number;
    }>(request, ld.baseURL, 'list_documents_below_accuracy');
    expect(result.totalBelowThreshold).toBe(1);
    expect(result.items[0].title).toBe('Intro');
    expect(result.items[0].accuracy).toBe(0);
  });

  test('list_documents_below_accuracy excludes docs with frontmatter status: SuperSeeded', async ({
    request,
    ld,
  }) => {
    // Same drift as above, but mark the doc as SuperSeeded via frontmatter.
    fs.writeFileSync(path.resolve(ld.parent, 'src/sample.ts'), 'drift\n');
    fs.writeFileSync(
      path.join(ld.docsAbs, '2026_01_01_10_00_[General]_intro.md'),
      '---\nstatus: SuperSeeded\n---\n\n# Intro\n',
    );
    const result = await callTool<{ items: Array<unknown>; totalBelowThreshold: number }>(
      request,
      ld.baseURL,
      'list_documents_below_accuracy',
    );
    expect(result.items).toHaveLength(0);
    expect(result.totalBelowThreshold).toBe(0);
  });
});
