import { execFileSync } from "child_process";

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
