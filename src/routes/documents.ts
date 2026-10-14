import { Router, type Request, type Response } from "express";
import { contentFromTemplate, TemplateError } from "../lib/documentTemplates";
import fs from "node:fs";
import path from "node:path";
import { parseDocMetadata, readDocMetadata, uniqueDocFilename, type DocMetadata } from "../lib/parser";
import { readConfig } from "../lib/config";
import { readMetadataStore } from "../lib/metadata";
import { RESERVED_ROOT_FOLDERS, relocateEntry, TreeMoveError } from "../lib/treeMove";
import { normalizeFolderPath } from "../lib/folderName";
import { parseDocStatus } from "../lib/status";
import { isFileOrLinkToFile, isListedDir, isListedDocFile } from "../lib/explorerEntries";
import { isReservedOkfFile, normalizeFrontmatter } from "../lib/okf";
import { parseFrontmatter } from "../lib/frontmatter";
import { renderMarkdownWithCompareBlocks } from "../lib/compareBlock";

const METADATA_SEARCH_PREFIX = "metadata://";


function toPosixPath(value: string): string {
  return value.split(path.sep).join("/");
}

export function collectMdFiles(dir: string, baseDir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (isListedDir(entry.name)) results.push(...collectMdFiles(fullPath, baseDir));
    } else if (isListedDocFile(entry.name) && isFileOrLinkToFile(entry, fullPath)) {
      results.push(toPosixPath(path.relative(baseDir, fullPath)));
    }
  }
  return results;
}

