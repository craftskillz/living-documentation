// Deterministic, idempotent migration of the legacy numeric folder prefixes
// (`001_A`, `1_tutorial`) to the `liv-doc-main.md` manifests (US8): each
// prefixed folder is renamed without its prefix, its former position goes to
// the parent manifest `order`, and the links, doc-keyed stores and favorites
// that pointed into it follow. Documents are never renamed.
import fs from "node:fs";
import path from "node:path";
import { FOLDER_MANIFEST_FILE } from "./folderManifest";
import { parseFrontmatter, serializeFrontmatter } from "./frontmatter";
import { migrateDocIds, RESERVED_ROOT_FOLDERS } from "./treeMove";

const IGNORED_DIRS = new Set([".git", "node_modules", "dist"]);
const NUMERIC_PREFIX = /^\d+_(?=.)/;

export interface FolderRename {
  /** POSIX path of the folder before the migration, relative to the docs folder. */
  from: string;
  /** POSIX path of the folder once every rename is applied. */
  to: string;
}

export interface PrefixMigrationResult {
  renamed: FolderRename[];
  /** Folders left prefixed because the target name is already taken. */
  collisions: FolderRename[];
  /** Markdown files whose links were (or would be) rewritten, at their final path. */
  linksRewritten: string[];
  /** Root folders added to the root manifest `hidden`. */
  hiddenAdded: string[];
}

interface PlannedRename {
  parentOld: string;
  fromName: string;
  toName: string;
}

/** `001_A` → `A`; null when the name has no numeric prefix. */
export function stripNumericPrefix(name: string): string | null {
  return NUMERIC_PREFIX.test(name) ? name.replace(NUMERIC_PREFIX, "") : null;
}

const join = (dir: string, name: string) => (dir ? `${dir}/${name}` : name);

function byName(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

function childDirs(absDir: string): string[] {
  return fs
    .readdirSync(absDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.isSymbolicLink() && !IGNORED_DIRS.has(e.name))
    .map((e) => e.name);
}

/** Walks the tree as it is on disk and plans the renames, parents before children. */
function planRenames(docsPath: string, relDir = "", plan: PlannedRename[] = [], collisions: FolderRename[] = []) {
  const dirs = childDirs(path.join(docsPath, relDir));
  const taken = new Set(fs.readdirSync(path.join(docsPath, relDir)).map((n) => n.toLowerCase()));
  for (const name of [...dirs].sort(byName)) {
    const toName = stripNumericPrefix(name);
    if (toName === null) continue;
    if (taken.has(toName.toLowerCase())) {
      collisions.push({ from: join(relDir, name), to: join(relDir, toName) });
      continue;
    }
    taken.add(toName.toLowerCase());
    plan.push({ parentOld: relDir, fromName: name, toName });
  }
  for (const name of dirs) planRenames(docsPath, join(relDir, name), plan, collisions);
  return { plan, collisions };
}

/**
 * Maps an old POSIX path, segment by segment, through the planned renames.
 * Returns null when no segment changes.
 */
function pathMapper(plan: PlannedRename[]): (oldRel: string) => string | null {
  const renames = new Map(plan.map((r) => [join(r.parentOld, r.fromName), r.toName]));
  return (oldRel) => {
    let current = "";
    let changed = false;
    const out = oldRel.split("/").map((seg) => {
      current = join(current, seg);
      const next = renames.get(current);
      if (next === undefined) return seg;
      changed = true;
      return next;
    });
    return changed ? out.join("/") : null;
  };
}

function normalizeSegments(segments: string[]): string[] | null {
  const out: string[] = [];
  for (const seg of segments) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") {
      if (out.length === 0) return null;
      out.pop();
    } else out.push(seg);
  }
  return out;
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Rewrites one link target written in the file `fileOldRel`. Each path segment
 * that walks into a renamed folder loses its prefix; `.`/`..`, encoding,
 * fragments and the rest are kept, so an unaffected link stays byte-identical.
 */
