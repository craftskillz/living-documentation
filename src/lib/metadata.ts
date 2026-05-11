import fs from "fs";
import path from "path";
import { readConfig } from "./config";
import { sha256File } from "./hash";

export interface MetadataEntry {
  path: string; // relative to sourceRoot
  hash: string;
}

export type MetadataStore = Record<string, MetadataEntry[]>;

export type MetadataStatus = "unchanged" | "modified" | "missing";

export interface MetadataItem {
  path: string;
  storedHash: string;
  currentHash: string | null;
  status: MetadataStatus;
}

export interface AccuracyReport {
  items: MetadataItem[];
  total: number;
  unchanged: number;
  modified: number;
  missing: number;
  accuracy: number; // 0..1
}

const METADATA_FILENAME = ".metadata.json";

export function metadataPath(docsPath: string): string {
  return path.join(docsPath, METADATA_FILENAME);
}

export function readMetadataStore(docsPath: string): MetadataStore {
  const p = metadataPath(docsPath);
  if (!fs.existsSync(p)) return {};
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {
    return {};
  }
}

export function writeMetadataStore(
  docsPath: string,
  store: MetadataStore,
): void {
  fs.writeFileSync(
    metadataPath(docsPath),
    JSON.stringify(store, null, 2),
    "utf-8",
  );
}

export function resolveSourceRoot(docsPath: string): string {
  // readConfig always returns sourceRoot as an absolute path (resolved from storage).
  return readConfig(docsPath).sourceRoot;
}

export function assertUnderSourceRoot(
  relOrAbs: string,
  sourceRoot: string,
): string {
  // Returns the normalized relative path under sourceRoot.
  const abs = path.isAbsolute(relOrAbs)
    ? path.resolve(relOrAbs)
    : path.resolve(sourceRoot, relOrAbs);
  const base = path.resolve(sourceRoot) + path.sep;
  if (!abs.startsWith(base) && abs !== path.resolve(sourceRoot)) {
    throw new Error("Path escapes sourceRoot");
  }
  return path.relative(sourceRoot, abs);
}

export function classifyEntry(
  entry: MetadataEntry,
  sourceRoot: string,
): MetadataItem {
  const abs = path.resolve(sourceRoot, entry.path);
  if (!fs.existsSync(abs)) {
    return {
      path: entry.path,
      storedHash: entry.hash,
      currentHash: null,
      status: "missing",
    };
  }
  const current = sha256File(abs);
  const status: MetadataStatus =
    current === entry.hash ? "unchanged" : "modified";
  return {
    path: entry.path,
    storedHash: entry.hash,
    currentHash: current,
    status,
  };
}

// accuracy = unchanged / total. Each entry is an assertion that the doc is in
// sync with a source file; modified or missing both break that assertion.
export function buildReport(
  entries: MetadataEntry[],
  sourceRoot: string,
): AccuracyReport {
  const items = entries.map((e) => classifyEntry(e, sourceRoot));
  const total = items.length;
  let unchanged = 0;
  let modified = 0;
  let missing = 0;
  for (const it of items) {
    if (it.status === "unchanged") unchanged++;
    else if (it.status === "modified") modified++;
    else missing++;
  }
  const accuracy = total === 0 ? 1 : unchanged / total;
  return { items, total, unchanged, modified, missing, accuracy };
}

export function getDocEntries(
  docsPath: string,
  docId: string,
): MetadataEntry[] {
  const store = readMetadataStore(docsPath);
  return store[docId] || [];
}

export function setDocEntries(
  docsPath: string,
  docId: string,
  entries: MetadataEntry[],
): void {
  const store = readMetadataStore(docsPath);
  if (entries.length === 0) delete store[docId];
  else store[docId] = entries;
  writeMetadataStore(docsPath, store);
}

// Reads a frontmatter field from a Markdown document. Supports the two
// conventions used in this project: YAML block (`---\nkey: value\n---`) and
// ADR-style inline (`**key:** value` in the opening lines). Returns null when
// not found. Case-insensitive on the key.
export function getFrontmatterField(
  content: string,
  key: string,
): string | null {
  const k = key.toLowerCase();
  const head = content.slice(0, 4096);

  if (head.startsWith("---")) {
    const end = head.indexOf("\n---", 3);
    if (end !== -1) {
      const block = head.slice(3, end);
      for (const line of block.split("\n")) {
        const m = /^\s*([A-Za-z0-9_-]+)\s*:\s*(.+?)\s*$/.exec(line);
        if (m && m[1].toLowerCase() === k) return m[2];
      }
    }
  }

  for (const line of head.split("\n", 30)) {
    const m = /^\s*\*\*([A-Za-z0-9_-]+)\s*:\s*\*\*\s*(.+?)\s*$/.exec(line);
    if (m && m[1].toLowerCase() === k) return m[2];
  }

  return null;
}
