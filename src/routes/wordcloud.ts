import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

function collectFiles(dir: string, exts: string[], out: string[] = []): string[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.isDirectory() && !e.name.startsWith('.')) {
      collectFiles(path.join(dir, e.name), exts, out);
    } else if (e.isFile()) {
      const ext = path.extname(e.name).slice(1).toLowerCase();
      if (exts.includes(ext)) out.push(path.join(dir, e.name));
    }
  }
  return out;
}

export function wordcloudRouter(): Router {
  const router = Router();

  // GET /api/wordcloud?path=<absolute_path>&ext=md&ext=ts&ext=java
  // Returns { files: number, text: string }
  router.get('/', (req: Request, res: Response) => {
    const rawPath = (req.query.path as string) || '/';
    const target = path.resolve(rawPath);

    const rawExt = req.query.ext;
    const exts: string[] = rawExt
      ? (Array.isArray(rawExt) ? rawExt : [rawExt]).map((e) => (e as string).toLowerCase().replace(/^\./, ''))
      : ['md'];

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
      files = collectFiles(target, exts);
    } else {
      res.status(400).json({ error: 'Path must be a directory or a file' });
      return;
    }

    const text = files
      .map((f) => { try { return fs.readFileSync(f, 'utf-8'); } catch { return ''; } })
      .join('\n\n');

    res.json({ files: files.length, text });
  });

  return router;
}
