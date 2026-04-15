import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { marked } from 'marked';
import { readConfig } from '../lib/config';
import { listDocs, safeFilePath, stripFrontmatter } from './documents';

// ── Helpers ────────────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/\s+/g, '-')
    .replace(/[^\w\-\.]/g, '')
    .replace(/-+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '') || 'document';
}

/** Group key used to decide which ZIP folder a doc goes into. */
function docGroup(doc: { folder?: string[] | null; category?: string }): string {
  return doc.folder?.[0] ?? doc.category ?? 'General';
}

/** Minimal HTML wrapper for exported pages. */
function wrapHtml(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:900px;margin:0 auto;padding:2rem;color:#111827;line-height:1.7}
    h1,h2,h3,h4,h5,h6{font-weight:600;margin-top:1.5em;line-height:1.3}
    h1{font-size:2em;border-bottom:2px solid #e5e7eb;padding-bottom:.4em;margin-top:0}
    h2{font-size:1.5em}h3{font-size:1.2em}
    p{margin:.8em 0}
    code{background:#f3f4f6;padding:.15em .4em;border-radius:4px;font-size:.9em;font-family:ui-monospace,Menlo,monospace}
    pre{background:#1f2937;color:#f9fafb;padding:1.2rem;border-radius:8px;overflow-x:auto}
    pre code{background:none;padding:0;color:inherit;font-size:.85em}
    table{border-collapse:collapse;width:100%;margin:1em 0}
    th,td{border:1px solid #e5e7eb;padding:.5rem 1rem;text-align:left}
    th{background:#f9fafb;font-weight:600}
    tr:nth-child(even){background:#f9fafb}
    img{max-width:100%;height:auto;border-radius:4px}
    blockquote{border-left:4px solid #d1d5db;margin:1em 0;padding:.5em 1em;background:#f9fafb;color:#4b5563}
    a{color:#2563eb;text-decoration:none}
    a:hover{text-decoration:underline}
    ul,ol{padding-left:1.5em}li{margin:.3em 0}
    hr{border:none;border-top:1px solid #e5e7eb;margin:2em 0}
  </style>
</head>
<body>
${body}
</body>
</html>`;
}

/**
 * Process rendered HTML:
 *  1. Remove <a> wrappers around diagram links (keep the inner <img>).
 *  2. Rewrite image src from ./images/xxx or /images/xxx to ./{mediaSubfolder}/xxx (or ./xxx if no subfolder).
 *  3. Collect referenced image basenames.
 *
 * @param mediaSubfolder  Optional subfolder name for media (used by Confluence mode).
 *                        When provided, images are referenced as `./{mediaSubfolder}/{basename}`.
 */
function processHtml(html: string, mediaSubfolder?: string): { html: string; images: Set<string> } {
  const images = new Set<string>();
  const imgPrefix = mediaSubfolder ? `./${mediaSubfolder}/` : './';

  // Remove diagram link wrappers but keep inner content (e.g. the screenshot img).
  html = html.replace(
    /<a\s[^>]*href=["'][^"']*\/diagram[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi,
    '$1',
  );

  // Rewrite image src attributes and collect basenames.
  html = html.replace(
    /(<img\b[^>]*?\s)src=["']((?:\.\/|\/)?images\/([^"'?#\s]+))["']/gi,
    (_match, before, _fullSrc, filename) => {
      const basename = path.basename(filename);
      images.add(basename);
      return `${before}src="${imgPrefix}${basename}"`;
    },
  );
  // Also handle src= at the start of the tag (no preceding attributes).
  html = html.replace(
    /(<img\b)(\s+)src=["']((?:\.\/|\/)?images\/([^"'?#\s]+))["']/gi,
    (_match, tag, space, _fullSrc, filename) => {
      const basename = path.basename(filename);
      images.add(basename);
      return `${tag}${space}src="${imgPrefix}${basename}"`;
    },
  );

  return { html, images };
}

// ── Route ─────────────────────────────────────────────────────────────────────

export function exportRouter(docsPath: string): Router {
  const router = Router();

  /**
   * POST /api/export/html
   * Body: { folders: string[], mode: 'notion' | 'confluence' }
   *
   * Notion   → group/page.html + group/image.png  (flat per group)
   * Confluence → group/page/page.html + group/page/image.png  (one sub-folder per page)
   */
  router.post('/html', async (req: Request, res: Response) => {
    const { folders, mode = 'notion' } = req.body as { folders?: string[]; mode?: string };
    if (!folders?.length) {
      return res.status(400).json({ error: 'No folders selected' });
    }

    const { extraFiles = [], filenamePattern } = readConfig(docsPath);
    const docs = listDocs(docsPath, extraFiles, filenamePattern);

    // Filter to selected groups.
    const selectedDocs = docs.filter((doc) => folders.includes(docGroup(doc)));
    if (!selectedDocs.length) {
      return res.status(404).json({ error: 'No documents found for selected folders' });
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="export.zip"');

    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.on('error', (err) => {
      console.error('[export] archive error:', err);
    });
    archive.pipe(res);

    // Track which images have already been added per group to avoid duplicates.
    const addedImages = new Set<string>();

    for (const doc of selectedDocs) {
      const group = docGroup(doc);

      // Resolve file path.
      let filePath: string | null;
      const id = decodeURIComponent(doc.id);
      if (path.isAbsolute(id)) {
        const abs = id + '.md';
        filePath = extraFiles.includes(abs) ? abs : null;
      } else {
        filePath = safeFilePath(docsPath, doc.filename);
      }
      if (!filePath || !fs.existsSync(filePath)) continue;

      const raw = fs.readFileSync(filePath, 'utf-8');
      const bodyHtml = marked.parse(stripFrontmatter(raw)) as string;

      const baseName    = sanitizeFilename(path.basename(doc.filename, '.md'));
      const htmlFilename = baseName + '.html';

      // Notion:     group/page.html  +  group/image.png       (images at same level as HTML)
      // Confluence: group/page.html  +  group/page/image.png  (images in subfolder named after page)
      const isConfluence = mode === 'confluence';
      const mediaSubfolder = isConfluence ? baseName : undefined;
      const { html: processedHtml, images } = processHtml(bodyHtml, mediaSubfolder);
      const fullHtml = wrapHtml(doc.title, processedHtml);

      archive.append(fullHtml, { name: `${group}/${htmlFilename}` });

      for (const imageName of images) {
        const imageDir = isConfluence ? `${group}/${baseName}` : group;
        const key = `${imageDir}/${imageName}`;
        if (addedImages.has(key)) continue;
        addedImages.add(key);
        const imagePath = path.join(docsPath, 'images', imageName);
        if (fs.existsSync(imagePath)) {
          archive.file(imagePath, { name: key });
        }
      }
    }

    await archive.finalize();
  });

  return router;
}
