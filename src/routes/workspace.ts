import { Router } from 'express';
import fs from 'fs';
import path from 'path';

const WORKSPACE_VERSION = 1;
const MAX_WORKSPACE_ENTITIES = 1000;
const MAX_LABEL_LENGTH = 160;
const MAX_TEXT_FIELD_LENGTH = 4000;
const MAX_WORKSPACE_FILE_BYTES = 1024 * 1024;
const WORKSPACE_PROVIDER_ROOT = path.join('AI', 'WORKSPACE');
const DEFAULT_LLM_TEST_TIMEOUT_MS = 5000;

type WorkspaceNodeKind = 'system' | 'llm' | 'agent' | 'mcp';

interface WorkspaceEntityConfig {
  endpoint: string;
  token: string;
  model: string;
  timeout: number;
  description: string;
  workspaceFolder: string;
  systemPrompt: string;
}

interface WorkspaceEntity {
  id: string;
  label: string;
  kind: WorkspaceNodeKind;
  parentId: string | null;
  x: number;
  y: number;
  angle: number;
  config: WorkspaceEntityConfig;
}

interface WorkspaceCamera {
  x: number;
  y: number;
  zoom: number;
}

interface WorkspaceState {
  version: typeof WORKSPACE_VERSION;
  updatedAt: string;
  entities: WorkspaceEntity[];
  camera: WorkspaceCamera;
}

interface LlmConnectionTestRequest {
  endpoint?: unknown;
  token?: unknown;
  model?: unknown;
  timeout?: unknown;
}

function workspaceFilePath(docsPath: string): string {
  return path.join(docsPath, '.workspace');
}

function defaultWorkspaceState(): WorkspaceState {
  return {
    version: WORKSPACE_VERSION,
    updatedAt: new Date(0).toISOString(),
    entities: [],
    camera: { x: 0, y: 0, zoom: 1 },
  };
}

function readWorkspaceState(docsPath: string): WorkspaceState {
  const filePath = workspaceFilePath(docsPath);
  if (!fs.existsSync(filePath)) {
    return defaultWorkspaceState();
  }

  const stat = fs.statSync(filePath);
  if (stat.size > MAX_WORKSPACE_FILE_BYTES) {
    throw new Error('.workspace is too large');
  }

  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as unknown;
  return sanitizeWorkspaceState(parsed);
}

