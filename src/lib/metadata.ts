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
  const { sourceRoot } = readConfig(docsPath);
  const resolved =
    sourceRoot && path.isAbsolute(sourceRoot)
      ? sourceRoot
      : path.dirname(path.resolve(docsPath));
  return path.resolve(resolved);
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

// Weighted ratio: missing = 3, modified = 1, unchanged = 0. accuracy = 1 - sum/(3*total)
export function buildReport(
  entries: MetadataEntry[],
  sourceRoot: string,
): AccuracyReport {
  const items = entries.map((e) => classifyEntry(e, sourceRoot));
  const total = items.length;
  let unchanged = 0;
  let modified = 0;
  let missing = 0;
  let weight = 0;
  for (const it of items) {
    if (it.status === "unchanged") unchanged++;
    else if (it.status === "modified") {
      modified++;
      weight += 1;
    } else {
      missing++;
      weight += 3;
    }
  }
  const accuracy = total === 0 ? 1 : 1 - weight / (total * 3);
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
