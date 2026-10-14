// Builds the ordered explorer tree of a docs folder: folders and Markdown
// documents, nested, already sorted for display. Default order: folders first,
// then files, each alphabetical (case-insensitive). Reserved files come first,
// flagged `reserved`, for the "show hidden entries" view only.
import fs from "node:fs";
import path from "node:path";
import { applyManifestOrder, readFolderManifest } from "./folderManifest";
import { isListedEntry } from "./explorerEntries";
import { RESERVED_OKF_FILES } from "./okf";

export interface FolderTreeNode {
  kind: "folder" | "doc";
  name: string;
  /** POSIX path relative to the docs folder. */
  path: string;
  /** Document id, same as GET /api/documents (docs only). */
  id?: string;
  /** Listed in the parent manifest `hidden`: shown only on demand, greyed. */
  hidden?: true;
  /** Generated file (index.md, log.md, liv-doc-main.md): shown only on demand, read-only. */
  reserved?: true;
  children?: FolderTreeNode[];
}

function byDirentName(a: fs.Dirent, b: fs.Dirent): number {
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

/** Entries the explorer lists in `absDir`, in display order (manifest, then folders, then files). */
function orderedListedEntries(absDir: string, order = readFolderManifest(absDir).order): fs.Dirent[] {
  const entries = fs.readdirSync(absDir, { withFileTypes: true }).filter(isListedEntry);
  const folders = entries.filter((e) => e.isDirectory()).sort(byDirentName);
  const docs = entries.filter((e) => !e.isDirectory()).sort(byDirentName);
  return applyManifestOrder([...folders, ...docs], order);
}

/** Names of the entries the explorer lists in `absDir`, in display order. */
export function orderedEntryNames(absDir: string): string[] {
  return orderedListedEntries(absDir).map((e) => e.name);
}

function docNode(relDir: string, name: string): FolderTreeNode {
  const relPath = relDir ? `${relDir}/${name}` : name;
  return { kind: "doc", name, path: relPath, id: encodeURIComponent(relPath.slice(0, -3)) };
}

/** Reserved files present in `absDir`, in RESERVED_OKF_FILES order, under their on-disk name. */
function reservedFileNodes(absDir: string, relDir: string): FolderTreeNode[] {
  const files = fs.readdirSync(absDir, { withFileTypes: true }).filter((e) => e.isFile());
  return [...RESERVED_OKF_FILES].flatMap((reserved) => {
    const entry = files.find((e) => e.name.toLowerCase() === reserved);
    return entry ? [{ ...docNode(relDir, entry.name), reserved: true as const }] : [];
  });
}

function readFolder(docsPath: string, relDir: string): FolderTreeNode[] {
  const absDir = path.join(docsPath, relDir);
  const { order, hidden } = readFolderManifest(absDir);
  const listed = orderedListedEntries(absDir, order).map((entry): FolderTreeNode => {
    const relPath = relDir ? `${relDir}/${entry.name}` : entry.name;
    const node: FolderTreeNode = entry.isDirectory()
      ? { kind: "folder", name: entry.name, path: relPath, children: readFolder(docsPath, relPath) }
      : docNode(relDir, entry.name);
    if (hidden.includes(entry.name)) node.hidden = true;
    return node;
  });
  return [...reservedFileNodes(absDir, relDir), ...listed];
}

export function buildFolderTree(docsPath: string): FolderTreeNode[] {
  return readFolder(docsPath, "");
}
