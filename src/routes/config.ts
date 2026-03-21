import { Router, Request, Response } from 'express';
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
      ];
      const safe: Partial<LivingDocConfig> = {};
      for (const key of allowed) {
        if (key in patch) {
          (safe as Record<string, unknown>)[key] = patch[key];
        }
      }
      const updated = writeConfig(docsPath, safe);
      res.json(updated);
    } catch {
      res.status(500).json({ error: 'Failed to update config' });
    }
  });

  return router;
}
