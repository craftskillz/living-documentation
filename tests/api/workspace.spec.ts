import fs from 'fs';
import http from 'http';
import path from 'path';
import { test, expect } from '../helpers/ld-fixture';
import { callTool } from '../helpers/mcp';

type JsonHandler = (body: unknown, req: http.IncomingMessage) => unknown | Promise<unknown>;

async function startJsonServer(handler: JsonHandler): Promise<{ url: string; close: () => Promise<void> }> {
  const server = http.createServer((req, res) => {
    let raw = '';
    req.setEncoding('utf-8');
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', async () => {
      try {
        const body = raw ? JSON.parse(raw) as unknown : {};
        const result = await handler(body, req);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
      }
    });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('mock server did not bind to a TCP port');
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    }),
  };
}

test('run-agent-document appends generated image markdown from generate_image tool results', async ({
  request,
  ld,
}) => {
  const generatedImageMarkdown = '![blueprint-prezi-folder-explorer.png](./images-ai/ADRS/20260629225416_sj66_blueprint-prezi-folder-explorer.png)';
  let llmCalls = 0;

  const llm = await startJsonServer((body) => {
    llmCalls += 1;
    if (llmCalls === 1) {
      return {
        choices: [{
          message: {
            role: 'assistant',
            content: null,
            tool_calls: [{
              id: 'call_generate_image',
              type: 'function',
              function: {
                name: 'generate_image',
                arguments: JSON.stringify({
                  imageProviderId: 'provider-mqzohdv8',
                  documentId: 'ADRS/example',
                  prompt: 'Create a technical illustration.',
                }),
              },
            }],
          },
        }],
      };
    }

    expect(JSON.stringify(body)).toContain(generatedImageMarkdown);
    return {
      choices: [{
        message: {
          role: 'assistant',
          content: "Fait. L'illustration `blueprint-prezi-folder-explorer.png` est prête à être insérée dans le document.",
        },
      }],
    };
  });

  const mcp = await startJsonServer((body) => {
    const requestBody = body as { id?: unknown; method?: string; params?: { name?: string } };
    if (requestBody.method === 'tools/list') {
      return {
        jsonrpc: '2.0',
        id: requestBody.id,
        result: {
          tools: [{
            name: 'generate_image',
            description: 'Generate an image',
            inputSchema: { type: 'object', properties: {} },
          }],
        },
      };
    }

    expect(requestBody.method).toBe('tools/call');
    expect(requestBody.params?.name).toBe('generate_image');
    return {
      jsonrpc: '2.0',
      id: requestBody.id,
      result: {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            filename: 'ADRS/20260629225416_sj66_blueprint-prezi-folder-explorer.png',
            url: '/images-ai/ADRS/20260629225416_sj66_blueprint-prezi-folder-explorer.png',
            markdown: generatedImageMarkdown,
          }),
        }],
      },
    };
  });

  try {
    const workspace = {
      version: 1,
      updatedAt: new Date(0).toISOString(),
      camera: { x: 0, y: 0, zoom: 1 },
      entities: [
        {
          id: 'provider-chat',
          label: 'Mock Chat Provider',
          kind: 'llm',
          parentId: null,
          config: {
            endpoint: llm.url,
            model: 'mock-chat',
            providerType: 'chat',
            toolMode: 'tools',
          },
        },
        {
          id: 'mcp-node',
          label: 'MCP',
          kind: 'mcp',
          parentId: null,
          config: { endpoint: `${mcp.url}/mcp` },
        },
        {
          id: 'agent-image',
          label: 'Document Image Summary',
          kind: 'agent',
          parentId: 'provider-chat',
          config: {
            systemPrompt: 'Use generate_image, then answer briefly.',
            workspaceFolder: 'AI/WORKSPACE/document_image_summary',
          },
        },
      ],
    };

    const saveWorkspace = await request.put(`${ld.baseURL}/api/workspace`, { data: workspace });
    expect(saveWorkspace.ok()).toBe(true);

    const run = await request.post(`${ld.baseURL}/api/workspace/run-agent-document`, {
      data: { agentId: 'agent-image', userInput: 'ADRS/example' },
    });
    expect(run.ok()).toBe(true);
    const result = await run.json() as { document: { filename: string } };
    const runDocumentPath = path.join(ld.docsAbs, result.document.filename);
    const markdown = fs.readFileSync(runDocumentPath, 'utf-8');

    expect(markdown).toContain('## Response');
    expect(markdown).toContain("Fait. L'illustration `blueprint-prezi-folder-explorer.png` est prête à être insérée dans le document.");
    expect(markdown).toContain(generatedImageMarkdown);
    expect(markdown.indexOf(generatedImageMarkdown)).toBeGreaterThan(
      markdown.indexOf("Fait. L'illustration"),
    );
  } finally {
    await llm.close();
    await mcp.close();
  }
});

test('generate_image saves AI images under images-ai instead of files', async ({
  request,
  ld,
}) => {
  const imageBytes = Buffer.from('fake image bytes');
  const imageProvider = await startJsonServer((body, req) => {
    expect(req.url).toBe('/v1/images');
    expect(body).toEqual(expect.objectContaining({
      model: 'mock-image-model',
      prompt: 'Generate a concise architecture image.',
      response_format: 'b64_json',
    }));
    return {
      data: [{
        b64_json: imageBytes.toString('base64'),
        media_type: 'image/png',
      }],
    };
  });

  try {
    const workspace = {
      version: 1,
      updatedAt: new Date(0).toISOString(),
      camera: { x: 0, y: 0, zoom: 1 },
      entities: [{
        id: 'provider-image',
        label: 'Mock Image Provider',
        kind: 'llm',
        parentId: null,
        config: {
          endpoint: imageProvider.url,
          model: 'mock-image-model',
          providerType: 'image',
        },
      }],
    };

    const saveWorkspace = await request.put(`${ld.baseURL}/api/workspace`, { data: workspace });
    expect(saveWorkspace.ok()).toBe(true);

    const result = await callTool<{
      success: boolean;
      filename: string;
      url: string;
      markdown: string;
      size: number;
    }>(request, ld.baseURL, 'generate_image', {
      imageProviderId: 'provider-image',
      documentId: encodeURIComponent('2026_01_01_10_00_[General]_intro'),
      prompt: 'Generate a concise architecture image.',
      filename: 'architecture-overview.png',
    });

    expect(result.success).toBe(true);
    expect(result.filename).toMatch(/architecture-overview\.png$/);
    expect(result.url).toBe(`/images-ai/${result.filename}`);
    expect(result.markdown).toBe(`![${path.basename(result.filename)}](./images-ai/${result.filename})`);
    expect(result.size).toBe(imageBytes.length);
    expect(fs.existsSync(path.join(ld.docsAbs, 'images-ai', result.filename))).toBe(true);
    expect(fs.existsSync(path.join(ld.docsAbs, 'files', result.filename))).toBe(false);
  } finally {
    await imageProvider.close();
  }
});
