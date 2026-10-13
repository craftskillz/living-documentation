// Which filesystem entries of a docs folder the explorer and the document
// scanners list. Dot folders and dot Markdown files are listed like any other
// entry; only tool directories (.git, node_modules) and reserved files
// (index.md, log.md, liv-doc-main.md) are never listed.
import type fs from "node:fs";
import { isReservedOkfFile } from "./okf";

export const ALWAYS_IGNORED_DIRS = new Set([".git", "node_modules"]);

export function isListedDir(name: string): boolean {
  return !ALWAYS_IGNORED_DIRS.has(name);
}

export function isListedDocFile(name: string): boolean {
  return name.toLowerCase().endsWith(".md") && !isReservedOkfFile(name);
}

export function isListedEntry(entry: fs.Dirent): boolean {
  if (entry.isDirectory()) return isListedDir(entry.name);
  return entry.isFile() && isListedDocFile(entry.name);
}
