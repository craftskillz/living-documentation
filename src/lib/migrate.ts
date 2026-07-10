// Deterministic (no-AI) migration of a docs folder to canonical OKF YAML
// frontmatter. Reuses the write-path transform (`normalizeFrontmatter`, T04), so
// a migrated file is byte-identical to what a later save would produce. Shared
// by the CLI `migrate` command, the startup gate (T06) and the standalone
// script. Idempotent.
import fs from "node:fs";
import path from "node:path";
import { parseFilename } from "./parser";
import { isReservedOkfFile, normalizeFrontmatter, OKF_SPEC_VERSION } from "./okf";
import { generateOkfIndexFiles } from "./okf/index-generator";
import { generateOkfLogFile } from "./okf/log-generator";
import { backfillSourcesFromStore } from "./metadata";

export const OKF_VERSION = OKF_SPEC_VERSION;

const IGNORED_DIRS = new Set([".git", "node_modules", "dist"]);

export interface MigrateResult {
  scanned: number;
  changed: number;
  unchanged: number;
  errors: string[];
  /** Bundle-relative paths of the files that were (or would be) rewritten. */
  changedList: string[];
}

function collectMd(root: string, dir: string = root, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    // Never follow symlinks: instruction files (AGENTS.md, CLAUDE.md, MEMORY.md)
    // are symlinked into the bundle but live outside it — they are not concepts.
    if (entry.isSymbolicLink()) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) collectMd(root, full, out);
    } else if (entry.name.endsWith(".md") && !isReservedOkfFile(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

/** Persist the OKF migration flag so the CLI startup gate lets the project open. */
export function writeOkfFlag(docsPath: string): void {
  const cfgPath = path.join(docsPath, ".living-doc.json");
  const cfg = fs.existsSync(cfgPath)
    ? (JSON.parse(fs.readFileSync(cfgPath, "utf-8")) as Record<string, unknown>)
    : {};
  cfg.okfMigration = { version: OKF_VERSION, migratedAt: new Date().toISOString() };
  fs.writeFileSync(cfgPath, `${JSON.stringify(cfg, null, 2)}\n`, "utf-8");
}

export function migrateDocsFolder(
  docsPath: string,
  opts: { dryRun?: boolean } = {},
): MigrateResult {
  const files = collectMd(docsPath);
  const result: MigrateResult = {
    scanned: files.length,
    changed: 0,
    unchanged: 0,
    errors: [],
    changedList: [],
  };

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, "utf-8");
      const relPath = path.relative(docsPath, file).split(path.sep).join("/");
      const title = parseFilename(path.basename(file)).title;
      const next = normalizeFrontmatter(content, relPath, { title });
      if (next === content) {
        result.unchanged += 1;
      } else {
        result.changed += 1;
        result.changedList.push(relPath);
        if (!opts.dryRun) fs.writeFileSync(file, next, "utf-8");
      }
    } catch (err) {
      result.errors.push(`${file}: ${(err as Error).message}`);
    }
  }

  if (!opts.dryRun && result.errors.length === 0) {
    // Mirror existing drift bindings into each doc's frontmatter `sources` block
    // (T11) so the bundle is self-describing, then the reserved OKF files:
    // index.md listings (+ root okf_version) and the log.md changelog.
    backfillSourcesFromStore(docsPath);
    generateOkfIndexFiles(docsPath);
    generateOkfLogFile(docsPath);
    writeOkfFlag(docsPath);
  }
  return result;
}
