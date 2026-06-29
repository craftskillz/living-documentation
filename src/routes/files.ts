import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { readConfig } from '../lib/config';

const MAX_FILE_BYTES = 19 * 1024 * 1024; // keep below Express 20mb body limit

function slugify(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_\-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 80);
}

function isSafeFilename(filename: string): boolean {
  return typeof filename === 'string'
    && filename.length > 0
    && !/[\\\/]/.test(filename)
    && !filename.startsWith('.')
    && filename !== '..';
}

function isSafeRelativePath(value: string): boolean {
  if (typeof value !== 'string') return false;
  if (!value || value.startsWith('/') || value.startsWith('\\')) return false;
  const segments = value.split(/[\\/]+/).filter(Boolean);
  if (!segments.length) return false;
  return segments.every((segment) => isSafeFilename(segment) && segment !== '.' && segment !== '..');
}

function toPosixPath(value: string): string {
  return value.split(path.sep).join('/');
}

function resolveFilePathSafe(filesDir: string, filename: string): string | null {
  if (!isSafeRelativePath(filename)) return null;
  const resolvedDir = path.resolve(filesDir);
  const resolved = path.resolve(filesDir, filename);
  if (!resolved.startsWith(resolvedDir + path.sep)) return null;
  return resolved;
}

function collectFilePaths(dir: string, baseDir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFilePaths(fullPath, baseDir));
    } else if (entry.isFile()) {
      results.push(toPosixPath(path.relative(baseDir, fullPath)));
    }
  }
  return results;
}

function collectFolderPaths(dir: string, baseDir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
    const fullPath = path.join(dir, entry.name);
    results.push(toPosixPath(path.relative(baseDir, fullPath)));
    results.push(...collectFolderPaths(fullPath, baseDir));
  }
  return results;
}

function folderFromDocumentId(documentId: unknown): string {
  if (typeof documentId !== 'string' || !documentId.trim()) return '';
  let decoded = documentId;
  try {
    decoded = decodeURIComponent(documentId);
  } catch {
    return '';
  }
  if (path.isAbsolute(decoded)) return '';
  const docDir = path.posix.dirname(decoded.split(path.sep).join('/'));
  if (docDir === '.') return '';
  return isSafeRelativePath(docDir) ? docDir : '';
}

function parseUploadedAt(filename: string): { uploadedAt: string | null; displayName: string } {
  const base = path.posix.basename(filename);
  const match = base.match(/^(\d{14})_[a-z0-9]{4}_(.+)$/);
  if (!match) return { uploadedAt: null, displayName: base };
  const ts = match[1];
  const d = new Date(
    parseInt(ts.slice(0, 4), 10),
    parseInt(ts.slice(4, 6), 10) - 1,
    parseInt(ts.slice(6, 8), 10),
    parseInt(ts.slice(8, 10), 10),
    parseInt(ts.slice(10, 12), 10),
    parseInt(ts.slice(12, 14), 10),
  );
  return {
    uploadedAt: isNaN(d.getTime()) ? null : d.toISOString(),
    displayName: match[2],
  };
}

