import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";

interface Annotation {
  id: string;
  selectedText: string;
  contextBefore: string;
  contextAfter: string;
  note: string;
  createdAt: string;
}

type AnnotationsStore = Record<string, Annotation[]>;

function annotationsPath(docsPath: string): string {
  return path.join(docsPath, ".annotations.json");
}

function readAnnotations(docsPath: string): AnnotationsStore {
  const p = annotationsPath(docsPath);
  if (!fs.existsSync(p)) return {};
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {
    return {};
  }
}

function writeAnnotations(docsPath: string, store: AnnotationsStore): void {
  fs.writeFileSync(annotationsPath(docsPath), JSON.stringify(store, null, 2), "utf-8");
}

export function annotationsRouter(docsPath: string): Router {
  const router = Router();

  // GET /api/annotations  → { [docId]: count }
  router.get("/", (_req: Request, res: Response) => {
    const store = readAnnotations(docsPath);
    const counts: Record<string, number> = {};
    for (const [docId, arr] of Object.entries(store)) {
      if (Array.isArray(arr) && arr.length > 0) counts[docId] = arr.length;
    }
    res.json(counts);
  });

  // GET /api/annotations/:docId
  router.get("/:docId", (req: Request, res: Response) => {
    const docId = decodeURIComponent(req.params.docId as string);
    const store = readAnnotations(docsPath);
    res.json(store[docId] || []);
  });

  // POST /api/annotations/:docId
  router.post("/:docId", (req: Request, res: Response) => {
    const docId = decodeURIComponent(req.params.docId as string);
    const { selectedText, contextBefore, contextAfter, note } = req.body as {
      selectedText?: string;
      contextBefore?: string;
      contextAfter?: string;
      note?: string;
    };

    if (!selectedText || !note) {
      return res.status(400).json({ error: "selectedText and note are required" });
    }

    const annotation: Annotation = {
      id: crypto.randomUUID(),
      selectedText,
      contextBefore: contextBefore || "",
      contextAfter: contextAfter || "",
      note,
      createdAt: new Date().toISOString(),
    };

    const store = readAnnotations(docsPath);
    if (!store[docId]) store[docId] = [];
    store[docId].push(annotation);
    writeAnnotations(docsPath, store);

    res.json(annotation);
  });

  // DELETE /api/annotations/:docId/:id
  router.delete("/:docId/:id", (req: Request, res: Response) => {
    const docId = decodeURIComponent(req.params.docId as string);
    const id = req.params.id as string;

    const store = readAnnotations(docsPath);
    if (!store[docId]) return res.status(404).json({ error: "Not found" });

    store[docId] = store[docId].filter((a) => a.id !== id);
    if (store[docId].length === 0) delete store[docId];
    writeAnnotations(docsPath, store);

    res.json({ ok: true });
  });

  return router;
}
