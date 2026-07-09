import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { readConfig } from '../lib/config';
import { normalizeFrontmatter } from '../lib/okf';

const WORKSPACE_VERSION = 1;
const MAX_WORKSPACE_ENTITIES = 1000;
const MAX_LABEL_LENGTH = 160;
const MAX_TEXT_FIELD_LENGTH = 4000;
const MAX_WORKSPACE_FILE_BYTES = 1024 * 1024;
const WORKSPACE_PROVIDER_ROOT = path.join('AI', 'WORKSPACE');
const DEFAULT_LLM_TEST_TIMEOUT_MS = 5000;
// Max model round-trips per agent run. The last one is always offered without tools so a model
// that keeps calling tools is forced to emit a final text answer instead of exhausting the budget.
const MAX_AGENT_TURNS = 5;

type WorkspaceNodeKind = 'system' | 'llm' | 'agent' | 'mcp';
type WorkspaceProviderType = 'chat' | 'image';
type WorkspaceToolMode = 'tools' | 'chat';

interface WorkspaceEntityConfig {
  endpoint: string;
  token: string;
  model: string;
  providerType: WorkspaceProviderType;
  toolMode: WorkspaceToolMode;
  timeout: number;
  description: string;
  workspaceFolder: string;
  systemPrompt: string;
  requiresUserInput: boolean;
  userInputDescription: string;
  expectedOutputMarker: string;
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

interface AgentRunConfig {
  endpoint: string;
  token: string;
  model: string;
  systemPrompt: string;
  userInput: string;
  timeout: number;
  mcpEndpoint: string;
  toolsEnabled: boolean;
  expectedOutputMarker: string;
}

// Optional debug collector. When provided to runAgent, every prompt sent, response received,
// tool load and tool call/result is appended as a Markdown section, later embedded in the
// generated agent-run document (enabled via the `debugAgents` config flag).
interface AgentDebugLog {
  sections: string[];
}

// Cap any single captured value so a debug trace stays readable and the document doesn't explode.
const DEBUG_VALUE_MAX = 6000;
const CHAT_ONLY_TOOL_NOTICE = [
  'Runtime constraint: MCP tool calling is disabled for this run.',
  'You cannot call read_document, update_document, save_context, or any other MCP tool.',
  'Do not emit pseudo tool calls such as XML tags, JSON function-call objects, or tool-call placeholders.',
  'If the user request or agent instructions require tool access, say clearly that the task cannot be completed in chat-only mode because tools are disabled.',
].join('\n');

function debugBlock(value: unknown): string {
  let text: string;
  if (typeof value === 'string') {
    text = value;
  } else {
    try {
      text = JSON.stringify(value, null, 2);
    } catch {
      text = String(value);
    }
  }
  if (text.length > DEBUG_VALUE_MAX) {
    text = `${text.slice(0, DEBUG_VALUE_MAX)}\n… [truncated ${text.length - DEBUG_VALUE_MAX} chars]`;
  }
  return `\`\`\`json\n${text}\n\`\`\``;
}

type AgentRunEventType =
  | 'status'
  | 'mcp_tools'
  | 'model_call'
  | 'tool_call'
  | 'tool_result'
  | 'fallback'
  | 'final'
  | 'document'
  | 'error';

interface AgentRunEvent {
  type: AgentRunEventType;
  message: string;
  turn?: number;
  toolName?: string;
  detail?: string;
  content?: string;
  document?: AgentRunDocumentResult;
}

type AgentRunReporter = (event: AgentRunEvent) => void;

interface AgentRunDocumentResult {
  id: string;
  filename: string;
  title: string;
  ok: boolean;
}

interface GeneratedImageArtifact {
  filename: string;
  url: string;
  markdown: string;
}

interface AgentRunArtifacts {
  generatedImages: GeneratedImageArtifact[];
}

interface AgentRunFailureRequest {
  agentId?: unknown;
  userInput?: unknown;
  errorMessage?: unknown;
  errorName?: unknown;
  errorStack?: unknown;
  phase?: unknown;
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
    // Only an environment-variable reference (env:NAME or ${NAME}) may be persisted — never a
    // literal secret, since .workspace is git-tracked. Any other value is dropped to ''.
    token: sanitizeTokenRef(safeOptionalString(config.token, '', MAX_TEXT_FIELD_LENGTH)),
    model: safeOptionalString(config.model, '', MAX_LABEL_LENGTH),
    providerType: config.providerType === 'image' ? 'image' : 'chat',
    toolMode: config.toolMode === 'chat' ? 'chat' : 'tools',
    timeout: clamp(safeFiniteNumber(config.timeout, 180), 1, 600),
    systemPrompt: safeOptionalString(config.systemPrompt, '', MAX_TEXT_FIELD_LENGTH),
    requiresUserInput: config.requiresUserInput === true,
    userInputDescription: safeOptionalString(config.userInputDescription, '', MAX_TEXT_FIELD_LENGTH),
    expectedOutputMarker: safeOptionalString(config.expectedOutputMarker, '', MAX_LABEL_LENGTH),
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
    if (entity.kind !== 'agent') {
      entity.config.workspaceFolder = '';
      continue;
    }

    const existingFolder = sanitizeWorkspaceFolder(entity.config.workspaceFolder);
    const labelFolder = toPosixPath(path.join(WORKSPACE_PROVIDER_ROOT, slugify(entity.label)));

    // Rename existing folder if label slug changed
    if (existingFolder && existingFolder !== labelFolder) {
      const absoluteExisting = path.resolve(docsPath, existingFolder);
      if (fs.existsSync(absoluteExisting)) {
        const uniqueLabel = uniqueWorkspaceFolder(labelFolder, reservedFolders);
        const absoluteNew = path.resolve(docsPath, uniqueLabel);
        if (!absoluteNew.startsWith(`${workspaceRoot}${path.sep}`)) {
          throw new Error('provider workspace folder escapes AI/WORKSPACE');
        }
        fs.renameSync(absoluteExisting, absoluteNew);
        entity.config.workspaceFolder = toPosixPath(uniqueLabel);
        reservedFolders.add(entity.config.workspaceFolder);
        continue;
      }
    }

