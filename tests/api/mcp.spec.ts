import fs from 'fs';
import path from 'path';
import { test, expect } from '../helpers/ld-fixture';
import { callTool, listTools, listPrompts } from '../helpers/mcp';

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

test('prompts/list exposes the diagram-generation prompts', async ({ request, ld }) => {
  const prompts = await listPrompts(request, ld.baseURL);
  const names = prompts.map((p) => p.name);
  expect(names).toEqual(
    expect.arrayContaining([
      'generate-context-diagram',
      'generate-container-diagram',
      'generate-uml-diagram',
      'generate-screen-guide',
      'flow',
      'erd',
    ]),
  );
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

  test('read_diagram returns a compact node/edge summary (not the raw DSL)', async ({
    request,
    ld,
  }) => {
    const result = await callTool<{ nodes: Array<{ name: string }>; edges: Array<unknown> }>(
      request,
      ld.baseURL,
      'read_diagram',
      { id: 'diag-1' },
    );
    expect(result.nodes.map((n) => n.name).sort()).toEqual(['End', 'Start']);
    expect(result.edges).toHaveLength(1);
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
