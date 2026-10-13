// Moves a document or a folder inside the docs tree, keeping the folder
// manifests (`liv-doc-main.md`) and the doc-keyed stores in step. A doc id is
// its relative path without `.md`, so a move changes the ids of the document,
// or of every document under a moved folder.
import fs from "node:fs";
import path from "node:path";
import { readConfig, writeConfig } from "./config";
import { isListedDir, isListedDocFile } from "./explorerEntries";
import {
  appendToManifestOrder,
  isManifestWritable,
  removeFromManifest,
  setManifestOrder,
} from "./folderManifest";
import { orderedEntryNames } from "./folderTree";
import { readMetadataStore, writeMetadataStore } from "./metadata";
import { isReservedOkfFile } from "./okf";

/** Folders at the docs root that hold assets, never documents. */
export const RESERVED_ROOT_FOLDERS = new Set(["files", "images"]);

export class TreeMoveError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface TreeMoveRequest {
  /** POSIX path of the entry to move, relative to the docs folder. */
  source: string;
  /** POSIX path of the destination folder; "" is the docs root. */
  targetFolder: string;
  /** Position of the entry in the destination folder once moved; past the end appends. */
  index: number;
}

export interface TreeMoveResult {
  path: string;
  /** New document id (documents only), same as GET /api/tree. */
  id?: string;
}

function toPosix(value: string): string {
  return value.split(path.sep).join("/");
}

function insideRoot(root: string, abs: string): boolean {
  const rel = path.relative(root, abs);
  return !rel.startsWith("..") && !path.isAbsolute(rel);
}

function remapId(id: string, from: string, to: string, isFolder: boolean): string | null {
  if (id === from) return to;
  if (isFolder && id.startsWith(`${from}/`)) return to + id.slice(from.length);
  return null;
}

function remapKeys<T>(store: Record<string, T>, from: string, to: string, isFolder: boolean): boolean {
  let changed = false;
  for (const key of Object.keys(store)) {
    const next = remapId(key, from, to, isFolder);
    if (next === null) continue;
    store[next] = store[key];
    delete store[key];
    changed = true;
  }
  return changed;
}

/**
 * Migrates the doc ids `from` → `to` (and, for a folder, every id below it) in
 * `.metadata.json`, `.annotations.json` and the favorites of `.living-doc.json`.
 */
export function migrateDocIds(docsPath: string, from: string, to: string, isFolder: boolean): void {
  const metadata = readMetadataStore(docsPath);
  if (remapKeys(metadata, from, to, isFolder)) writeMetadataStore(docsPath, metadata);

  const annPath = path.join(docsPath, ".annotations.json");
  if (fs.existsSync(annPath)) {
    try {
      const store = JSON.parse(fs.readFileSync(annPath, "utf-8"));
      if (store && typeof store === "object" && remapKeys(store, from, to, isFolder)) {
        fs.writeFileSync(annPath, JSON.stringify(store, null, 2), "utf-8");
      }
    } catch {
      /* non-fatal */
    }
  }

  // Favorites keep the URL-encoded id served to the frontend.
  const { favorites } = readConfig(docsPath);
  let favoritesChanged = false;
  const nextFavorites = favorites.map((fav) => {
    const next = remapId(decodeURIComponent(fav.id), from, to, isFolder);
    if (next === null) return fav;
    favoritesChanged = true;
    return { ...fav, id: encodeURIComponent(next) };
  });
  if (favoritesChanged) writeConfig(docsPath, { favorites: nextFavorites });
}

/**
 * Moves `absSource` into the existing folder `absTargetDir`. With an `index`,
 * the destination manifest `order` is rewritten with the entry at that
 * position; without one, the entry is appended like a new entry. Inside the
 * same folder only the manifest changes. Returns the new POSIX relative path.
 */
