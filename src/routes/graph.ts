import { Router, type Request, type Response } from "express";
import { buildConceptGraph } from "../lib/okf/graph";

/**
 * Concept graph — a read-only view of the bundle's concepts (nodes) and the real
 * in-bundle links between them (edges). Derived on each request; the bundle is
 * small enough that caching is unnecessary.
 */
export function graphRouter(docsPath: string): Router {
  const router = Router();

  router.get("/", (_req: Request, res: Response) => {
    try {
      res.json(buildConceptGraph(docsPath));
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  return router;
}
