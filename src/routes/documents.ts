import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import { marked } from "marked";
import { parseFilename, DocMetadata } from "../lib/parser";
import { readConfig } from "../lib/config";
import { readMetadataStore } from "../lib/metadata";

const METADATA_SEARCH_PREFIX = "metadata://";

const RESERVED_DOCS_SUBFOLDERS = new Set(["files", "images"]);

export function collectMdFiles(dir: string, baseDir: string): string[] {
  const results: string[] = [];
  const atDocsRoot = path.resolve(dir) === path.resolve(baseDir);
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    if (atDocsRoot && RESERVED_DOCS_SUBFOLDERS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectMdFiles(fullPath, baseDir));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      results.push(path.relative(baseDir, fullPath));
    }
  }
  return results;
}

export function listDocs(
  docsPath: string,
  extraFiles: string[] = [],
  filenamePattern?: string,
): DocMetadata[] {
  // Extra files first, in config order, always General
  const extraDocs: DocMetadata[] = [];
  for (const filePath of extraFiles) {
    if (!filePath.endsWith(".md") || !fs.existsSync(filePath)) continue;
    const filename = path.basename(filePath);
    const meta = parseFilename(filename, filenamePattern);
    extraDocs.push({
      ...meta,
      id: encodeURIComponent(filePath.slice(0, -3)),
      category: "General",
      folder: null,
    });
  }

  // Regular docs: recursive scan, sorted by relative path
  const regularDocs = collectMdFiles(docsPath, docsPath).map((relPath) => {
    const filename = path.basename(relPath);
    const subdir = path.dirname(relPath);
    const meta = parseFilename(filename, filenamePattern);
    const id = encodeURIComponent(relPath.slice(0, -3));
    const folder =
      subdir !== "."
        ? subdir.split(path.sep)
        : null;
    return { ...meta, id, filename: relPath, folder };
  });

  regularDocs.sort((a, b) => a.filename.localeCompare(b.filename));

  return [...extraDocs, ...regularDocs];
}

function buildFilename(filenamePattern: string, title: string, category: string, date: string): string {
  const [year, month, day] = date.split('-');
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const titleSlug = title.trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') || 'document';

  return (filenamePattern || 'YYYY_MM_DD_HH_mm_[Category]_title')
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace(/\[Category\]/i, `[${category}]`)
    .replace(/(?<![a-z0-9])(?:title_words|title)(?![a-z0-9])/i, titleSlug) + '.md';
}

export function safeFilePath(docsPath: string, filename: string): string | null {
  const resolved = path.resolve(docsPath, filename);
  if (!resolved.startsWith(path.resolve(docsPath) + path.sep)) return null;
  return resolved;
}

function resolveDocPath(
  docsPath: string,
  doc: DocMetadata,
  extraFiles: string[],
): string | null {
  const id = decodeURIComponent(doc.id);
  if (path.isAbsolute(id)) {
    const filePath = id + ".md";
    return extraFiles.includes(filePath) ? filePath : null;
  }
  return safeFilePath(docsPath, doc.filename);
}

export function stripFrontmatter(content: string): string {
  if (!content.startsWith("---")) return content;
  const end = content.indexOf("\n---", 3);
  if (end === -1) return content;
  return content.slice(end + 4).replace(/^\n/, "");
}

// Decorate <a> tags pointing to the /files/ folder with a paperclip icon and
// target="_blank" so attachments open in a new tab.
export function decorateFileLinks(html: string): string {
  return html.replace(
    /<a\s+([^>]*?)href="(\.?\/files\/[^"]+)"([^>]*)>([\s\S]*?)<\/a>/gi,
    (_m, pre: string, href: string, post: string, label: string) => {
      const attrs = `${pre} ${post}`.trim();
      const hasClass = /\bclass\s*=/.test(attrs);
      const classFragment = hasClass
        ? attrs.replace(/class\s*=\s*"([^"]*)"/i, (_x, c) => `class="${c} ld-file-attachment"`)
        : `${attrs} class="ld-file-attachment"`;
      const withTarget = / target\s*=/.test(classFragment)
        ? classFragment
        : `${classFragment} target="_blank" rel="noopener"`;
      const iconPrefix = /fa-paperclip|📎/.test(label)
        ? ""
        : '<i class="fa-solid fa-paperclip ld-file-icon"></i> ';
      return `<a ${withTarget} href="${href}">${iconPrefix}${label}</a>`;
    },
  );
}

