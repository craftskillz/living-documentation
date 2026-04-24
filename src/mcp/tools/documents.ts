import fs from 'fs';
import path from 'path';
import { readConfig } from '../../lib/config';
import { parseFilename } from '../../lib/parser';

function buildFilename(filenamePattern: string, title: string, category: string): string {
  const now = new Date();
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

export function toolListDocuments(docsPath: string) {
  const docs = listAllDocuments(docsPath);
  return { content: [{ type: 'text' as const, text: JSON.stringify(docs, null, 2) }] };
}

export function toolReadDocument(docsPath: string, args: { id: string }) {
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
  const content = fs.readFileSync(filePath, 'utf-8');
  return { content: [{ type: 'text' as const, text: content }] };
}

export function toolCreateDocument(docsPath: string, args: {
  title: string;
  category: string;
  folder?: string;
  content?: string;
}) {
  const { filenamePattern, port } = readConfig(docsPath);
  const filename = buildFilename(filenamePattern, args.title, args.category || 'General');

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
      }, null, 2),
    }],
  };
}
