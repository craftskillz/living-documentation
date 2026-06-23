import { Router, Request, Response } from "express";
import path from "path";
import fs from "fs";
import {
  getDocEntries,
  setDocEntries,
  resolveSourceRoot,
  assertUnderSourceRoot,
  buildReport,
  sourceCommitForMetadata,
  MetadataEntry,
} from "../lib/metadata";
import { sha256File } from "../lib/hash";
import { SourceCommit } from "../lib/git";
import { assertNotSuperSeeded, DocumentSuperSeededError } from "../lib/status";

// Builds a fresh entry, attaching the source commit (and dirty flag) when known.
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

// SuperSeeded documents are read-only as far as metadata is concerned: an ADR
// that has been replaced should keep the source bindings that prove what the
// original decision described, frozen at the moment of supersession. The guard
// itself lives in `lib/status.ts` so MCP tools share the same check.
function rejectIfSuperSeeded(
  docsPath: string,
  docId: string,
  res: Response,
): boolean {
  try {
    assertNotSuperSeeded(docsPath, docId);
    return false;
  } catch (err) {
    if (err instanceof DocumentSuperSeededError) {
      res.status(403).json({ error: err.message });
      return true;
    }
    throw err;
  }
}

export function metadataRouter(docsPath: string): Router {
  const router = Router();

  // GET /api/metadata/:docId → { items, total, unchanged, modified, missing, accuracy }
  router.get("/:docId", (req: Request, res: Response) => {
    const docId = decodeURIComponent(req.params.docId as string);
    try {
      const sourceRoot = resolveSourceRoot(docsPath);
      const entries = getDocEntries(docsPath, docId);
      const report = buildReport(entries, sourceRoot);
      res.json(report);
    } catch (err) {
      res
        .status(500)
        .json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // POST /api/metadata/:docId  body: { path }
  router.post("/:docId", (req: Request, res: Response) => {
    const docId = decodeURIComponent(req.params.docId as string);
    if (rejectIfSuperSeeded(docsPath, docId, res)) return;
    const { path: rawPath } = req.body as { path?: string };
    if (!rawPath || typeof rawPath !== "string") {
      return res.status(400).json({ error: "path is required" });
    }
    try {
      const sourceRoot = resolveSourceRoot(docsPath);
      const rel = assertUnderSourceRoot(rawPath, sourceRoot);
      const abs = path.resolve(sourceRoot, rel);
      if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
        return res.status(400).json({ error: "Not a readable file" });
      }
      const hash = sha256File(abs);
      if (!hash) return res.status(500).json({ error: "Failed to hash file" });

      const entries = getDocEntries(docsPath, docId);
      // replace if path already exists, else append
      const idx = entries.findIndex((e) => e.path === rel);
      const entry: MetadataEntry = buildEntry(rel, hash, sourceCommitForMetadata(docsPath, sourceRoot));
      if (idx >= 0) entries[idx] = entry;
      else entries.push(entry);
      setDocEntries(docsPath, docId, entries);

      const report = buildReport(entries, sourceRoot);
      res.json(report);
    } catch (err) {
      res
        .status(400)
        .json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // DELETE /api/metadata/:docId  body: { path }
  router.delete("/:docId", (req: Request, res: Response) => {
    const docId = decodeURIComponent(req.params.docId as string);
    if (rejectIfSuperSeeded(docsPath, docId, res)) return;
    const { path: rel } = req.body as { path?: string };
    if (!rel) return res.status(400).json({ error: "path is required" });
    try {
      const sourceRoot = resolveSourceRoot(docsPath);
      const entries = getDocEntries(docsPath, docId).filter(
        (e) => e.path !== rel,
      );
      setDocEntries(docsPath, docId, entries);
      const report = buildReport(entries, sourceRoot);
      res.json(report);
    } catch (err) {
      res
        .status(500)
        .json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // POST /api/metadata/:docId/refresh → recompute stored hashes from current file state
  router.post("/:docId/refresh", (req: Request, res: Response) => {
    const docId = decodeURIComponent(req.params.docId as string);
    if (rejectIfSuperSeeded(docsPath, docId, res)) return;
    try {
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
      res.json(report);
    } catch (err) {
      res
        .status(500)
        .json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  return router;
}