export function documentsRouter(docsPath: string): Router {
  const router = Router();

  // GET /api/documents — list all docs with metadata
  router.get("/", (_req: Request, res: Response) => {
    try {
      const { extraFiles = [], filenamePattern } = readConfig(docsPath);
      res.json(listDocs(docsPath, extraFiles, filenamePattern));
    } catch {
      res.status(500).json({ error: "Failed to list documents" });
    }
  });

  // GET /api/documents/search?q=query — full-text search. When the query
  // starts with `metadata://<basename>`, return docs whose metadata references
  // a source file with that basename (e.g. a file in DOCS_FOLDER/files/).
  router.get("/search", (req: Request, res: Response) => {
    const rawQuery = ((req.query.q as string) ?? "").trim();
    if (!rawQuery) return res.json([]);

    if (rawQuery.toLowerCase().startsWith(METADATA_SEARCH_PREFIX)) {
      const needle = rawQuery.slice(METADATA_SEARCH_PREFIX.length).trim();
      if (!needle) return res.json([]);
      try {
        const { extraFiles = [], filenamePattern } = readConfig(docsPath);
        const docs = listDocs(docsPath, extraFiles, filenamePattern);
        const store = readMetadataStore(docsPath);
        const matchingIds = new Set<string>();
        for (const [docId, entries] of Object.entries(store)) {
          for (const entry of entries) {
            if (path.basename(entry.path) === needle) {
              matchingIds.add(docId);
              break;
            }
          }
        }
        const results = docs
          .filter((d) => matchingIds.has(decodeURIComponent(d.id)))
          .map((d) => ({ ...d, excerpt: `↳ ${needle}` }));
        return res.json(results);
      } catch {
        return res.status(500).json({ error: "Metadata search failed" });
      }
    }

    const query = rawQuery.toLowerCase();

    try {
      const { extraFiles = [], filenamePattern } = readConfig(docsPath);
      const docs = listDocs(docsPath, extraFiles, filenamePattern);
      const results: (DocMetadata & { excerpt: string })[] = [];

      for (const doc of docs) {
        const filePath = resolveDocPath(docsPath, doc, extraFiles);
        if (!filePath || !fs.existsSync(filePath)) continue;

        const content = fs.readFileSync(filePath, "utf-8");
        const inTitle = doc.title.toLowerCase().includes(query);
        const inCategory = doc.category.toLowerCase().includes(query);
        const inContent = content.toLowerCase().includes(query);

        if (inTitle || inCategory || inContent) {
          let excerpt = "";
          if (inContent) {
            const idx = content.toLowerCase().indexOf(query);
            const start = Math.max(0, idx - 60);
            const end = Math.min(content.length, idx + query.length + 90);
            excerpt =
              (start > 0 ? "…" : "") +
              content.slice(start, end).replace(/\n+/g, " ").trim() +
              (end < content.length ? "…" : "");
          }
          results.push({ ...doc, excerpt });
        }
      }

      res.json(results);
    } catch {
      res.status(500).json({ error: "Search failed" });
    }
  });

  // GET /api/documents/file-counts → { [docId]: attachmentCount }
  router.get("/file-counts", (_req: Request, res: Response) => {
    try {
      const { extraFiles = [], filenamePattern } = readConfig(docsPath);
      const docs = listDocs(docsPath, extraFiles, filenamePattern);
      const counts: Record<string, number> = {};
      const linkRe = /\]\(\s*\.?\/files\/[^)\s]+/g;
      for (const doc of docs) {
        const filePath = resolveDocPath(docsPath, doc, extraFiles);
        if (!filePath || !fs.existsSync(filePath)) continue;
        const content = fs.readFileSync(filePath, "utf-8");
        const matches = content.match(linkRe);
        if (matches && matches.length > 0) counts[doc.id] = matches.length;
      }
      res.json(counts);
    } catch {
      res.status(500).json({ error: "Failed to compute file counts" });
    }
  });

  // GET /api/documents/:id — get a single document (content + rendered HTML)
  router.get("/:id", async (req: Request, res: Response) => {
    const id = decodeURIComponent(req.params.id);
    const { extraFiles = [], filenamePattern, markdownSoftBreaks } = readConfig(docsPath);
    const markedOpts = { breaks: !!markdownSoftBreaks };

    // Extra file: id is an absolute path without .md
    if (path.isAbsolute(id)) {
      const filePath = id + ".md";
      if (!extraFiles.includes(filePath)) {
        return res.status(403).json({ error: "Access denied" });
      }
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Document not found" });
      }
      try {
        const content = fs.readFileSync(filePath, "utf-8");
        const meta = parseFilename(path.basename(filePath), filenamePattern);
        const html = decorateFileLinks(marked.parse(stripFrontmatter(content), markedOpts) as string);
        res.json({
          ...meta,
          id: req.params.id,
          category: "General",
          content,
          html,
        });
      } catch {
        res.status(500).json({ error: "Failed to read document" });
      }
      return;
    }

    // Normal file inside docsPath
    const filename = id + ".md";
    const filePath = safeFilePath(docsPath, filename);

    if (!filePath) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Document not found" });
    }

    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const metadata = parseFilename(path.basename(filename), filenamePattern);
      const subdir = path.dirname(id);
      const folder =
        subdir !== "."
          ? subdir.split("/")
          : null;
      const html = marked.parse(stripFrontmatter(content), markedOpts) as string;
      res.json({ ...metadata, folder, content, html });
    } catch {
      res.status(500).json({ error: "Failed to read document" });
    }
  });

  // PUT /api/documents/:id — update document content
  router.put("/:id", (req: Request, res: Response) => {
    const id = decodeURIComponent(req.params.id);
    const { content } = req.body as { content?: string };

    if (typeof content !== "string") {
      return res.status(400).json({ error: "content is required" });
    }

    const { extraFiles = [] } = readConfig(docsPath);

    // Extra file: id is an absolute path without .md
    if (path.isAbsolute(id)) {
      const filePath = id + ".md";
      if (!extraFiles.includes(filePath)) {
        return res.status(403).json({ error: "Access denied" });
      }
      try {
        fs.writeFileSync(filePath, content, "utf-8");
        return res.json({ ok: true });
      } catch {
        return res.status(500).json({ error: "Failed to write document" });
      }
    }

    // Normal file inside docsPath
    const filename = id + ".md";
    const filePath = safeFilePath(docsPath, filename);

    if (!filePath) {
      return res.status(403).json({ error: "Access denied" });
    }

    try {
      fs.writeFileSync(filePath, content, "utf-8");
      return res.json({ ok: true });
    } catch {
      return res.status(500).json({ error: "Failed to write document" });
    }
  });

  // DELETE /api/documents/:id — delete a document permanently
  router.delete("/:id", (req: Request, res: Response) => {
    const id = decodeURIComponent(req.params.id);
    const { extraFiles = [] } = readConfig(docsPath);

    if (path.isAbsolute(id)) {
      const filePath = id + ".md";
      if (!extraFiles.includes(filePath)) {
        return res.status(403).json({ error: "Access denied" });
      }
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Document not found" });
      }
      try {
        fs.unlinkSync(filePath);
        return res.json({ ok: true });
      } catch {
        return res.status(500).json({ error: "Failed to delete document" });
      }
    }

    const filename = id + ".md";
    const filePath = safeFilePath(docsPath, filename);
    if (!filePath) return res.status(403).json({ error: "Access denied" });
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Document not found" });
    }

    try {
      fs.unlinkSync(filePath);

      // Also drop its annotations, if any
      const annPath = path.join(docsPath, ".annotations.json");
      if (fs.existsSync(annPath)) {
        try {
          const store = JSON.parse(fs.readFileSync(annPath, "utf-8"));
          if (store && typeof store === "object" && store[id]) {
            delete store[id];
            fs.writeFileSync(annPath, JSON.stringify(store, null, 2), "utf-8");
          }
        } catch {
          /* non-fatal */
        }
      }
      return res.json({ ok: true });
    } catch {
      return res.status(500).json({ error: "Failed to delete document" });
    }
  });

  // POST /api/documents — create a new document
  router.post('/', (req: Request, res: Response) => {
    const { title, category = 'General', folder = '' } = req.body as {
      title?: string; category?: string; folder?: string;
    };

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'title is required' });
    }

    const { filenamePattern } = readConfig(docsPath);
    const today = new Date().toISOString().slice(0, 10);
    const normalizedCategory =
      (category || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/[^A-Z0-9_-]/g, '') || 'GENERAL';
    const filename = buildFilename(
      filenamePattern || 'YYYY_MM_DD_HH_mm_[Category]_title',
      title.trim(),
      normalizedCategory,
      today,
    );

    // Resolve target directory, constrained to docsPath
    let targetDir = path.resolve(docsPath);
    if (folder && folder.trim()) {
      const resolved = path.resolve(docsPath, folder.trim());
      if (!resolved.startsWith(path.resolve(docsPath) + path.sep) && resolved !== path.resolve(docsPath)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      const firstSegment = folder.trim().replace(/^\/+/, '').split('/')[0];
      if (RESERVED_DOCS_SUBFOLDERS.has(firstSegment)) {
        return res.status(400).json({
          error: `"${firstSegment}" is a reserved folder name at the docs root`,
        });
      }
      targetDir = resolved;
    }

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const filePath = path.join(targetDir, filename);
    if (fs.existsSync(filePath)) {
      return res.status(409).json({ error: 'A document with this name already exists' });
    }

    const content = `# ${title.trim()}\n`;
    try {
      fs.writeFileSync(filePath, content, 'utf-8');
    } catch {
      return res.status(500).json({ error: 'Failed to create document' });
    }

    const relPath = path.relative(docsPath, filePath);
    const meta = parseFilename(filename, filenamePattern);
    const subdir = path.dirname(relPath);
    const folderSegments = subdir !== '.'
      ? subdir.split(path.sep)
      : null;

    res.json({ ...meta, id: encodeURIComponent(relPath.slice(0, -3)), filename: relPath, folder: folderSegments });
  });

  return router;
}
