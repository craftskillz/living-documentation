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
});
