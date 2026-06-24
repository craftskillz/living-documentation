import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import {
  BLUEPRINT_FOLDER,
  isBlueprintIgnoredDir,
  listBlueprintBox,
  normalizeBlueprintPath,
  safeResolveBlueprintPath,
} from '../lib/blueprint';
import { readConfig } from '../lib/config';
import { listDocs } from './documents';

const MAX_TEXT_BYTES = 1024 * 1024; // 1 MB

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.bmp', '.avif']);
const VIDEO_EXTS = new Set(['.mp4', '.webm', '.mov', '.avi', '.mkv', '.ogv']);

const EXT_TO_LANGUAGE: Record<string, string> = {
  '.ts': 'typescript', '.tsx': 'typescript', '.mts': 'typescript',
  '.js': 'javascript', '.jsx': 'javascript', '.mjs': 'javascript', '.cjs': 'javascript',
  '.py': 'python', '.rs': 'rust', '.go': 'go', '.java': 'java',
  '.c': 'c', '.h': 'c', '.cpp': 'cpp', '.cc': 'cpp', '.cxx': 'cpp', '.hpp': 'cpp',
  '.cs': 'csharp', '.rb': 'ruby', '.php': 'php', '.swift': 'swift', '.kt': 'kotlin',
  '.html': 'html', '.htm': 'html', '.css': 'css', '.scss': 'scss', '.sass': 'scss',
  '.json': 'json', '.yaml': 'yaml', '.yml': 'yaml', '.toml': 'toml',
  '.md': 'markdown', '.mdx': 'markdown',
  '.sh': 'bash', '.bash': 'bash', '.zsh': 'bash',
  '.sql': 'sql', '.xml': 'xml', '.graphql': 'graphql', '.gql': 'graphql',
  '.dockerfile': 'dockerfile', '.tf': 'hcl', '.lua': 'lua', '.r': 'r',
};

function isBinary(buffer: Buffer): boolean {
  const sample = buffer.slice(0, Math.min(8000, buffer.length));
  for (let i = 0; i < sample.length; i++) {
    if (sample[i] === 0) return true;
  }
  return false;
}

export interface BlueprintFolder {
  name: string;
  path: string; // relative to sourceRoot, posix
  hasChildren: boolean;
  hasDoc: boolean; // true when a blueprint document already exists for this block
}

// Mirrors the frontend slug used by AdrModal: a folder name maps to an ADR
// category. Kept identical so `hasDoc` agrees with the lookup the "D" button
// performs (GET /blueprint-adr?category=...).
export function slugifyCategory(name: string): string {
  return (
    name.normalize('NFKD').replace(/[̀-ͯ]/g, '').toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'FOLDER'
  );
}

// Set of categories (uppercased) that already have a document under the
// blueprint folder — the same filter as the /blueprint-adr lookup.
function blueprintDocCategories(docsPath: string): Set<string> {
  const { extraFiles = [], filenamePattern } = readConfig(docsPath);
  const docs = listDocs(docsPath, extraFiles, filenamePattern);
  const categories = new Set<string>();
  for (const d of docs) {
    if (Array.isArray(d.folder) && d.folder.length === 1 && d.folder[0] === BLUEPRINT_FOLDER) {
      categories.add(d.category.toUpperCase());
    }
  }
  return categories;
}

export interface BlueprintResponse {
  sourceRoot: string;
  path: string;
  name: string;
  folders: BlueprintFolder[];
}

