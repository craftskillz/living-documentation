// Deterministic (no-AI) import of an external OKF bundle into a living-doc
// project. Concepts are copied under `IMPORTED/<bundle>/`, preserving their
// folder structure (so bundle-relative links keep resolving) and their original
// OKF `type`. Frontmatter is run through the shared `normalizeFrontmatter` so an
// imported concept is byte-identical to a locally-authored one. Reserved files
// (index.md / log.md) are not imported — they are regenerated for the whole
// bundle afterwards. Idempotency is not attempted: a non-empty target is refused.
import fs from "node:fs";
import path from "node:path";
import { parseFilename } from "../parser";
import { getField } from "../frontmatter";
import { isReservedOkfFile, normalizeFrontmatter } from "../okf";
import { generateOkfIndexFiles } from "./index-generator";

export interface ImportResult {
  bundle: string;
  /** Bundle-relative destination folder, e.g. "IMPORTED/ga4". */
  targetDir: string;
  imported: number;
  skippedReserved: number;
  errors: string[];
}

const IGNORED_DIRS = new Set([".git", "node_modules", "dist"]);

function collectMd(root: string, dir: string = root, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) collectMd(root, full, out);
    } else if (entry.name.endsWith(".md")) {
      out.push(full);
    }
  }
  return out;
}

/** Filesystem-safe bundle folder name. */
function sanitizeName(name: string): string {
  return (
    name
      .trim()
      .replace(/[^A-Za-z0-9._-]+/g, "_")
      .replace(/^_+|_+$/g, "") || "bundle"
  );
}

/**
 * Import the OKF bundle at `sourcePath` into `docsPath/IMPORTED/<bundle>`.
 * Read-only on the source. Returns a summary; on any error nothing downstream
 * (index regeneration) runs.
 */
export function importOkfBundle(
  sourcePath: string,
  docsPath: string,
  opts: { name?: string } = {},
): ImportResult {
  const bundle = sanitizeName(opts.name ?? path.basename(path.resolve(sourcePath)));
  const targetRel = path.join("IMPORTED", bundle);
  const targetAbs = path.join(docsPath, targetRel);
  const result: ImportResult = {
    bundle,
    targetDir: targetRel.split(path.sep).join("/"),
    imported: 0,
    skippedReserved: 0,
    errors: [],
  };

  if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isDirectory()) {
    result.errors.push(`Source is not a directory: ${sourcePath}`);
    return result;
  }
  if (fs.existsSync(targetAbs) && fs.readdirSync(targetAbs).length > 0) {
    result.errors.push(`Target already exists and is not empty: ${result.targetDir}`);
    return result;
  }

  for (const file of collectMd(sourcePath)) {
    const base = path.basename(file);
    if (isReservedOkfFile(base)) {
      result.skippedReserved += 1;
      continue;
    }
    try {
      const rel = path.relative(sourcePath, file);
      const destAbs = path.join(targetAbs, rel);
      const destRel = path.relative(docsPath, destAbs).split(path.sep).join("/");
      const content = fs.readFileSync(file, "utf-8");
      // Preserve the concept's own title; fall back to the filename.
      const title = getField(content, "title") || parseFilename(base).title;
      const normalized = normalizeFrontmatter(content, destRel, { title });
      fs.mkdirSync(path.dirname(destAbs), { recursive: true });
      fs.writeFileSync(destAbs, normalized, "utf-8");
      result.imported += 1;
    } catch (err) {
      result.errors.push(`${file}: ${(err as Error).message}`);
    }
  }

  if (result.errors.length === 0 && result.imported > 0) {
    // Refresh listings so the new IMPORTED/<bundle> subtree appears in index.md.
    generateOkfIndexFiles(docsPath);
  }
  return result;
}