    const baseFolder = existingFolder || labelFolder;
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

function errorMessageWithCause(error: unknown, fallback: string): string {
  const base = error instanceof Error && error.message.trim()
    ? error.message.trim()
    : fallback;
  const cause = error instanceof Error && 'cause' in error
    ? (error as Error & { cause?: unknown }).cause
    : undefined;

  if (!cause || !isRecord(cause)) {
    return base;
  }

  const details: string[] = [];
  const causeMessage = cause.message;
  if (typeof causeMessage === 'string' && causeMessage.trim() && causeMessage.trim() !== base) {
    details.push(causeMessage.trim());
  }

  for (const key of ['code', 'errno', 'syscall', 'hostname', 'address', 'port']) {
    const value = cause[key];
    if (typeof value === 'string' || typeof value === 'number') {
      details.push(`${key}=${value}`);
    }
  }

  return details.length > 0 ? `${base} (${details.join(', ')})` : base;
}

function summarizeResponseBody(text: string, maxLength = 500): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function upstreamHttpError(label: string, url: URL, response: Response, body: string): string {
  const detail = summarizeResponseBody(body);
  const suffix = detail ? `: ${detail}` : '';
  return `${label} ${url.toString()} → ${response.status} ${response.statusText}${suffix}`.trim();
}

function workspaceErrorMessage(scope: string, error: unknown, fallback: string): string {
  const message = errorMessageWithCause(error, fallback);
  console.error(`[workspace] ${scope}:`, message);
  return message;
}

function summarizeForEvent(value: unknown, maxLength = 240): string {
  let text = '';
  if (typeof value === 'string') {
    text = value;
  } else {
    try {
      text = JSON.stringify(value);
    } catch {
      text = String(value);
    }
  }
  text = text ?? String(value);
  const normalized = text.replace(/\s+/g, ' ').trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}…` : normalized;
}

function errorReportMarkdown(error: unknown, phase: string, extra: Record<string, string> = {}): string {
  const name = error instanceof Error ? error.name : typeof error;
  const message = errorMessageWithCause(error, String(error));
  const stack = error instanceof Error && error.stack ? error.stack : '';
  const lines = [
    `## Error summary`,
    ``,
    `- Phase: ${phase}`,
    `- Name: ${name}`,
    `- Message: ${message}`,
  ];

  for (const [key, value] of Object.entries(extra)) {
    if (value.trim()) {
      lines.push(`- ${key}: ${value}`);
    }
  }

  if (stack.trim()) {
    lines.push(``, `## Stack trace`, ``, '```text', stack, '```');
  }

  return lines.join('\n');
}

// True when the endpoint's origin (protocol + host) is in the configured "no /v1" list,
// i.e. the provider serves model listing at `{base}/models` rather than `{base}/v1/models`
// (e.g. DeepSeek). Invalid URLs simply don't match.
function endpointServesModelsWithoutV1(endpoint: string, noV1Hosts: string[]): boolean {
  if (!noV1Hosts.length) return false;
  try {
    return noV1Hosts.includes(new URL(endpoint).origin);
  } catch {
    return false;
  }
}

// API tokens are stored ONLY as environment-variable references (env:NAME or ${NAME}) — never as
// literal secrets, since .workspace is git-tracked. This regex captures the variable name.
const ENV_REF_PATTERN = /^(?:env:([A-Za-z_][A-Za-z0-9_]*)|\$\{([A-Za-z_][A-Za-z0-9_]*)\})$/;

// Keep a value only if it is a valid env-var reference; otherwise drop it to ''. Used at the
// persistence boundary so a pasted literal token never lands in the workspace file.
function sanitizeTokenRef(raw: string): string {
  const value = raw.trim();
  return ENV_REF_PATTERN.test(value) ? value : '';
}

// Resolve an env-var token reference to its secret value from process.env. Returns '' for an
// unset variable or a non-reference value (literals are not accepted as bearer tokens).
function resolveSecret(raw: unknown): string {
  const value = typeof raw === 'string' ? raw.trim() : '';
  const match = ENV_REF_PATTERN.exec(value);
  if (!match) return '';
  const name = match[1] ?? match[2];
  return (process.env[name] ?? '').trim();
}

function llmModelsUrl(endpoint: string, noV1 = false): URL {
  const url = new URL(endpoint);
  const cleanPath = url.pathname.replace(/\/+$/, '');
  if (cleanPath.endsWith('/models')) {
    url.pathname = cleanPath;
  } else if (noV1) {
    url.pathname = `${cleanPath}/models`;
  } else if (cleanPath.endsWith('/v1')) {
    url.pathname = `${cleanPath}/models`;
  } else {
    url.pathname = `${cleanPath}/v1/models`;
  }
  return url;
}

function imageModelsUrl(endpoint: string): URL {
  const url = new URL(endpoint);
  const cleanPath = url.pathname.replace(/\/+$/, '');
  if (cleanPath.endsWith('/images/models')) {
    url.pathname = cleanPath;
  } else if (cleanPath.endsWith('/images')) {
    url.pathname = `${cleanPath}/models`;
  } else if (cleanPath.endsWith('/v1')) {
    url.pathname = `${cleanPath}/images/models`;
  } else {
    url.pathname = `${cleanPath}/v1/images/models`;
  }
  return url;
}

async function testLlmConnection(input: LlmConnectionTestRequest, noV1 = false): Promise<Record<string, unknown>> {
  if (typeof input.endpoint !== 'string' || !input.endpoint.trim()) {
    throw new Error('endpoint is required');
  }

  const model = typeof input.model === 'string' ? input.model.trim() : '';
  const timeoutSeconds = clamp(safeFiniteNumber(input.timeout, 5), 1, 30);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutSeconds * 1000 || DEFAULT_LLM_TEST_TIMEOUT_MS);
  const headers: Record<string, string> = { Accept: 'application/json', 'Content-Type': 'application/json' };
  const resolvedToken = resolveSecret(input.token);
  if (resolvedToken) {
    headers.Authorization = `Bearer ${resolvedToken}`;
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
          : upstreamHttpError('LLM chat completion', chatUrl, response, text),
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  const url = llmModelsUrl(input.endpoint.trim(), noV1);
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
        : upstreamHttpError('LLM models', url, response, text),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function callMcp(endpoint: string, method: string, params: unknown): Promise<unknown> {
  let url: URL;
  let response: Response;
  try {
    url = new URL(endpoint);
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    });
  } catch (error) {
    throw new Error(`MCP request failed: ${errorMessageWithCause(error, 'fetch failed')}`);
  }
  const text = await response.text();
  if (!response.ok) {
    throw new Error(upstreamHttpError('MCP request', url, response, text));
  }
  // Handle SSE (data: ...) or plain JSON
  for (const line of text.split('\n')) {
    const trimmed = line.startsWith('data:') ? line.slice(5).trim() : line.trim();
    if (!trimmed || trimmed === '[DONE]') continue;
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (isRecord(parsed) && isRecord(parsed.result)) return parsed.result;
      if (isRecord(parsed) && parsed.error) throw new Error(String((parsed.error as Record<string,unknown>).message ?? parsed.error));
    } catch { }
  }
  throw new Error('No valid MCP response');
}

