import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import {
  resolveSourceRoot,
  getDocEntries,
  buildReport,
} from '../../lib/metadata';
import { currentSourceCommit, gitStatusPorcelain, gitDiff, GitStatusEntry } from '../../lib/git';
import { listAllDocuments } from './documents';

const DEFAULT_MAX_FILES = 50;
const MAX_FILES_CAP = 200;
const DEFAULT_MAX_DIFF_CHARS = 20_000;
const MAX_FILE_BYTES = 512 * 1024; // same cap as read_source_file, for consistency

interface BuildContextOptions {
  base?: string;
  maxFiles?: number;
  maxFileBytes?: number;
  maxDiffChars?: number;
  includeDocumentation?: boolean;
}

function toPosix(p: string): string {
  return p.split(path.sep).join('/');
}

function currentBranch(cwd: string): string | null {
  try {
    const branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
    return branch || null;
  } catch {
    return null;
  }
}

function repoRoot(cwd: string): string | null {
  try {
    const root = execFileSync('git', ['rev-parse', '--show-toplevel'], {
      cwd, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
    return root || null;
  } catch {
    return null;
  }
}

function deriveStatus(entry: GitStatusEntry): { status: string; untracked: boolean; staged: boolean } {
  if (entry.indexStatus === '?' && entry.worktreeStatus === '?') {
    return { status: 'A', untracked: true, staged: false };
  }
  const staged = entry.indexStatus !== ' ' && entry.indexStatus !== '?';
  const status = entry.worktreeStatus !== ' ' ? entry.worktreeStatus : entry.indexStatus;
  return { status, untracked: false, staged };
}

export function toolBuildContext(docsPath: string, args: {
  task: string;
  options?: BuildContextOptions;
}) {
  if (!args || typeof args.task !== 'string' || !args.task.trim()) {
    throw new Error("Missing required parameter 'task'");
  }
  const options = args.options ?? {};
  const base = options.base ?? 'HEAD';
  const maxFiles = Math.min(Math.max(Math.floor(options.maxFiles ?? DEFAULT_MAX_FILES), 1), MAX_FILES_CAP);
  const maxFileBytes = Math.min(Math.max(Math.floor(options.maxFileBytes ?? MAX_FILE_BYTES), 1), MAX_FILE_BYTES);
  const maxDiffChars = Math.max(Math.floor(options.maxDiffChars ?? DEFAULT_MAX_DIFF_CHARS), 500);
  const includeDocumentation = options.includeDocumentation ?? true;

  const sourceRoot = resolveSourceRoot(docsPath);
  const docsFolder = path.resolve(docsPath);
  const gitRoot = repoRoot(sourceRoot);

  const src = currentSourceCommit(sourceRoot);
  const git = gitRoot
    ? { branch: currentBranch(sourceRoot), headCommit: src?.commit ?? null, dirty: src?.dirty ?? null }
    : null;

  // git always reports paths relative to gitRoot, never to cwd — run status/diff
  // from gitRoot and scope to sourceRoot via a pathspec, then re-express each
  // path relative to sourceRoot for output (matching the metadata store's
  // convention). sourceRoot may equal gitRoot (pathspec becomes ".").
  const rawStatusEntries = gitRoot
    ? gitStatusPorcelain(gitRoot, (() => {
        const rel = toPosix(path.relative(gitRoot, sourceRoot));
        return rel && rel !== '.' ? [rel] : [];
      })()) ?? []
    : [];
  const truncatedStatus = rawStatusEntries.length > maxFiles;
  const scoped = rawStatusEntries.slice(0, maxFiles);

  const changeFiles = scoped.map((entry) => {
    const { status, untracked, staged } = deriveStatus(entry);
    const relToSource = toPosix(path.relative(sourceRoot, path.resolve(gitRoot as string, entry.path)));
    let diff: string | null = null;
    let diffTruncated = false;
    if (!untracked) {
      const raw = gitDiff(gitRoot as string, [entry.path], base);
      if (raw !== null) {
        diff = raw.length > maxDiffChars ? raw.slice(0, maxDiffChars) : raw;
        diffTruncated = raw.length > maxDiffChars;
      }
    }
    return { path: relToSource, status, untracked, staged, diff, diffTruncated };
  });

  const changedPaths = changeFiles.map((f) => f.path);
  const allDocsOnly = changedPaths.length > 0 && changedPaths.every((rel) => {
    const abs = path.resolve(sourceRoot, rel);
    const underDocs = abs === docsFolder || abs.startsWith(docsFolder + path.sep);
    return underDocs && rel.toLowerCase().endsWith('.md');
  });

  let sourceSection: { skipped: string | null; files: Array<{ path: string; content: string; size: number; truncated: boolean }> };
  if (allDocsOnly) {
    sourceSection = { skipped: 'docs-only change', files: [] };
  } else {
    const files: Array<{ path: string; content: string; size: number; truncated: boolean }> = [];
    for (const file of changeFiles) {
      if (file.status === 'D') continue;
      const abs = path.resolve(sourceRoot, file.path);
      if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) continue;
      const stat = fs.statSync(abs);
      if (stat.size > maxFileBytes) continue;
      files.push({ path: file.path, content: fs.readFileSync(abs, 'utf-8'), size: stat.size, truncated: false });
    }
    sourceSection = { skipped: null, files };
  }

  let relatedDocuments: Array<{
    id: string; title: string; category: string; folder: string | null;
    matchedPaths: string[]; accuracy: number;
  }> = [];
  if (includeDocumentation && changedPaths.length > 0) {
    const changedSet = new Set(changedPaths.map(toPosix));
    const docs = listAllDocuments(docsPath);
    for (const doc of docs) {
      const decodedId = decodeURIComponent(doc.id);
      const entries = getDocEntries(docsPath, decodedId);
      if (entries.length === 0) continue;
      const matchedPaths = entries.map((e) => toPosix(e.path)).filter((p) => changedSet.has(p));
      if (matchedPaths.length === 0) continue;
      const report = buildReport(entries, sourceRoot);
      relatedDocuments.push({
        id: doc.id, title: doc.title, category: doc.category, folder: doc.folder,
        matchedPaths, accuracy: report.accuracy,
      });
    }
  }

  const result = {
    task: args.task,
    workspace: { sourceRoot, docsFolder, gitRoot },
    git,
    changes: {
      base,
      totalFiles: rawStatusEntries.length,
      truncated: truncatedStatus,
      files: changeFiles,
    },
    source: sourceSection,
    documentation: { relatedDocuments },
    metadata: { generatedAt: new Date().toISOString(), options },
  };

  return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
}
