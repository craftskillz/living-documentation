import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

export function browseRouter(): Router {
  const router = Router();

  // GET /api/browse?path=... — list dirs and .md files at a given path
  router.get('/', (req: Request, res: Response) => {
    const rawPath = (req.query.path as string) || '/';
    const current = path.resolve(rawPath);

    try {
      const entries = fs.readdirSync(current, { withFileTypes: true });

      const dirs = entries
        .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
        .map((e) => ({ name: e.name, path: path.join(current, e.name) }))
        .sort((a, b) => a.name.localeCompare(b.name));

      const allFiles = req.query.all === '1';
      const files = entries
        .filter((e) => e.isFile() && (allFiles || e.name.toLowerCase().endsWith('.md')))
        .map((e) => ({ name: e.name, path: path.join(current, e.name) }))
        .sort((a, b) => a.name.localeCompare(b.name));

      const parsed = path.parse(current);
      const parent = current === parsed.root ? null : path.dirname(current);

      res.json({ current, parent, dirs, files });
    } catch {
      res.status(400).json({ error: 'Cannot read directory' });
    }
  });

  // GET /api/browse/alldirs?path=... — recursively list all subdirectories (relative paths)
  router.get('/alldirs', (req: Request, res: Response) => {
    const rawPath = (req.query.path as string) || '';
    if (!rawPath) return res.status(400).json({ error: 'path is required' });
    const base = path.resolve(rawPath);
    const results: string[] = [];

    function collect(dir: string) {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const e of entries) {
          if (e.isDirectory() && !e.name.startsWith('.')) {
            const full = path.join(dir, e.name);
            results.push(path.relative(base, full));
            collect(full);
          }
        }
      } catch { /* skip unreadable dirs */ }
    }
    collect(base);
    res.json(results);
  });

  // POST /api/browse/mkdir — create a directory
  router.post('/mkdir', (req: Request, res: Response) => {
    const { path: dirPath } = req.body as { path?: string };
    if (!dirPath || typeof dirPath !== 'string') {
      return res.status(400).json({ error: 'path is required' });
    }
    const resolved = path.resolve(dirPath);
    try {
      fs.mkdirSync(resolved, { recursive: true });
      res.json({ created: resolved });
    } catch {
      res.status(500).json({ error: 'Failed to create directory' });
    }
  });

  return router;
}
