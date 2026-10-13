import fs from "node:fs";
import path from "node:path";
import { Router, type Request, type Response } from "express";
import { isListedDocFile, isListedDir } from "../lib/explorerEntries";
import { isReservedOkfFile } from "../lib/okf";
import { setManifestHidden } from "../lib/folderManifest";
import { buildFolderTree } from "../lib/folderTree";

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

  return router;
}
