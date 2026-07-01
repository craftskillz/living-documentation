import { spawnSync } from "child_process";
import type { Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";
import { readConfig } from "./config";

export interface GitSaveResult {
  attempted: boolean;
  skipped: boolean;
  committed: boolean;
  pushed: boolean;
  commit?: string;
  warning?: string;
  error?: string;
  message: string;
  timestamp: string;
}

export interface GitStatus {
  mode: "unconfigured" | "disabled" | "enabled";
  ok: boolean;
  docsFolder: string;
  repoRoot: string | null;
  docsPathspec: string | null;
  dirtyDocsCount: number;
  dirtyOutsideDocsCount: number;
  aheadOfUpstream: number | null;
  pushMode: "never" | "everyNCommits";
  pushEveryCommits: number;
  commitMessage: string;
  message: string;
  lastSave: GitSaveResult | null;
}

export interface GitDocumentCommit {
  hash: string;
  shortHash: string;
  date: string;
  author: string;
  subject: string;
}

export interface GitDocumentVersions {
  mode: "unconfigured" | "disabled" | "enabled";
  ok: boolean;
  docsFolder: string;
  repoRoot: string | null;
  relativePath: string | null;
  baseRef: string;
  baseContent: string | null;
  headRef: "HEAD";
  headContent: string | null;
  commits: GitDocumentCommit[];
  message: string;
}

interface GitCommandResult {
  ok: boolean;
  status: number | null;
  stdout: string;
  stderr: string;
  error?: string;
}

interface RepoInfo {
  root: string;
  docsPathspec: string;
}

const lastSaveByDocsPath = new Map<string, GitSaveResult>();
const DEFAULT_DOCUMENT_HISTORY_DAYS = 30;
const MIN_DOCUMENT_HISTORY_DAYS = 1;
const MAX_DOCUMENT_HISTORY_DAYS = 3650;
const GIT_LOG_FIELD_SEPARATOR = "\x1f";
const MCP_WRITE_TOOLS = new Set([
  "create_document",
  "update_document",
  "create_diagram",
  "add_metadata",
  "remove_metadata",
  "refresh_metadata",
  "generate_image",
  "save_context",
]);

function nowIso(): string {
  return new Date().toISOString();
}

function runGit(cwd: string, args: string[]): GitCommandResult {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf-8",
    maxBuffer: 10 * 1024 * 1024,
  });
  return {
    ok: result.status === 0 && !result.error,
    status: result.status,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    error: result.error instanceof Error ? result.error.message : undefined,
  };
}

function toPosix(value: string): string {
  return value.split(path.sep).join("/");
}

function realPath(value: string): string {
  return fs.realpathSync(value);
}

function resolveRepoInfo(docsPath: string): RepoInfo {
  const docsFolder = realPath(docsPath);
  const topLevel = runGit(docsFolder, ["rev-parse", "--show-toplevel"]);
  if (!topLevel.ok) {
    const detail = (topLevel.stderr || topLevel.error || "not a Git repository").trim();
    throw new Error(`Git integration is enabled but the configured documentation folder is not inside a Git repository (${docsFolder}): ${detail}`);
  }

  const root = realPath(topLevel.stdout.trim());
  const rel = path.relative(root, docsFolder);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(`Git integration is enabled but the configured documentation folder (${docsFolder}) is outside the detected Git repository.`);
  }

  return {
    root,
    docsPathspec: rel ? toPosix(rel) : ".",
  };
}

function statusEntries(repoRoot: string): string[] {
  const status = runGit(repoRoot, ["status", "--porcelain=v1", "-z"]);
  if (!status.ok) {
    const detail = (status.stderr || status.error || "status failed").trim();
    throw new Error(`Unable to read Git status: ${detail}`);
  }

  const records = status.stdout.split("\0");
  const paths: string[] = [];
  for (let i = 0; i < records.length; i += 1) {
    const record = records[i];
    if (!record) continue;
    const code = record.slice(0, 2);
    const filePath = record.slice(3);
    if (filePath) paths.push(filePath);
    if (code.includes("R") || code.includes("C")) {
      i += 1;
    }
  }
  return paths;
}

