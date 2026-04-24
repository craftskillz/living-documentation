import type { APIRequestContext } from '@playwright/test';

// MCP Streamable HTTP returns responses as a single SSE `data: {...}` line. Extract the JSON.
function parseSSE(text: string): unknown {
  const match = text.match(/^data:\s*(\{.*\})\s*$/m);
  if (!match) throw new Error(`No SSE data line in response: ${text.slice(0, 200)}`);
  return JSON.parse(match[1]);
}

async function rpcCall(
  request: APIRequestContext,
  baseURL: string,
  id: number,
  method: string,
  params: Record<string, unknown>,
): Promise<{ result?: any; error?: any }> {
  const res = await request.post(`${baseURL}/mcp`, {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    },
    data: { jsonrpc: '2.0', id, method, params },
  });
  if (!res.ok()) {
    throw new Error(`MCP HTTP ${res.status()}: ${await res.text()}`);
  }
  return parseSSE(await res.text()) as { result?: any; error?: any };
}

async function initialize(request: APIRequestContext, baseURL: string): Promise<void> {
  await rpcCall(request, baseURL, 1, 'initialize', {
    protocolVersion: '2025-03-26',
    capabilities: {},
    clientInfo: { name: 'playwright-test', version: '1.0' },
  });
}

// Call an MCP tool and return the parsed tool-result content as either JSON or raw text.
// When the tool signals an error (either via JSON-RPC envelope or the SDK's `isError: true`
// content-wrapper), the promise rejects with the server-side error message.
export async function callTool<T = unknown>(
  request: APIRequestContext,
  baseURL: string,
  name: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  await initialize(request, baseURL);
  const envelope = await rpcCall(request, baseURL, 2, 'tools/call', {
    name,
    arguments: args,
  });
  if (envelope.error) throw new Error(`MCP tool error: ${JSON.stringify(envelope.error)}`);
  const result = envelope.result;
  const textContent = result.content?.[0]?.text as string | undefined;
  if (result.isError) {
    throw new Error(textContent ?? 'MCP tool error');
  }
  if (typeof textContent !== 'string') {
    throw new Error(`Unexpected MCP result shape: ${JSON.stringify(result)}`);
  }
  try {
    return JSON.parse(textContent) as T;
  } catch {
    return textContent as unknown as T;
  }
}

export async function listTools(
  request: APIRequestContext,
  baseURL: string,
): Promise<Array<{ name: string; description: string }>> {
  await initialize(request, baseURL);
  const envelope = await rpcCall(request, baseURL, 2, 'tools/list', {});
  return envelope.result.tools;
}

export async function listPrompts(
  request: APIRequestContext,
  baseURL: string,
): Promise<Array<{ name: string; description: string }>> {
  await initialize(request, baseURL);
  const envelope = await rpcCall(request, baseURL, 2, 'prompts/list', {});
  return envelope.result.prompts;
}
