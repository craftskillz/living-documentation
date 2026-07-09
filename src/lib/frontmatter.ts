// Unified frontmatter reader/writer for the OKF migration.
//
// During the migration the project holds two frontmatter conventions in a
// `---`-fenced block:
//   - **legacy**: Markdown-bold keys — `**date:** 2026-07-08` (NOT valid YAML);
//   - **YAML**: OKF-conformant — `type: ADR`, `tags:\n  - a\n  - b`.
//
// `parseFrontmatter` reads either without throwing; `serializeFrontmatter`
// always emits YAML (used by the writer in a later ticket). Legacy blocks are
// detected first and never handed to the YAML parser, which would mis-read the
// `**` markers.
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

export type FrontmatterFormat = "yaml" | "legacy" | "none";

export interface ParsedFrontmatter {
  /** Frontmatter fields. Legacy `tags` (comma string) is normalized to an array. */
  data: Record<string, unknown>;
  /** Document body after the closing fence. */
  body: string;
  format: FrontmatterFormat;
  /** Raw frontmatter text, fences excluded. */
  raw: string;
}

const FENCE_RE = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
// A `**key:**` line proves the legacy Markdown-bold convention.
const LEGACY_KEY_RE = /^\s*\*\*[A-Za-z0-9_-]+\s*:\s*\*\*/m;
// One `key: value` line, tolerating optional `**` around key and value (legacy).
const LEGACY_LINE_RE = /^\s*(?:\*\*)?([A-Za-z0-9_-]+)(?:\*\*)?\s*:\s*(?:\*\*)?\s*(.*?)\s*$/;

export function parseFrontmatter(content: string): ParsedFrontmatter {
  if (typeof content !== "string") {
    return { data: {}, body: "", format: "none", raw: "" };
  }
  const match = content.match(FENCE_RE);
  if (!match) return { data: {}, body: content, format: "none", raw: "" };

  const raw = match[1];
  const body = content.slice(match[0].length);

  if (LEGACY_KEY_RE.test(raw)) {
    return { data: parseLegacyBlock(raw), body, format: "legacy", raw };
  }
  try {
    const parsed = parseYaml(raw);
    const data =
      parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    return { data, body, format: "yaml", raw };
  } catch {
    // Malformed YAML — be lenient and line-parse rather than throw.
    return { data: parseLegacyBlock(raw), body, format: "legacy", raw };
  }
}

function parseLegacyBlock(raw: string): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = LEGACY_LINE_RE.exec(line);
    if (!m) continue;
    const key = m[1];
    const value = m[2];
    // Normalize `tags` to the same array shape as YAML so consumers are uniform.
    if (key.toLowerCase() === "tags") {
      data[key] = value.split(",").map((s) => s.trim()).filter(Boolean);
    } else {
      data[key] = value;
    }
  }
  return data;
}

function lookupCaseInsensitive(data: Record<string, unknown>, key: string): unknown {
  const lower = key.toLowerCase();
  for (const k of Object.keys(data)) {
    if (k.toLowerCase() === lower) return data[k];
  }
  return undefined;
}

function toStringField(value: unknown): string | null {
  if (value == null) return null;
  if (Array.isArray(value)) return value.map((v) => String(v)).join(", ");
  return String(value);
}

/**
 * Case-insensitive single-field read, format-agnostic. Arrays (e.g. `tags`) are
 * returned as a comma-joined string for backward compatibility.
 */
export function getField(content: string, key: string): string | null {
  return toStringField(lookupCaseInsensitive(parseFrontmatter(content).data, key));
}

/** First present field among `keys`, case-insensitive. */
export function getFirstField(content: string, keys: string[]): string | null {
  const { data } = parseFrontmatter(content);
  for (const key of keys) {
    const v = lookupCaseInsensitive(data, key);
    if (v != null) return toStringField(v);
  }
  return null;
}

/** Serialize fields to a YAML `---` block (trailing newline included). */
export function serializeFrontmatter(data: Record<string, unknown>): string {
  const yaml = stringifyYaml(data, { lineWidth: 0 }).replace(/\n+$/, "");
  return `---\n${yaml}\n---\n`;
}