function isInsidePathspec(filePath: string, docsPathspec: string): boolean {
  if (docsPathspec === ".") return true;
  return filePath === docsPathspec || filePath.startsWith(`${docsPathspec}/`);
}

function resolveDocumentPathspec(docsPath: string, documentId: string, repo: RepoInfo): string {
  if (path.isAbsolute(documentId)) {
    throw new Error("Git document versions are only available for documents inside docsFolder.");
  }

  const filename = `${documentId}.md`;
  const documentPath = path.resolve(docsPath, filename);
  const docsFolder = realPath(docsPath);
  if (!documentPath.startsWith(`${docsFolder}${path.sep}`) && documentPath !== docsFolder) {
    throw new Error(`Document path escapes ${docsFolder}.`);
  }

  const relToDocs = path.relative(docsFolder, documentPath);
  const relativePath = repo.docsPathspec === "."
    ? toPosix(relToDocs)
    : `${repo.docsPathspec}/${toPosix(relToDocs)}`;
  if (!isInsidePathspec(relativePath, repo.docsPathspec)) {
    throw new Error(`Document path is outside ${docsFolder}.`);
  }
  return relativePath;
}

function normalizeHistoryDays(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULT_DOCUMENT_HISTORY_DAYS;
  return Math.max(MIN_DOCUMENT_HISTORY_DAYS, Math.min(MAX_DOCUMENT_HISTORY_DAYS, Math.floor(value)));
}

function isSafeGitRef(value: string): boolean {
  return /^[0-9a-f]{7,40}$/i.test(value) || value === "HEAD";
}

function readRefContent(repoRoot: string, ref: string, relativePath: string): string | null {
  if (!isSafeGitRef(ref)) {
    throw new Error("Invalid Git reference.");
  }
  const result = runGit(repoRoot, ["show", `${ref}:${relativePath}`]);
  if (!result.ok) return null;
  return result.stdout;
}

function listDocumentCommits(repoRoot: string, relativePath: string, sinceDays: number): GitDocumentCommit[] {
  const result = runGit(repoRoot, [
    "log",
    "--follow",
    `--since=${sinceDays} days ago`,
    `--format=%H%x1f%h%x1f%aI%x1f%an%x1f%s`,
    "--",
    relativePath,
  ]);
  if (!result.ok) {
    const detail = (result.stderr || result.error || "git log failed").trim();
    throw new Error(`Unable to read document commits: ${detail}`);
  }
  return result.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [hash = "", shortHash = "", date = "", author = "", subject = ""] = line.split(GIT_LOG_FIELD_SEPARATOR);
      return { hash, shortHash, date, author, subject };
    });
}

function countDirty(repoRoot: string, docsPathspec: string): { docs: number; outside: number } {
  let docs = 0;
  let outside = 0;
  for (const filePath of statusEntries(repoRoot)) {
    if (isInsidePathspec(filePath, docsPathspec)) docs += 1;
    else outside += 1;
  }
  return { docs, outside };
}

