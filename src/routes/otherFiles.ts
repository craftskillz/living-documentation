// Non-Markdown files of the documentation explorer: preview in the central area,
// or opening with the application associated by the OS.
import { Router, type Request, type Response } from "express";
import { isMediaFile, previewFile } from "../lib/filePreview";
import { isLocalRequest } from "../lib/localRequest";
import { isExecutableFile, openWithOs, resolveOtherFile } from "../lib/otherFiles";

// An SVG opened directly must not run as a page of the application.
const RAW_FILE_HEADERS = {
  "Content-Security-Policy": "sandbox; default-src 'none'; img-src data:; style-src 'unsafe-inline'",
  "X-Content-Type-Options": "nosniff",
};

export function otherFilesRouter(docsPath: string): Router {
  const router = Router();

  router.use((req: Request, res: Response, next) => {
    const local = isLocalRequest({
      remoteAddress: req.socket.remoteAddress,
      host: req.headers.host,
      origin: req.headers.origin,
    });
    if (local) next();
    else res.status(403).json({ error: "not_local" });
  });

  const queryPath = (req: Request) => (typeof req.query.path === "string" ? req.query.path : "");

  router.get("/content", (req: Request, res: Response) => {
    const relPath = queryPath(req);
    const abs = resolveOtherFile(docsPath, relPath);
    if (!abs) return res.status(404).json({ error: "not_found" });
    res.json(previewFile(abs, `/api/other-files/raw?path=${encodeURIComponent(relPath)}`));
  });

  router.get("/raw", (req: Request, res: Response) => {
    const abs = resolveOtherFile(docsPath, queryPath(req));
    if (!abs) return res.status(404).json({ error: "not_found" });
    if (!isMediaFile(abs)) return res.status(415).json({ error: "not_media" });
    res.sendFile(abs, { dotfiles: "allow", headers: RAW_FILE_HEADERS });
  });

  router.post("/open", async (req: Request, res: Response) => {
    const relPath = (req.body as { path?: unknown } | undefined)?.path;
    const abs = typeof relPath === "string" ? resolveOtherFile(docsPath, relPath) : null;
    if (!abs) return res.status(404).json({ error: "not_found" });
    if (isExecutableFile(abs)) return res.status(403).json({ error: "executable" });
    // Text and media files are shown by the application, never launched: this also
    // keeps out the scripts an OS would run, whatever their extension.
    if (previewFile(abs, "").type !== "binary") return res.status(400).json({ error: "not_binary" });
    try {
      await openWithOs(abs);
      res.json({ ok: true });
    } catch {
      res.status(502).json({ error: "open_failed" });
    }
  });

  return router;
}
