import fs from "node:fs";
import path from "node:path";
import { isFileOrLinkToFile, isListedDir, isListedDocFile } from "./explorerEntries";

function collectFolderMdFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (isListedDir(entry.name)) results.push(...collectFolderMdFiles(fullPath));
    } else if (isListedDocFile(entry.name) && isFileOrLinkToFile(entry, fullPath)) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Absolute .md paths behind the configured extra entries, in config order.
 * A folder entry expands to its .md files (recursively, sorted by path), so
 * files added to it later show up without touching the config.
 */
export function expandExtraFiles(extraFiles: string[]): string[] {
  const files: string[] = [];
  for (const entry of extraFiles) {
    let stat: fs.Stats;
    try {
      stat = fs.statSync(entry);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      const inFolder = collectFolderMdFiles(entry).sort((a, b) =>
        path.relative(entry, a).split(path.sep).join("/")
          .localeCompare(path.relative(entry, b).split(path.sep).join("/")),
      );
      files.push(...inFolder);
    } else if (entry.endsWith(".md")) {
      files.push(entry);
    }
  }
  return [...new Set(files)];
}

function isInsideFolderEntry(folder: string, filePath: string): boolean {
  const rel = path.relative(folder, filePath);
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) return false;
  const segments = rel.split(path.sep);
  const filename = segments.pop() as string;
  return segments.every(isListedDir) && isListedDocFile(filename);
}

function isDirectory(entry: string): boolean {
  try {
    return fs.statSync(entry).isDirectory();
  } catch {
    return false;
  }
}

/**
 * True when an absolute path is an extra file or a .md path inside an extra
 * folder. Existence is not checked, so callers can still answer 404.
 */
export function isAllowedExtraFile(extraFiles: string[], filePath: string): boolean {
  return extraFiles.some(
    (entry) =>
      entry === filePath || (isDirectory(entry) && isInsideFolderEntry(entry, filePath)),
  );
}
