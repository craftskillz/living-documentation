import fs from "node:fs";
import path from "node:path";
import { Router, type Request, type Response } from "express";
import { isListedDocFile, isListedDir } from "../lib/explorerEntries";
import { isReservedOkfFile } from "../lib/okf";
import { setManifestHidden } from "../lib/folderManifest";
import { buildFolderTree } from "../lib/folderTree";
import { deleteTreeFolder, moveTreeEntry, renameTreeEntry, TreeMoveError } from "../lib/treeMove";

export function treeRouter(docsPath: string): Router {
  const router = Router();

  // GET /api/tree — ordered explorer tree (folders, then Markdown documents).
  router.get("/", (_req: Request, res: Response) => {
    res.json(buildFolderTree(docsPath));
  });

  // PUT /api/tree/hidden — { path, hidden }: hides or shows an entry through
  // the `hidden` list of its parent folder manifest.
  router.put("/hidden", (req: Request, res: Response) => {
    const { path: relPath, hidden } = req.body as { path?: unknown; hidden?: unknown };
    if (typeof relPath !== "string" || !relPath.trim() || typeof hidden !== "boolean") {
      return res.status(400).json({ error: "path and hidden (boolean) are required" });
    }
    const root = path.resolve(docsPath);
    const abs = path.resolve(root, relPath);
    const rel = path.relative(root, abs);
    if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) {
      return res.status(400).json({ error: "path must be inside the docs folder" });
    }
    const name = path.basename(abs);
    if (isReservedOkfFile(name)) return res.status(400).json({ error: "Reserved files cannot be hidden" });
    let stat: fs.Stats;
    try {
      stat = fs.statSync(abs);
    } catch {
      return res.status(404).json({ error: "Entry not found" });
    }
    const listed = stat.isDirectory() ? isListedDir(name) : stat.isFile() && isListedDocFile(name);
    if (!listed) return res.status(400).json({ error: "This entry is not shown in the explorer" });
    if (!setManifestHidden(path.dirname(abs), name, hidden)) {
      return res.status(409).json({ error: "Parent liv-doc-main.md has an invalid frontmatter" });
    }
    res.json({ path: rel.split(path.sep).join("/"), hidden });
  });

  // POST /api/tree/move — { source, targetFolder, index }: reorders an entry
  // in its folder or moves it, with its doc ids, to another folder.
  router.post("/move", (req: Request, res: Response) => {
    const { source, targetFolder, index } = req.body as { source?: unknown; targetFolder?: unknown; index?: unknown };
    if (typeof source !== "string" || !source.trim() || typeof targetFolder !== "string" || typeof index !== "number") {
      return res.status(400).json({ error: "source, targetFolder and index (number) are required" });
    }
    try {
      res.json(moveTreeEntry(docsPath, { source, targetFolder, index }));
    } catch (err) {
      if (err instanceof TreeMoveError) return res.status(err.status).json({ error: err.message });
      res.status(500).json({ error: "Failed to move entry" });
    }
  });

  // PUT /api/tree/rename — { path, newName }: renames an entry in place; doc
  // ids, manifest position and the links of every document follow.
  router.put("/rename", (req: Request, res: Response) => {
    const { path: relPath, newName } = req.body as { path?: unknown; newName?: unknown };
    if (typeof relPath !== "string" || !relPath.trim() || typeof newName !== "string") {
      return res.status(400).json({ error: "path and newName are required" });
    }
    try {
      res.json(renameTreeEntry(docsPath, { path: relPath, newName }));
    } catch (err) {
      if (err instanceof TreeMoveError) return res.status(err.status).json({ error: err.message });
      res.status(500).json({ error: "Failed to rename entry" });
    }
  });

  // DELETE /api/tree — { path }: deletes a folder and everything it contains.
  router.delete("/", (req: Request, res: Response) => {
    const { path: relPath } = (req.body ?? {}) as { path?: unknown };
    if (typeof relPath !== "string" || !relPath.trim()) {
      return res.status(400).json({ error: "path is required" });
    }
    try {
      res.json(deleteTreeFolder(docsPath, relPath));
    } catch (err) {
      if (err instanceof TreeMoveError) return res.status(err.status).json({ error: err.message });
      res.status(500).json({ error: "Failed to delete folder" });
    }
  });

  return router;
}
