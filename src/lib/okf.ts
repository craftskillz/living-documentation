// OKF concept model — deterministic (no-AI) frontmatter normalization.
//
// `normalizeFrontmatter` converts a document's frontmatter (legacy `**bold**`
// or already-YAML) to the canonical OKF-conformant YAML frozen by the T03
// convention ADR. It is the single deterministic transform shared by the write
// path (T04) and the bulk migration (T05): given the same input it always
// yields the same output, with no LLM involved.
import { parseFrontmatter, serializeFrontmatter } from "./frontmatter";

// Emission order for known keys; unknown/custom keys (e.g. `sources`) follow.
const CANONICAL_ORDER = [
  "type",
  "title",
  "description",
  "tags",
  "timestamp",
  "status",
  "language",
  "resource",
];

/**
 * Deterministic `type` derivation from a doc's folder-relative path (T03 table).
 * Diagrams (stored outside .md) and imported `Concept`s are typed by their own
 * creators, not here.
 */
export function deriveType(relPath: string): string {
  const p = relPath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (/(^|\/)ADRS\//i.test(p)) return "ADR";
  if (/(^|\/)WORKLOG\//i.test(p)) return "Worklog";
  if (/(^|\/)AI\/rules\//i.test(p)) return "Rule";
  if (/(^|\/)AI\//i.test(p)) return "Technical Doc";
  return "Document";
}

/** `YYYY-MM-DD` (or already-ISO) → full ISO 8601 UTC, using the filename's `HH_mm`. */
function toIsoTimestamp(value: string, relPath: string): string {
  const v = value.trim();
  if (/^\d{4}-\d{2}-\d{2}T/.test(v)) return v; // already a datetime
  const base = (relPath.split("/").pop() ?? "");
  const fnDate = base.match(/^(\d{4})_(\d{2})_(\d{2})(?:_(\d{2})_(\d{2}))?/);
  const datePart = /^\d{4}-\d{2}-\d{2}$/.test(v)
    ? v
    : fnDate
      ? `${fnDate[1]}-${fnDate[2]}-${fnDate[3]}`
      : v;
  const hh = fnDate?.[4] ?? "00";
  const mm = fnDate?.[5] ?? "00";
  return /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? `${datePart}T${hh}:${mm}:00Z` : datePart;
}

function toTagList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
}

function serializeCanonical(data: Record<string, unknown>): string {
  const ordered: Record<string, unknown> = {};
  for (const key of CANONICAL_ORDER) {
    if (data[key] !== undefined) ordered[key] = data[key];
  }
  for (const key of Object.keys(data)) {
    if (!(key in ordered) && data[key] !== undefined) ordered[key] = data[key];
  }
  return serializeFrontmatter(ordered);
}

/**
 * Convert a document's frontmatter to canonical OKF YAML. Idempotent: running it
 * on already-normalized content yields the same content. Preserves unknown keys
 * (e.g. `sources`) and the body verbatim.
 */
export function normalizeFrontmatter(
  content: string,
  relPath: string,
  defaults?: { title?: string },
): string {
  const { data, body, format } = parseFrontmatter(content);

  // Lower-case all keys so mapping is uniform, then build the canonical set.
  const fields: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) fields[k.toLowerCase()] = v;

  // date → timestamp (ISO 8601 UTC, minute precision from the filename).
  if (fields.date !== undefined && fields.timestamp === undefined) {
    fields.timestamp = toIsoTimestamp(String(fields.date), relPath);
  }
  delete fields.date;

  // Fill a missing title from the caller (e.g. filename-derived) — OKF concepts
  // should be self-describing.
  if ((typeof fields.title !== "string" || fields.title.trim() === "") && defaults?.title) {
    fields.title = defaults.title;
  }

  // type is required — derive when absent.
  if (typeof fields.type !== "string" || fields.type.trim() === "") {
    fields.type = deriveType(relPath);
  }

  // tags is always a YAML list.
  if (fields.tags !== undefined) fields.tags = toTagList(fields.tags);

  const yamlBlock = serializeCanonical(fields);
  // Keep exactly one blank line between the block and the body.
  const trimmedBody = body.replace(/^\r?\n/, "");
  void format;
  return `${yamlBlock}\n${trimmedBody}`;
}
