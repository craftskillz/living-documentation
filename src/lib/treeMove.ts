// Moves or renames a document or a folder inside the docs tree, keeping the
// folder manifests (`liv-doc-main.md`), the doc-keyed stores, the links of
// every document and the OKF `index.md` files in step. A doc id is its
// relative path without `.md`, so a move changes the ids of the document, or
// of every document under a moved folder.
import fs from "node:fs";
import path from "node:path";
import { readConfig, writeConfig } from "./config";
import { isListedDir, isListedDocFile, isSymlink } from "./explorerEntries";
import {
  appendToManifestOrder,
  isManifestWritable,
  readFolderManifest,
  removeFromManifest,
  renameInManifest,
  setManifestOrder,
} from "./folderManifest";
import { orderedEntryNames } from "./folderTree";
import {
  applyLinkRewrites,
  entryMapper,
  entryMatcher,
  migrateSourcePaths,
  planLinkRewrites,
  unlinkDeletedTargets,
} from "./linkRewrite";
import { readMetadataStore, writeMetadataStore } from "./metadata";
import { isReservedOkfFile } from "./okf";
import { generateOkfIndexFiles } from "./okf/index-generator";

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

export interface TreeRenameRequest {
  /** POSIX path of the entry to rename, relative to the docs folder. */
  path: string;
  /** New file or folder name; `.md` is added to a document name without it. */
  newName: string;
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

