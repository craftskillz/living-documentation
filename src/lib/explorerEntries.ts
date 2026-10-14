// Which filesystem entries of a docs folder the explorer and the document
// scanners list. Dot folders and dot Markdown files are listed like any other
// entry; only tool directories (.git, node_modules) and reserved files
// (index.md, log.md, liv-doc-main.md) are never listed.
import fs from "node:fs";
import { isReservedOkfFile } from "./okf";

export const ALWAYS_IGNORED_DIRS = new Set([".git", "node_modules"]);

export function isListedDir(name: string): boolean {
  return !ALWAYS_IGNORED_DIRS.has(name);
}

export function isListedDocFile(name: string): boolean {
  return name.toLowerCase().endsWith(".md") && !isReservedOkfFile(name);
}

export function isListedEntry(entry: fs.Dirent, fullPath: string): boolean {
  if (entry.isDirectory()) return isListedDir(entry.name);
  return isListedDocFile(entry.name) && isFileOrLinkToFile(entry, fullPath);
}

/**
 * A regular file, or a symlink to one (linked AI instruction files). A broken
 * symlink — its target was deleted — is skipped instead of failing the scan.
 */
export function isFileOrLinkToFile(entry: fs.Dirent, fullPath: string): boolean {
  if (entry.isFile()) return true;
  if (!entry.isSymbolicLink()) return false;
  try {
    return fs.statSync(fullPath).isFile();
  } catch {
    return false;
  }
}

/** True when `absPath` is itself a symlink (not followed); false when it does not exist. */
export function isSymlink(absPath: string): boolean {
  try {
    return fs.lstatSync(absPath).isSymbolicLink();
  } catch {
    return false;
  }
}
