import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { readConfig } from '../../lib/config';

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 200;
const MAX_BODY_CHARS = 4096;

// Manifest / lock / config files that should NOT be attached as ADR metadata
// — they change for almost every feature. Same spirit as the `add_metadata`
// guidance. Detection is best-effort: the LLM still has final say.
const GOD_FILE_BASENAMES = new Set([
  'package.json',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'tsconfig.json',
  'tsconfig.base.json',
  'requirements.txt',
  'cargo.lock',
  'cargo.toml',
  'go.sum',
  'go.mod',
  'pyproject.toml',
  'composer.lock',
  'composer.json',
  'gemfile.lock',
  'gemfile',
]);

function resolveSourceRoot(docsPath: string): string {
  const resolved = readConfig(docsPath).sourceRoot;
  if (!fs.existsSync(resolved)) {
    throw new Error(
      `sourceRoot "${resolved}" does not exist. ` +
      `Update it in .living-doc.json or via PUT /api/config.`,
    );
  }
  return resolved;
}

function ensureGitRepo(cwd: string): string {
  try {
    const root = execFileSync('git', ['rev-parse', '--show-toplevel'], {
      cwd, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
    if (!root) throw new Error('empty toplevel');
    return root;
  } catch {
    throw new Error(
      `Not a git repository (or git not on PATH): ${cwd}. ` +
      `retrodocument_adrs_from_git requires \`sourceRoot\` to be inside a git working tree.`,
    );
  }
}

type ChangeType = 'A' | 'M' | 'D' | 'T' | 'R' | 'C' | string;

interface ChangedFile {
  path: string;            // Relative to sourceRoot when underSourceRoot, else relative to gitRoot
  changeType: ChangeType;  // First letter of `--name-status` (R/C followed by similarity score is normalised)
  underSourceRoot: boolean;
  existsNow: boolean;
  godFileSuspect: boolean;
}

interface CommitEntry {
  sha: string;
  shortSha: string;
  committerDate: string; // ISO 8601 — use this as the ADR `**date:**`
  authorDate: string;    // ISO 8601
  author: string;
  subject: string;
  body: string;
  parents: number;
  state: 'trivial' | 'candidate' | 'merge';
  filesChanged: ChangedFile[];
}

const REC = '~~~LDOC-REC~~~';
const FIELD = '~~~LDOC-FIELD~~~';
const FILES = '~~~LDOC-FILES~~~';

function buildPrettyFormat(): string {
  return [
    REC,
    '%H',  FIELD,
    '%cI', FIELD,
    '%aI', FIELD,
    '%an', FIELD,
    '%P',  FIELD,
    '%s',  FIELD,
    '%b',
    FILES,
  ].join('%n');
}

function parseFileLine(line: string, gitRoot: string, sourceRoot: string): ChangedFile | null {
  const parts = line.split('\t').map((s) => s.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  const rawType = parts[0];
  const changeType: ChangeType = rawType.charAt(0).toUpperCase();
  // For renames/copies (R100, C075), git emits: type\tfrom\tto — keep destination only.
  const relToGit = parts[parts.length - 1];
  if (!relToGit) return null;

  const abs = path.resolve(gitRoot, relToGit);
  const sourceRootResolved = path.resolve(sourceRoot);
  const underSourceRoot =
    abs === sourceRootResolved || abs.startsWith(sourceRootResolved + path.sep);
  const relToSource = underSourceRoot ? path.relative(sourceRootResolved, abs) : null;
  const existsNow = fs.existsSync(abs);
  const basename = path.basename(relToGit).toLowerCase();
  const godFileSuspect = GOD_FILE_BASENAMES.has(basename);

  return {
    path: underSourceRoot && relToSource ? relToSource : relToGit,
    changeType,
    underSourceRoot,
    existsNow,
    godFileSuspect,
  };
}

function parseGitLog(raw: string, sourceRoot: string, gitRoot: string): CommitEntry[] {
  const lines = raw.split('\n');
  const commits: CommitEntry[] = [];

  let i = 0;
  while (i < lines.length) {
    if (lines[i].trim() !== REC) { i++; continue; }
    i++;

    const fields: string[] = [];
    let current: string[] = [];
    const fileLines: string[] = [];

    while (i < lines.length) {
      const line = lines[i];
      if (line.trim() === REC) break;
      if (line.trim() === FIELD) {
        fields.push(current.join('\n').trim());
        current = [];
        i++;
        continue;
      }
      if (line.trim() === FILES) {
        fields.push(current.join('\n').trim());
        current = [];
        i++;
        while (i < lines.length && lines[i].trim() !== REC) {
          if (lines[i].trim()) fileLines.push(lines[i]);
          i++;
        }
        break;
      }
      current.push(line);
      i++;
    }
    if (current.length > 0 && fields.length < 7) {
      fields.push(current.join('\n').trim());
    }

    if (fields.length < 7) continue;
    const [sha, cDate, aDate, author, parents, subject, body] = fields;

    const filesChanged = fileLines
      .map((l) => parseFileLine(l, gitRoot, sourceRoot))
      .filter((f): f is ChangedFile => f !== null);

    const parentCount = parents ? parents.split(/\s+/).filter(Boolean).length : 0;
    const isMerge = parentCount > 1;
    const candidateFiles = filesChanged.filter(
      (f) => f.underSourceRoot && !f.godFileSuspect && f.changeType !== 'D',
    );
    const state: CommitEntry['state'] = isMerge
      ? 'merge'
      : candidateFiles.length === 0
        ? 'trivial'
        : 'candidate';

    commits.push({
      sha,
      shortSha: sha.slice(0, 8),
      committerDate: cDate,
      authorDate: aDate,
      author,
      subject,
      body: body.length > MAX_BODY_CHARS ? body.slice(0, MAX_BODY_CHARS) + '\n…[truncated]' : body,
      parents: parentCount,
      state,
      filesChanged,
    });
  }
  return commits;
}

export function toolRetrodocumentAdrsFromGit(docsPath: string, args: {
  limit?: number;
  since?: string;
}) {
  const sourceRoot = resolveSourceRoot(docsPath);
  const gitRoot = ensureGitRepo(sourceRoot);

  const limit = Math.min(
    Math.max(Math.floor(args?.limit ?? DEFAULT_LIMIT), 1),
    MAX_LIMIT,
  );

  const gitArgs = [
    'log',
    '-n', String(limit),
    '--reverse',
    '--name-status',
    `--pretty=format:${buildPrettyFormat()}`,
  ];
  if (args?.since && typeof args.since === 'string' && args.since.trim()) {
    gitArgs.push(`--since=${args.since.trim()}`);
  }

  let raw: string;
  try {
    raw = execFileSync('git', gitArgs, {
      cwd: gitRoot,
      encoding: 'utf-8',
      maxBuffer: 32 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (err) {
    throw new Error(`git log failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  const commits = parseGitLog(raw, sourceRoot, gitRoot);

  const counts = commits.reduce(
    (acc, c) => {
      acc[c.state] = (acc[c.state] ?? 0) + 1;
      return acc;
    },
    {} as Record<CommitEntry['state'], number>,
  );

  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({
        sourceRoot,
        gitRoot,
        limit,
        since: args?.since ?? null,
        totalCommits: commits.length,
        stateCounts: {
          candidate: counts.candidate ?? 0,
          trivial:   counts.trivial   ?? 0,
          merge:     counts.merge     ?? 0,
        },
        commits,
      }, null, 2),
    }],
  };
}
