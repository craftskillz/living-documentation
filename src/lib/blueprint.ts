import fs from "fs";
import path from "path";

export const BLUEPRINT_FOLDER = "001_BLUEPRINT";

export const BLUEPRINT_IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  ".svn",
  "dist",
  "build",
  "out",
  "coverage",
  ".next",
  ".nuxt",
  ".cache",
  ".turbo",
  "__pycache__",
  ".venv",
  "venv",
]);

export interface BlueprintDirectoryEntry {
  name: string;
  path: string;
}

export interface BlueprintBoxListing {
  sourceRoot: string;
  path: string;
  folders: BlueprintDirectoryEntry[];
  files: BlueprintDirectoryEntry[];
}

export function normalizeBlueprintPath(relPath: string): string {
  return relPath.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
}

export function safeResolveBlueprintPath(
  sourceRoot: string,
  relPath: string,
): string | null {
  const root = path.resolve(sourceRoot);
  const abs = path.resolve(root, normalizeBlueprintPath(relPath));
  if (!abs.startsWith(root + path.sep) && abs !== root) return null;
  return abs;
}

export function isBlueprintIgnoredDir(name: string): boolean {
  return name.startsWith(".") || BLUEPRINT_IGNORED_DIRS.has(name);
}

function childPath(parentPath: string, name: string): string {
  return parentPath ? `${parentPath}/${name}` : name;
}

export function listBlueprintBox(
  sourceRoot: string,
  relPath: string,
): BlueprintBoxListing {
  const normalizedPath = normalizeBlueprintPath(relPath);
  const absDir = safeResolveBlueprintPath(sourceRoot, normalizedPath);
  if (!absDir) throw new Error("path escapes sourceRoot");
  if (!fs.existsSync(absDir)) {
    return {
      sourceRoot: path.resolve(sourceRoot),
      path: normalizedPath,
      folders: [],
      files: [],
    };
  }
  if (!fs.statSync(absDir).isDirectory()) {
    throw new Error(`Not a directory: ${normalizedPath}`);
  }

  const entries = fs.readdirSync(absDir, { withFileTypes: true });
  const folders = entries
    .filter(
      (entry) => entry.isDirectory() && !isBlueprintIgnoredDir(entry.name),
    )
    .map((entry) => ({
      name: entry.name,
      path: childPath(normalizedPath, entry.name),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const files = entries
    .filter((entry) => entry.isFile() && !entry.name.startsWith("."))
    .map((entry) => ({
      name: entry.name,
      path: childPath(normalizedPath, entry.name),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    sourceRoot: path.resolve(sourceRoot),
    path: normalizedPath,
    folders,
    files,
  };
}