export function listDocs(
  docsPath: string,
  extraFiles: string[] = [],
): DocMetadata[] {
  // Extra files first, in config order
  const extraDocs: DocMetadata[] = [];
  for (const filePath of extraFiles) {
    if (!filePath.endsWith(".md") || !fs.existsSync(filePath)) continue;
    const meta = readDocMetadata(filePath, path.basename(filePath));
    extraDocs.push({
      ...meta,
      id: encodeURIComponent(filePath.slice(0, -3)),
      folder: null,
    });
  }

  // Regular docs: recursive scan, sorted by relative path
  const regularDocs = collectMdFiles(docsPath, docsPath).map((relPath) => {
    const filename = path.posix.basename(relPath);
    const subdir = path.posix.dirname(relPath);
    const meta = readDocMetadata(path.join(docsPath, relPath), filename);
    const id = encodeURIComponent(relPath.slice(0, -3));
    const folder =
      subdir !== "."
        ? subdir.split("/")
        : null;
    return { ...meta, id, filename: relPath, folder };
  });

  regularDocs.sort((a, b) => a.filename.localeCompare(b.filename));

  return [...extraDocs, ...regularDocs];
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
    const filePath = `${id}.md`;
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

/**
 * Markdown shown for a reserved file: its frontmatter (the useful part of
 * liv-doc-main.md) as a YAML code block, then its body.
 */
function reservedFileMarkdown(content: string): string {
  const body = stripFrontmatter(content);
  if (body === content) return content;
  const yaml = content.slice(content.indexOf("\n") + 1, content.indexOf("\n---", 3));
  return `\`\`\`yaml\n${yaml}\n\`\`\`\n\n${body}`;
}

/** Reserved files (index.md, log.md, liv-doc-main.md) are generated: read-only through the API. */
function isReservedDocId(id: string): boolean {
  return isReservedOkfFile(path.basename(`${id}.md`));
}

const RESERVED_READ_ONLY = { error: "Reserved files are read-only" };

export function isConcreteFileAttachmentHref(href: string): boolean {
  const raw = (href || "").trim();
  if (!/^\.?\/files\//i.test(raw)) return false;

  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    // Keep the raw href if it is not valid URI-encoded text.
  }

  if (/[<>]/.test(raw) || /[<>]/.test(decoded)) return false;

  const filename = decoded.split(/[?#]/, 1)[0].split("/").pop() || "";
  return filename.length > 0;
}

export function countFileAttachmentLinks(content: string): number {
  const linkRe = /\[[^\]]*]\(\s*(\.?\/files\/[^)\s]+)(?:\s+["'][^)]*["'])?\s*\)/gi;
  let count = 0;
  for (let match = linkRe.exec(content); match !== null; match = linkRe.exec(content)) {
    if (isConcreteFileAttachmentHref(match[1])) count += 1;
  }
  return count;
}

// Decorate <a> tags pointing to the /files/ folder with a paperclip icon and
// target="_blank" so attachments open in a new tab.
export function decorateFileLinks(html: string): string {
  return html.replace(
    /<a\s+([^>]*?)href="(\.?\/files\/[^"]+)"([^>]*)>([\s\S]*?)<\/a>/gi,
    (_m, pre: string, href: string, post: string, label: string) => {
      if (!isConcreteFileAttachmentHref(href)) return _m;

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
      const { extraFiles = [] } = readConfig(docsPath);
      res.json(listDocs(docsPath, extraFiles));
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
        const { extraFiles = [] } = readConfig(docsPath);
        const docs = listDocs(docsPath, extraFiles);
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

    // Strip diacritics: NFD decomposition + remove combining marks → accent-insensitive matching
    const deAccent = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

    const query = deAccent(rawQuery);

    try {
      const { extraFiles = [] } = readConfig(docsPath);
      const docs = listDocs(docsPath, extraFiles);
      const results: (DocMetadata & { excerpt: string })[] = [];

      for (const doc of docs) {
        const filePath = resolveDocPath(docsPath, doc, extraFiles);
        if (!filePath || !fs.existsSync(filePath)) continue;

        const content = fs.readFileSync(filePath, "utf-8");
        const inTitle = deAccent(doc.title).includes(query);
        const inContent = deAccent(content).includes(query);

        if (inTitle || inContent) {
          let excerpt = "";
          if (inContent) {
            const idx = deAccent(content).indexOf(query);
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
      const { extraFiles = [] } = readConfig(docsPath);
      const docs = listDocs(docsPath, extraFiles);
      const counts: Record<string, number> = {};
      for (const doc of docs) {
        const filePath = resolveDocPath(docsPath, doc, extraFiles);
        if (!filePath || !fs.existsSync(filePath)) continue;
        const content = fs.readFileSync(filePath, "utf-8");
        const count = countFileAttachmentLinks(content);
        if (count > 0) counts[doc.id] = count;
      }
      res.json(counts);
    } catch {
      res.status(500).json({ error: "Failed to compute file counts" });
    }
  });

  // GET /api/documents/statuses → { [docId]: status } — frontmatter status per
  // doc, used by the sidebar status-highlight pills. Defined before /:id so the
  // literal path is not captured by the id param.
  router.get("/statuses", (_req: Request, res: Response) => {
    try {
      const { extraFiles = [] } = readConfig(docsPath);
      const docs = listDocs(docsPath, extraFiles);
      const statuses: Record<string, string> = {};
      for (const doc of docs) {
        const filePath = resolveDocPath(docsPath, doc, extraFiles);
        if (!filePath || !fs.existsSync(filePath)) continue;
        const status = parseDocStatus(fs.readFileSync(filePath, "utf-8"));
        if (status) statuses[doc.id] = status;
      }
      res.json(statuses);
    } catch {
      res.status(500).json({ error: "Failed to compute statuses" });
    }
  });

  // GET /api/documents/:id — get a single document (content + rendered HTML)
  router.get("/:id", async (req: Request, res: Response) => {
    const id = decodeURIComponent(req.params.id as string);
    const { extraFiles = [], markdownSoftBreaks } = readConfig(docsPath);
    const markedOpts = { breaks: !!markdownSoftBreaks };

    // Extra file: id is an absolute path without .md
    if (path.isAbsolute(id)) {
      const filePath = `${id}.md`;
      if (!extraFiles.includes(filePath)) {
        return res.status(403).json({ error: "Access denied" });
      }
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Document not found" });
      }
      try {
        const content = fs.readFileSync(filePath, "utf-8");
        const meta = parseDocMetadata(path.basename(filePath), content);
        const html = decorateFileLinks(renderMarkdownWithCompareBlocks(stripFrontmatter(content), markedOpts));
        const fm = parseFrontmatter(content).data;
        res.json({
          ...meta,
          id: req.params.id,
          content,
          html,
          tags: Array.isArray(fm.tags) ? fm.tags.map(String) : [],
          type: typeof fm.type === "string" ? fm.type : undefined,
        });
      } catch {
        res.status(500).json({ error: "Failed to read document" });
      }
      return;
    }

    // Normal file inside docsPath
    const filename = `${id}.md`;
    const filePath = safeFilePath(docsPath, filename);

    if (!filePath) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Document not found" });
    }

    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const metadata = parseDocMetadata(path.basename(filename), content);
      const subdir = path.dirname(id);
      const folder =
        subdir !== "."
          ? subdir.split("/")
          : null;
      const reserved = isReservedDocId(id);
      const markdown = reserved ? reservedFileMarkdown(content) : stripFrontmatter(content);
      const html = renderMarkdownWithCompareBlocks(markdown, markedOpts);
      const fm = parseFrontmatter(content).data;
      res.json({
        ...metadata,
        ...(reserved && { reserved: true }),
        folder,
        content,
        html,
        tags: Array.isArray(fm.tags) ? fm.tags.map(String) : [],
        type: typeof fm.type === "string" ? fm.type : undefined,
      });
    } catch {
      res.status(500).json({ error: "Failed to read document" });
    }
  });

  // PUT /api/documents/:id — update document content
  router.put("/:id", (req: Request, res: Response) => {
    const id = decodeURIComponent(req.params.id as string);
    const { content } = req.body as { content?: string };

    if (typeof content !== "string") {
      return res.status(400).json({ error: "content is required" });
    }

    const { extraFiles = [] } = readConfig(docsPath);

    // Extra file: id is an absolute path without .md
    if (path.isAbsolute(id)) {
      const filePath = `${id}.md`;
      if (!extraFiles.includes(filePath)) {
        return res.status(403).json({ error: "Access denied" });
      }
      try {
        fs.writeFileSync(
          filePath,
          normalizeFrontmatter(content, filePath, { title: parseDocMetadata(path.basename(filePath), content).title }),
          "utf-8",
        );
        return res.json({ ok: true });
      } catch {
        return res.status(500).json({ error: "Failed to write document" });
      }
    }

    // Normal file inside docsPath
    if (isReservedDocId(id)) return res.status(400).json(RESERVED_READ_ONLY);
    const filename = `${id}.md`;
    const filePath = safeFilePath(docsPath, filename);

    if (!filePath) {
      return res.status(403).json({ error: "Access denied" });
    }

    try {
      fs.writeFileSync(
        filePath,
        normalizeFrontmatter(content, filename, { title: parseDocMetadata(path.basename(filename), content).title }),
        "utf-8",
      );
      return res.json({ ok: true });
    } catch {
      return res.status(500).json({ error: "Failed to write document" });
    }
  });

  // DELETE /api/documents/:id — delete a document permanently
  router.delete("/:id", (req: Request, res: Response) => {
    const id = decodeURIComponent(req.params.id as string);
    const { extraFiles = [] } = readConfig(docsPath);

    if (path.isAbsolute(id)) {
      const filePath = `${id}.md`;
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

    if (isReservedDocId(id)) return res.status(400).json(RESERVED_READ_ONLY);
    const filename = `${id}.md`;
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

  // POST /api/documents/:id/move — move a document to another folder.
  // The doc id encodes the relative path, so moving CHANGES the id; the
  // response returns the new identity and the doc-keyed stores
  // (.metadata.json, .annotations.json) have their keys migrated.
  router.post("/:id/move", (req: Request, res: Response) => {
    const id = decodeURIComponent(req.params.id as string);
    const { folder } = req.body as { folder?: string };

    if (path.isAbsolute(id)) {
      // Extra files live outside the docs tree — they cannot be moved into it.
      return res.status(403).json({ error: "Access denied" });
    }
    if (typeof folder !== "string" || !folder.trim()) {
      return res.status(400).json({ error: "folder is required" });
    }
    if (isReservedDocId(id)) return res.status(400).json(RESERVED_READ_ONLY);

    const sourcePath = safeFilePath(docsPath, `${id}.md`);
    if (!sourcePath) return res.status(403).json({ error: "Access denied" });
    if (!fs.existsSync(sourcePath)) {
      return res.status(404).json({ error: "Document not found" });
    }

    // Same folder guards as POST create: traversal + reserved names.
    const requestedFolder = folder.trim().replace(/^\/+/, "");
    const resolvedDir = path.resolve(docsPath, requestedFolder);
    if (
      !resolvedDir.startsWith(path.resolve(docsPath) + path.sep) &&
      resolvedDir !== path.resolve(docsPath)
    ) {
      return res.status(403).json({ error: "Access denied" });
    }
    const firstSegment = requestedFolder.split("/")[0];
    if (RESERVED_ROOT_FOLDERS.has(firstSegment)) {
      return res.status(400).json({
        error: `"${firstSegment}" is a reserved folder name at the docs root`,
      });
    }

    const normalizedFolder = normalizeFolderPath(requestedFolder);
    if (!normalizedFolder) {
      return res.status(400).json({ error: "Invalid folder name" });
    }
    const targetDir = path.resolve(docsPath, normalizedFolder);
    const filename = path.basename(sourcePath);
    const targetPath = path.join(targetDir, filename);

    if (path.resolve(targetPath) === path.resolve(sourcePath)) {
      // No-op move: return the current identity unchanged.
      const relPath = toPosixPath(path.relative(docsPath, sourcePath));
      const meta = readDocMetadata(sourcePath, filename);
      const subdir = path.posix.dirname(relPath);
      return res.json({
        ...meta,
        id: encodeURIComponent(relPath.slice(0, -3)),
        filename: relPath,
        folder: subdir !== "." ? subdir.split("/") : null,
      });
    }
    if (fs.existsSync(targetPath)) {
      return res
        .status(409)
        .json({ error: "A document with this name already exists" });
    }

    // Disk move, folder manifests and doc-keyed stores (.metadata.json,
    // .annotations.json, favorites) are migrated by the shared tree service.
    let relPath: string;
    try {
      fs.mkdirSync(targetDir, { recursive: true });
      relPath = relocateEntry(docsPath, sourcePath, targetDir);
    } catch (err) {
      if (err instanceof TreeMoveError) return res.status(err.status).json({ error: err.message });
      return res.status(500).json({ error: "Failed to move document" });
    }
    const newId = relPath.slice(0, -3);

    const meta = readDocMetadata(path.join(docsPath, relPath), filename);
    const subdir = path.posix.dirname(relPath);
    return res.json({
      ...meta,
      id: encodeURIComponent(newId),
      filename: relPath,
      folder: subdir !== "." ? subdir.split("/") : null,
    });
  });

  // POST /api/documents — create a new document
  router.post('/', (req: Request, res: Response) => {
    // `name` (optional) fixes the file stem independently of the title — used by
    // Blueprint, whose document is keyed by the source folder name.
    const { title, name, folder = '', content, templateId } = req.body as {
      title?: string; name?: string; folder?: string; content?: string; templateId?: string;
    };

    if (!title?.trim()) {
      return res.status(400).json({ error: 'title is required' });
    }

    let templateContent: string | undefined;
    if (templateId !== undefined) {
      if (content !== undefined) return res.status(400).json({ error: 'Choose content or templateId' });
      try { templateContent = contentFromTemplate(docsPath, templateId, title.trim()); }
      catch (error) {
        return res.status(error instanceof TemplateError ? error.status : 500).json({ error: error instanceof TemplateError ? error.message : 'storage_error' });
      }
    }

    // Resolve target directory, constrained to docsPath
    let targetDir = path.resolve(docsPath);
    if (folder?.trim()) {
      const resolved = path.resolve(docsPath, folder.trim());
      if (!resolved.startsWith(path.resolve(docsPath) + path.sep) && resolved !== path.resolve(docsPath)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      const firstSegment = folder.trim().replace(/^\/+/, '').split('/')[0];
      if (RESERVED_ROOT_FOLDERS.has(firstSegment)) {
        return res.status(400).json({
          error: `"${firstSegment}" is a reserved folder name at the docs root`,
        });
      }
      targetDir = resolved;
    }

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const filename = uniqueDocFilename(targetDir, name?.trim() || title.trim());
    const filePath = path.join(targetDir, filename);

    const initialContent = templateContent ?? (
      typeof content === 'string'
        ? `${content.trimEnd()}\n`
        : `# ${title.trim()}\n`);
    const relPath = path.relative(docsPath, filePath);
    try {
      fs.writeFileSync(
        filePath,
        normalizeFrontmatter(initialContent, relPath, { title: title.trim(), timestamp: new Date().toISOString() }),
        'utf-8',
      );
    } catch {
      return res.status(500).json({ error: 'Failed to create document' });
    }

    const meta = readDocMetadata(filePath, filename);
    const subdir = path.dirname(relPath);
    const folderSegments = subdir !== '.'
      ? subdir.split(path.sep)
      : null;

    res.json({ ...meta, id: encodeURIComponent(relPath.slice(0, -3)), filename: relPath, folder: folderSegments });
  });

  return router;
}
