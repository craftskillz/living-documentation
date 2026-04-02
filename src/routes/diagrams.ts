import { Router } from 'express';
import fs from 'fs';
import path from 'path';

interface DiagramNode {
  id: string;
  label: string;
  shapeType: string;
  colorKey: string;
  x?: number;
  y?: number;
  [key: string]: unknown;
}

interface DiagramEdge {
  id: string;
  from: string;
  to: string;
  [key: string]: unknown;
}

interface Diagram {
  id: string;
  title: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

function diagramsFilePath(docsPath: string): string {
  return path.join(docsPath, '.diagrams.json');
}

function loadDiagrams(docsPath: string): Diagram[] {
  const filePath = diagramsFilePath(docsPath);
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return [];
  }
}

function saveDiagrams(docsPath: string, diagrams: Diagram[]): void {
  fs.writeFileSync(diagramsFilePath(docsPath), JSON.stringify(diagrams, null, 2), 'utf-8');
}

export function diagramsRouter(docsPath: string): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    const diagrams = loadDiagrams(docsPath);
    res.json(diagrams.map(({ id, title }) => ({ id, title })));
  });

  router.get('/:id', (req, res) => {
    const diagrams = loadDiagrams(docsPath);
    const diagram = diagrams.find(d => d.id === req.params.id);
    if (!diagram) return res.status(404).json({ error: 'Not found' });
    res.json(diagram);
  });

  router.put('/:id', (req, res) => {
    const diagrams = loadDiagrams(docsPath);
    const { title, nodes, edges } = req.body;
    const diagram: Diagram = {
      id: req.params.id,
      title: typeof title === 'string' ? title : 'Sans titre',
      nodes: Array.isArray(nodes) ? nodes : [],
      edges: Array.isArray(edges) ? edges : [],
    };
    const idx = diagrams.findIndex(d => d.id === req.params.id);
    if (idx >= 0) {
      diagrams[idx] = diagram;
    } else {
      diagrams.push(diagram);
    }
    saveDiagrams(docsPath, diagrams);
    res.json(diagram);
  });

  router.delete('/:id', (req, res) => {
    const diagrams = loadDiagrams(docsPath);
    saveDiagrams(docsPath, diagrams.filter(d => d.id !== req.params.id));
    res.json({ ok: true });
  });

  return router;
}
