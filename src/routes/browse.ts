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

      const files = entries
        .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.md'))
        .map((e) => ({ name: e.name, path: path.join(current, e.name) }))
        .sort((a, b) => a.name.localeCompare(b.name));

      const parsed = path.parse(current);
      const parent = current === parsed.root ? null : path.dirname(current);

      res.json({ current, parent, dirs, files });
    } catch {
      res.status(400).json({ error: 'Cannot read directory' });
    }
  });

  return router;
}