function writeWorkspaceState(docsPath: string, state: WorkspaceState): void {
  const filePath = workspaceFilePath(docsPath);
  const tmpPath = `${filePath}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2), 'utf-8');
  fs.renameSync(tmpPath, filePath);
}

function sanitizeWorkspaceState(input: unknown, docsPath?: string): WorkspaceState {
  if (!isRecord(input)) {
    throw new Error('workspace payload must be an object');
  }

  const entitiesInput = input.entities;
  if (!Array.isArray(entitiesInput)) {
    throw new Error('workspace entities must be an array');
  }
  if (entitiesInput.length > MAX_WORKSPACE_ENTITIES) {
    throw new Error('workspace contains too many entities');
  }

  const updatedAt =
    typeof input.updatedAt === 'string' && input.updatedAt.trim()
      ? input.updatedAt
      : new Date().toISOString();

  const state: WorkspaceState = {
    version: WORKSPACE_VERSION,
    updatedAt,
    entities: entitiesInput.map(sanitizeEntity),
    camera: sanitizeCamera(input.camera),
  };

  if (docsPath) {
    ensureProviderWorkspaceFolders(docsPath, state);
  }

  return state;
}

function sanitizeEntity(input: unknown): WorkspaceEntity {
  if (!isRecord(input)) {
    throw new Error('workspace entity must be an object');
  }

  const id = safeRequiredString(input.id, 'entity id', MAX_LABEL_LENGTH);
  const kind = sanitizeKind(input.kind);
  const parentId =
    input.parentId === null || input.parentId === undefined
      ? null
      : safeRequiredString(input.parentId, 'entity parentId', MAX_LABEL_LENGTH);

  return {
    id,
    label: safeRequiredString(input.label, 'entity label', MAX_LABEL_LENGTH),
    kind,
    parentId,
    x: safeFiniteNumber(input.x, 0),
    y: safeFiniteNumber(input.y, 0),
    angle: safeFiniteNumber(input.angle, 0),
    config: sanitizeConfig(input.config),
  };
}

function sanitizeConfig(input: unknown): WorkspaceEntityConfig {
  const config = isRecord(input) ? input : {};
  return {
    endpoint: safeOptionalString(config.endpoint, '', MAX_TEXT_FIELD_LENGTH),
    token: safeOptionalString(config.token, '', MAX_TEXT_FIELD_LENGTH),
    model: safeOptionalString(config.model, '', MAX_LABEL_LENGTH),
    timeout: clamp(safeFiniteNumber(config.timeout, 180), 1, 600),
    systemPrompt: safeOptionalString(config.systemPrompt, '', MAX_TEXT_FIELD_LENGTH),
    description: safeOptionalString(config.description, '', MAX_TEXT_FIELD_LENGTH),
    workspaceFolder: sanitizeWorkspaceFolder(
      safeOptionalString(config.workspaceFolder, '', MAX_TEXT_FIELD_LENGTH),
    ),
  };
}

function ensureProviderWorkspaceFolders(docsPath: string, state: WorkspaceState): void {
  const workspaceRoot = path.resolve(docsPath, WORKSPACE_PROVIDER_ROOT);
  fs.mkdirSync(workspaceRoot, { recursive: true });

  const reservedFolders = new Set<string>();
  for (const entity of state.entities) {
    if (entity.kind !== 'llm') {
      entity.config.workspaceFolder = '';
      continue;
    }

    const existingFolder = sanitizeWorkspaceFolder(entity.config.workspaceFolder);
    const baseFolder = existingFolder || path.join(WORKSPACE_PROVIDER_ROOT, slugify(entity.label));
    const uniqueFolder = uniqueWorkspaceFolder(baseFolder, reservedFolders);
    const absoluteFolder = path.resolve(docsPath, uniqueFolder);
    if (!absoluteFolder.startsWith(`${workspaceRoot}${path.sep}`) && absoluteFolder !== workspaceRoot) {
      throw new Error('provider workspace folder escapes AI/WORKSPACE');
    }

    fs.mkdirSync(absoluteFolder, { recursive: true });
    entity.config.workspaceFolder = toPosixPath(uniqueFolder);
    reservedFolders.add(entity.config.workspaceFolder);
  }
}

function sanitizeWorkspaceFolder(folder: string): string {
  if (!folder) {
    return '';
  }

  const normalized = toPosixPath(path.normalize(folder));
  const prefix = toPosixPath(WORKSPACE_PROVIDER_ROOT);
  if (
    normalized.startsWith('../') ||
    path.isAbsolute(normalized) ||
    normalized === prefix ||
    !normalized.startsWith(`${prefix}/`)
  ) {
    return '';
  }
  return normalized;
}

function uniqueWorkspaceFolder(folder: string, reservedFolders: Set<string>): string {
  const parsed = path.posix.parse(toPosixPath(folder));
  let candidate = toPosixPath(folder);
  let index = 2;
  while (reservedFolders.has(candidate)) {
    candidate = path.posix.join(parsed.dir, `${parsed.name}_${index}`);
    index += 1;
  }
  return candidate;
}

function slugify(value: string): string {
  const slug = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return slug || 'llm_provider';
}

function toPosixPath(value: string): string {
  return value.split(path.sep).join('/');
}

function sanitizeCamera(input: unknown): WorkspaceCamera {
  const camera = isRecord(input) ? input : {};
  return {
    x: safeFiniteNumber(camera.x, 0),
    y: safeFiniteNumber(camera.y, 0),
    zoom: clamp(safeFiniteNumber(camera.zoom, 1), 0.1, 4),
  };
}

function sanitizeKind(input: unknown): WorkspaceNodeKind {
  if (input === 'system' || input === 'llm' || input === 'agent' || input === 'mcp') {
    return input;
  }
  throw new Error('invalid entity kind');
}

function safeRequiredString(input: unknown, field: string, maxLength: number): string {
  if (typeof input !== 'string' || !input.trim()) {
    throw new Error(`${field} is required`);
  }
  return input.trim().slice(0, maxLength);
}

function safeOptionalString(input: unknown, fallback: string, maxLength: number): string {
  return typeof input === 'string' ? input.slice(0, maxLength) : fallback;
}

function safeFiniteNumber(input: unknown, fallback: number): number {
  return typeof input === 'number' && Number.isFinite(input) ? input : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null && !Array.isArray(input);
}

function llmModelsUrl(endpoint: string): URL {
  const url = new URL(endpoint);
  const cleanPath = url.pathname.replace(/\/+$/, '');
  if (cleanPath.endsWith('/models')) {
    url.pathname = cleanPath;
  } else if (cleanPath.endsWith('/v1')) {
    url.pathname = `${cleanPath}/models`;
  } else {
    url.pathname = `${cleanPath}/v1/models`;
  }
  return url;
}

async function testLlmConnection(input: LlmConnectionTestRequest): Promise<Record<string, unknown>> {
  if (typeof input.endpoint !== 'string' || !input.endpoint.trim()) {
    throw new Error('endpoint is required');
  }

  const model = typeof input.model === 'string' ? input.model.trim() : '';
  const timeoutSeconds = clamp(safeFiniteNumber(input.timeout, 5), 1, 30);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutSeconds * 1000 || DEFAULT_LLM_TEST_TIMEOUT_MS);
  const headers: Record<string, string> = { Accept: 'application/json', 'Content-Type': 'application/json' };
  if (typeof input.token === 'string' && input.token.trim()) {
    headers.Authorization = `Bearer ${input.token.trim()}`;
  }

  if (model) {
    const base = input.endpoint.trim();
    const chatUrl = new URL(base.endsWith('/v1') ? `${base}/chat/completions` : `${base}/v1/chat/completions`);
    try {
      const response = await fetch(chatUrl, {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1,
        }),
      });
      const text = await response.text();
      let replyModel: string | null = null;
      try {
        const body = JSON.parse(text) as unknown;
        if (isRecord(body) && typeof body.model === 'string') {
          replyModel = body.model;
        }
      } catch { /* ignore */ }
      return {
        ok: response.ok,
        status: response.status,
        url: chatUrl.toString(),
        detail: response.ok
          ? `Model ${replyModel ?? model} responded`
          : `Chat completion failed (${response.status})`,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  const url = llmModelsUrl(input.endpoint.trim());
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });
    const text = await response.text();
    let modelCount: number | null = null;
    try {
      const body = JSON.parse(text) as unknown;
      if (isRecord(body) && Array.isArray(body.data)) {
        modelCount = body.data.length;
      }
    } catch { /* ignore */ }
    return {
      ok: response.ok,
      status: response.status,
      url: url.toString(),
      detail: response.ok
        ? modelCount !== null
          ? `Connection OK (${modelCount} model${modelCount === 1 ? '' : 's'})`
          : `Connection OK (${response.status})`
        : `Connection failed (${response.status})`,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function callMcp(endpoint: string, method: string, params: unknown): Promise<unknown> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const text = await response.text();
  // Handle SSE (data: ...) or plain JSON
  for (const line of text.split('\n')) {
    const trimmed = line.startsWith('data:') ? line.slice(5).trim() : line.trim();
    if (!trimmed || trimmed === '[DONE]') continue;
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (isRecord(parsed) && isRecord(parsed.result)) return parsed.result;
      if (isRecord(parsed) && parsed.error) throw new Error(String((parsed.error as Record<string,unknown>).message ?? parsed.error));
    } catch { continue; }
  }
  throw new Error('No valid MCP response');
}

export function workspaceRouter(docsPath: string): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    try {
      res.json(readWorkspaceState(docsPath));
    } catch {
      res.status(500).json({ error: 'Failed to read workspace' });
    }
  });

  router.put('/', (req, res) => {
    try {
      const state = sanitizeWorkspaceState(
        {
          ...req.body,
          updatedAt: new Date().toISOString(),
        },
        docsPath,
      );
      writeWorkspaceState(docsPath, state);
      res.json(state);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid workspace payload';
      res.status(400).json({ error: message });
    }
  });

  router.post('/list-models', async (req, res) => {
    try {
      const body = req.body as { endpoint?: unknown; token?: unknown };
      if (typeof body.endpoint !== 'string' || !body.endpoint.trim()) {
        res.status(400).json({ ok: false, error: 'endpoint is required' });
        return;
      }
      const url = llmModelsUrl(body.endpoint.trim());
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (typeof body.token === 'string' && body.token.trim()) {
        headers.Authorization = `Bearer ${body.token.trim()}`;
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), DEFAULT_LLM_TEST_TIMEOUT_MS);
      try {
        const response = await fetch(url, { method: 'GET', headers, signal: controller.signal });
        const text = await response.text();
        let models: string[] = [];
        try {
          const parsed = JSON.parse(text) as unknown;
          if (isRecord(parsed) && Array.isArray(parsed.data)) {
            models = (parsed.data as unknown[])
              .map((m) => (isRecord(m) && typeof m.id === 'string' ? m.id : null))
              .filter((id): id is string => id !== null);
          }
        } catch { /* ignore */ }
        res.json({ ok: response.ok, models });
      } finally {
        clearTimeout(timeout);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to list models';
      res.status(400).json({ ok: false, error: message });
    }
  });

  router.post('/run-agent', async (req, res) => {
    try {
      const body = req.body as {
        endpoint?: unknown; token?: unknown; model?: unknown;
        systemPrompt?: unknown; userInput?: unknown; timeout?: unknown; mcpEndpoint?: unknown;
      };
      if (typeof body.endpoint !== 'string' || !body.endpoint.trim()) {
        res.status(400).json({ ok: false, error: 'endpoint is required' }); return;
      }
      if (typeof body.model !== 'string' || !body.model.trim()) {
        res.status(400).json({ ok: false, error: 'model is required' }); return;
      }
      if (typeof body.systemPrompt !== 'string' || !body.systemPrompt.trim()) {
        res.status(400).json({ ok: false, error: 'systemPrompt is required' }); return;
      }

      const mcpEndpoint = typeof body.mcpEndpoint === 'string' ? body.mcpEndpoint.trim() : '';
      const timeoutSeconds = clamp(safeFiniteNumber(body.timeout, 180), 1, 600);
      const base = body.endpoint.trim();
      const chatUrl = new URL(base.endsWith('/v1') ? `${base}/chat/completions` : `${base}/v1/chat/completions`);
      const llmHeaders: Record<string, string> = { Accept: 'application/json', 'Content-Type': 'application/json' };
      if (typeof body.token === 'string' && body.token.trim()) {
        llmHeaders.Authorization = `Bearer ${body.token.trim()}`;
      }

      // Fetch MCP tools if endpoint provided
      let mcpTools: unknown[] = [];
      if (mcpEndpoint) {
        try {
          const toolsRes = await callMcp(mcpEndpoint, 'tools/list', {});
          if (isRecord(toolsRes) && Array.isArray(toolsRes.tools)) {
            mcpTools = (toolsRes.tools as unknown[]).map((t) => {
              if (!isRecord(t)) return null;
              return {
                type: 'function',
                function: {
                  name: t.name,
                  description: t.description ?? '',
                  parameters: t.inputSchema ?? { type: 'object', properties: {} },
                },
              };
            }).filter(Boolean);
          }
        } catch { /* no tools */ }
      }

      // Agentic loop: up to 5 tool calls max
      const userInput = typeof body.userInput === 'string' ? body.userInput.trim() : '';
      const messages: unknown[] = [{ role: 'system', content: body.systemPrompt.trim() }];
      if (userInput) messages.push({ role: 'user', content: userInput });
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutSeconds * 1000);
      let finalContent: string | null = null;

      try {
        for (let turn = 0; turn < 5; turn++) {
          const llmBody: Record<string, unknown> = { model: body.model.trim(), messages };
          if (mcpTools.length > 0) llmBody.tools = mcpTools;

          const response = await fetch(chatUrl, {
            method: 'POST', headers: llmHeaders, signal: controller.signal,
            body: JSON.stringify(llmBody),
          });
          if (!response.ok) {
            res.status(502).json({ ok: false, error: `LLM error (${response.status})` }); return;
          }

          const parsed = JSON.parse(await response.text()) as unknown;
          if (!isRecord(parsed) || !Array.isArray(parsed.choices) || !parsed.choices.length) break;

          const choice = parsed.choices[0] as unknown;
          if (!isRecord(choice) || !isRecord(choice.message)) break;
          const msg = choice.message;
          messages.push(msg);

          // Tool calls requested by LLM
          if (Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0 && mcpEndpoint) {
            for (const tc of msg.tool_calls as unknown[]) {
              if (!isRecord(tc) || !isRecord(tc.function)) continue;
              const fnName = typeof tc.function.name === 'string' ? tc.function.name : '';
              const fnArgs = typeof tc.function.arguments === 'string'
                ? JSON.parse(tc.function.arguments) as unknown
                : (tc.function.arguments ?? {});
              let toolResult = '';
              try {
                const mcpResult = await callMcp(mcpEndpoint, 'tools/call', { name: fnName, arguments: fnArgs });
                if (isRecord(mcpResult) && Array.isArray(mcpResult.content)) {
                  toolResult = (mcpResult.content as unknown[])
                    .filter((c) => isRecord(c) && typeof c.text === 'string')
                    .map((c) => (c as Record<string, unknown>).text as string)
                    .join('\n');
                } else {
                  toolResult = JSON.stringify(mcpResult);
                }
              } catch (e) {
                toolResult = `Tool error: ${e instanceof Error ? e.message : String(e)}`;
              }
              messages.push({ role: 'tool', tool_call_id: tc.id ?? '', content: toolResult });
            }
            continue; // next turn: send tool results back to LLM
          }

          // Final text response
          if (typeof msg.content === 'string' && msg.content.trim()) {
            finalContent = msg.content;
          }
          break;
        }
      } finally {
        clearTimeout(timer);
      }

      if (finalContent !== null) {
        res.json({ ok: true, content: finalContent });
      } else {
        res.status(502).json({ ok: false, error: 'Agent did not produce a response' });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Agent run failed';
      res.status(400).json({ ok: false, error: message });
    }
  });

  router.post('/test-llm', async (req, res) => {
    try {
      const result = await testLlmConnection(req.body as LlmConnectionTestRequest);
      res.status(result.ok ? 200 : 502).json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to test LLM connection';
      res.status(400).json({ ok: false, error: message });
    }
  });

  return router;
}
