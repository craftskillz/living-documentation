import path from "node:path";
import fs from "node:fs";
import {
  getDocEntries,
  setDocEntries,
  resolveSourceRoot,
  assertUnderSourceRoot,
  buildReport,
  getFrontmatterField,
  sourceCommitForMetadata,
  type MetadataEntry,
} from "../../lib/metadata";
import { sha256File } from "../../lib/hash";
import type { SourceCommit } from "../../lib/git";
import { assertNotSuperSeeded } from "../../lib/status";
import { listAllDocuments, resolveDocFilePath } from "./documents";

const ACCURACY_THRESHOLD = 0.8;
const FULL_ACCURACY = 1;
const MAX_ITEMS = 10;

function jsonResult(obj: unknown) {
  return {
    content: [
      { type: "text" as const, text: JSON.stringify(obj, null, 2) },
    ],
  };
}

// Builds a fresh entry, attaching the source commit (and dirty flag) when the
// repo state is known. Omits the fields entirely when null so the stored JSON
// stays clean for non-git source roots.
function buildEntry(
  relPath: string,
  hash: string,
  src: SourceCommit | null,
): MetadataEntry {
  return {
    path: relPath,
    hash,
    ...(src ? { commit: src.commit, dirty: src.dirty } : {}),
  };
}

function decodeDocId(id: unknown): string {
  if (typeof id !== "string" || !id) {
    throw new Error("Missing required parameter 'id'");
  }
  return decodeURIComponent(id);
}

function isAdrDocument(
  doc: { category: string; folder: string | null },
  docId: string,
  content: string,
): boolean {
  const folderParts = (doc.folder ?? "").toLowerCase().split(/[\\/]+/);
  if (folderParts.includes("adrs")) return true;
  if (doc.category.toLowerCase() === "adr") return true;
  if (/\[adr\]/i.test(docId)) return true;
  return /architecture decision record/i.test(content.slice(0, 4096));
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

export function toolReviewAdrRelevance(docsPath: string, args: { id: string }) {
  const docId = decodeDocId(args?.id);
  const docs = listAllDocuments(docsPath);
  const doc = docs.find((candidate) => decodeURIComponent(candidate.id) === docId);
  if (!doc) throw new Error(`Document not found: ${docId}`);

  const filePath = resolveDocFilePath(docsPath, doc);
  if (!filePath) throw new Error(`Document not found: ${docId}`);

  const content = fs.readFileSync(filePath, "utf-8");
  if (!isAdrDocument(doc, docId, content)) {
    throw new Error(`Document is not an ADR: ${docId}`);
  }

  const sourceRoot = resolveSourceRoot(docsPath);
  const entries = getDocEntries(docsPath, docId);
  const report = buildReport(entries, sourceRoot);
  const sourceFilesToReread = report.items.filter((item) => item.status !== "unchanged");
  const hasMetadata = entries.length > 0;
  const needsReview = hasMetadata && report.accuracy < FULL_ACCURACY;

  let state: "no_metadata" | "metadata_current" | "needs_llm_review" | "already_superseeded";
  const status = getFrontmatterField(content, "status");
  if (status?.trim().toLowerCase() === "superseeded") state = "already_superseeded";
  else if (!hasMetadata) state = "no_metadata";
  else if (needsReview) state = "needs_llm_review";
  else state = "metadata_current";

  return jsonResult({
    id: docId,
    isAdr: true,
    state,
    document: {
      id: doc.id,
      decodedId: docId,
      title: doc.title,
      category: doc.category,
      folder: doc.folder,
      status,
      description: getFrontmatterField(content, "description"),
      tags: getFrontmatterField(content, "tags"),
      content,
    },
    metadata: {
      sourceRoot,
      hasMetadata,
      ...report,
      sourceFilesToReread,
    },
  });
}

export function toolRefreshMetadata(
  docsPath: string,
  args: { id: string },
) {
  const docId = decodeDocId(args?.id);
  assertNotSuperSeeded(docsPath, docId);
  const sourceRoot = resolveSourceRoot(docsPath);
  const src = sourceCommitForMetadata(docsPath, sourceRoot);
  const entries = getDocEntries(docsPath, docId).map((e) => {
    const abs = path.resolve(sourceRoot, e.path);
    if (!fs.existsSync(abs)) return e; // keep stored hash + commit, still "missing"
    const fresh = sha256File(abs);
    return fresh ? buildEntry(e.path, fresh, src) : e;
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
  assertNotSuperSeeded(docsPath, docId);
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
  const entry: MetadataEntry = buildEntry(rel, hash, sourceCommitForMetadata(docsPath, sourceRoot));
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
  assertNotSuperSeeded(docsPath, docId);
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

export function toolListAdrsBelowAccuracy(docsPath: string) {
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
    if (!filePath) continue;
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      if (!isAdrDocument(doc, decodedId, content)) continue;
      const status = getFrontmatterField(content, "status");
      if (status && status.trim().toLowerCase() === "superseeded") continue;
    } catch {
      continue;
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
