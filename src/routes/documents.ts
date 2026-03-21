import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { marked } from 'marked';
import { parseFilename, DocMetadata } from '../lib/parser';

function listDocs(docsPath: string): DocMetadata[] {
  const files = fs
    .readdirSync(docsPath)
    .filter((f) => f.toLowerCase().endsWith('.md'));

  const docs = files.map((filename) => parseFilename(filename));

  // Sort: dated docs first (newest → oldest), then undated alphabetically
  docs.sort((a, b) => {
    if (a.date && b.date) return b.date.localeCompare(a.date);
    if (a.date) return -1;
    if (b.date) return 1;
    return a.title.localeCompare(b.title);
  });

  return docs;
}

function safeFilePath(docsPath: string, filename: string): string | null {
  const resolved = path.resolve(docsPath, filename);
  if (!resolved.startsWith(path.resolve(docsPath) + path.sep)) return null;
  return resolved;
}

export function documentsRouter(docsPath: string): Router {
  const router = Router();

  // GET /api/documents — list all docs with metadata
  router.get('/', (_req: Request, res: Response) => {
    try {
      res.json(listDocs(docsPath));
    } catch {
      res.status(500).json({ error: 'Failed to list documents' });
    }
  });

  // GET /api/documents/search?q=query — full-text search
  router.get('/search', (req: Request, res: Response) => {
    const query = ((req.query.q as string) ?? '').toLowerCase().trim();
    if (!query) return res.json([]);

    try {
      const docs = listDocs(docsPath);
      const results: (DocMetadata & { excerpt: string })[] = [];

      for (const doc of docs) {
        const filePath = safeFilePath(docsPath, doc.filename);
        if (!filePath || !fs.existsSync(filePath)) continue;

        const content = fs.readFileSync(filePath, 'utf-8');
        const inTitle = doc.title.toLowerCase().includes(query);
        const inCategory = doc.category.toLowerCase().includes(query);
        const inContent = content.toLowerCase().includes(query);

        if (inTitle || inCategory || inContent) {
          // Extract a snippet around the first match in content
          let excerpt = '';
          if (inContent) {
            const idx = content.toLowerCase().indexOf(query);
            const start = Math.max(0, idx - 60);
            const end = Math.min(content.length, idx + query.length + 90);
            excerpt =
              (start > 0 ? '…' : '') +
              content.slice(start, end).replace(/\n+/g, ' ').trim() +
              (end < content.length ? '…' : '');
          }
          results.push({ ...doc, excerpt });
        }
      }

      res.json(results);
    } catch {
      res.status(500).json({ error: 'Search failed' });
    }
  });

  // GET /api/documents/:id — get a single document (content + rendered HTML)
  router.get('/:id', async (req: Request, res: Response) => {
    const id = decodeURIComponent(req.params.id);
    const filename = id + '.md';
    const filePath = safeFilePath(docsPath, filename);

    if (!filePath) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Document not found' });
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const metadata = parseFilename(filename);
      const html = marked.parse(content) as string;
      res.json({ ...metadata, content, html });
    } catch {
      res.status(500).json({ error: 'Failed to read document' });
    }
  });

  return router;
}
