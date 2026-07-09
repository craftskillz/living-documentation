import fs from "node:fs";
import path from "node:path";
import { readConfig } from "./config";
import { sha256File } from "./hash";
import { currentSourceCommit, type SourceCommit } from "./git";
import { getField } from "./frontmatter";

export interface MetadataEntry {
  path: string; // relative to sourceRoot
  hash: string;
  // HEAD commit of the source repo when `hash` was computed. Optional so that
  // legacy `.metadata.json` files (written before this field existed) stay
  // valid. Stored per entry — all entries refreshed together share the same
  // value, but `add_metadata` of a single file records the commit at its own
  // moment. Lets an LLM run a targeted `git diff <commit>..HEAD` instead of
  // searching the whole history.
  commit?: string;
  // True when the working tree was dirty at capture time: the commit is then an
  // approximation, since `hash` reflects uncommitted working-tree content.
  dirty?: boolean;
}

export type MetadataStore = Record<string, MetadataEntry[]>;

export type MetadataStatus = "unchanged" | "modified" | "missing";

export interface MetadataItem {
  path: string;
  storedHash: string;
  currentHash: string | null;
  status: MetadataStatus;
  // Carried through from the stored entry (see MetadataEntry). Present only when
  // recorded; absent for legacy entries.
  commit?: string;
  dirty?: boolean;
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

// Captures the source-repo HEAD commit + dirty flag for a metadata write,
// excluding the documentation folder from the dirtiness check when it lives
// inside the source repo (otherwise every ADR write would mark `dirty: true`).
export function sourceCommitForMetadata(
  docsPath: string,
  sourceRoot: string,
): SourceCommit | null {
  const rel = path.relative(sourceRoot, docsPath);
  return currentSourceCommit(sourceRoot, { excludeRelPaths: [rel] });
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
  const { commit, dirty } = entry;
  if (!fs.existsSync(abs)) {
    return {
      path: entry.path,
      storedHash: entry.hash,
      currentHash: null,
      status: "missing",
      ...(commit !== undefined ? { commit } : {}),
      ...(dirty !== undefined ? { dirty } : {}),
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
    ...(commit !== undefined ? { commit } : {}),
    ...(dirty !== undefined ? { dirty } : {}),
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

// Reads a frontmatter field from a Markdown document, format-agnostic (YAML or
// legacy `**key:** value`). Kept as a thin wrapper over the shared frontmatter
// parser so existing callers are unchanged. Case-insensitive on the key.
export function getFrontmatterField(
  content: string,
  key: string,
): string | null {
  return getField(content, key);
}