// Match a tool name as a whole token in free text. Tool names are snake_case identifiers,
// so a `\w` boundary on each side prevents `search` from matching inside `research`. Match is
// case-insensitive so a prompt author can write the name in any casing.
function systemPromptMentionsTool(systemPrompt: string, toolName: string): boolean {
  if (!toolName) return false;
  const escaped = toolName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<!\\w)${escaped}(?!\\w)`, 'i').test(systemPrompt);
}

// Keep only the MCP tools whose exact name is named (as a whole word) in the agent's system
// prompt, so the model is offered just the tools the prompt actually asks for — fewer tokens
// and fewer spurious tool calls, especially on small models.
// If the prompt names no tool at all, the result is empty: the author is expected to name the
// tools the agent may use, so an unnamed tool is intentionally withheld (no implicit full list).
function selectToolsForSystemPrompt(
  tools: unknown[],
  systemPrompt: string,
): { tools: unknown[]; matched: number; total: number } {
  const total = tools.length;
  if (total === 0) {
    return { tools, matched: 0, total };
  }
  const matched = tools.filter((tool) => {
    if (!isRecord(tool) || !isRecord(tool.function)) return false;
    const name = typeof tool.function.name === 'string' ? tool.function.name : '';
    return systemPromptMentionsTool(systemPrompt, name);
  });
  return { tools: matched, matched: matched.length, total };
}

// Deterministic serialization (object keys sorted recursively) used to detect when the model
// re-requests a tool call identical to one that already succeeded this run.
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

function toolNamesList(tools: unknown[]): string {
  return tools
    .map((tool) =>
      isRecord(tool) && isRecord(tool.function) && typeof tool.function.name === 'string'
        ? tool.function.name
        : '',
    )
    .filter(Boolean)
    .map((name) => `\`${name}\``)
    .join(', ');
}

// List the `name`s exposed by an MCP server for a given listing method (tools/list or
// prompts/list). Returns an error string instead of throwing so the caller can surface a
// partial inventory (e.g. tools succeed while a server that lacks prompts fails).
async function listMcpNames(
  endpoint: string,
  method: string,
  key: 'tools' | 'prompts',
): Promise<{ ok: boolean; names: string[]; error?: string }> {
  try {
    const result = await callMcp(endpoint, method, {});
    const names =
      isRecord(result) && Array.isArray(result[key])
        ? (result[key] as unknown[])
            .map((item) => (isRecord(item) && typeof item.name === 'string' ? item.name : ''))
            .filter(Boolean)
        : [];
    return { ok: true, names };
  } catch (error) {
    return { ok: false, names: [], error: errorMessageWithCause(error, `Failed to list ${key}`) };
  }
}

