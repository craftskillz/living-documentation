import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { readConfig } from '../lib/config';

const IGNORED_DIRS = new Set([
  'node_modules', '.git', '.svn', 'dist', 'build', 'out', 'coverage',
  '.next', '.nuxt', '.cache', '.turbo', '__pycache__', '.venv', 'venv',
]);

export interface BlueprintFolder {
  name: string;
  path: string; // relative to sourceRoot, posix
  hasChildren: boolean;
}

export interface BlueprintResponse {
  sourceRoot: string;
  path: string;
  name: string;
  folders: BlueprintFolder[];
}

function listFolders(sourceRoot: string, relPath: string): BlueprintFolder[] {
  const absDir = path.resolve(sourceRoot, relPath);

  // Security: must stay inside sourceRoot
  if (!absDir.startsWith(sourceRoot + path.sep) && absDir !== sourceRoot) {
    throw new Error('path escapes sourceRoot');
  }
  if (!fs.existsSync(absDir)) return [];

  return fs.readdirSync(absDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.') && !IGNORED_DIRS.has(entry.name))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((entry) => {
      const childRel = relPath ? `${relPath}/${entry.name}` : entry.name;
      const childAbs = path.resolve(sourceRoot, childRel);
      const hasChildren = fs.readdirSync(childAbs, { withFileTypes: true })
        .some((e) => e.isDirectory() && !e.name.startsWith('.') && !IGNORED_DIRS.has(e.name));
      return { name: entry.name, path: childRel, hasChildren };
    });
}

const POSITIONS_FILE = '.blueprint-positions.json';

type PositionsMap = Record<string, { x: number; y: number; expanded?: boolean }>;

function positionsFilePath(docsPath: string): string {
  return path.join(docsPath, POSITIONS_FILE);
}

function readPositions(docsPath: string): PositionsMap {
  const file = positionsFilePath(docsPath);
  if (!fs.existsSync(file)) return {};
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as PositionsMap;
  } catch {
    return {};
  }
}

function writePositions(docsPath: string, positions: PositionsMap): void {
  const file = positionsFilePath(docsPath);
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(positions, null, 2), 'utf-8');
  fs.renameSync(tmp, file);
}

export function blueprintRouter(docsPath: string): Router {
  const router = Router();

  router.get('/', (req, res) => {
    try {
      const config = readConfig(docsPath);
      const sourceRoot = config.sourceRoot;
      const reqPath = typeof req.query.path === 'string'
        ? req.query.path.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '')
        : '';

      const folders = listFolders(sourceRoot, reqPath);
      const name = reqPath ? reqPath.split('/').pop()! : path.basename(sourceRoot);

      const response: BlueprintResponse = {
        sourceRoot: path.basename(sourceRoot),
        path: reqPath,
        name,
        folders,
      };
      res.json(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Blueprint error';
      res.status(400).json({ error: message });
    }
  });

  router.get('/files', (req, res) => {
    try {
      const config = readConfig(docsPath);
      const sourceRoot = config.sourceRoot;
      const reqPath = typeof req.query.path === 'string'
        ? req.query.path.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '')
        : '';
      const absDir = path.resolve(sourceRoot, reqPath);
      if (!absDir.startsWith(sourceRoot + path.sep) && absDir !== sourceRoot) {
        res.status(400).json({ error: 'path escapes sourceRoot' }); return;
      }
      if (!fs.existsSync(absDir)) { res.json({ folders: [], files: [] }); return; }
      const entries = fs.readdirSync(absDir, { withFileTypes: true });
      const folders = entries
        .filter((e) => e.isDirectory() && !e.name.startsWith('.') && !IGNORED_DIRS.has(e.name))
        .map((e) => e.name).sort();
      const files = entries
        .filter((e) => e.isFile() && !e.name.startsWith('.'))
        .map((e) => e.name).sort();
      res.json({ folders, files });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'error' });
    }
  });

  router.get('/positions', (_req, res) => {
    res.json(readPositions(docsPath));
  });

  router.put('/positions', (req, res) => {
    try {
      const body = req.body as unknown;
      if (typeof body !== 'object' || body === null || Array.isArray(body)) {
        res.status(400).json({ error: 'positions must be an object' });
        return;
      }
      // Sanitize: keep only valid { x, y } entries
      const sanitized: PositionsMap = {};
      for (const [key, val] of Object.entries(body as Record<string, unknown>)) {
        if (typeof val === 'object' && val !== null &&
            typeof (val as Record<string, unknown>).x === 'number' &&
            typeof (val as Record<string, unknown>).y === 'number') {
          const v = val as Record<string, unknown>;
          sanitized[key] = {
            x: v.x as number,
            y: v.y as number,
            ...(v.expanded === true ? { expanded: true } : {}),
          };
        }
      }
      writePositions(docsPath, sanitized);
      res.json({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save positions';
      res.status(500).json({ error: message });
    }
  });

  return router;
}
