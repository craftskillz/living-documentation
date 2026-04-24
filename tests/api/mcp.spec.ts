import { test, expect } from '../helpers/ld-fixture';

test('MCP initialize + list_documents returns the three fixture docs', async ({
  request,
  ld,
}) => {
  const mcpUrl = `${ld.baseURL}/mcp`;
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
  };

  // Per MCP spec, a Streamable HTTP client sends initialize first.
  const initRes = await request.post(mcpUrl, {
    headers,
    data: {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-03-26',
        capabilities: {},
        clientInfo: { name: 'playwright-test', version: '1.0' },
      },
    },
  });
  expect(initRes.ok()).toBeTruthy();

  const listRes = await request.post(mcpUrl, {
    headers,
    data: {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: { name: 'list_documents', arguments: {} },
    },
  });
  expect(listRes.ok()).toBeTruthy();
  const text = await listRes.text();
  // Server streams SSE; extract the JSON body from the first `data:` line.
  const match = text.match(/^data:\s*(\{.*\})\s*$/m);
  expect(match).not.toBeNull();
  const payload = JSON.parse(match![1]);
  const toolResultText = payload.result.content[0].text as string;
  const docs = JSON.parse(toolResultText) as Array<{ title: string }>;
  const titles = docs.map((d) => d.title);
  expect(titles).toEqual(expect.arrayContaining(['Intro', 'Quickstart', 'Advanced']));
});