  // Diagram edges cite documents as evidence by URL-encoded id, anywhere in the store.
  const diagramsPath = path.join(docsPath, ".diagrams.json");
  if (fs.existsSync(diagramsPath)) {
    try {
      let diagramsChanged = false;
      const store = JSON.parse(fs.readFileSync(diagramsPath, "utf-8"), (key, value) => {
        if (key !== "documentId" || typeof value !== "string") return value;
        const next = remapId(decodeURIComponent(value), from, to, isFolder);
        if (next === null) return value;
        diagramsChanged = true;
        return encodeURIComponent(next);
      });
      if (diagramsChanged) fs.writeFileSync(diagramsPath, JSON.stringify(store, null, 2), "utf-8");
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

function dropKeys<T>(store: Record<string, T>, matches: (id: string) => boolean): boolean {
  const doomed = Object.keys(store).filter(matches);
  for (const key of doomed) delete store[key];
  return doomed.length > 0;
}

/**
 * Drops the doc ids matched by `matches` from `.metadata.json`,
 * `.annotations.json`, the favorites of `.living-doc.json` and the evidence of
 * `.diagrams.json`.
 */
function dropDocIds(docsPath: string, matches: (id: string) => boolean): void {
  const metadata = readMetadataStore(docsPath);
  if (dropKeys(metadata, matches)) writeMetadataStore(docsPath, metadata);

  const annPath = path.join(docsPath, ".annotations.json");
  if (fs.existsSync(annPath)) {
    try {
      const store = JSON.parse(fs.readFileSync(annPath, "utf-8"));
      if (store && typeof store === "object" && dropKeys(store, matches)) {
        fs.writeFileSync(annPath, JSON.stringify(store, null, 2), "utf-8");
      }
    } catch {
      /* non-fatal */
    }
  }

  // Diagram nodes and edges cite documents as evidence by URL-encoded id, anywhere in the store.
  const diagramsPath = path.join(docsPath, ".diagrams.json");
  if (fs.existsSync(diagramsPath)) {
    try {
      let diagramsChanged = false;
      const cited = (item: unknown) =>
        typeof (item as { documentId?: unknown })?.documentId === "string" &&
        matches(decodeURIComponent((item as { documentId: string }).documentId));
      const store = JSON.parse(fs.readFileSync(diagramsPath, "utf-8"), (key, value) => {
        if (key !== "evidence" || !Array.isArray(value) || !value.some(cited)) return value;
        diagramsChanged = true;
        return value.filter((item) => !cited(item));
      });
      if (diagramsChanged) fs.writeFileSync(diagramsPath, JSON.stringify(store, null, 2), "utf-8");
    } catch {
      /* non-fatal */
    }
  }

  const { favorites } = readConfig(docsPath);
  const kept = favorites.filter((fav) => !matches(decodeURIComponent(fav.id)));
  if (kept.length !== favorites.length) writeConfig(docsPath, { favorites: kept });
}

/**
 * Forgets a deleted document (`relPath` ends in `.md`) or folder: the links
 * that pointed at it keep their text, and the doc-keyed stores drop its ids.
 */
export function forgetDeletedEntry(docsPath: string, relPath: string, isFolder: boolean): void {
  unlinkDeletedTargets(docsPath, entryMatcher(relPath, isFolder));
  dropDocIds(docsPath, entryMatcher(isFolder ? relPath : relPath.slice(0, -3), isFolder));
}

/** Regenerates the OKF `index.md` files of a bundle that already has them. */
function refreshOkfIndexes(docsPath: string): void {
  if (fs.existsSync(path.join(docsPath, "index.md"))) generateOkfIndexFiles(docsPath);
}

/**
 * Renames `absFrom` to `absTo` on disk; doc ids, source bindings and the links
 * of every document (incoming, and the relative ones of the moved documents)
 * follow. Returns the new POSIX relative path.
 */
function changeEntryPath(docsPath: string, absFrom: string, absTo: string, isFolder: boolean): string {
  const fromRel = toPosix(path.relative(docsPath, absFrom));
  const toRel = toPosix(path.relative(docsPath, absTo));
  const mapPath = entryMapper(fromRel, toRel, isFolder);
  const rewrites = planLinkRewrites(docsPath, mapPath);
  fs.renameSync(absFrom, absTo);
  const strip = (rel: string) => (isFolder ? rel : rel.slice(0, -3));
  migrateDocIds(docsPath, strip(fromRel), strip(toRel), isFolder);
  migrateSourcePaths(docsPath, mapPath);
  applyLinkRewrites(docsPath, rewrites, mapPath);
  return toRel;
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
    refreshOkfIndexes(docsPath);
    return toPosix(path.relative(docsPath, absSource));
  }

  const targetOrder = index === undefined ? null : insertAt(orderedEntryNames(absTargetDir));
  const isFolder = fs.statSync(absSource).isDirectory();
  const toRel = changeEntryPath(docsPath, absSource, path.join(absTargetDir, name), isFolder);

  removeFromManifest(sourceDir, name);
  if (targetOrder) setManifestOrder(absTargetDir, targetOrder);
  else appendToManifestOrder(absTargetDir, name);
  refreshOkfIndexes(docsPath);
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
  if (isSymlink(absSource)) throw new TreeMoveError(400, "Linked files cannot be moved");
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

/** PUT /api/tree/rename: renames a visible entry in place, keeping its manifest position and state. */
export function renameTreeEntry(docsPath: string, request: TreeRenameRequest): TreeMoveResult {
  const root = path.resolve(docsPath);
  const absSource = path.resolve(root, request.path);
  if (absSource === root || !insideRoot(root, absSource)) throw new TreeMoveError(403, "Access denied");

  const name = path.basename(absSource);
  const parentDir = path.dirname(absSource);
  if (isReservedOkfFile(name)) throw new TreeMoveError(400, "Reserved files cannot be renamed");
  if (isSymlink(absSource)) throw new TreeMoveError(400, "Linked files cannot be renamed");
  let sourceStat: fs.Stats;
  try {
    sourceStat = fs.statSync(absSource);
  } catch {
    throw new TreeMoveError(404, "Entry not found");
  }
  const isFolder = sourceStat.isDirectory();
  const listed = isFolder ? isListedDir(name) : sourceStat.isFile() && isListedDocFile(name);
  if (!listed) throw new TreeMoveError(400, "This entry is not shown in the explorer");
  const atRoot = parentDir === root;
  if (isFolder && atRoot && RESERVED_ROOT_FOLDERS.has(name)) throw new TreeMoveError(400, `"${name}" is a reserved folder`);
  if (readFolderManifest(parentDir).hidden.includes(name)) throw new TreeMoveError(400, "Hidden entries cannot be renamed");

  const trimmed = request.newName.trim();
  const newName = isFolder || trimmed.toLowerCase().endsWith(".md") ? trimmed : `${trimmed}.md`;
  const invalid =
    !trimmed ||
    /[/\\]/.test(trimmed) ||
    trimmed === "." ||
    trimmed === ".." ||
    isReservedOkfFile(newName) ||
    !(isFolder ? isListedDir(newName) : isListedDocFile(newName)) ||
    (isFolder && atRoot && RESERVED_ROOT_FOLDERS.has(newName));
  if (invalid) throw new TreeMoveError(400, "Invalid name");

  const result = (rel: string) => (isFolder ? { path: rel } : { path: rel, id: encodeURIComponent(rel.slice(0, -3)) });
  if (newName === name) return result(toPosix(path.relative(root, absSource)));
  // A case-only rename finds the entry itself on a case-insensitive disk.
  const sameEntry = newName.toLowerCase() === name.toLowerCase();
  if (!sameEntry && fs.existsSync(path.join(parentDir, newName))) {
    throw new TreeMoveError(409, "An entry with this name already exists in this folder");
  }
  if (!isManifestWritable(parentDir)) throw new TreeMoveError(409, "Parent liv-doc-main.md has an invalid frontmatter");

  const toRel = changeEntryPath(docsPath, absSource, path.join(parentDir, newName), isFolder);
  renameInManifest(parentDir, name, newName);
  refreshOkfIndexes(docsPath);
  return result(toRel);
}

/**
 * DELETE /api/tree: deletes a folder and everything it contains. Its parent
 * manifest forgets it, incoming links are unlinked and the doc-keyed stores
 * drop the ids it held; a linked file inside is removed as a link, its target
 * is kept.
 */
export function deleteTreeFolder(docsPath: string, relPath: string): TreeMoveResult {
  const root = path.resolve(docsPath);
  const absFolder = path.resolve(root, relPath);
  if (absFolder === root || !insideRoot(root, absFolder)) throw new TreeMoveError(403, "Access denied");

  const name = path.basename(absFolder);
  const parentDir = path.dirname(absFolder);
  if (isSymlink(absFolder)) throw new TreeMoveError(400, "Linked entries cannot be deleted");
  let stat: fs.Stats;
  try {
    stat = fs.statSync(absFolder);
  } catch {
    throw new TreeMoveError(404, "Entry not found");
  }
  if (!stat.isDirectory()) throw new TreeMoveError(400, "Only folders can be deleted here");
  if (!isListedDir(name)) throw new TreeMoveError(400, "This entry is not shown in the explorer");
  if (parentDir === root && RESERVED_ROOT_FOLDERS.has(name)) throw new TreeMoveError(400, `"${name}" is a reserved folder`);
  if (readFolderManifest(parentDir).hidden.includes(name)) throw new TreeMoveError(400, "Hidden entries cannot be deleted");
  if (!isManifestWritable(parentDir)) throw new TreeMoveError(409, "Parent liv-doc-main.md has an invalid frontmatter");

  const rel = toPosix(path.relative(root, absFolder));
  fs.rmSync(absFolder, { recursive: true });
  removeFromManifest(parentDir, name);
  forgetDeletedEntry(docsPath, rel, true);
  refreshOkfIndexes(docsPath);
  return { path: rel };
}