async function runAgent(
  config: AgentRunConfig,
  report?: AgentRunReporter,
  debug?: AgentDebugLog,
  artifacts?: AgentRunArtifacts,
): Promise<string> {
  if (!config.endpoint.trim()) throw new Error('endpoint is required');
  if (!config.model.trim()) throw new Error('model is required');
  if (!config.systemPrompt.trim()) throw new Error('systemPrompt is required');

  const timeoutSeconds = clamp(config.timeout, 1, 600);
  const base = config.endpoint.trim();
  const chatUrl = new URL(base.endsWith('/v1') ? `${base}/chat/completions` : `${base}/v1/chat/completions`);
  const llmHeaders: Record<string, string> = { Accept: 'application/json', 'Content-Type': 'application/json' };
  const resolvedToken = resolveSecret(config.token);
  if (resolvedToken) {
    llmHeaders.Authorization = `Bearer ${resolvedToken}`;
  }

  let mcpTools: unknown[] = [];
  if (!config.toolsEnabled) {
    report?.({
      type: 'mcp_tools',
      message: 'MCP tools disabled by LLM provider configuration',
    });
    debug?.sections.push('### Tools MCP\n\nDésactivés par la configuration du provider LLM.');
  } else if (config.mcpEndpoint) {
    report?.({ type: 'status', message: 'Loading MCP tools' });
    try {
      const toolsRes = await callMcp(config.mcpEndpoint, 'tools/list', {});
      if (isRecord(toolsRes) && Array.isArray(toolsRes.tools)) {
        mcpTools = (toolsRes.tools as unknown[]).map((tool) => {
          if (!isRecord(tool)) return null;
          return {
            type: 'function',
            function: {
              name: tool.name,
              description: tool.description ?? '',
              parameters: tool.inputSchema ?? { type: 'object', properties: {} },
            },
          };
        }).filter(Boolean);
      }
      report?.({
        type: 'mcp_tools',
        message: `${mcpTools.length} MCP tool${mcpTools.length === 1 ? '' : 's'} available`,
      });
      debug?.sections.push(
        `### Tools MCP chargés (${mcpTools.length})\n\nEndpoint MCP : \`${config.mcpEndpoint}\`\n\n${debugBlock(mcpTools)}`,
      );
    } catch (error) {
      const message = errorMessageWithCause(error, 'MCP tools unavailable');
      mcpTools = [];
      report?.({
        type: 'mcp_tools',
        message: `MCP tools unavailable; running without tool calls (${message})`,
      });
      debug?.sections.push(`### Tools MCP\n\nIndisponibles — exécution sans tool calls.\n\n${message}`);
    }
  } else {
    report?.({
      type: 'mcp_tools',
      message: 'No MCP endpoint configured; running without tool calls',
    });
    debug?.sections.push('### Tools MCP\n\nAucun endpoint MCP configuré — exécution sans tool calls.');
  }

  // Narrow the tool list to the tools the agent's system prompt actually names, so the model is
  // offered only what the author asked for. When no tool is named, none are sent (the agent runs
  // without tool calls) — naming a tool is how an author opts it in.
  if (mcpTools.length > 0) {
    const selection = selectToolsForSystemPrompt(mcpTools, config.systemPrompt);
    if (selection.matched < selection.total) {
      mcpTools = selection.tools;
      report?.({
        type: 'mcp_tools',
        message: selection.matched === 0
          ? `No MCP tool named in the system prompt; running without tool calls (0/${selection.total})`
          : `Filtered to ${selection.matched}/${selection.total} tool${selection.matched === 1 ? '' : 's'} named in the system prompt`,
      });
      debug?.sections.push(
        selection.matched === 0
          ? `### Tools MCP filtrés (0/${selection.total})\n\nAucun tool nommé dans le system prompt — exécution sans tool calls.`
          : `### Tools MCP filtrés (${selection.matched}/${selection.total})\n\nConservés car nommés dans le system prompt : ${toolNamesList(mcpTools)}`,
      );
    }
  }

  const systemPrompt = config.toolsEnabled
    ? config.systemPrompt.trim()
    : `${config.systemPrompt.trim()}\n\n${CHAT_ONLY_TOOL_NOTICE}`;
  const messages: unknown[] = [{ role: 'system', content: systemPrompt }];
  const expectedOutputMarker = config.expectedOutputMarker.trim();
  if (config.userInput.trim()) {
    messages.push({ role: 'user', content: config.userInput.trim() });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutSeconds * 1000);

  let toolsSupported = mcpTools.length > 0;
  // Signatures (name + canonical args) of tool calls already executed successfully this run, so a
  // model that re-issues the same call is answered with a "do not repeat" note instead of running
  // it again (avoids duplicate side effects and wasted credits, e.g. regenerating the same image).
  const executedToolSignatures = new Set<string>();

  try {
    for (let turn = 0; turn < MAX_AGENT_TURNS; turn += 1) {
      // The final turn is offered WITHOUT tools: a model that keeps calling tools is then forced
      // to produce a text answer from what it already gathered, rather than failing on the cap.
      const isFinalTurn = turn === MAX_AGENT_TURNS - 1;
      const offerTools = toolsSupported && mcpTools.length > 0 && !isFinalTurn;
      if (isFinalTurn && toolsSupported && mcpTools.length > 0) {
        messages.push({
          role: 'user',
          content:
            'Do not call any tool now. Using the tool results already gathered above, write your final answer as plain text.',
        });
      }
      report?.({
        type: 'model_call',
        turn: turn + 1,
        message: `Calling model ${config.model.trim()}${offerTools ? ' with tools' : ''}`,
      });
      const llmBody: Record<string, unknown> = { model: config.model.trim(), messages };
      if (offerTools) llmBody.tools = mcpTools;

      debug?.sections.push(
        `### Tour ${turn + 1} — Prompt envoyé\n\nPOST \`${chatUrl.toString()}\`\n\n${debugBlock(llmBody)}`,
      );

      const response = await fetch(chatUrl, {
        method: 'POST',
        headers: llmHeaders,
        signal: controller.signal,
        body: JSON.stringify(llmBody),
      });
      const responseText = await response.text();

      // Model doesn't support tool use — retry once without tools
      if (!response.ok && response.status === 400 && toolsSupported) {
        toolsSupported = false;
        report?.({
          type: 'fallback',
          turn: turn + 1,
          message: 'Model rejected tool calling; retrying without tools',
        });
        debug?.sections.push(
          `### Tour ${turn + 1} — Fallback\n\nLe modèle a rejeté l'appel d'outils (HTTP 400). Réessai sans \`tools\`, descriptions injectées dans le system prompt.`,
        );
        // Inject tool descriptions as context in the system message
        const toolDescriptions = mcpTools
          .map((t) => {
            if (!isRecord(t) || !isRecord(t.function)) return '';
            return `- ${t.function.name}: ${t.function.description ?? ''}`;
          })
          .filter(Boolean)
          .join('\n');
        if (toolDescriptions && messages.length > 0 && isRecord(messages[0]) && messages[0].role === 'system') {
          (messages[0] as Record<string, unknown>).content =
            `${messages[0].content}\n\nAvailable MCP tools (call them by name in your response):\n${toolDescriptions}`;
        }
        continue;
      }

      if (!response.ok) {
        throw new Error(upstreamHttpError('LLM chat completion', chatUrl, response, responseText));
      }

      const parsed = JSON.parse(responseText) as unknown;
      if (!isRecord(parsed) || !Array.isArray(parsed.choices) || !parsed.choices.length) break;

      const choice = parsed.choices[0] as unknown;
      if (!isRecord(choice) || !isRecord(choice.message)) break;
      const msg = choice.message;
      messages.push(msg);

      debug?.sections.push(
        `### Tour ${turn + 1} — Réponse reçue\n\n${debugBlock(msg)}`,
      );

      if (Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0 && config.toolsEnabled && config.mcpEndpoint) {
        for (const toolCall of msg.tool_calls as unknown[]) {
          if (!isRecord(toolCall) || !isRecord(toolCall.function)) continue;
          const fnName = typeof toolCall.function.name === 'string' ? toolCall.function.name : '';
          const fnArgs = typeof toolCall.function.arguments === 'string'
            ? JSON.parse(toolCall.function.arguments) as unknown
            : (toolCall.function.arguments ?? {});

          // Already executed with identical arguments this run — refuse to repeat it and nudge the
          // model to finalize, instead of running the side effect again.
          const signature = `${fnName}:${stableStringify(fnArgs)}`;
          if (executedToolSignatures.has(signature)) {
            const note = `Tool ${fnName} was already called with identical arguments and succeeded earlier in this run; its result is unchanged. Do not call it again — use the earlier result and write your final answer now.`;
            report?.({
              type: 'tool_result',
              turn: turn + 1,
              toolName: fnName,
              detail: 'duplicate call skipped',
              message: `Tool ${fnName} skipped (duplicate call)`,
            });
            debug?.sections.push(
              `### Tour ${turn + 1} — Tool call ignoré (doublon) : \`${fnName}\`\n\n${note}`,
            );
            messages.push({ role: 'tool', tool_call_id: toolCall.id ?? '', content: note });
            continue;
          }

          report?.({
            type: 'tool_call',
            turn: turn + 1,
            toolName: fnName,
            detail: summarizeForEvent(fnArgs),
            message: `Calling tool ${fnName}`,
          });
          debug?.sections.push(
            `### Tour ${turn + 1} — Tool call : \`${fnName}\`\n\n**Arguments :**\n\n${debugBlock(fnArgs)}`,
          );
          let toolResult = '';
          try {
            const mcpResult = await callMcp(config.mcpEndpoint, 'tools/call', { name: fnName, arguments: fnArgs });
            if (isRecord(mcpResult) && Array.isArray(mcpResult.content)) {
              toolResult = (mcpResult.content as unknown[])
                .filter((content) => isRecord(content) && typeof content.text === 'string')
                .map((content) => (content as Record<string, unknown>).text as string)
                .join('\n');
            } else {
              toolResult = JSON.stringify(mcpResult);
            }
            executedToolSignatures.add(signature);
            report?.({
              type: 'tool_result',
              turn: turn + 1,
              toolName: fnName,
              detail: `${toolResult.length.toLocaleString()} character${toolResult.length === 1 ? '' : 's'}`,
              message: `Tool ${fnName} returned`,
            });
          } catch (error) {
            toolResult = `Tool error: ${error instanceof Error ? error.message : String(error)}`;
            report?.({
              type: 'tool_result',
              turn: turn + 1,
              toolName: fnName,
              detail: summarizeForEvent(toolResult),
              message: `Tool ${fnName} failed`,
            });
          }
          debug?.sections.push(
            `### Tour ${turn + 1} — Tool result : \`${fnName}\`\n\n${debugBlock(toolResult)}`,
          );
          collectGeneratedImageArtifact(fnName, toolResult, artifacts);
          messages.push({ role: 'tool', tool_call_id: toolCall.id ?? '', content: toolResult });
        }
        continue;
      }

      if (typeof msg.content === 'string' && msg.content.trim()) {
        const content = msg.content.trim();
        if (!expectedOutputMarker || content.includes(expectedOutputMarker)) {
          report?.({ type: 'final', message: 'Final response received', content });
          return content;
        }
        report?.({
          type: 'status',
          turn: turn + 1,
          message: `Final response missed required marker "${expectedOutputMarker}"`,
        });
        messages.push({
          role: 'user',
          content:
            `Your previous answer did not include the required output marker "${expectedOutputMarker}". ` +
            `Return the final answer now, include "${expectedOutputMarker}", and do not explain the correction.`,
        });
        continue;
      }
      break;
    }
  } finally {
    clearTimeout(timer);
  }

  throw new Error(
    expectedOutputMarker
      ? `Agent response did not include required output marker: ${expectedOutputMarker}`
      : 'Agent did not produce a response',
  );
}

