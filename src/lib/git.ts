import { execFileSync } from "node:child_process";

export interface GitStatusEntry {
  path: string; // relative to cwd, POSIX-separated
  indexStatus: string; // staged status char, e.g. "M", "A", "D", " "
  worktreeStatus: string; // unstaged status char
  renamedFrom?: string; // set for R/C entries
}

export interface SourceCommit {
  commit: string; // full HEAD SHA1
  dirty: boolean; // true when the working tree has uncommitted changes
}

export interface SourceCommitOptions {
  // Paths (relative to `cwd`) to exclude from the dirtiness check. The
  // documentation folder usually lives inside the same git repo as the source,
  // so writing an ADR — a new Markdown file plus `.metadata.json` — leaves the
  // tree dirty even when every source file is committed. Excluding it keeps
  // `dirty` a meaningful signal about the *source code*. Ignored when a path is
  // not under `cwd` (cross-project setups where docs live elsewhere).
  excludeRelPaths?: string[];
}

// Captures the HEAD commit of the git repository containing `cwd`, plus whether
// the working tree is dirty. The hashes stored in `.metadata.json` are computed
// from the working-tree files, so when `dirty` is true the recorded commit is
// only an approximation of the state the hashes describe — the LLM is told so it
// can treat a `git diff <commit>..HEAD` as best-effort rather than exact.
//
// Returns null when `cwd` is not inside a git working tree (or git is missing),
// so callers degrade gracefully instead of throwing.
export function currentSourceCommit(
  cwd: string,
  options: SourceCommitOptions = {},
): SourceCommit | null {
  try {
    const commit = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
    if (!commit) return null;

    // Keep only excludes that stay under `cwd` (no leading ".." / absolute).
    const excludes = (options.excludeRelPaths ?? []).filter(
      (rel) => rel && !rel.startsWith("..") && rel !== ".",
    );
    const pathspec =
      excludes.length > 0
        ? ["--", ".", ...excludes.map((rel) => `:(exclude)${rel}`)]
        : [];

    const status = execFileSync(
      "git",
      ["status", "--porcelain", ...pathspec],
      { cwd, encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] },
    );
    return { commit, dirty: status.trim().length > 0 };
  } catch {
    return null;
  }
}

// Working-tree change list (staged + unstaged + untracked), parsed from
// `git status --porcelain=v1 -z`. The `-z` / null-terminated form avoids
// having to unescape quoted paths and keeps rename records (which emit
// `to\0from\0`) unambiguous. `pathspecs`, when given, scopes the listing
// (e.g. to a sourceRoot subdirectory of the repo). Returns null when `cwd`
// is not inside a git working tree, so callers can degrade gracefully
// instead of throwing.
//
// IMPORTANT: git always reports `path` relative to the repository root, not
// to `cwd` — even when `cwd` is a subdirectory. Callers whose `cwd` isn't the
// repo root must re-resolve `path` themselves (see `gitDiff` below, which has
// the same property and expects repo-root-relative pathspecs back).
export function gitStatusPorcelain(cwd: string, pathspecs: string[] = []): GitStatusEntry[] | null {
  try {
    const raw = execFileSync("git", ["status", "--porcelain=v1", "-z", ...(pathspecs.length ? ["--", ...pathspecs] : [])], {
      cwd,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 32 * 1024 * 1024,
    });
    const records = raw.split("\0").filter((r) => r.length > 0);
    const entries: GitStatusEntry[] = [];
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const indexStatus = record.charAt(0);
      const worktreeStatus = record.charAt(1);
      const filePath = record.slice(3);
      const entry: GitStatusEntry = { path: filePath, indexStatus, worktreeStatus };
      // Renames/copies emit the destination record followed by a bare `from` record.
      if (indexStatus === "R" || indexStatus === "C" || worktreeStatus === "R" || worktreeStatus === "C") {
        const from = records[i + 1];
        if (from !== undefined) {
          entry.renamedFrom = from;
          i++;
        }
      }
      entries.push(entry);
    }
    return entries;
  } catch {
    return null;
  }
}

// Unified diff for the given paths against `base` (default HEAD), covering
// both staged and unstaged changes to tracked files in one call. `paths` are
// resolved as git pathspecs relative to `cwd` — pass repo-root-relative paths
// (as returned by `gitStatusPorcelain`) with `cwd` set to the repo root to
// avoid mismatches when `cwd` is a subdirectory. Returns null on failure
// (e.g. no commits yet, or `base` doesn't resolve) instead of throwing, so
// `build_context` can degrade a single section rather than fail the whole call.
export function gitDiff(
  cwd: string,
  paths: string[],
  base: string = "HEAD",
): string | null {
  if (paths.length === 0) return "";
  try {
    return execFileSync(
      "git",
      ["diff", base, "--", ...paths],
      { cwd, encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 32 * 1024 * 1024 },
    );
  } catch {
    return null;
  }
}
