// Per-folder manifest `liv-doc-main.md`: a reserved, invisible file whose YAML
// frontmatter drives the explorer — `order` (entries shown first, in that
// order) and `hidden` (entries not shown). The body is a free description of
// the folder. A missing or malformed manifest falls back to the default order.
import fs from "node:fs";
import path from "node:path";
import { parseFrontmatter } from "./frontmatter";

export const FOLDER_MANIFEST_FILE = "liv-doc-main.md";

export interface FolderManifest {
  order: string[];
  hidden: string[];
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim() !== "").map((v) => v.trim());
}

export function readFolderManifest(absDir: string): FolderManifest {
  const file = path.join(absDir, FOLDER_MANIFEST_FILE);
  let content: string;
  try {
    content = fs.readFileSync(file, "utf-8");
  } catch {
    return { order: [], hidden: [] };
  }
  const { data, format, raw } = parseFrontmatter(content);
  if (format !== "yaml" && raw.trim()) {
    console.warn(`[living-doc] ${file}: invalid YAML frontmatter, default order applied`);
    return { order: [], hidden: [] };
  }
  return { order: stringList(data.order), hidden: stringList(data.hidden) };
}

/**
 * Applies a manifest `order` to already default-sorted entries: listed entries
 * first (manifest order, unknown names ignored), then the others unchanged.
 */
export function applyManifestOrder<T extends { name: string }>(entries: T[], order: string[]): T[] {
  const byName = new Map(entries.map((e) => [e.name, e]));
  const listed: T[] = [];
  for (const name of order) {
    const entry = byName.get(name);
    if (entry) {
      listed.push(entry);
      byName.delete(name);
    }
  }
  return [...listed, ...entries.filter((e) => byName.has(e.name))];
}