function rewriteTarget(target: string, fileOldRel: string, mapPath: (oldRel: string) => string | null): string {
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(target)) return target;

  const doc = target.match(/([?&]doc=)([^&#]+)/);
  if (doc) {
    const id = safeDecode(safeDecode(doc[2]));
    const next = mapPath(id);
    if (next === null) return target;
    return target.replace(doc[0], doc[1] + encodeURIComponent(encodeURIComponent(next)));
  }

  const cut = target.search(/[?#]/);
  const pathPart = cut === -1 ? target : target.slice(0, cut);
  if (!pathPart) return target;
  const absolute = pathPart.startsWith("/");
  const fileDir = fileOldRel.includes("/") ? fileOldRel.slice(0, fileOldRel.lastIndexOf("/")).split("/") : [];
  const segments = pathPart.split("/");
  let base = absolute ? [] : fileDir;
  let changed = false;
  const out = segments.map((seg, i) => {
    if (i === 0 && absolute) return seg;
    const resolved = normalizeSegments([...base, safeDecode(seg)]);
    if (resolved === null) return seg;
    base = resolved;
    if (seg === "" || seg === "." || seg === "..") return seg;
    const mapped = mapPath(resolved.join("/"));
    if (mapped === null || mapped.split("/").at(-1) === resolved.at(-1)) return seg;
    changed = true;
    return seg.replace(NUMERIC_PREFIX, "");
  });
  return changed ? out.join("/") + target.slice(pathPart.length) : target;
}

/**
 * Rewrites the inline links and reference definitions of a Markdown file
 * (fenced code excluded) that point into renamed folders.
 */
export function rewriteMovedLinks(
  content: string,
  fileOldRel: string,
  mapPath: (oldRel: string) => string | null,
): string {
  let fence: string | null = null;
  return content
    .split("\n")
    .map((line) => {
      const marker = line.match(/^\s{0,3}(`{3,}|~{3,})/);
      if (marker) {
        if (fence === null) fence = marker[1][0];
        else if (marker[1][0] === fence) fence = null;
        return line;
      }
      if (fence !== null) return line;
      return line
        .replace(/(\]\()([^)\s]+)/g, (_m, open: string, t: string) => open + rewriteTarget(t, fileOldRel, mapPath))
        .replace(
          /^(\s{0,3}\[[^\]]+\]:\s*)(\S+)/,
          (_m, open: string, t: string) => open + rewriteTarget(t, fileOldRel, mapPath),
        );
    })
    .join("\n");
}

function collectMd(docsPath: string, relDir = "", out: string[] = []): string[] {
  for (const entry of fs.readdirSync(path.join(docsPath, relDir), { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue;
    const rel = join(relDir, entry.name);
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) collectMd(docsPath, rel, out);
    } else if (entry.name.endsWith(".md")) out.push(rel);
  }
  return out;
}

/**
 * Merges the renames of one folder into its manifest (created when missing):
 * renamed names are replaced in place in `order` and `hidden`, then the
 * renamed folders not yet ordered are appended in their former order.
 */
function mergeManifest(absDir: string, renames: PlannedRename[], extraHidden: string[] = []): boolean {
  const file = path.join(absDir, FOLDER_MANIFEST_FILE);
  const content = fs.existsSync(file) ? fs.readFileSync(file, "utf-8") : null;
  const { data, body, format } = parseFrontmatter(content ?? "");
  if (content !== null && format !== "yaml") return false;
  const toNew = new Map(renames.map((r) => [r.fromName, r.toName]));
  const list = (value: unknown) =>
    (Array.isArray(value) ? value : []).filter((v): v is string => typeof v === "string").map((n) => toNew.get(n) ?? n);
  const order = list(data.order);
  for (const r of renames) if (!order.includes(r.toName)) order.push(r.toName);
  const hidden = list(data.hidden);
  for (const name of extraHidden) if (!hidden.includes(name)) hidden.push(name);
  const next = serializeFrontmatter({ ...data, order, hidden }) + (content === null ? "" : body);
  if (next === content) return false;
  fs.writeFileSync(file, next);
  return true;
}

export function migrateFolderPrefixes(docsPath: string, opts: { dryRun?: boolean } = {}): PrefixMigrationResult {
  const { plan, collisions } = planRenames(docsPath);
  const mapPath = pathMapper(plan);
  const newPath = (oldRel: string) => mapPath(oldRel) ?? oldRel;

  const rootHidden = parseFrontmatter(
    fs.existsSync(path.join(docsPath, FOLDER_MANIFEST_FILE))
      ? fs.readFileSync(path.join(docsPath, FOLDER_MANIFEST_FILE), "utf-8")
      : "",
  ).data.hidden;
  const hiddenAdded = [...RESERVED_ROOT_FOLDERS]
    .sort()
    .filter((name) => fs.existsSync(path.join(docsPath, name)))
    .filter((name) => !(Array.isArray(rootHidden) && rootHidden.includes(name)));

  const rewrites = collectMd(docsPath)
    .map((oldRel) => {
      const content = fs.readFileSync(path.join(docsPath, oldRel), "utf-8");
      return { oldRel, content, next: rewriteMovedLinks(content, oldRel, mapPath) };
    })
    .filter((r) => r.next !== r.content);

  const result: PrefixMigrationResult = {
    renamed: plan.map((r) => ({ from: join(r.parentOld, r.fromName), to: newPath(join(r.parentOld, r.fromName)) })),
    collisions,
    linksRewritten: rewrites.map((r) => (opts.dryRun ? r.oldRel : newPath(r.oldRel))),
    hiddenAdded,
  };
  if (opts.dryRun) return result;

  // Deepest first, so every old path is still valid when its folder is renamed.
  const depth = (r: PlannedRename) => (r.parentOld ? r.parentOld.split("/").length : 0);
  for (const r of [...plan].sort((a, b) => depth(b) - depth(a))) {
    const from = join(r.parentOld, r.fromName);
    fs.renameSync(path.join(docsPath, from), path.join(docsPath, r.parentOld, r.toName));
    migrateDocIds(docsPath, from, join(r.parentOld, r.toName), true);
  }

  const byParent = new Map<string, PlannedRename[]>();
  for (const r of plan) byParent.set(r.parentOld, [...(byParent.get(r.parentOld) ?? []), r]);
  if (!byParent.has("") && hiddenAdded.length) byParent.set("", []);
  for (const [parentOld, renames] of byParent) {
    mergeManifest(path.join(docsPath, newPath(parentOld)), renames, parentOld === "" ? hiddenAdded : []);
  }

  for (const r of rewrites) fs.writeFileSync(path.join(docsPath, newPath(r.oldRel)), r.next, "utf-8");
  return result;
}