export function filesRouter(docsPath: string): Router {
  const router = Router();

  // GET /api/files — recursively list files in DOCS_FOLDER/files/.
  router.get('/', (_req: Request, res: Response) => {
    const filesDir = path.join(docsPath, 'files');
    if (!fs.existsSync(filesDir)) {
      return res.json({ files: [], folders: [] });
    }

    const entries = collectFilePaths(filesDir, filesDir).sort((a, b) => a.localeCompare(b));
    const folders = collectFolderPaths(filesDir, filesDir).sort((a, b) => a.localeCompare(b));
    const files = entries.map((filename) => {
      const stat = fs.statSync(path.join(filesDir, filename));
      const { uploadedAt, displayName } = parseUploadedAt(filename);
      const folder = path.posix.dirname(filename) === '.' ? '' : path.posix.dirname(filename);
      return {
        filename,
        displayName,
        folder,
        uploadedAt,
        size: stat.size,
        url: `/files/${filename}`,
      };
    });

    res.json({ files, folders });
  });

  // PUT /api/files/:filename — overwrite existing file (same filename, no history).
  router.put('/:filename', (req: Request, res: Response) => {
    const filename = req.params.filename as string;
    const { data } = req.body as { data?: string };

    const filesDir = path.join(docsPath, 'files');
    const filePath = resolveFilePathSafe(filesDir, filename);
    if (!filePath) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    if (typeof data !== 'string' || !data) {
      return res.status(400).json({ error: 'data is required' });
    }
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const base64 = data.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');
    if (buffer.length > MAX_FILE_BYTES) {
      return res.status(413).json({
        error: `File too large (${(buffer.length / 1024 / 1024).toFixed(1)} MB). Maximum is ${(MAX_FILE_BYTES / 1024 / 1024).toFixed(0)} MB.`,
        maxBytes: MAX_FILE_BYTES,
      });
    }

    try {
      fs.writeFileSync(filePath, buffer);
      const stat = fs.statSync(filePath);
      res.json({ filename, size: stat.size, url: `/files/${filename}` });
    } catch {
      res.status(500).json({ error: 'Failed to replace file' });
    }
  });

  // DELETE /api/files/:filename — remove a file from DOCS_FOLDER/files/.
  router.delete('/:filename', (req: Request, res: Response) => {
    const filename = req.params.filename as string;
    const filesDir = path.join(docsPath, 'files');
    const filePath = resolveFilePathSafe(filesDir, filename);
    if (!filePath) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    try {
      fs.unlinkSync(filePath);
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: 'Failed to delete file' });
    }
  });

  // POST /api/files/upload — base64-encoded arbitrary file saved to DOCS_FOLDER/files/
  router.post('/upload', (req: Request, res: Response) => {
    const { data, name, documentId } = req.body as { data?: string; name?: string; documentId?: string };

    if (typeof data !== 'string' || !data) {
      return res.status(400).json({ error: 'data is required' });
    }
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }

    const originalName = name.trim();
    const rawExt = (path.extname(originalName) || '').replace(/^\./, '').toLowerCase();
    if (!rawExt || !/^[a-z0-9]+$/.test(rawExt)) {
      return res.status(400).json({ error: 'File must have a simple alphanumeric extension' });
    }

    const config = readConfig(docsPath);
    const blocked = (config.blockedFileExtensions || []).map((e) => e.toLowerCase());
    if (blocked.includes(rawExt)) {
      return res.status(400).json({
        error: `Extension ".${rawExt}" is blocked by server configuration`,
        blockedExtension: rawExt,
      });
    }

    const base64 = data.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');
    if (buffer.length > MAX_FILE_BYTES) {
      return res.status(413).json({
        error: `File too large (${(buffer.length / 1024 / 1024).toFixed(1)} MB). Maximum is ${(MAX_FILE_BYTES / 1024 / 1024).toFixed(0)} MB.`,
        maxBytes: MAX_FILE_BYTES,
      });
    }

    const folder = folderFromDocumentId(documentId);
    const filesDir = path.join(docsPath, 'files', folder);
    if (!fs.existsSync(filesDir)) {
      fs.mkdirSync(filesDir, { recursive: true });
    }

    const baseWithoutExt = slugify(path.basename(originalName, path.extname(originalName))) || 'file';
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const timestamp =
      `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
      `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const random = Math.random().toString(36).slice(2, 6);
    const basename = `${timestamp}_${random}_${baseWithoutExt}.${rawExt}`;
    const filename = folder ? `${folder}/${basename}` : basename;

    try {
      fs.writeFileSync(path.join(filesDir, basename), buffer);
      res.json({
        filename,
        url: `/files/${filename}`,
        originalName,
        size: buffer.length,
      });
    } catch {
      res.status(500).json({ error: 'Failed to save file' });
    }
  });

  return router;
}