function listFolders(
  sourceRoot: string,
  relPath: string,
  docCategories: Set<string>,
): BlueprintFolder[] {
  const absDir = path.resolve(sourceRoot, relPath);

  // Security: must stay inside sourceRoot
  if (!absDir.startsWith(sourceRoot + path.sep) && absDir !== sourceRoot) {
    throw new Error('path escapes sourceRoot');
  }
  if (!fs.existsSync(absDir)) return [];

  return fs.readdirSync(absDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !isBlueprintIgnoredDir(entry.name))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((entry) => {
      const childRel = relPath ? `${relPath}/${entry.name}` : entry.name;
      const childAbs = path.resolve(sourceRoot, childRel);
      const hasChildren = fs.readdirSync(childAbs, { withFileTypes: true })
        .some((e) => e.isDirectory() && !isBlueprintIgnoredDir(e.name));
      const hasDoc = docCategories.has(slugifyCategory(entry.name));
      return { name: entry.name, path: childRel, hasChildren, hasDoc };
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
        ? normalizeBlueprintPath(req.query.path)
        : '';

      const folders = listFolders(sourceRoot, reqPath, blueprintDocCategories(docsPath));
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

  // Blueprint ADR folder management
  router.get('/blueprint-folder', (_req, res) => {
    const folderPath = path.join(docsPath, BLUEPRINT_FOLDER);
    res.json({ exists: fs.existsSync(folderPath), folder: BLUEPRINT_FOLDER });
  });

  router.post('/blueprint-folder', (_req, res) => {
    try {
      const folderPath = path.join(docsPath, BLUEPRINT_FOLDER);
      fs.mkdirSync(folderPath, { recursive: true });
      res.json({ ok: true, folder: BLUEPRINT_FOLDER });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create folder' });
    }
  });

  router.get('/blueprint-adr', (req, res) => {
    try {
      const category = typeof req.query.category === 'string' ? req.query.category.trim().toUpperCase() : '';
      if (!category) { res.status(400).json({ error: 'category required' }); return; }
      const { extraFiles = [], filenamePattern } = readConfig(docsPath);
      const docs = listDocs(docsPath, extraFiles, filenamePattern);
      const matches = docs.filter((d) =>
        Array.isArray(d.folder) && d.folder.length === 1 && d.folder[0] === BLUEPRINT_FOLDER &&
        d.category.toUpperCase() === category
      );
      if (!matches.length) { res.json({ found: false }); return; }
      // Most recent first (filename starts with date)
      matches.sort((a, b) => b.id.localeCompare(a.id));
      res.json({ found: true, doc: matches[0] });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'error' });
    }
  });

  router.get('/file-content', (req, res) => {
    try {
      const config = readConfig(docsPath);
      const filePath = typeof req.query.path === 'string' ? req.query.path : '';
      const abs = safeResolveBlueprintPath(config.sourceRoot, filePath);
      if (!abs) { res.status(400).json({ error: 'Invalid path' }); return; }
      if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
        res.status(404).json({ error: 'File not found' }); return;
      }
      const ext = path.extname(abs).toLowerCase();
      if (IMAGE_EXTS.has(ext)) {
        res.json({ type: 'image', url: `/api/blueprint/file-raw?path=${encodeURIComponent(filePath)}` });
        return;
      }
      if (VIDEO_EXTS.has(ext)) {
        res.json({ type: 'video', url: `/api/blueprint/file-raw?path=${encodeURIComponent(filePath)}`, ext });
        return;
      }
      const stat = fs.statSync(abs);
      const buffer = fs.readFileSync(abs);
      if (isBinary(buffer)) { res.json({ type: 'binary' }); return; }
      const truncated = stat.size > MAX_TEXT_BYTES;
      const content = buffer.slice(0, MAX_TEXT_BYTES).toString('utf-8');
      const language = EXT_TO_LANGUAGE[ext] ?? 'plaintext';
      res.json({ type: 'text', content, language, truncated });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'error' });
    }
  });

  router.get('/file-raw', (req, res) => {
    try {
      const config = readConfig(docsPath);
      const filePath = typeof req.query.path === 'string' ? req.query.path : '';
      const abs = safeResolveBlueprintPath(config.sourceRoot, filePath);
      if (!abs) { res.status(400).end(); return; }
      if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) { res.status(404).end(); return; }
      res.sendFile(abs);
    } catch { res.status(500).end(); }
  });

  router.get('/files', (req, res) => {
    try {
      const config = readConfig(docsPath);
      const reqPath = typeof req.query.path === 'string'
        ? normalizeBlueprintPath(req.query.path)
        : '';
      const listing = listBlueprintBox(config.sourceRoot, reqPath);
      const folders = listing.folders.map((entry) => entry.name);
      const files = listing.files.map((entry) => entry.name);
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