export function relocateEntry(docsPath: string, absSource: string, absTargetDir: string, index?: number): string {
  const sourceDir = path.dirname(absSource);
  const name = path.basename(absSource);
  const insertAt = (names: string[]) => {
    const rest = names.filter((n) => n !== name);
    rest.splice(Math.min(index ?? rest.length, rest.length), 0, name);
    return rest;
  };

  if (!isManifestWritable(sourceDir) || !isManifestWritable(absTargetDir)) {
    throw new TreeMoveError(409, "A folder liv-doc-main.md has an invalid frontmatter");
  }

  if (sourceDir === absTargetDir) {
    if (index !== undefined) setManifestOrder(absTargetDir, insertAt(orderedEntryNames(absTargetDir)));
    return toPosix(path.relative(docsPath, absSource));
  }

  const targetOrder = index === undefined ? null : insertAt(orderedEntryNames(absTargetDir));
  const absTarget = path.join(absTargetDir, name);
  const isFolder = fs.statSync(absSource).isDirectory();
  fs.renameSync(absSource, absTarget);

  removeFromManifest(sourceDir, name);
  if (targetOrder) setManifestOrder(absTargetDir, targetOrder);
  else appendToManifestOrder(absTargetDir, name);

  const fromRel = toPosix(path.relative(docsPath, absSource));
  const toRel = toPosix(path.relative(docsPath, absTarget));
  const strip = (rel: string) => (isFolder ? rel : rel.slice(0, -3));
  migrateDocIds(docsPath, strip(fromRel), strip(toRel), isFolder);
  return toRel;
}

/** POST /api/tree/move: validates the request, then relocates the entry. */
export function moveTreeEntry(docsPath: string, request: TreeMoveRequest): TreeMoveResult {
  const { source, targetFolder, index } = request;
  if (!Number.isInteger(index) || index < 0) throw new TreeMoveError(400, "index must be a non-negative integer");

  const root = path.resolve(docsPath);
  const absSource = path.resolve(root, source);
  const absTargetDir = path.resolve(root, targetFolder);
  if (absSource === root || !insideRoot(root, absSource) || !insideRoot(root, absTargetDir)) {
    throw new TreeMoveError(403, "Access denied");
  }

  const name = path.basename(absSource);
  if (isReservedOkfFile(name)) throw new TreeMoveError(400, "Reserved files cannot be moved");
  let sourceStat: fs.Stats;
  try {
    sourceStat = fs.statSync(absSource);
  } catch {
    throw new TreeMoveError(404, "Entry not found");
  }
  const isFolder = sourceStat.isDirectory();
  const listed = isFolder ? isListedDir(name) : sourceStat.isFile() && isListedDocFile(name);
  if (!listed) throw new TreeMoveError(400, "This entry is not shown in the explorer");
  if (isFolder && path.dirname(absSource) === root && RESERVED_ROOT_FOLDERS.has(name)) {
    throw new TreeMoveError(400, `"${name}" is a reserved folder`);
  }
  const targetFirstSegment = path.relative(root, absTargetDir).split(path.sep)[0];
  if (RESERVED_ROOT_FOLDERS.has(targetFirstSegment)) {
    throw new TreeMoveError(400, `"${targetFirstSegment}" is a reserved folder`);
  }
  if (isFolder && (absTargetDir === absSource || absTargetDir.startsWith(absSource + path.sep))) {
    throw new TreeMoveError(400, "A folder cannot be moved into itself");
  }
  if (!fs.existsSync(absTargetDir) || !fs.statSync(absTargetDir).isDirectory()) {
    throw new TreeMoveError(404, "Target folder not found");
  }
  if (path.dirname(absSource) !== absTargetDir && fs.existsSync(path.join(absTargetDir, name))) {
    throw new TreeMoveError(409, "An entry with this name already exists in the target folder");
  }

  const newPath = relocateEntry(docsPath, absSource, absTargetDir, index);
  return isFolder ? { path: newPath } : { path: newPath, id: encodeURIComponent(newPath.slice(0, -3)) };
}