function upstreamAhead(repoRoot: string): number | null {
  const upstream = runGit(repoRoot, ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"]);
  if (!upstream.ok) return null;
  const count = runGit(repoRoot, ["rev-list", "--count", "@{upstream}..HEAD"]);
  if (!count.ok) return null;
  const value = Number.parseInt(count.stdout.trim(), 10);
  return Number.isFinite(value) ? value : null;
}

function recordLastSave(docsPath: string, result: GitSaveResult): GitSaveResult {
  lastSaveByDocsPath.set(path.resolve(docsPath), result);
  return result;
}

export function lastGitSaveResult(docsPath: string): GitSaveResult | null {
  return lastSaveByDocsPath.get(path.resolve(docsPath)) || null;
}

export function gitStatus(docsPath: string): GitStatus {
  const config = readConfig(docsPath).gitIntegration;
  const base = {
    mode: config.mode,
    docsFolder: path.resolve(docsPath),
    repoRoot: null,
    docsPathspec: null,
    dirtyDocsCount: 0,
    dirtyOutsideDocsCount: 0,
    aheadOfUpstream: null,
    pushMode: config.pushMode,
    pushEveryCommits: config.pushEveryCommits,
    commitMessage: config.commitMessage,
    lastSave: lastGitSaveResult(docsPath),
  };

  if (config.mode === "unconfigured") {
    return {
      ...base,
      ok: true,
      message: "Git integration is not configured.",
    };
  }
  if (config.mode === "disabled") {
    return {
      ...base,
      ok: true,
      message: "Git integration is disabled.",
    };
  }

  try {
    const repo = resolveRepoInfo(docsPath);
    const dirty = countDirty(repo.root, repo.docsPathspec);
    return {
      ...base,
      ok: true,
      repoRoot: repo.root,
      docsPathspec: repo.docsPathspec,
      dirtyDocsCount: dirty.docs,
      dirtyOutsideDocsCount: dirty.outside,
      aheadOfUpstream: upstreamAhead(repo.root),
      message:
        dirty.outside > 0
          ? `Git repository has ${dirty.outside} change(s) outside ${base.docsFolder}; Living Documentation will only commit ${base.docsFolder}.`
          : "Git integration is ready.",
    };
  } catch (error) {
    return {
      ...base,
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export function gitDocumentVersions(
  docsPath: string,
  documentId: string,
  sinceDays?: number,
  baseRef?: string,
): GitDocumentVersions {
  const config = readConfig(docsPath).gitIntegration;
  const base = {
    mode: config.mode,
    docsFolder: path.resolve(docsPath),
    repoRoot: null,
    relativePath: null,
    baseRef: "HEAD",
    baseContent: null,
    headRef: "HEAD" as const,
    headContent: null,
    commits: [],
  };

  if (config.mode !== "enabled") {
    return {
      ...base,
      ok: false,
      message:
        config.mode === "disabled"
          ? "Git integration is disabled."
          : "Git integration is not configured.",
    };
  }

  try {
    const repo = resolveRepoInfo(docsPath);
    const relativePath = resolveDocumentPathspec(docsPath, documentId, repo);
    const days = normalizeHistoryDays(sinceDays);
    const commits = listDocumentCommits(repo.root, relativePath, days);
    const selectedBaseRef = baseRef?.trim() || commits[1]?.hash || commits[0]?.hash || "HEAD";
    const headContent = readRefContent(repo.root, "HEAD", relativePath);
    return {
      ...base,
      ok: true,
      repoRoot: repo.root,
      relativePath,
      baseRef: selectedBaseRef,
      baseContent: readRefContent(repo.root, selectedBaseRef, relativePath),
      headContent,
      commits,
      message: "Git document versions are available.",
    };
  } catch (error) {
    return {
      ...base,
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export function autoCommitAfterSave(docsPath: string, reason: string): GitSaveResult {
  const config = readConfig(docsPath).gitIntegration;
  const base = {
    timestamp: nowIso(),
    pushed: false,
    committed: false,
  };

  if (config.mode !== "enabled") {
    return recordLastSave(docsPath, {
      ...base,
      attempted: false,
      skipped: true,
      message:
        config.mode === "disabled"
          ? "Git integration is disabled."
          : "Git integration is not configured.",
    });
  }

  try {
    const repo = resolveRepoInfo(docsPath);
    const add = runGit(repo.root, ["add", "-A", "--", repo.docsPathspec]);
    if (!add.ok) {
      throw new Error((add.stderr || add.error || "git add failed").trim());
    }

    const hasStagedDocs = runGit(repo.root, ["diff", "--cached", "--quiet", "--", repo.docsPathspec]);
    if (hasStagedDocs.status === 0) {
      return recordLastSave(docsPath, {
        ...base,
        attempted: true,
        skipped: true,
        message: "No docsFolder changes to commit.",
      });
    }

    const commit = runGit(repo.root, ["commit", "-m", config.commitMessage, "--", repo.docsPathspec]);
    if (!commit.ok) {
      throw new Error((commit.stderr || commit.error || "git commit failed").trim());
    }

    const rev = runGit(repo.root, ["rev-parse", "--short", "HEAD"]);
    const commitHash = rev.ok ? rev.stdout.trim() : undefined;
    let pushed = false;
    let warning: string | undefined;

    if (config.pushMode === "everyNCommits") {
      const ahead = upstreamAhead(repo.root);
      if (ahead === null) {
        warning = "Git push is enabled but no upstream branch is configured.";
      } else if (ahead >= config.pushEveryCommits) {
        const push = runGit(repo.root, ["push"]);
        if (push.ok) {
          pushed = true;
        } else {
          warning = (push.stderr || push.error || "git push failed").trim();
        }
      }
    }

    return recordLastSave(docsPath, {
      ...base,
      attempted: true,
      skipped: false,
      committed: true,
      pushed,
      commit: commitHash,
      warning,
      message: warning
        ? `Git commit created for ${reason}, but push needs attention: ${warning}`
        : `Git commit created for ${reason}.`,
    });
  } catch (error) {
    return recordLastSave(docsPath, {
      ...base,
      attempted: true,
      skipped: false,
      error: error instanceof Error ? error.message : String(error),
      message: "Git auto-commit failed.",
    });
  }
}

function shouldAutoCommit(req: Request): boolean {
  if (!["POST", "PUT", "DELETE"].includes(req.method)) return false;
  const url = req.originalUrl || req.url;
  if (url.startsWith("/api/git")) return false;
  if (url.startsWith("/mcp")) {
    const body = req.body as unknown;
    if (!body || typeof body !== "object" || Array.isArray(body)) return false;
    const record = body as Record<string, unknown>;
    const params = record.params;
    if (record.method !== "tools/call" || !params || typeof params !== "object" || Array.isArray(params)) {
      return false;
    }
    const toolName = (params as Record<string, unknown>).name;
    return typeof toolName === "string" && MCP_WRITE_TOOLS.has(toolName);
  }
  return (
    url.startsWith("/api/documents") ||
    url.startsWith("/api/config") ||
    url.startsWith("/api/browse/mkdir") ||
    url.startsWith("/api/images") ||
    url.startsWith("/api/files") ||
    url.startsWith("/api/diagrams") ||
    url.startsWith("/api/shape-libraries") ||
    url.startsWith("/api/annotations") ||
    url.startsWith("/api/metadata") ||
    url.startsWith("/api/context") ||
    url.startsWith("/api/workspace") ||
    url.startsWith("/api/blueprint") ||
    url.startsWith("/api/survival-kit")
  );
}

export function gitAutoCommitMiddleware(docsPath: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!shouldAutoCommit(req)) {
      next();
      return;
    }

    const originalEnd = res.end.bind(res) as typeof res.end;
    let handled = false;

    res.end = function patchedEnd(
      chunk?: unknown,
      encodingOrCb?: BufferEncoding | (() => void),
      cb?: () => void,
    ): Response {
      if (!handled && res.statusCode >= 200 && res.statusCode < 300) {
        handled = true;
        const result = autoCommitAfterSave(docsPath, `${req.method} ${req.originalUrl || req.url}`);
        if (result.error || result.warning) {
          console.warn(`[living-doc][git] ${result.error || result.warning}`);
        }
        if (!res.headersSent) {
          res.setHeader("X-Living-Doc-Git-Message", encodeURIComponent(result.message));
          if (result.error) res.setHeader("X-Living-Doc-Git-Error", encodeURIComponent(result.error));
          if (result.warning) res.setHeader("X-Living-Doc-Git-Warning", encodeURIComponent(result.warning));
        }
      }

      return originalEnd(
        chunk as Parameters<typeof res.end>[0],
        encodingOrCb as Parameters<typeof res.end>[1],
        cb as Parameters<typeof res.end>[2],
      );
    } as typeof res.end;

    next();
  };
}
