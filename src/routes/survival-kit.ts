import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";

/**
 * Survival Kit — an independent dashboard module (tasks / notes / links).
 *
 * Persisted as a single JSON blob in `<docsPath>/.survival-kit.json`. The whole
 * state is read and written at once (the dataset is small and entirely user-owned),
 * which keeps the client store trivial: load on mount, PUT the full state on change.
 */

interface SkTask {
  id: number;
  text: string;
  priority: "normal" | "urgent" | "later";
  done: boolean;
}

type SkBloc =
  | { type: "b" | "p" | "pre"; content: string }
  | { type: "ul"; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] };

interface SkNote {
  id: number;
  theme: string;
  titre: string;
  blocs: SkBloc[];
}

interface SkLink {
  nom: string;
  desc: string;
  url: string;
}

interface SkCategory {
  theme: string;
  titre: string;
  liens: SkLink[];
}

interface SkState {
  tasks: SkTask[];
  notes: SkNote[];
  links: SkCategory[];
}

const EMPTY_STATE: SkState = { tasks: [], notes: [], links: [] };

function survivalKitPath(docsPath: string): string {
  return path.join(docsPath, ".survival-kit.json");
}

function readState(docsPath: string): SkState {
  const p = survivalKitPath(docsPath);
  if (!fs.existsSync(p)) return { ...EMPTY_STATE };
  try {
    const parsed = JSON.parse(fs.readFileSync(p, "utf-8")) as Partial<SkState>;
    return {
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      notes: Array.isArray(parsed.notes) ? parsed.notes : [],
      links: Array.isArray(parsed.links) ? parsed.links : [],
    };
  } catch {
    return { ...EMPTY_STATE };
  }
}

function writeState(docsPath: string, state: SkState): void {
  fs.writeFileSync(survivalKitPath(docsPath), JSON.stringify(state, null, 2), "utf-8");
}

export function survivalKitRouter(docsPath: string): Router {
  const router = Router();

  // GET /api/survival-kit → full state
  router.get("/", (_req: Request, res: Response) => {
    res.json(readState(docsPath));
  });

  // PUT /api/survival-kit → replace full state
  router.put("/", (req: Request, res: Response) => {
    const body = req.body as Partial<SkState>;
    if (
      !body ||
      !Array.isArray(body.tasks) ||
      !Array.isArray(body.notes) ||
      !Array.isArray(body.links)
    ) {
      return res.status(400).json({ error: "tasks, notes and links arrays are required" });
    }
    const state: SkState = {
      tasks: body.tasks as SkTask[],
      notes: body.notes as SkNote[],
      links: body.links as SkCategory[],
    };
    writeState(docsPath, state);
    res.json({ ok: true });
  });

  return router;
}
