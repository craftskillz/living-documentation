import { Router } from "express";
import fs from "node:fs";
import path from "node:path";

interface ShapeAnchor {
  id: string;
  x: number;
  y: number;
}

interface CustomShape {
  id: string;
  name: string;
  imageSrc: string;
  width: number;
  height: number;
  labelPlacement: "center" | "below" | "above" | "right" | "left";
  showInDiagram: boolean;
  anchors: ShapeAnchor[];
}

interface ShapeLibrary {
  id: string;
  name: string;
  shapes: CustomShape[];
}

interface ShapeLibraryStore {
  libraries: ShapeLibrary[];
}

const FILE_NAME = ".shape-libraries.json";
const CUSTOM_SHAPE_DEFAULT_SIZE = 65;
const CUSTOM_SHAPE_MIN_SIZE = 16;
const CUSTOM_SHAPE_MAX_SIZE = 1200;

function filePath(docsPath: string): string {
  return path.join(docsPath, FILE_NAME);
}

function loadStore(docsPath: string): ShapeLibraryStore {
  const fp = filePath(docsPath);
  if (!fs.existsSync(fp)) return { libraries: [] };
  try {
    const raw = JSON.parse(fs.readFileSync(fp, "utf-8"));
    return sanitizeStore(raw);
  } catch {
    return { libraries: [] };
  }
}

function saveStore(docsPath: string, store: ShapeLibraryStore): void {
  fs.writeFileSync(
    filePath(docsPath),
    JSON.stringify(sanitizeStore(store), null, 2),
    "utf-8",
  );
}

function clamp01(n: unknown): number {
  return Math.max(
    0,
    Math.min(1, typeof n === "number" && Number.isFinite(n) ? n : 0),
  );
}

function safeId(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const clean = value
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .slice(0, 80);
  return clean || fallback;
}

function safeName(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const clean = value.trim().slice(0, 120);
  return clean || fallback;
}

function safeLabelPlacement(value: unknown): CustomShape["labelPlacement"] {
  return ["center", "below", "above", "right", "left"].includes(String(value))
    ? (value as CustomShape["labelPlacement"])
    : "below";
}

function safeDimension(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(
        CUSTOM_SHAPE_MIN_SIZE,
        Math.min(CUSTOM_SHAPE_MAX_SIZE, Math.round(value)),
      )
    : CUSTOM_SHAPE_DEFAULT_SIZE;
}

function sanitizeStore(raw: unknown): ShapeLibraryStore {
  const obj =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const rawLibraries = Array.isArray(obj.libraries) ? obj.libraries : [];
  const libraries = rawLibraries.map((lib, libIndex): ShapeLibrary => {
    const libObj =
      lib && typeof lib === "object" ? (lib as Record<string, unknown>) : {};
    const shapesRaw = Array.isArray(libObj.shapes) ? libObj.shapes : [];
    return {
      id: safeId(libObj.id, `lib-${libIndex + 1}`),
      name: safeName(libObj.name, `Library ${libIndex + 1}`),
      shapes: shapesRaw
        .map((shape, shapeIndex): CustomShape => {
          const shapeObj =
            shape && typeof shape === "object"
              ? (shape as Record<string, unknown>)
              : {};
          const anchorsRaw = Array.isArray(shapeObj.anchors)
            ? shapeObj.anchors
            : [];
          const width = safeDimension(shapeObj.width);
          const height = safeDimension(shapeObj.height);
          return {
            id: safeId(shapeObj.id, `shape-${shapeIndex + 1}`),
            name: safeName(shapeObj.name, `Shape ${shapeIndex + 1}`),
            imageSrc:
              typeof shapeObj.imageSrc === "string" ? shapeObj.imageSrc : "",
            width,
            height,
            labelPlacement: safeLabelPlacement(shapeObj.labelPlacement),
            showInDiagram: shapeObj.showInDiagram !== false,
            anchors: anchorsRaw
              .map((anchor, anchorIndex): ShapeAnchor => {
                const anchorObj =
                  anchor && typeof anchor === "object"
                    ? (anchor as Record<string, unknown>)
                    : {};
                return {
                  id: safeId(anchorObj.id, `p${anchorIndex + 1}`),
                  x: clamp01(anchorObj.x),
                  y: clamp01(anchorObj.y),
                };
              })
              .filter((anchor) => anchor.id),
          };
        })
        .filter((shape) => shape.imageSrc),
    };
  });
  return { libraries };
}

export function shapeLibrariesRouter(docsPath: string): Router {
  const router = Router();

  router.get("/", (_req, res) => {
    res.json(loadStore(docsPath));
  });

  router.put("/", (req, res) => {
    const store = sanitizeStore(req.body);
    saveStore(docsPath, store);
    res.json(store);
  });

  return router;
}
