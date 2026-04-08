import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import { marked } from "marked";
import { parseFilename, DocMetadata } from "../lib/parser";
import { readConfig } from "../lib/config";

function collectMdFiles(dir: string, baseDir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectMdFiles(fullPath, baseDir));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      results.push(path.relative(baseDir, fullPath));
    }
  }
  return results;
}

function listDocs(
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
        ? subdir.split(path.sep).map((s) =>
            s.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          )
        : null;
    return { ...meta, id, filename: relPath, folder };
  });

  regularDocs.sort((a, b) => a.filename.localeCompare(b.filename));

  return [...extraDocs, ...regularDocs];
}

function safeFilePath(docsPath: string, filename: string): string | null {
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

function stripFrontmatter(content: string): string {
  if (!content.startsWith("---")) return content;
  const end = content.indexOf("\n---", 3);
  if (end === -1) return content;
  return content.slice(end + 4).replace(/^\n/, "");
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

  // GET /api/documents/search?q=query — full-text search
  router.get("/search", (req: Request, res: Response) => {
    const query = ((req.query.q as string) ?? "").toLowerCase().trim();
    if (!query) return res.json([]);

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

  // GET /api/documents/:id — get a single document (content + rendered HTML)
  router.get("/:id", async (req: Request, res: Response) => {
    const id = decodeURIComponent(req.params.id);
    const { extraFiles = [], filenamePattern } = readConfig(docsPath);

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
        const html = marked.parse(stripFrontmatter(content)) as string;
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
          ? subdir.split("/").map((s) =>
              s.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
            )
          : null;
      const html = marked.parse(stripFrontmatter(content)) as string;
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

  return router;
}
