import fs from 'fs';
import path from 'path';
import { readConfig } from '../../lib/config';
import { parseFilename } from '../../lib/parser';

function buildFilename(filenamePattern: string, title: string, category: string, dateOverride?: string): string {
  const parsed = dateOverride ? new Date(dateOverride) : null;
  const now = parsed && !Number.isNaN(parsed.getTime()) ? parsed : new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const [year, month, day] = today.split('-');
  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());

  const titleSlug = title.trim()
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
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

function safeResolve(docsPath: string, rel: string): string | null {
  const resolved = path.resolve(docsPath, rel);
  const base = path.resolve(docsPath) + path.sep;
  return resolved.startsWith(base) ? resolved : null;
}

export interface DocSummary {
  id: string;
  title: string;
  category: string;
  folder: string | null;
}

export function listAllDocuments(docsPath: string): DocSummary[] {
  const { filenamePattern, extraFiles = [] } = readConfig(docsPath);
  const docs: DocSummary[] = [];

  for (const fp of extraFiles) {
    if (!fp.endsWith('.md') || !fs.existsSync(fp)) continue;
    const meta = parseFilename(path.basename(fp), filenamePattern);
    docs.push({ id: encodeURIComponent(fp.slice(0, -3)), title: meta.title, category: 'General', folder: null });
  }

  function scan(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scan(full);
      } else if (entry.name.toLowerCase().endsWith('.md')) {
        const relPath = path.relative(docsPath, full);
        const meta = parseFilename(entry.name, filenamePattern);
        const subdir = path.dirname(relPath);
        docs.push({
          id: encodeURIComponent(relPath.slice(0, -3)),
          title: meta.title,
          category: meta.category,
          folder: subdir !== '.' ? subdir : null,
        });
      }
    }
  }
  scan(docsPath);
  return docs;
}

export function resolveDocFilePath(docsPath: string, doc: DocSummary): string | null {
  const { extraFiles = [] } = readConfig(docsPath);
  const decoded = decodeURIComponent(doc.id);
  if (path.isAbsolute(decoded)) {
    const fp = decoded + '.md';
    return extraFiles.includes(fp) && fs.existsSync(fp) ? fp : null;
  }
  const resolved = safeResolve(docsPath, decoded + '.md');
  return resolved && fs.existsSync(resolved) ? resolved : null;
}

export function toolListDocuments(
  docsPath: string,
  args?: { page?: number; pageSize?: number; folder?: string },
) {
  let all = listAllDocuments(docsPath).map(d => ({
    ...d,
    linkHref: `?doc=${encodeURIComponent(d.id)}`,
  }));

  // Optional folder scope: keep documents whose folder equals the requested
  // folder or sits beneath it. Case-insensitive and separator-normalised so the
  // caller can pass "ADRS" or "AI/WORKSPACE" without worrying about the OS path
  // separator. A document at the docs root has folder === null and only matches
  // when no folder filter is supplied.
  const folderFilter = typeof args?.folder === 'string' ? args.folder.trim() : '';
  const normFolder = (f: string) => f.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').toLowerCase();
  if (folderFilter) {
    const needle = normFolder(folderFilter);
    all = all.filter(d => {
      const folder = normFolder(d.folder ?? '');
      return folder === needle || folder.startsWith(`${needle}/`);
    });
  }

  const total = all.length;
  const pageSize = Math.min(Math.max(1, Math.round(args?.pageSize ?? 50)), 200);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, Math.round(args?.page ?? 1)), totalPages);
  const start = (page - 1) * pageSize;
  const documents = all.slice(start, start + pageSize);

  const result = {
    total,
    page,
    pageSize,
    totalPages,
    hasNextPage: page < totalPages,
    nextPage: page < totalPages ? page + 1 : null,
    folder: folderFilter || null,
    documents,
  };
  return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
}

export function toolReadDocument(
  docsPath: string,
  args: { id: string; maxLines?: number; maxChars?: number },
) {
  if (!args || typeof args.id !== 'string' || !args.id) {
    throw new Error("Missing required parameter 'id'");
  }
  const { extraFiles = [] } = readConfig(docsPath);
  const decoded = decodeURIComponent(args.id);

  let filePath: string;

  if (path.isAbsolute(decoded)) {
    const fp = decoded + '.md';
    if (!extraFiles.includes(fp)) throw new Error('Access denied: not an allowed extra file');
    filePath = fp;
  } else {
    const resolved = safeResolve(docsPath, decoded + '.md');
    if (!resolved) throw new Error('Access denied: path traversal attempt');
    filePath = resolved;
  }

  if (!fs.existsSync(filePath)) throw new Error(`Document not found: ${args.id}`);
  const full = fs.readFileSync(filePath, 'utf-8');

  // Optional excerpt: when maxLines and/or maxChars are provided, return only the
  // head of the document. This keeps the model's context small for tasks that
  // only need the opening lines (e.g. language detection) and avoids overflowing
  // the context window on large documents. When neither is set, behaviour is
  // unchanged: the full content is returned.
  const maxLines =
    typeof args.maxLines === 'number' && Number.isFinite(args.maxLines) && args.maxLines > 0
      ? Math.floor(args.maxLines)
      : null;
  const maxChars =
    typeof args.maxChars === 'number' && Number.isFinite(args.maxChars) && args.maxChars > 0
      ? Math.floor(args.maxChars)
      : null;

  let text = full;
  let truncated = false;

  if (maxLines !== null) {
    const lines = text.split(/\r?\n/);
    if (lines.length > maxLines) {
      text = lines.slice(0, maxLines).join('\n');
      truncated = true;
    }
  }
  if (maxChars !== null && text.length > maxChars) {
    text = text.slice(0, maxChars);
    truncated = true;
  }

  if (truncated) {
    text += `\n\n…[excerpt truncated — full document is ${full.length.toLocaleString()} characters]`;
  }

  return { content: [{ type: 'text' as const, text }] };
}

