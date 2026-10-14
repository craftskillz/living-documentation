// Keeps the Markdown links of a docs bundle valid when files or folders change
// path (folder prefix migration, rename, move). A `mapPath` function maps an
// old POSIX path, relative to the docs folder, to its new path (null when it
// does not move). Incoming links are found by walking every `.md` file, never
// through the OKF `index.md`, which may be stale.
import fs from "node:fs";
import path from "node:path";
import { readConfig } from "./config";
import { readMetadataStore, writeMetadataStore } from "./metadata";

export type PathMapper = (oldRel: string) => string | null;

const IGNORED_DIRS = new Set([".git", "node_modules", "dist"]);
const join = (dir: string, name: string) => (dir ? `${dir}/${name}` : name);

/** Maps the entry `from` → `to` and, for a folder, every path below it. */
export function entryMapper(from: string, to: string, isFolder: boolean): PathMapper {
  return (oldRel) => {
    if (oldRel === from) return to;
    if (isFolder && oldRel.startsWith(`${from}/`)) return to + oldRel.slice(from.length);
    return null;
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

const dirSegments = (rel: string) => (rel.includes("/") ? rel.slice(0, rel.lastIndexOf("/")).split("/") : []);

/** Encodes a path segment like `like`: percent-encoded if it was, spaces always. */
function encodeSegment(name: string, like: string): string {
  return like.includes("%") ? encodeURIComponent(name) : name.replace(/ /g, "%20");
}

/** Resolves a link path written in a file of `base`; null when it escapes the docs folder. */
function resolveLink(base: string[], linkPath: string): string | null {
  return normalizeSegments([...base, ...linkPath.split("/").map(safeDecode)])?.join("/") ?? null;
}

/**
 * Rewrites one link target written in the file `fileOldRel`, which ends up at
 * `fileNewRel`. A link that still resolves to its target is kept as is; else
 * renamed segments are replaced in place (keeping `.`/`..` and encoding), and
 * only when that is not enough is the path recomputed from the new location.
 * Fragments and queries are kept, so an unaffected link stays byte-identical.
 */
function rewriteTarget(target: string, fileOldRel: string, fileNewRel: string, mapPath: PathMapper): string {
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(target)) return target;

  const doc = target.match(/([?&]doc=)([^&#]+)/);
  if (doc) {
    const next = mapPath(`${safeDecode(safeDecode(doc[2]))}.md`);
    if (next === null) return target;
    return target.replace(doc[0], doc[1] + encodeURIComponent(encodeURIComponent(next.slice(0, -3))));
  }

  const cut = target.search(/[?#]/);
  const pathPart = cut === -1 ? target : target.slice(0, cut);
  const suffix = target.slice(pathPart.length);
  if (!pathPart) return target;
  const absolute = pathPart.startsWith("/");
  const oldBase = absolute ? [] : dirSegments(fileOldRel);
  const newBase = absolute ? [] : dirSegments(fileNewRel);
  const oldTarget = resolveLink(oldBase, pathPart);
  if (oldTarget === null) return target;
  const newTarget = mapPath(oldTarget) ?? oldTarget;
  if (resolveLink(newBase, pathPart) === newTarget) return target;

  let base = oldBase;
  const renamed = pathPart
    .split("/")
    .map((seg, i) => {
      if (i === 0 && absolute) return seg;
      const resolved = normalizeSegments([...base, safeDecode(seg)]);
      if (resolved === null) return seg;
      base = resolved;
      if (seg === "" || seg === "." || seg === "..") return seg;
      const name = mapPath(resolved.join("/"))?.split("/").at(-1);
      return name === undefined || name === resolved.at(-1) ? seg : encodeSegment(name, seg);
    })
    .join("/");
  if (resolveLink(newBase, renamed) === newTarget) return renamed + suffix;

  const encode = (p: string) =>
    p
      .split("/")
      .map((seg) => (seg === ".." ? seg : encodeSegment(seg, pathPart)))
      .join("/");
  const trailing = pathPart.endsWith("/") ? "/" : "";
  if (absolute) return `/${encode(newTarget)}${trailing}${suffix}`;
  let relative = encode(path.posix.relative(newBase.join("/"), newTarget) || ".");
  if (pathPart.startsWith("./") && !relative.startsWith("..")) relative = `./${relative}`;
  return relative + trailing + suffix;
}

/**
 * Rewrites the inline links and reference definitions of a Markdown file
 * (fenced code excluded) whose target, or the file itself, changes path.
 */
export function rewriteMovedLinks(content: string, fileOldRel: string, mapPath: PathMapper): string {
  const fileNewRel = mapPath(fileOldRel) ?? fileOldRel;
  const rewrite = (t: string) => rewriteTarget(t, fileOldRel, fileNewRel, mapPath);
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
        .replace(/(\]\()([^)\s]+)/g, (_m, open: string, t: string) => open + rewrite(t))
        .replace(/^(\s{0,3}\[[^\]]+\]:\s*)(\S+)/, (_m, open: string, t: string) => open + rewrite(t));
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

export interface LinkRewrite {
  /** POSIX path of the file before the paths change. */
  oldRel: string;
  next: string;
}

/** Plans the link rewrites of every `.md` file, read before anything moves on disk. */
export function planLinkRewrites(docsPath: string, mapPath: PathMapper): LinkRewrite[] {
  return collectMd(docsPath)
    .map((oldRel) => {
      const content = fs.readFileSync(path.join(docsPath, oldRel), "utf-8");
      return { oldRel, content, next: rewriteMovedLinks(content, oldRel, mapPath) };
    })
    .filter((r) => r.next !== r.content)
    .map(({ oldRel, next }) => ({ oldRel, next }));
}

/** Writes planned rewrites once the paths changed on disk. */
export function applyLinkRewrites(docsPath: string, rewrites: LinkRewrite[], mapPath: PathMapper): void {
  for (const r of rewrites) fs.writeFileSync(path.join(docsPath, mapPath(r.oldRel) ?? r.oldRel), r.next, "utf-8");
}

/**
 * Source bindings are paths relative to `sourceRoot`; those that point at a
 * document of the docs folder follow its new path.
 */
export function migrateSourcePaths(docsPath: string, mapPath: PathMapper): void {
  const { sourceRoot } = readConfig(docsPath);
  const store = readMetadataStore(docsPath);
  let changed = false;
  for (const entries of Object.values(store)) {
    for (const entry of Array.isArray(entries) ? entries : []) {
      if (typeof entry?.path !== "string") continue;
      const rel = path.relative(docsPath, path.resolve(sourceRoot, entry.path)).split(path.sep).join("/");
      if (rel.startsWith("..") || path.isAbsolute(rel)) continue;
      const next = mapPath(rel);
      if (next === null) continue;
      entry.path = path.relative(sourceRoot, path.join(docsPath, next)).split(path.sep).join("/");
      changed = true;
    }
  }
  if (changed) writeMetadataStore(docsPath, store);
}