function collectGeneratedImageArtifact(
  toolName: string,
  toolResult: string,
  artifacts: AgentRunArtifacts | undefined,
): void {
  if (!artifacts || toolName !== 'generate_image') return;

  let parsed: unknown;
  try {
    parsed = JSON.parse(toolResult);
  } catch {
    return;
  }
  if (!isRecord(parsed) || parsed.success !== true || typeof parsed.markdown !== 'string') return;

  const markdown = parsed.markdown.trim();
  if (!markdown) return;
  const filename = typeof parsed.filename === 'string' ? parsed.filename.trim() : '';
  const url = typeof parsed.url === 'string' ? parsed.url.trim() : '';
  const duplicate = artifacts.generatedImages.some((image) => {
    return image.markdown === markdown || (!!filename && image.filename === filename) || (!!url && image.url === url);
  });
  if (!duplicate) {
    artifacts.generatedImages.push({ filename, url, markdown });
  }
}

function contentWithGeneratedImages(content: string, artifacts: AgentRunArtifacts | undefined): string {
  const generatedImages = artifacts?.generatedImages ?? [];
  if (generatedImages.length === 0) return content;

  const imageBlocks = generatedImages
    .map((image) => image.markdown.trim())
    .filter((markdown, index) => {
      if (!markdown) return false;
      const image = generatedImages[index];
      return !content.includes(markdown)
        && (!image.filename || !content.includes(image.filename))
        && (!image.url || !content.includes(image.url));
    });

  if (imageBlocks.length === 0) return content;
  return `${content.trimEnd()}\n\n${imageBlocks.join('\n\n')}`;
}

function agentRunMarkdown(args: {
  title: string;
  agent: WorkspaceEntity;
  provider: WorkspaceEntity;
  ok: boolean;
  userInput: string;
  content: string;
  debug?: string;
  artifacts?: AgentRunArtifacts;
}): string {
  const status = args.ok ? 'Success' : 'Failed';
  const userInput = args.userInput.trim() || '_No user input._';
  const responseContent = contentWithGeneratedImages(args.content, args.artifacts);
  const debugSection = args.debug?.trim() ? `\n## Debug\n\n${args.debug.trim()}\n` : '';
  return `---\n**date:** ${new Date().toISOString()}\n**status:** ${status}\n**description:** Resultat d'execution de l'agent ${args.agent.label} via ${args.provider.label}.\n**tags:** agent, run-agent, workspace, llm, ${slugify(args.agent.label)}\n---\n\n# ${args.title}\n\n## Execution\n\n- Agent: ${args.agent.label}\n- Provider: ${args.provider.label}\n- Model: ${args.provider.config.model}\n- Status: ${status}\n\n## User input\n\n${userInput}\n\n## Response\n\n${responseContent}\n${debugSection}`;
}

// Render an accumulated debug log into a Markdown block. Returns '' when nothing was captured.
function renderAgentDebug(debug: AgentDebugLog | undefined): string {
  if (!debug || debug.sections.length === 0) return '';
  return debug.sections.join('\n\n');
}

// Filename used to persist an agent's cross-run memory inside its workspace
// folder. A plain (non-dotted) name so it is visible/inspectable in the UI.
const AGENT_CONTEXT_FILENAME = 'context.md';

