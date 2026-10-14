// Per-folder manifest `liv-doc-main.md`: a reserved, invisible file whose YAML
// frontmatter drives the explorer — `order` (entries shown first, in that
// order) and `hidden` (entries not shown). The body is a free description of
// the folder. A missing or malformed manifest falls back to the default order.
import fs from "node:fs";
import path from "node:path";
import { parseFrontmatter, serializeFrontmatter } from "./frontmatter";

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

/** Writes an empty manifest in a new folder; an existing manifest is kept. */
export function createFolderManifest(absDir: string): void {
  try {
    fs.writeFileSync(path.join(absDir, FOLDER_MANIFEST_FILE), serializeFrontmatter({ order: [], hidden: [] }), {
      flag: "wx",
    });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
  }
}

/**
 * Appends `name` to the parent manifest `order` when that order is non-empty;
 * an empty order already shows new entries in default order. Other fields and
 * the body are kept.
 */
export function appendToManifestOrder(absDir: string, name: string): void {
  const file = path.join(absDir, FOLDER_MANIFEST_FILE);
  if (!fs.existsSync(file)) return;
  const { data, body, format } = parseFrontmatter(fs.readFileSync(file, "utf-8"));
  if (format !== "yaml") return;
  const order = stringList(data.order);
  if (order.length === 0 || order.includes(name)) return;
  fs.writeFileSync(file, serializeFrontmatter({ ...data, order: [...order, name] }) + body);
}

/**
 * Adds `name` to (or removes it from) the manifest `hidden` of `absDir`,
 * creating the manifest when missing. Returns false, writing nothing, when the
 * existing manifest has no valid YAML frontmatter.
 */
export function setManifestHidden(absDir: string, name: string, hidden: boolean): boolean {
  const file = path.join(absDir, FOLDER_MANIFEST_FILE);
  const content = fs.existsSync(file) ? fs.readFileSync(file, "utf-8") : serializeFrontmatter({ order: [], hidden: [] });
  const { data, body, format } = parseFrontmatter(content);
  if (format !== "yaml") return false;
  const current = stringList(data.hidden).filter((n) => n !== name);
  const next = hidden ? [...current, name] : current;
  fs.writeFileSync(file, serializeFrontmatter({ ...data, order: stringList(data.order), hidden: next }) + body);
  return true;
}

/** True when `absDir` has no manifest yet or one with a valid YAML frontmatter. */
export function isManifestWritable(absDir: string): boolean {
  const file = path.join(absDir, FOLDER_MANIFEST_FILE);
  return !fs.existsSync(file) || parseFrontmatter(fs.readFileSync(file, "utf-8")).format === "yaml";
}

function rewriteManifest(absDir: string, edit: (manifest: FolderManifest) => FolderManifest): void {
  const file = path.join(absDir, FOLDER_MANIFEST_FILE);
  const content = fs.existsSync(file) ? fs.readFileSync(file, "utf-8") : serializeFrontmatter({ order: [], hidden: [] });
  const { data, body, format } = parseFrontmatter(content);
  if (format !== "yaml") return;
  const next = edit({ order: stringList(data.order), hidden: stringList(data.hidden) });
  fs.writeFileSync(file, serializeFrontmatter({ ...data, ...next }) + body);
}

/**
 * Replaces the manifest `order` of `absDir` (created when missing) and purges
 * `hidden` names that no longer exist on disk.
 */
export function setManifestOrder(absDir: string, order: string[]): void {
  rewriteManifest(absDir, ({ hidden }) => ({
    order,
    hidden: hidden.filter((name) => fs.existsSync(path.join(absDir, name))),
  }));
}

/** Removes `name` from the `order` and `hidden` of an existing manifest. */
export function removeFromManifest(absDir: string, name: string): void {
  if (!fs.existsSync(path.join(absDir, FOLDER_MANIFEST_FILE))) return;
  rewriteManifest(absDir, ({ order, hidden }) => ({
    order: order.filter((n) => n !== name),
    hidden: hidden.filter((n) => n !== name),
  }));
}

/** Replaces `from` by `to` in the `order` and `hidden` of an existing manifest, keeping positions. */
export function renameInManifest(absDir: string, from: string, to: string): void {
  if (!fs.existsSync(path.join(absDir, FOLDER_MANIFEST_FILE))) return;
  const swap = (n: string) => (n === from ? to : n);
  rewriteManifest(absDir, ({ order, hidden }) => ({ order: order.map(swap), hidden: hidden.map(swap) }));
}
