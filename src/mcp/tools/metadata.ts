import path from "path";
import fs from "fs";
import {
  getDocEntries,
  setDocEntries,
  resolveSourceRoot,
  assertUnderSourceRoot,
  buildReport,
  MetadataEntry,
} from "../../lib/metadata";
import { sha256File } from "../../lib/hash";

function jsonResult(obj: unknown) {
  return {
    content: [
      { type: "text" as const, text: JSON.stringify(obj, null, 2) },
    ],
  };
}

export function toolListMetadata(docsPath: string, args: { docId: string }) {
  if (!args.docId) throw new Error("docId is required");
  const sourceRoot = resolveSourceRoot(docsPath);
  const entries = getDocEntries(docsPath, args.docId);
  return jsonResult({ docId: args.docId, sourceRoot, items: entries });
}

export function toolGetAccuracy(docsPath: string, args: { docId: string }) {
  if (!args.docId) throw new Error("docId is required");
  const sourceRoot = resolveSourceRoot(docsPath);
  const entries = getDocEntries(docsPath, args.docId);
  const report = buildReport(entries, sourceRoot);
  return jsonResult({ docId: args.docId, ...report });
}

export function toolRefreshMetadata(
  docsPath: string,
  args: { docId: string },
) {
  if (!args.docId) throw new Error("docId is required");
  const sourceRoot = resolveSourceRoot(docsPath);
  const entries = getDocEntries(docsPath, args.docId).map((e) => {
    const abs = path.resolve(sourceRoot, e.path);
    if (!fs.existsSync(abs)) return e;
    const fresh = sha256File(abs);
    return fresh ? { path: e.path, hash: fresh } : e;
  });
  setDocEntries(docsPath, args.docId, entries);
  const report = buildReport(entries, sourceRoot);
  return jsonResult({ docId: args.docId, refreshed: true, ...report });
}

export function toolAddMetadata(
  docsPath: string,
  args: { docId: string; path: string },
) {
  if (!args.docId) throw new Error("docId is required");
  if (!args.path) throw new Error("path is required");
  const sourceRoot = resolveSourceRoot(docsPath);
  const rel = assertUnderSourceRoot(args.path, sourceRoot);
  const abs = path.resolve(sourceRoot, rel);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
    throw new Error(`Not a readable file: ${args.path}`);
  }
  const hash = sha256File(abs);
  if (!hash) throw new Error("Failed to hash file");

  const entries = getDocEntries(docsPath, args.docId);
  const idx = entries.findIndex((e) => e.path === rel);
  const entry: MetadataEntry = { path: rel, hash };
  if (idx >= 0) entries[idx] = entry;
  else entries.push(entry);
  setDocEntries(docsPath, args.docId, entries);

  const report = buildReport(entries, sourceRoot);
  return jsonResult({ docId: args.docId, added: rel, ...report });
}