// Build the effective system prompt for an agent run: the author's prompt plus
// a "Run memory" section that (a) injects the context saved at the end of the
// previous run, and (b) tells the agent which folder to pass to `save_context`.
// This makes the load side automatic — the model never has to call a tool to
// recall its prior state — while the save side stays an explicit decision.
function agentSystemPromptWithMemory(docsPath: string, agent: WorkspaceEntity): string {
  const base = agent.config.systemPrompt.trim();
  const folder = sanitizeWorkspaceFolder(agent.config.workspaceFolder);
  if (!folder) return base;

  let previous = '';
  try {
    const ctxPath = path.resolve(docsPath, folder, AGENT_CONTEXT_FILENAME);
    const docsRoot = path.resolve(docsPath);
    if (
      (ctxPath === docsRoot || ctxPath.startsWith(`${docsRoot}${path.sep}`)) &&
      fs.existsSync(ctxPath)
    ) {
      previous = fs.readFileSync(ctxPath, 'utf-8').trim();
    }
  } catch {
    previous = '';
  }

  const memory = [
    '---',
    '## Run memory',
    `Your workspace folder is \`${folder}\`.`,
    previous
      ? `Context you saved at the end of your previous run:\n\n${previous}`
      : 'No context was saved by a previous run yet.',
    `When you finish, call \`save_context\` with folder="${folder}" and a SHORT \`content\` holding only what the next run needs to resume (e.g. a cursor or a few ids). Keep it minimal — it is re-injected here next time.`,
  ].join('\n\n');

  return `${base}\n\n${memory}`;
}

function agentSystemPromptForRun(docsPath: string, agent: WorkspaceEntity, toolsEnabled: boolean): string {
  if (!toolsEnabled) {
    return agent.config.systemPrompt.trim();
  }
  return agentSystemPromptWithMemory(docsPath, agent);
}

function createAgentRunDocument(
  docsPath: string,
  agent: WorkspaceEntity,
  provider: WorkspaceEntity,
  ok: boolean,
  userInput: string,
  content: string,
  debug?: string,
  artifacts?: AgentRunArtifacts,
): AgentRunDocumentResult {
  const folder = sanitizeWorkspaceFolder(agent.config.workspaceFolder);
  if (!folder) throw new Error('agent workspace folder is missing');

  const docsRoot = path.resolve(docsPath);
  const targetDir = path.resolve(docsPath, folder);
  if (!targetDir.startsWith(`${docsRoot}${path.sep}`) && targetDir !== docsRoot) {
    throw new Error('agent workspace folder escapes docs folder');
  }
  fs.mkdirSync(targetDir, { recursive: true });

  const title = `Run - ${agent.label}`;
  const baseFilename = buildWorkspaceFilenameForDocs(docsPath, title, 'AGENT');
  const baseName = baseFilename.replace(/\.md$/, '');
  let filename = baseFilename;
  let filePath = path.join(targetDir, filename);
  let suffix = 2;
  while (fs.existsSync(filePath)) {
    filename = `${baseName}_${suffix}.md`;
    filePath = path.join(targetDir, filename);
    suffix += 1;
  }

  const relativePath = path.relative(docsPath, filePath);
  fs.writeFileSync(
    filePath,
    normalizeFrontmatter(agentRunMarkdown({ title, agent, provider, ok, userInput, content, debug, artifacts }), relativePath, { title }),
    'utf-8',
  );
  return {
    id: encodeURIComponent(relativePath.slice(0, -3)),
    filename: relativePath,
    title,
    ok,
  };
}

function createAgentFailureDocumentFromRequest(
  docsPath: string,
  input: AgentRunFailureRequest,
): AgentRunDocumentResult {
  if (typeof input.agentId !== 'string' || !input.agentId.trim()) {
    throw new Error('agentId is required');
  }

  const state = readWorkspaceState(docsPath);
  ensureProviderWorkspaceFolders(docsPath, state);
  writeWorkspaceState(docsPath, state);

  const { agent, provider } = findWorkspaceAgentRunContext(state, input.agentId.trim());
  const userInput = typeof input.userInput === 'string' ? input.userInput.trim() : '';
  const error = new Error(
    typeof input.errorMessage === 'string' && input.errorMessage.trim()
      ? input.errorMessage.trim()
      : 'Agent run failed before the server returned a response',
  );
  error.name =
    typeof input.errorName === 'string' && input.errorName.trim()
      ? input.errorName.trim()
      : 'ClientFetchError';
  if (typeof input.errorStack === 'string' && input.errorStack.trim()) {
    error.stack = input.errorStack;
  }

  const content = errorReportMarkdown(error, safeOptionalString(input.phase, 'client-fetch', MAX_LABEL_LENGTH));
  return createAgentRunDocument(docsPath, agent, provider, false, userInput, content);
}

function findWorkspaceAgentRunContext(state: WorkspaceState, agentId: string): {
  agent: WorkspaceEntity;
  provider: WorkspaceEntity;
  mcp: WorkspaceEntity | null;
} {
  const agent = state.entities.find((entity) => entity.id === agentId && entity.kind === 'agent');
  if (!agent) {
    throw new Error('agent not found');
  }

  const provider = state.entities.find((entity) => entity.id === agent.parentId && entity.kind === 'llm');
  if (!provider) {
    throw new Error('agent parent LLM provider not found');
  }
  if (provider.config.providerType === 'image') {
    throw new Error('agents must be attached to a Chat completion provider; use Image generation providers through generate_image');
  }

  return {
    agent,
    provider,
    mcp: state.entities.find((entity) => entity.kind === 'mcp') ?? null,
  };
}

