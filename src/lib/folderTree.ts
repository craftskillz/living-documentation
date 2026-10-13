// Builds the ordered explorer tree of a docs folder: folders and Markdown
// documents, nested, already sorted for display. Default order: folders first,
// then files, each alphabetical (case-insensitive).
import fs from "node:fs";
import path from "node:path";
import { applyManifestOrder, readFolderManifest } from "./folderManifest";
import { isReservedOkfFile } from "./okf";

export interface FolderTreeNode {
  kind: "folder" | "doc";
  name: string;
  /** POSIX path relative to the docs folder. */
  path: string;
  children?: FolderTreeNode[];
}

const RESERVED_ROOT_FOLDERS = new Set(["files", "images"]);

function byName(a: FolderTreeNode, b: FolderTreeNode): number {
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

function isListed(entry: fs.Dirent, atRoot: boolean): boolean {
  if (entry.name.startsWith(".")) return false;
  if (entry.isDirectory()) return !(atRoot && RESERVED_ROOT_FOLDERS.has(entry.name));
  return entry.isFile() && entry.name.toLowerCase().endsWith(".md") && !isReservedOkfFile(entry.name);
}

function readFolder(docsPath: string, relDir: string): FolderTreeNode[] {
  const absDir = path.join(docsPath, relDir);
  const folders: FolderTreeNode[] = [];
  const docs: FolderTreeNode[] = [];
  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    if (!isListed(entry, relDir === "")) continue;
    const relPath = relDir ? `${relDir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      folders.push({ kind: "folder", name: entry.name, path: relPath, children: readFolder(docsPath, relPath) });
    } else {
      docs.push({ kind: "doc", name: entry.name, path: relPath });
    }
  }
  const { order } = readFolderManifest(absDir);
  return applyManifestOrder([...folders.sort(byName), ...docs.sort(byName)], order);
}

export function buildFolderTree(docsPath: string): FolderTreeNode[] {
  return readFolder(docsPath, "");
}
