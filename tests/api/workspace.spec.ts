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

test('mcp-inventory returns live tool and prompt names from the MCP endpoint', async ({
  request,
  ld,
}) => {
  const mcp = await startJsonServer((body) => {
    const requestBody = body as { id?: unknown; method?: string };
    if (requestBody.method === 'tools/list') {
      return {
        jsonrpc: '2.0',
        id: requestBody.id,
        result: {
          tools: [
            { name: 'read_document', description: 'Read a document' },
            { name: 'generate_image', description: 'Generate an image' },
            { name: 'save_context', description: 'Persist run memory' },
          ],
        },
      };
    }
    expect(requestBody.method).toBe('prompts/list');
    return {
      jsonrpc: '2.0',
      id: requestBody.id,
      result: { prompts: [{ name: 'feature-workflow' }, { name: 'audit-adrs-drift' }] },
    };
  });

  try {
    const inventory = await request.post(`${ld.baseURL}/api/workspace/mcp-inventory`, {
      data: { endpoint: `${mcp.url}/mcp` },
    });
    expect(inventory.ok()).toBe(true);
    const result = await inventory.json() as { ok: boolean; tools: string[]; prompts: string[] };
    expect(result.ok).toBe(true);
    expect(result.tools).toEqual(['read_document', 'generate_image', 'save_context']);
    expect(result.prompts).toEqual(['feature-workflow', 'audit-adrs-drift']);
  } finally {
    await mcp.close();
  }
});

test('run-agent-document only sends MCP tools named in the agent system prompt', async ({
  request,
  ld,
}) => {
  let capturedToolNames: string[] = [];
  const llm = await startJsonServer((body) => {
    const requestBody = body as { tools?: Array<{ function?: { name?: string } }> };
    capturedToolNames = (requestBody.tools ?? [])
      .map((tool) => tool?.function?.name ?? '')
      .filter(Boolean);
    return {
      choices: [{
        message: { role: 'assistant', content: 'Done reading the document.' },
      }],
    };
  });

  const mcp = await startJsonServer((body) => {
    const requestBody = body as { id?: unknown; method?: string };
    expect(requestBody.method).toBe('tools/list');
    return {
      jsonrpc: '2.0',
      id: requestBody.id,
      result: {
        tools: [
          { name: 'read_document', description: 'Read a document', inputSchema: { type: 'object', properties: {} } },
          { name: 'update_document', description: 'Update a document', inputSchema: { type: 'object', properties: {} } },
          { name: 'generate_image', description: 'Generate an image', inputSchema: { type: 'object', properties: {} } },
        ],
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
          config: { endpoint: llm.url, model: 'mock-chat', providerType: 'chat', toolMode: 'tools' },
        },
        {
          id: 'mcp-node',
          label: 'MCP',
          kind: 'mcp',
          parentId: null,
          config: { endpoint: `${mcp.url}/mcp` },
        },
        {
          id: 'agent-reader',
          label: 'Doc Reader',
          kind: 'agent',
          parentId: 'provider-chat',
          // Names read_document only; update_document/generate_image must be filtered out.
          // "research" must not pull in any tool via a substring match.
          config: {
            systemPrompt: 'Call read_document to research the topic, then answer briefly.',
            workspaceFolder: 'AI/WORKSPACE/doc_reader',
          },
        },
      ],
    };

    const saveWorkspace = await request.put(`${ld.baseURL}/api/workspace`, { data: workspace });
    expect(saveWorkspace.ok()).toBe(true);

    const run = await request.post(`${ld.baseURL}/api/workspace/run-agent-document`, {
      data: { agentId: 'agent-reader', userInput: 'Summarize ADRS/example' },
    });
    expect(run.ok()).toBe(true);

    expect(capturedToolNames).toEqual(['read_document']);
  } finally {
    await llm.close();
    await mcp.close();
  }
});

