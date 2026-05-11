import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import { resolveSourceRoot } from "../lib/metadata";

// Directories that are never useful to browse for source selection
const IGNORED_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
  "out",
  "coverage",
  ".git",
  ".next",
  ".nuxt",
  ".cache",
  ".turbo",
  ".svelte-kit",
  "target",
  "bin",
  "obj",
  "__pycache__",
  ".venv",
  "venv",
]);

function isIgnoredDir(name: string): boolean {
  if (IGNORED_DIRS.has(name)) return true;
  if (name.startsWith(".") && name !== ".github") return true;
  return false;
}

export function browseSourceRouter(docsPath: string): Router {
  const router = Router();

  // GET /api/browse-source?path=<relative path under sourceRoot>
  router.get("/", (req: Request, res: Response) => {
    try {
      const root = resolveSourceRoot(docsPath);
      const rel = (req.query.path as string) || "";
      const current = path.resolve(root, rel);
      if (
        !(
          current === root || current.startsWith(path.resolve(root) + path.sep)
        )
      ) {
        return res.status(400).json({ error: "Path escapes sourceRoot" });
      }
      if (!fs.existsSync(current) || !fs.statSync(current).isDirectory()) {
        return res.status(400).json({ error: "Not a directory" });
      }
      const entries = fs.readdirSync(current, { withFileTypes: true });

      const dirs = entries
        .filter((e) => e.isDirectory() && !isIgnoredDir(e.name))
        .map((e) => ({
          name: e.name,
          path: path.relative(root, path.join(current, e.name)),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      const files = entries
        .filter((e) => e.isFile() && !e.name.startsWith("."))
        .map((e) => ({
          name: e.name,
          path: path.relative(root, path.join(current, e.name)),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      const currentRel = path.relative(root, current);
      const parent =
        current === root ? null : path.relative(root, path.dirname(current));

      res.json({ sourceRoot: root, current: currentRel, parent, dirs, files });
    } catch (err) {
      res
        .status(400)
        .json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  return router;
}
