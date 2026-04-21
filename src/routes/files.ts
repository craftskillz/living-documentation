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

export function filesRouter(docsPath: string): Router {
  const router = Router();

  // POST /api/files/upload — base64-encoded arbitrary file saved to DOCS_FOLDER/files/
  router.post('/upload', (req: Request, res: Response) => {
    const { data, name } = req.body as { data?: string; name?: string };

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

    const filesDir = path.join(docsPath, 'files');
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
    const filename = `${timestamp}_${random}_${baseWithoutExt}.${rawExt}`;
    const filePath = path.join(filesDir, filename);

    try {
      fs.writeFileSync(filePath, buffer);
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
