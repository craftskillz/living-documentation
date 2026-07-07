import { Router, type Request, type Response } from "express";
import { gitDocumentVersions, gitStatus } from "../lib/git-integration";

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
    const result = gitDocumentVersions(docsPath, documentId, rawSinceDays, baseRef);
    if (!result.ok) {
      return res.status(400).json(result);
    }
    return res.json(result);
  });

  return router;
}
