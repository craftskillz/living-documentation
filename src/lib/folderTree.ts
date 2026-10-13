// Builds the ordered explorer tree of a docs folder: folders and Markdown
// documents, nested, already sorted for display. Default order: folders first,
// then files, each alphabetical (case-insensitive).
import fs from "node:fs";
import path from "node:path";
import { applyManifestOrder, readFolderManifest } from "./folderManifest";
import { isListedEntry } from "./explorerEntries";

export interface FolderTreeNode {
  kind: "folder" | "doc";
  name: string;
  /** POSIX path relative to the docs folder. */
  path: string;
  /** Document id, same as GET /api/documents (docs only). */
  id?: string;
  /** Listed in the parent manifest `hidden`: shown only on demand, greyed. */
  hidden?: true;
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

function readFolder(docsPath: string, relDir: string): FolderTreeNode[] {
  const absDir = path.join(docsPath, relDir);
  const { order, hidden } = readFolderManifest(absDir);
  return orderedListedEntries(absDir, order).map((entry): FolderTreeNode => {
    const relPath = relDir ? `${relDir}/${entry.name}` : entry.name;
    const node: FolderTreeNode = entry.isDirectory()
      ? { kind: "folder", name: entry.name, path: relPath, children: readFolder(docsPath, relPath) }
      : { kind: "doc", name: entry.name, path: relPath, id: encodeURIComponent(relPath.slice(0, -3)) };
    if (hidden.includes(entry.name)) node.hidden = true;
    return node;
  });
}

export function buildFolderTree(docsPath: string): FolderTreeNode[] {
  return readFolder(docsPath, "");
}
