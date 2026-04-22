import path from "path";
import fs from "fs";
import {
  getDocEntries,
  setDocEntries,
  resolveSourceRoot,
  assertUnderSourceRoot,
  buildReport,
  getFrontmatterField,
  MetadataEntry,
} from "../../lib/metadata";
import { sha256File } from "../../lib/hash";
import { listAllDocuments, resolveDocFilePath } from "./documents";

const ACCURACY_THRESHOLD = 0.8;
const MAX_ITEMS = 10;

function jsonResult(obj: unknown) {
  return {
    content: [
      { type: "text" as const, text: JSON.stringify(obj, null, 2) },
    ],
  };
}

function decodeDocId(id: unknown): string {
  if (typeof id !== "string" || !id) {
    throw new Error("Missing required parameter 'id'");
  }
  return decodeURIComponent(id);
}

export function toolListMetadata(docsPath: string, args: { id: string }) {
  const docId = decodeDocId(args?.id);
  const sourceRoot = resolveSourceRoot(docsPath);
  const entries = getDocEntries(docsPath, docId);
  return jsonResult({ id: docId, sourceRoot, items: entries });
}

export function toolGetAccuracy(docsPath: string, args: { id: string }) {
  const docId = decodeDocId(args?.id);
  const sourceRoot = resolveSourceRoot(docsPath);
  const entries = getDocEntries(docsPath, docId);
  const report = buildReport(entries, sourceRoot);
  return jsonResult({ id: docId, ...report });
}

export function toolRefreshMetadata(
  docsPath: string,
  args: { id: string },
) {
  const docId = decodeDocId(args?.id);
  const sourceRoot = resolveSourceRoot(docsPath);
  const entries = getDocEntries(docsPath, docId).map((e) => {
    const abs = path.resolve(sourceRoot, e.path);
    if (!fs.existsSync(abs)) return e;
    const fresh = sha256File(abs);
    return fresh ? { path: e.path, hash: fresh } : e;
  });
  setDocEntries(docsPath, docId, entries);
  const report = buildReport(entries, sourceRoot);
  return jsonResult({ id: docId, refreshed: true, ...report });
}

export function toolAddMetadata(
  docsPath: string,
  args: { id: string; path: string },
) {
  const docId = decodeDocId(args?.id);
  if (!args.path) throw new Error("path is required");
  const sourceRoot = resolveSourceRoot(docsPath);
  const rel = assertUnderSourceRoot(args.path, sourceRoot);
  const abs = path.resolve(sourceRoot, rel);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
    throw new Error(`Not a readable file: ${args.path}`);
  }
  const hash = sha256File(abs);
  if (!hash) throw new Error("Failed to hash file");

  const entries = getDocEntries(docsPath, docId);
  const idx = entries.findIndex((e) => e.path === rel);
  const entry: MetadataEntry = { path: rel, hash };
  if (idx >= 0) entries[idx] = entry;
  else entries.push(entry);
  setDocEntries(docsPath, docId, entries);

  const report = buildReport(entries, sourceRoot);
  return jsonResult({
    id: docId,
    added: entry,
    total: report.total,
    accuracy: report.accuracy,
  });
}

export function toolRemoveMetadata(
  docsPath: string,
  args: { id: string; path: string },
) {
  const docId = decodeDocId(args?.id);
  if (!args.path) throw new Error("path is required");
  const sourceRoot = resolveSourceRoot(docsPath);
  const rel = assertUnderSourceRoot(args.path, sourceRoot);

  const entries = getDocEntries(docsPath, docId);
  const idx = entries.findIndex((e) => e.path === rel);
  let removed: MetadataEntry | null = null;
  if (idx >= 0) {
    removed = entries[idx];
    entries.splice(idx, 1);
    setDocEntries(docsPath, docId, entries);
  }

  const report = buildReport(entries, sourceRoot);
  return jsonResult({
    id: docId,
    removed,
    total: report.total,
    accuracy: report.accuracy,
  });
}

export function toolListDocumentsBelowAccuracy(docsPath: string) {
  const sourceRoot = resolveSourceRoot(docsPath);
  const docs = listAllDocuments(docsPath);

  const candidates: Array<{
    id: string;
    title: string;
    category: string;
    folder: string | null;
    accuracy: number;
    total: number;
    unchanged: number;
    modified: number;
    missing: number;
  }> = [];

  for (const doc of docs) {
    const decodedId = decodeURIComponent(doc.id);
    const entries = getDocEntries(docsPath, decodedId);
    if (entries.length === 0) continue;

    const filePath = resolveDocFilePath(docsPath, doc);
    if (filePath) {
      try {
        const content = fs.readFileSync(filePath, "utf-8");
        const status = getFrontmatterField(content, "status");
        if (status && status.trim().toLowerCase() === "superseeded") continue;
      } catch {
        // Unreadable doc — keep it in scope; metadata accuracy is still meaningful.
      }
    }

    const report = buildReport(entries, sourceRoot);
    if (report.accuracy >= ACCURACY_THRESHOLD) continue;

    candidates.push({
      id: doc.id,
      title: doc.title,
      category: doc.category,
      folder: doc.folder,
      accuracy: report.accuracy,
      total: report.total,
      unchanged: report.unchanged,
      modified: report.modified,
      missing: report.missing,
    });
  }

  candidates.sort((a, b) => a.accuracy - b.accuracy);

  return jsonResult({
    items: candidates.slice(0, MAX_ITEMS),
    totalBelowThreshold: candidates.length,
  });
}
