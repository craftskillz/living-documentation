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

function byName(a: FolderTreeNode, b: FolderTreeNode): number {
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

function readFolder(docsPath: string, relDir: string): FolderTreeNode[] {
  const absDir = path.join(docsPath, relDir);
  const folders: FolderTreeNode[] = [];
  const docs: FolderTreeNode[] = [];
  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    if (!isListedEntry(entry)) continue;
    const relPath = relDir ? `${relDir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      folders.push({ kind: "folder", name: entry.name, path: relPath, children: readFolder(docsPath, relPath) });
    } else {
      docs.push({ kind: "doc", name: entry.name, path: relPath, id: encodeURIComponent(relPath.slice(0, -3)) });
    }
  }
  const { order, hidden } = readFolderManifest(absDir);
  for (const node of [...folders, ...docs]) if (hidden.includes(node.name)) node.hidden = true;
  return applyManifestOrder([...folders.sort(byName), ...docs.sort(byName)], order);
}

export function buildFolderTree(docsPath: string): FolderTreeNode[] {
  return readFolder(docsPath, "");
}