// Persist an agent's cross-run memory as `context.md` inside its workspace
// folder. The folder is supplied by the caller (injected into the agent's system
// prompt by the run route) and must resolve inside AI/WORKSPACE. Content is
// capped so a bloated memory cannot blow up the next run's context window.
const MAX_AGENT_CONTEXT_BYTES = 8 * 1024;

export function toolSaveContext(docsPath: string, args: { folder: string; content: string }) {
  if (!args || typeof args.folder !== 'string' || !args.folder.trim()) {
    throw new Error("Missing required parameter 'folder'");
  }
  if (typeof args.content !== 'string') {
    throw new Error("Missing required parameter 'content'");
  }

  const workspaceRoot = path.resolve(docsPath, 'AI', 'WORKSPACE');
  const targetDir = path.resolve(docsPath, args.folder.trim());
  if (targetDir !== workspaceRoot && !targetDir.startsWith(`${workspaceRoot}${path.sep}`)) {
    throw new Error('Access denied: context folder must be under AI/WORKSPACE');
  }

  let content = args.content;
  let truncated = false;
  if (Buffer.byteLength(content, 'utf-8') > MAX_AGENT_CONTEXT_BYTES) {
    // Trim from the end until within the byte budget (chars ≥ bytes once ASCII).
    content = content.slice(0, MAX_AGENT_CONTEXT_BYTES);
    while (Buffer.byteLength(content, 'utf-8') > MAX_AGENT_CONTEXT_BYTES) {
      content = content.slice(0, -64);
    }
    truncated = true;
  }

  fs.mkdirSync(targetDir, { recursive: true });
  const filePath = path.join(targetDir, 'context.md');
  fs.writeFileSync(filePath, content, 'utf-8');

  const relativePath = path.relative(docsPath, filePath);
  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({
        success: true,
        path: relativePath,
        bytes: Buffer.byteLength(content, 'utf-8'),
        truncated,
      }, null, 2),
    }],
  };
}

export function toolUpdateDocument(docsPath: string, args: { id: string; content: string }) {
  if (!args || typeof args.id !== 'string' || !args.id) {
    throw new Error("Missing required parameter 'id'");
  }
  if (typeof args.content !== 'string' || !args.content) {
    throw new Error("Missing required parameter 'content' (must be non-empty)");
  }

  const { extraFiles = [] } = readConfig(docsPath);
  const decoded = decodeURIComponent(args.id);

  let filePath: string;
  if (path.isAbsolute(decoded)) {
    const fp = decoded + '.md';
    if (!extraFiles.includes(fp)) throw new Error('Access denied: not an allowed extra file');
    filePath = fp;
  } else {
    const resolved = safeResolve(docsPath, decoded + '.md');
    if (!resolved) throw new Error('Access denied: path traversal attempt');
    filePath = resolved;
  }

  if (!fs.existsSync(filePath)) throw new Error(`Document not found: ${args.id}`);
  fs.writeFileSync(filePath, args.content, 'utf-8');

  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({
        success: true,
        id: args.id,
        bytes: Buffer.byteLength(args.content, 'utf-8'),
      }, null, 2),
    }],
  };
}

export function toolCreateDocument(docsPath: string, args: {
  title: string;
  category: string;
  folder?: string;
  content?: string;
  date?: string;
}) {
  const { filenamePattern, port } = readConfig(docsPath);
  const filename = buildFilename(filenamePattern, args.title, args.category || 'General', args.date);

  let targetDir = path.resolve(docsPath);
  if (args.folder && args.folder.trim()) {
    const resolved = path.resolve(docsPath, args.folder.trim());
    if (!resolved.startsWith(path.resolve(docsPath))) throw new Error('Access denied: path traversal attempt');
    targetDir = resolved;
  }

  fs.mkdirSync(targetDir, { recursive: true });

  const filePath = path.join(targetDir, filename);
  if (fs.existsSync(filePath)) throw new Error('A document with this name already exists');

  const body = args.content ?? `# ${args.title.trim()}\n`;
  fs.writeFileSync(filePath, body, 'utf-8');

  const relPath = path.relative(docsPath, filePath);
  const docId = encodeURIComponent(relPath.slice(0, -3));

  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({
        success: true,
        filename,
        id: docId,
        url: `http://localhost:${port}/?doc=${encodeURIComponent(docId)}`,
        linkHref: `?doc=${encodeURIComponent(docId)}`,
      }, null, 2),
    }],
  };
}
