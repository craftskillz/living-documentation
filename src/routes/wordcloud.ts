import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const SKIP_DIRS = new Set([
  'node_modules', '.git', '.idea', '.vscode', '__pycache__',
  'target', 'build', 'dist', '.next', 'vendor', '.gradle',
  'out', 'coverage', '.cache', 'tmp', '.tmp', '.turbo',
  '.svelte-kit', '.nuxt', '.output', 'storybook-static',
  'public', 'static', '.vercel', '.netlify',
]);

function collectFiles(dir: string, exts: string[], excludeDirs: Set<string>, rootDir: string, out: string[] = []): string[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (e.name.startsWith('.') || SKIP_DIRS.has(e.name)) continue;
      const relPath = path.relative(rootDir, path.join(dir, e.name));
      if (excludeDirs.has(e.name) || excludeDirs.has(relPath)) continue;
      collectFiles(path.join(dir, e.name), exts, excludeDirs, rootDir, out);
    } else if (e.isFile()) {
      const ext = path.extname(e.name).slice(1).toLowerCase();
      if (!exts.includes(ext)) continue;
      const relPath = path.relative(rootDir, path.join(dir, e.name));
      if (excludeDirs.has(e.name) || excludeDirs.has(relPath)) continue;
      out.push(path.join(dir, e.name));
    }
  }
  return out;
}

export function wordcloudRouter(): Router {
  const router = Router();

  // GET /api/wordcloud?path=<absolute_path>&ext=md&ext=ts&ext=java
  // Returns { files: number, fileTexts: [{path, text}] }
  router.get('/', (req: Request, res: Response) => {
    const rawPath = (req.query.path as string) || '/';
    const target = path.resolve(rawPath);

    // Parse params directly from the raw query string to avoid qs object coercion.
    const rawQuery = req.url.split('?')[1] || '';
    const qp = new URLSearchParams(rawQuery);
    const exts: string[] = qp.getAll('ext')
      .map((e) => e.toLowerCase().replace(/^\./, ''))
      .filter(Boolean);
    if (!exts.length) exts.push('md');

    const excludeDirs = new Set<string>(
      qp.getAll('exclude').map((d) => d.replace(/\/$/, '')).filter(Boolean)
    );

    let stat: fs.Stats;
    try {
      stat = fs.statSync(target);
    } catch {
      res.status(400).json({ error: 'Path not found' });
      return;
    }

    let files: string[];
    if (stat.isFile()) {
      const ext = path.extname(target).slice(1).toLowerCase();
      files = exts.includes(ext) ? [target] : [];
    } else if (stat.isDirectory()) {
      files = collectFiles(target, exts, excludeDirs, target);
    } else {
      res.status(400).json({ error: 'Path must be a directory or a file' });
      return;
    }

    const fileTexts = files.map((f) => ({
      path: path.relative(target, f),
      text: (() => { try { return fs.readFileSync(f, 'utf-8'); } catch { return ''; } })(),
    }));

    res.json({ files: files.length, fileTexts });
  });

  return router;
}
