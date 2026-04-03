import { Router, Request, Response } from 'express';
import path from 'path';
import { readConfig, writeConfig, LivingDocConfig } from '../lib/config';

export function configRouter(docsPath: string): Router {
  const router = Router();

  // GET /api/config
  router.get('/', (_req: Request, res: Response) => {
    try {
      res.json(readConfig(docsPath));
    } catch {
      res.status(500).json({ error: 'Failed to read config' });
    }
  });

  // PUT /api/config
  router.put('/', (req: Request, res: Response) => {
    try {
      const patch = req.body as Partial<LivingDocConfig>;
      // Only allow safe fields — prevent path traversal via config
      const allowed: (keyof LivingDocConfig)[] = [
        'title',
        'filenamePattern',
        'theme',
        'showDiagramDebug',
      ];
      const safe: Partial<LivingDocConfig> = {};
      for (const key of allowed) {
        if (key in patch) {
          (safe as Record<string, unknown>)[key] = patch[key];
        }
      }
      // filenamePattern: must contain exactly one [Category]
      if ('filenamePattern' in safe && typeof safe.filenamePattern === 'string') {
        const matches = safe.filenamePattern.match(/\[Category\]/gi);
        if (!matches || matches.length === 0) {
          return res.status(400).json({ error: 'filenamePattern must contain [Category]' });
        }
        if (matches.length > 1) {
          return res.status(400).json({ error: 'filenamePattern must contain [Category] exactly once' });
        }
      }
      // extraFiles: only absolute .md paths
      if ('extraFiles' in patch && Array.isArray(patch.extraFiles)) {
        safe.extraFiles = (patch.extraFiles as unknown[]).filter(
          (f): f is string =>
            typeof f === 'string' &&
            path.isAbsolute(f) &&
            f.toLowerCase().endsWith('.md'),
        );
      }
      const updated = writeConfig(docsPath, safe);
      res.json(updated);
    } catch {
      res.status(500).json({ error: 'Failed to update config' });
    }
  });

  return router;
}
