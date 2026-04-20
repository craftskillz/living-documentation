import fs from 'fs';
import path from 'path';
import { readConfig } from '../../lib/config';

// Hardcoded ignore list for directories we never want to crawl.
// Keeps implementation dependency-free; users who need .gitignore parsing
// can scope sourceRoot more tightly.
const IGNORED_DIRS = new Set([
  'node_modules', 'dist', 'build', 'out', 'coverage',
  '.git', '.next', '.nuxt', '.cache', '.turbo', '.svelte-kit',
  'target', 'bin', 'obj', '__pycache__', '.venv', 'venv',
  '.DS_Store',
]);

const IGNORED_FILE_EXT = new Set([
  '.lock', '.log', '.map', '.min.js', '.min.css',
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.zip', '.tar', '.gz', '.7z', '.pdf',
  '.mp3', '.mp4', '.webm', '.mov',
  '.class', '.jar', '.o', '.so', '.dll', '.exe',
]);

const DEFAULT_MAX_LIST_RESULTS   = 500;
const DEFAULT_MAX_SEARCH_RESULTS = 200;
const MAX_FILE_BYTES             = 512 * 1024; // 512 KB

function resolveSourceRoot(docsPath: string): string {
  const { sourceRoot } = readConfig(docsPath);
  if (sourceRoot && path.isAbsolute(sourceRoot)) {
    if (!fs.existsSync(sourceRoot)) {
      throw new Error(
        `sourceRoot "${sourceRoot}" does not exist. ` +
        `Update it in .living-doc.json or via PUT /api/config.`,
      );
    }
    return path.resolve(sourceRoot);
  }
  // Default: parent of docsPath
  return path.resolve(path.dirname(path.resolve(docsPath)));
}

function safeResolve(root: string, rel: string): string {
  const resolved = path.resolve(root, rel);
  const base = path.resolve(root) + path.sep;
  if (!resolved.startsWith(base) && resolved !== path.resolve(root)) {
    throw new Error('Access denied: path escapes sourceRoot');
  }
  return resolved;
}

function shouldIgnoreDir(name: string): boolean {
  if (IGNORED_DIRS.has(name)) return true;
  // Ignore dotfolders by default (except .github which is often useful)
  if (name.startsWith('.') && name !== '.github') return true;
  return false;
}

function shouldIgnoreFile(name: string): boolean {
  if (name.startsWith('.')) return true;
  const lower = name.toLowerCase();
  for (const ext of IGNORED_FILE_EXT) {
    if (lower.endsWith(ext)) return true;
  }
  return false;
}

function matchesPattern(filePath: string, pattern?: string): boolean {
  if (!pattern) return true;
  // Very simple glob: support * and **
  const regex = new RegExp(
    '^' +
    pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*\*/g, '__DOUBLESTAR__')
      .replace(/\*/g, '[^/]*')
      .replace(/__DOUBLESTAR__/g, '.*')
      .replace(/\?/g, '.') +
    '$',
  );
  return regex.test(filePath);
}

function walk(root: string, onFile: (relPath: string, absPath: string) => boolean): void {
  // onFile returns false to stop walking.
  const stack: string[] = [root];
  while (stack.length) {
    const dir = stack.pop()!;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (shouldIgnoreDir(entry.name)) continue;
        stack.push(abs);
      } else if (entry.isFile()) {
        if (shouldIgnoreFile(entry.name)) continue;
        const rel = path.relative(root, abs);
        if (!onFile(rel, abs)) return;
      }
    }
  }
}

// ── Tool handlers ─────────────────────────────────────────────────────────────

export function toolListSourceFiles(docsPath: string, args: {
  pattern?: string;
  maxResults?: number;
}) {
  const root = resolveSourceRoot(docsPath);
  const max = Math.min(Math.max(args.maxResults ?? DEFAULT_MAX_LIST_RESULTS, 1), 2000);
  const results: string[] = [];
  walk(root, (rel) => {
    if (matchesPattern(rel, args.pattern)) {
      results.push(rel);
      if (results.length >= max) return false;
    }
    return true;
  });
  results.sort();
  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({ sourceRoot: root, count: results.length, files: results }, null, 2),
    }],
  };
}

export function toolReadSourceFile(docsPath: string, args: { path: string }) {
  const root = resolveSourceRoot(docsPath);
  if (!args.path || typeof args.path !== 'string') {
    throw new Error('path is required');
  }
  if (path.isAbsolute(args.path)) {
    throw new Error('path must be relative to sourceRoot');
  }
  const abs = safeResolve(root, args.path);
  if (!fs.existsSync(abs)) throw new Error(`File not found: ${args.path}`);
  const stat = fs.statSync(abs);
  if (!stat.isFile()) throw new Error(`Not a file: ${args.path}`);
  if (stat.size > MAX_FILE_BYTES) {
    throw new Error(
      `File too large (${stat.size} bytes). Max is ${MAX_FILE_BYTES}. ` +
      `Use search_source to find the relevant section.`,
    );
  }
  const content = fs.readFileSync(abs, 'utf-8');
  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({ path: args.path, size: stat.size, content }, null, 2),
    }],
  };
}

export function toolSearchSource(docsPath: string, args: {
  query: string;
  pattern?: string;
  maxResults?: number;
  caseSensitive?: boolean;
}) {
  if (!args.query || typeof args.query !== 'string') {
    throw new Error('query is required');
  }
  const root = resolveSourceRoot(docsPath);
  const max = Math.min(Math.max(args.maxResults ?? DEFAULT_MAX_SEARCH_RESULTS, 1), 1000);
  const needle = args.caseSensitive ? args.query : args.query.toLowerCase();

  const matches: Array<{ file: string; line: number; text: string }> = [];

  walk(root, (rel, abs) => {
    if (!matchesPattern(rel, args.pattern)) return true;
    let content: string;
    try {
      const stat = fs.statSync(abs);
      if (stat.size > MAX_FILE_BYTES) return true;
      content = fs.readFileSync(abs, 'utf-8');
    } catch {
      return true;
    }
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const haystack = args.caseSensitive ? lines[i] : lines[i].toLowerCase();
      if (haystack.includes(needle)) {
        matches.push({ file: rel, line: i + 1, text: lines[i].slice(0, 400) });
        if (matches.length >= max) return false;
      }
    }
    return true;
  });

  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({ sourceRoot: root, query: args.query, count: matches.length, matches }, null, 2),
    }],
  };
}