test('run-agent-document sends no MCP tools when the system prompt names none', async ({
  request,
  ld,
}) => {
  let toolsField: unknown = 'unset';
  const llm = await startJsonServer((body) => {
    toolsField = (body as { tools?: unknown }).tools;
    return {
      choices: [{
        message: { role: 'assistant', content: 'Answered without any tool.' },
      }],
    };
  });

  const mcp = await startJsonServer((body) => {
    const requestBody = body as { id?: unknown; method?: string };
    expect(requestBody.method).toBe('tools/list');
    return {
      jsonrpc: '2.0',
      id: requestBody.id,
      result: {
        tools: [
          { name: 'read_document', description: 'Read a document', inputSchema: { type: 'object', properties: {} } },
          { name: 'update_document', description: 'Update a document', inputSchema: { type: 'object', properties: {} } },
        ],
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
          config: { endpoint: llm.url, model: 'mock-chat', providerType: 'chat', toolMode: 'tools' },
        },
        {
          id: 'mcp-node',
          label: 'MCP',
          kind: 'mcp',
          parentId: null,
          config: { endpoint: `${mcp.url}/mcp` },
        },
        {
          id: 'agent-no-tool',
          label: 'Plain Answerer',
          kind: 'agent',
          parentId: 'provider-chat',
          // Natural-language prompt that names no tool by its exact id → no tools must be sent.
          config: {
            systemPrompt: 'Read the documentation and answer the question concisely.',
            workspaceFolder: 'AI/WORKSPACE/plain_answerer',
          },
        },
      ],
    };

    const saveWorkspace = await request.put(`${ld.baseURL}/api/workspace`, { data: workspace });
    expect(saveWorkspace.ok()).toBe(true);

    const run = await request.post(`${ld.baseURL}/api/workspace/run-agent-document`, {
      data: { agentId: 'agent-no-tool', userInput: 'What is this project?' },
    });
    expect(run.ok()).toBe(true);

    expect(toolsField).toBeUndefined();
  } finally {
    await llm.close();
    await mcp.close();
  }
});

test('chat-only agent prompt omits run memory instructions and keeps runtime constraint', async ({
  request,
  ld,
}) => {
  let capturedSystemPrompt = '';
  const llm = await startJsonServer((body) => {
    const requestBody = body as {
      tools?: unknown;
      messages?: Array<{ role?: string; content?: unknown }>;
    };
    expect(requestBody.tools).toBeUndefined();
    capturedSystemPrompt = String(requestBody.messages?.[0]?.content ?? '');
    return {
      choices: [{
        message: {
          role: 'assistant',
          content: 'Tools are disabled, so I can only answer directly.',
        },
      }],
    };
  });

  try {
    const workspace = {
      version: 1,
      updatedAt: new Date(0).toISOString(),
      camera: { x: 0, y: 0, zoom: 1 },
      entities: [
        {
          id: 'provider-chat-only',
          label: 'Mock Chat Only Provider',
          kind: 'llm',
          parentId: null,
          config: {
            endpoint: llm.url,
            model: 'mock-chat',
            providerType: 'chat',
            toolMode: 'chat',
          },
        },
        {
          id: 'mcp-node',
          label: 'MCP',
          kind: 'mcp',
          parentId: null,
          config: { endpoint: `${llm.url}/mcp` },
        },
        {
          id: 'agent-chat-only',
          label: 'Ask The LLM',
          kind: 'agent',
          parentId: 'provider-chat-only',
          config: {
            systemPrompt: 'Answer directly.',
            workspaceFolder: 'AI/WORKSPACE/ask_the_llm',
          },
        },
      ],
    };

    const saveWorkspace = await request.put(`${ld.baseURL}/api/workspace`, { data: workspace });
    expect(saveWorkspace.ok()).toBe(true);
    fs.writeFileSync(
      path.join(ld.docsAbs, 'AI', 'WORKSPACE', 'ask_the_llm', 'context.md'),
      'Persisted context that must not be injected in chat-only mode.',
      'utf-8',
    );

    const run = await request.post(`${ld.baseURL}/api/workspace/run-agent-document`, {
      data: { agentId: 'agent-chat-only', userInput: 'Hello' },
    });
    expect(run.ok()).toBe(true);

    expect(capturedSystemPrompt).toContain('Answer directly.');
    expect(capturedSystemPrompt).toContain('Runtime constraint: MCP tool calling is disabled for this run.');
    expect(capturedSystemPrompt).not.toContain('## Run memory');
    expect(capturedSystemPrompt).not.toContain('Your workspace folder is');
    expect(capturedSystemPrompt).not.toContain('When you finish, call `save_context`');
    expect(capturedSystemPrompt).not.toContain('Persisted context that must not be injected');
  } finally {
    await llm.close();
  }
});
