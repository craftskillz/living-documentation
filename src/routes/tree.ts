import { Router, type Request, type Response } from "express";
import { buildFolderTree } from "../lib/folderTree";

export function treeRouter(docsPath: string): Router {
  const router = Router();

  // GET /api/tree — ordered explorer tree (folders, then Markdown documents).
  router.get("/", (_req: Request, res: Response) => {
    res.json(buildFolderTree(docsPath));
  });

  return router;
}