function buildWorkspaceFilenameForDocs(docsPath: string, title: string, category: string): string {
  const { filenamePattern } = readConfig(docsPath);
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `${(filenamePattern || 'YYYY_MM_DD_HH_mm_[Category]_title')
    .replace('YYYY', yyyy)
    .replace('MM', mm)
    .replace('DD', dd)
    .replace('HH', hh)
    .replace('mm', min)
    .replace(/\[Category\]/i, `[${category}]`)
    .replace(/(?<![a-z0-9])(?:title_words|title)(?![a-z0-9])/i, slugify(title))}.md`;
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
      const body = req.body as { endpoint?: unknown; token?: unknown; providerType?: unknown };
      if (typeof body.endpoint !== 'string' || !body.endpoint.trim()) {
        res.status(400).json({ ok: false, error: 'endpoint is required' });
        return;
      }
      const noV1Hosts = readConfig(docsPath).llmModelsNoV1Hosts;
      const noV1 = endpointServesModelsWithoutV1(body.endpoint.trim(), noV1Hosts);
      const url = body.providerType === 'image'
        ? imageModelsUrl(body.endpoint.trim())
        : llmModelsUrl(body.endpoint.trim(), noV1);
      const headers: Record<string, string> = { Accept: 'application/json' };
      const resolvedToken = resolveSecret(body.token);
      if (resolvedToken) {
        headers.Authorization = `Bearer ${resolvedToken}`;
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
        // Surface a real reason on failure so the UI doesn't just say "No models found".
        const error = response.ok
          ? undefined
          : `${url.toString()} → ${response.status} ${response.statusText}`.trim();
        res.json({ ok: response.ok, models, error });
      } finally {
        clearTimeout(timeout);
      }
    } catch (error) {
      const message = workspaceErrorMessage('list-models failed', error, 'Failed to list models');
      res.status(400).json({ ok: false, error: message });
    }
  });

  router.post('/mcp-inventory', async (req, res) => {
    try {
      const body = req.body as { endpoint?: unknown };
      if (typeof body.endpoint !== 'string' || !body.endpoint.trim()) {
        res.status(400).json({ ok: false, error: 'endpoint is required' });
        return;
      }
      const endpoint = body.endpoint.trim();
      const [tools, prompts] = await Promise.all([
        listMcpNames(endpoint, 'tools/list', 'tools'),
        listMcpNames(endpoint, 'prompts/list', 'prompts'),
      ]);
      // Tools are the meaningful surface; prompts are optional on many MCP servers, so a prompts
      // failure must not fail the whole call. Only a tools failure becomes the top-level error.
      res.json({ ok: tools.ok, tools: tools.names, prompts: prompts.names, error: tools.error });
    } catch (error) {
      const message = workspaceErrorMessage('mcp-inventory failed', error, 'Failed to list MCP inventory');
      res.status(400).json({ ok: false, error: message });
    }
  });

  router.post('/run-agent-document', async (req, res) => {
    try {
      const body = req.body as { agentId?: unknown; userInput?: unknown };
      if (typeof body.agentId !== 'string' || !body.agentId.trim()) {
        res.status(400).json({ ok: false, error: 'agentId is required' });
        return;
      }

      const state = readWorkspaceState(docsPath);
      ensureProviderWorkspaceFolders(docsPath, state);
      writeWorkspaceState(docsPath, state);

      const { agent, provider, mcp } = findWorkspaceAgentRunContext(state, body.agentId.trim());
      const userInput = typeof body.userInput === 'string' ? body.userInput.trim() : '';
      const debug: AgentDebugLog | undefined = readConfig(docsPath).debugAgents ? { sections: [] } : undefined;
      const artifacts: AgentRunArtifacts = { generatedImages: [] };
      const toolsEnabled = provider.config.toolMode !== 'chat';

      try {
        const content = await runAgent(
          {
            endpoint: provider.config.endpoint,
            token: provider.config.token,
            model: agent.config.model || provider.config.model,
            systemPrompt: agentSystemPromptForRun(docsPath, agent, toolsEnabled),
            userInput,
            timeout: agent.config.timeout || provider.config.timeout,
            mcpEndpoint: mcp?.config.endpoint ?? '',
            toolsEnabled,
            expectedOutputMarker: agent.config.expectedOutputMarker,
          },
          undefined,
          debug,
          artifacts,
        );
        const document = createAgentRunDocument(docsPath, agent, provider, true, userInput, content, renderAgentDebug(debug), artifacts);
        res.json({ ok: true, content, document });
      } catch (error) {
        const message = workspaceErrorMessage('run-agent-document failed', error, 'Agent run failed');
        const content = errorReportMarkdown(error, 'server-agent-run', {
          Agent: agent.label,
          Provider: provider.label,
          Model: agent.config.model || provider.config.model,
        });
        const document = createAgentRunDocument(docsPath, agent, provider, false, userInput, content, renderAgentDebug(debug), artifacts);
        res.status(502).json({ ok: false, error: message, detail: content, document });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Agent run failed';
      const status = message === 'agent not found' ? 404 : 400;
      res.status(status).json({
        ok: false,
        error: message,
        detail: errorReportMarkdown(error, 'server-request-validation'),
      });
    }
  });

  router.post('/run-agent-document-stream', async (req, res) => {
    const writeEvent = (event: AgentRunEvent): void => {
      res.write(`${JSON.stringify(event)}\n`);
    };

    try {
      const body = req.body as { agentId?: unknown; userInput?: unknown };
      if (typeof body.agentId !== 'string' || !body.agentId.trim()) {
        res.status(400).json({ ok: false, error: 'agentId is required' });
        return;
      }

      const state = readWorkspaceState(docsPath);
      ensureProviderWorkspaceFolders(docsPath, state);
      writeWorkspaceState(docsPath, state);

      const { agent, provider, mcp } = findWorkspaceAgentRunContext(state, body.agentId.trim());
      const userInput = typeof body.userInput === 'string' ? body.userInput.trim() : '';
      const debug: AgentDebugLog | undefined = readConfig(docsPath).debugAgents ? { sections: [] } : undefined;
      const artifacts: AgentRunArtifacts = { generatedImages: [] };
      const toolsEnabled = provider.config.toolMode !== 'chat';

      res.status(200);
      res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();

      writeEvent({ type: 'status', message: 'Starting agent run' });

      let ok = false;
      let content = '';

      try {
        content = await runAgent(
          {
            endpoint: provider.config.endpoint,
            token: provider.config.token,
            model: agent.config.model || provider.config.model,
            systemPrompt: agentSystemPromptForRun(docsPath, agent, toolsEnabled),
            userInput,
            timeout: agent.config.timeout || provider.config.timeout,
            mcpEndpoint: mcp?.config.endpoint ?? '',
            toolsEnabled,
            expectedOutputMarker: agent.config.expectedOutputMarker,
          },
          writeEvent,
          debug,
          artifacts,
        );
        ok = true;
      } catch (error) {
        const message = workspaceErrorMessage('run-agent-document-stream failed', error, 'Agent run failed');
        writeEvent({ type: 'error', message });
        content = errorReportMarkdown(error, 'server-agent-run', {
          Agent: agent.label,
          Provider: provider.label,
          Model: agent.config.model || provider.config.model,
        });
      }

      try {
        const document = createAgentRunDocument(docsPath, agent, provider, ok, userInput, content, renderAgentDebug(debug), artifacts);
        writeEvent({ type: 'document', message: ok ? 'Document saved' : 'Error document saved', document });
      } catch (docError) {
        const msg = docError instanceof Error ? docError.message : 'Failed to save document';
        writeEvent({ type: 'error', message: `Document save failed: ${msg}` });
      }

      res.end();
    } catch (error) {
      if (res.headersSent) {
        const message = workspaceErrorMessage('run-agent-document-stream failed', error, 'Agent run failed');
        res.write(`${JSON.stringify({ type: 'error', message } as AgentRunEvent)}\n`);
        res.end();
        return;
      }
      const message = error instanceof Error ? error.message : 'Agent run failed';
      res.status(400).json({ ok: false, error: message });
    }
  });

  router.post('/run-agent-document-failure', (req, res) => {
    try {
      const document = createAgentFailureDocumentFromRequest(
        docsPath,
        req.body as AgentRunFailureRequest,
      );
      res.status(502).json({
        ok: false,
        error:
          typeof req.body?.errorMessage === 'string' && req.body.errorMessage.trim()
            ? req.body.errorMessage.trim()
            : 'Agent run failed before the server returned a response',
        document,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Agent run failed';
      const status = message === 'agent not found' ? 404 : 400;
      res.status(status).json({
        ok: false,
        error: message,
        detail: errorReportMarkdown(error, 'client-failure-document'),
      });
    }
  });

  router.post('/run-agent-stream', async (req, res) => {
    const writeEvent = (event: AgentRunEvent): void => {
      res.write(`${JSON.stringify(event)}\n`);
    };

    try {
      const body = req.body as {
        providerId?: unknown; endpoint?: unknown; model?: unknown;
        systemPrompt?: unknown; userInput?: unknown; timeout?: unknown; mcpEndpoint?: unknown; toolMode?: unknown; expectedOutputMarker?: unknown;
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

      // Resolve token server-side from workspace state — never accept a raw token from the client.
      let resolvedProviderToken = '';
      let toolsEnabled = body.toolMode !== 'chat';
      if (typeof body.providerId === 'string' && body.providerId.trim()) {
        const state = readWorkspaceState(docsPath);
        const provider = state.entities.find(
          (e) => e.id === body.providerId && e.kind === 'llm',
        );
        if (provider) {
          if (provider.config.providerType === 'image') {
            throw new Error('run-agent-stream requires a Chat completion provider');
          }
          resolvedProviderToken = provider.config.token;
          toolsEnabled = provider.config.toolMode !== 'chat';
        }
      }

      res.status(200);
      res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();

      writeEvent({ type: 'status', message: 'Starting agent run' });

      try {
        await runAgent(
          {
            endpoint: body.endpoint,
            token: resolvedProviderToken,
            model: body.model,
            systemPrompt: body.systemPrompt,
            userInput: typeof body.userInput === 'string' ? body.userInput : '',
            timeout: clamp(safeFiniteNumber(body.timeout, 180), 1, 600),
            mcpEndpoint: typeof body.mcpEndpoint === 'string' ? body.mcpEndpoint : '',
            toolsEnabled,
            expectedOutputMarker:
              typeof body.expectedOutputMarker === 'string' ? body.expectedOutputMarker : '',
          },
          writeEvent,
        );
      } catch (error) {
        const message = workspaceErrorMessage('run-agent-stream failed', error, 'Agent run failed');
        writeEvent({ type: 'error', message });
      } finally {
        res.end();
      }
    } catch (error) {
      if (res.headersSent) {
        const message = workspaceErrorMessage('run-agent-stream failed', error, 'Agent run failed');
        writeEvent({ type: 'error', message });
        res.end();
        return;
      }
      const message = error instanceof Error ? error.message : 'Agent run failed';
      res.status(400).json({ ok: false, error: message });
    }
  });

  router.post('/run-agent', async (req, res) => {
    try {
      const body = req.body as {
        endpoint?: unknown; token?: unknown; model?: unknown;
        systemPrompt?: unknown; userInput?: unknown; timeout?: unknown; mcpEndpoint?: unknown; toolMode?: unknown; expectedOutputMarker?: unknown;
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

      const content = await runAgent({
        endpoint: body.endpoint,
        token: typeof body.token === 'string' ? body.token : '',
        model: body.model,
        systemPrompt: body.systemPrompt,
        userInput: typeof body.userInput === 'string' ? body.userInput : '',
        timeout: clamp(safeFiniteNumber(body.timeout, 180), 1, 600),
        mcpEndpoint: typeof body.mcpEndpoint === 'string' ? body.mcpEndpoint : '',
        toolsEnabled: body.toolMode !== 'chat',
        expectedOutputMarker:
          typeof body.expectedOutputMarker === 'string' ? body.expectedOutputMarker : '',
      });
      res.json({ ok: true, content });
    } catch (error) {
      const message = workspaceErrorMessage('run-agent failed', error, 'Agent run failed');
      res.status(400).json({ ok: false, error: message });
    }
  });

  router.post('/test-llm', async (req, res) => {
    try {
      const testBody = req.body as LlmConnectionTestRequest;
      const noV1 =
        typeof testBody.endpoint === 'string' &&
        endpointServesModelsWithoutV1(testBody.endpoint.trim(), readConfig(docsPath).llmModelsNoV1Hosts);
      const result = await testLlmConnection(testBody, noV1);
      res.status(result.ok ? 200 : 502).json(result);
    } catch (error) {
      const message = errorMessageWithCause(error, 'Failed to test LLM connection');
      if (message !== 'endpoint is required') {
        console.error('[workspace] test-llm failed:', message);
      }
      res.status(400).json({ ok: false, error: message });
    }
  });

  return router;
}
