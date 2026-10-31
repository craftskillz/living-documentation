import { Router, type Request, type Response } from "express";
import { gitDocumentVersions, gitStatus, type GitLineRange } from "../lib/git-integration";

const LINE_RANGE_RE = /^(\d+),(\d+)$/;

/** `lines=start,end` (1-based, inclusive); undefined when malformed. */
function parseLineRange(raw: unknown): GitLineRange | null | undefined {
  if (raw === undefined) return null;
  const match = typeof raw === "string" ? LINE_RANGE_RE.exec(raw) : null;
  if (!match) return undefined;
  const start = Number(match[1]);
  const end = Number(match[2]);
  return start >= 1 && end >= start ? { start, end } : undefined;
}

export function gitRouter(docsPath: string): Router {
  const router = Router();

  router.get("/status", (_req: Request, res: Response) => {
    res.json(gitStatus(docsPath));
  });

  router.get("/document-versions", (req: Request, res: Response) => {
    const rawDocumentId = typeof req.query.documentId === "string" ? req.query.documentId : "";
    let documentId = rawDocumentId;
    try {
      documentId = decodeURIComponent(rawDocumentId);
    } catch {
      documentId = rawDocumentId;
    }
    if (!documentId.trim()) {
      return res.status(400).json({ error: "documentId is required" });
    }

    const rawSinceDays = typeof req.query.sinceDays === "string"
      ? Number.parseInt(req.query.sinceDays, 10)
      : undefined;
    const baseRef = typeof req.query.baseRef === "string" ? req.query.baseRef : undefined;
    const lineRange = parseLineRange(req.query.lines);
    if (lineRange === undefined) {
      return res.status(400).json({ error: "lines must be start,end with 1 <= start <= end" });
    }
    const result = gitDocumentVersions(docsPath, documentId, rawSinceDays, baseRef, lineRange);
    if (!result.ok) {
      return res.status(400).json(result);
    }
    return res.json(result);
  });

  return router;
}
