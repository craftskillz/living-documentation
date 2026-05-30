import { Router } from 'express';
import fs from 'fs';
import path from 'path';

const WORKSPACE_VERSION = 1;
const MAX_WORKSPACE_ENTITIES = 1000;
const MAX_LABEL_LENGTH = 160;
const MAX_TEXT_FIELD_LENGTH = 4000;
const MAX_WORKSPACE_FILE_BYTES = 1024 * 1024;

type WorkspaceNodeKind = 'system' | 'llm' | 'agent' | 'mcp';

interface WorkspaceEntityConfig {
  environment: string;
  endpoint: string;
  token: string;
  timeout: number;
  retryPolicy: string;
  description: string;
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

function sanitizeWorkspaceState(input: unknown): WorkspaceState {
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

  return {
    version: WORKSPACE_VERSION,
    updatedAt,
    entities: entitiesInput.map(sanitizeEntity),
    camera: sanitizeCamera(input.camera),
  };
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
    environment: safeOptionalString(config.environment, 'local', MAX_LABEL_LENGTH),
    endpoint: safeOptionalString(config.endpoint, '', MAX_TEXT_FIELD_LENGTH),
    token: safeOptionalString(config.token, '', MAX_TEXT_FIELD_LENGTH),
    timeout: clamp(safeFiniteNumber(config.timeout, 30), 1, 120),
    retryPolicy: safeOptionalString(config.retryPolicy, 'linear', MAX_LABEL_LENGTH),
    description: safeOptionalString(config.description, '', MAX_TEXT_FIELD_LENGTH),
  };
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
      const state = sanitizeWorkspaceState({
        ...req.body,
        updatedAt: new Date().toISOString(),
      });
      writeWorkspaceState(docsPath, state);
      res.json(state);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid workspace payload';
      res.status(400).json({ error: message });
    }
  });

  return router;
}
