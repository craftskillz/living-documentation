// Deterministic OKF-conformance validator for a docs bundle. Checks that every
// non-reserved `.md` is a well-formed OKF concept (YAML frontmatter, known
// non-empty `type`, `title`, ISO `timestamp`, well-formed `sources` block) and
// that the reserved files exist (`index.md` with `okf_version`, `log.md`).
// Pure read-only: shared by the CLI `validate` command and CI. No AI.
import fs from "node:fs";
import path from "node:path";
import { parseFrontmatter } from "../frontmatter";
import { isReservedOkfFile } from "../okf";

export type OkfSeverity = "error" | "warning";

export interface OkfViolation {
  /** Bundle-relative path (or a reserved filename for bundle-level rules). */
  file: string;
  rule: string;
  message: string;
  severity: OkfSeverity;
}

export interface OkfValidationResult {
  /** True when there are no `error`-severity violations (warnings are allowed). */
  ok: boolean;
  checked: number; // concept files inspected
  errors: number;
  warnings: number;
  violations: OkfViolation[];
}

// The closed vocabulary produced by the `type` derivation table (T03), plus
// `Concept` for imported bundles. A non-empty type outside this set is flagged
// so the bundle stays disciplined.
const KNOWN_TYPES = new Set([
  "ADR",
  "Worklog",
  "Rule",
  "Technical Doc",
  "Document",
  "Concept",
]);

const IGNORED_DIRS = new Set([".git", "node_modules", "dist"]);
const ISO_8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

function collectMd(root: string, dir: string = root, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue; // instruction files live outside the bundle
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) collectMd(root, full, out);
    } else if (entry.name.endsWith(".md") && !isReservedOkfFile(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function validateSources(value: unknown): string | null {
  if (!Array.isArray(value)) return "`sources` must be a YAML list";
  for (const item of value) {
    if (typeof item !== "object" || item === null) return "each `sources` entry must be a mapping";
    const rec = item as Record<string, unknown>;
    if (typeof rec.path !== "string" || !rec.path.trim()) return "each `sources` entry needs a non-empty `path`";
    if (typeof rec.hash !== "string" || !rec.hash.trim()) return "each `sources` entry needs a non-empty `hash`";
  }
  return null;
}

/** Validate that `docsPath` is a conformant OKF bundle. Read-only. */
export function validateOkfBundle(docsPath: string): OkfValidationResult {
  const violations: OkfViolation[] = [];
  const files = collectMd(docsPath);

  for (const file of files) {
    const rel = path.relative(docsPath, file).split(path.sep).join("/");
    const content = fs.readFileSync(file, "utf-8");
    const { data, format } = parseFrontmatter(content);

    if (format !== "yaml") {
      violations.push({
        file: rel,
        rule: "frontmatter",
        message: format === "none" ? "missing YAML frontmatter" : "frontmatter is legacy, not YAML",
        severity: "error",
      });
      continue; // the remaining field checks assume a parsed YAML block
    }

    // `type` must be present and non-empty (error). The OKF `type` vocabulary is
    // extensible, so a present-but-unrecognized type is only a warning — our own
    // concepts always use a derived (known) type, while imported bundles may
    // carry their own vocabulary.
    const type = typeof data.type === "string" ? data.type.trim() : "";
    if (!type) {
      violations.push({ file: rel, rule: "type", message: "missing or empty `type`", severity: "error" });
    } else if (!KNOWN_TYPES.has(type)) {
      violations.push({ file: rel, rule: "type", message: `unrecognized type "${type}"`, severity: "warning" });
    }

    const title = typeof data.title === "string" ? data.title.trim() : "";
    if (!title) violations.push({ file: rel, rule: "title", message: "missing or empty `title`", severity: "error" });

    // `timestamp` is recommended, not mandatory (undated concepts like rules are
    // legitimate) — absent is a warning, malformed is an error.
    const ts = typeof data.timestamp === "string" ? data.timestamp.trim() : "";
    if (!ts) violations.push({ file: rel, rule: "timestamp", message: "missing `timestamp`", severity: "warning" });
    else if (!ISO_8601.test(ts)) violations.push({ file: rel, rule: "timestamp", message: `\`timestamp\` is not ISO 8601: ${ts}`, severity: "error" });

    if (data.sources !== undefined) {
      const err = validateSources(data.sources);
      if (err) violations.push({ file: rel, rule: "sources", message: err, severity: "error" });
    }
  }

  // Bundle-level reserved files.
  const rootIndex = path.join(docsPath, "index.md");
  if (!fs.existsSync(rootIndex)) {
    violations.push({ file: "index.md", rule: "reserved", message: "root `index.md` is missing", severity: "error" });
  } else if (!/okf_version/i.test(fs.readFileSync(rootIndex, "utf-8"))) {
    violations.push({ file: "index.md", rule: "reserved", message: "root `index.md` has no `okf_version`", severity: "error" });
  }
  if (!fs.existsSync(path.join(docsPath, "log.md"))) {
    violations.push({ file: "log.md", rule: "reserved", message: "`log.md` changelog is missing", severity: "error" });
  }

  const errors = violations.filter((v) => v.severity === "error").length;
  return {
    ok: errors === 0,
    checked: files.length,
    errors,
    warnings: violations.length - errors,
    violations,
  };
}
