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
        'language',
        'showDiagramDebug',
        'diagramNodePalette',
        'diagramEdgePalette',
        'sourceRoot',
        'blockedFileExtensions',
        'exclusiveFolderExpansion',
        'exclusiveCategoryExpansion',
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
      // language: only 'en' or 'fr'
      if ('language' in safe && !['en', 'fr'].includes(safe.language as string)) {
        delete (safe as Record<string, unknown>).language;
      }
      // diagramNodePalette / diagramEdgePalette: null or array of strings
      if ('diagramNodePalette' in patch) {
        const v = patch.diagramNodePalette;
        if (v === null || (Array.isArray(v) && v.every((s) => typeof s === 'string'))) {
          safe.diagramNodePalette = v as string[] | null;
        }
      }
      if ('diagramEdgePalette' in patch) {
        const v = patch.diagramEdgePalette;
        if (v === null || (Array.isArray(v) && v.every((s) => typeof s === 'string'))) {
          safe.diagramEdgePalette = v as string[] | null;
        }
      }
      // sourceRoot: null or absolute directory path that exists
      if ('sourceRoot' in patch) {
        const v = patch.sourceRoot;
        if (v === null || v === '') {
          safe.sourceRoot = null;
        } else if (typeof v === 'string' && path.isAbsolute(v)) {
          safe.sourceRoot = v;
        } else {
          return res.status(400).json({ error: 'sourceRoot must be an absolute path or null' });
        }
      }
      // blockedFileExtensions: array of extension strings (without leading dot), lowercase
      if ('blockedFileExtensions' in patch) {
        const v = patch.blockedFileExtensions;
        if (Array.isArray(v)) {
          safe.blockedFileExtensions = (v as unknown[])
            .filter((e): e is string => typeof e === 'string')
            .map((e) => e.trim().replace(/^\.+/, '').toLowerCase())
            .filter((e) => /^[a-z0-9]+$/.test(e));
        } else {
          return res.status(400).json({ error: 'blockedFileExtensions must be an array of strings' });
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
