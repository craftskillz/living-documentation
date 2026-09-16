// Builds the concept graph of a docs bundle: one node per concept (.md), one
// edge per real in-bundle link found in a concept's body. Deterministic and
// read-only. Links are the OKF bundle-relative form (`/ADRS/x.md`, `./x.md`,
// `../g/x.md`) or the in-app `?doc=<id>` form; external, anchor and image links
// are ignored, and edges to unknown concepts are dropped.
import fs from "node:fs";
import path from "node:path";
import { marked } from "marked";
import { parseFilename } from "../parser";
import { parseFrontmatter } from "../frontmatter";
import { deriveType, isReservedOkfFile } from "../okf";

export interface GraphNode {
  id: string; // encodeURIComponent(relPath without .md)
  title: string;
  type: string;
  folder: string | null;
}

export interface GraphEdge {
  from: string;
  to: string;
}

export interface ConceptGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

const IGNORED_DIRS = new Set([".git", "node_modules", "dist"]);

function collectMd(root: string, dir: string = root, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) collectMd(root, full, out);
    } else if (entry.name.endsWith(".md") && !isReservedOkfFile(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

// Resolve a POSIX slash/dot path, dropping `.`/`..` segments (mirrors the
// viewer's normalizeRelPath).
function normalizeRelPath(p: string): string {
  const out: string[] = [];
  for (const seg of p.split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") out.pop();
    else out.push(seg);
  }
  return out.join("/");
}

// Map a link target found in `fromId`'s body to a concept id, or null. Handles
// both the `?doc=<id>` form and the OKF bundle-relative `.md` form (ported from
// the viewer's resolveBundleMdLink so the graph matches what a click opens).
function resolveLinkTarget(target: string, fromId: string): string | null {
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(target)) return null;
  // `?doc=<id>` links carry the canonical `linkHref` value, i.e.
  // `encodeURIComponent(docId)` where docId is itself `encodeURIComponent(relPath)`.
  // Decoding once yields the node id (which is still %2F-encoded).
  const doc = target.match(/[?&]doc=([^&#)]+)/);
  if (doc) {
    try {
      return decodeURIComponent(doc[1]);
    } catch {
      return null; // malformed percent-encoding
    }
  }

  const hashIdx = target.indexOf("#");
  const pathPart = hashIdx === -1 ? target : target.slice(0, hashIdx);
  if (!pathPart.toLowerCase().endsWith(".md")) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(pathPart)) return null; // scheme → external

  let rel: string;
  if (pathPart.startsWith("/")) {
    rel = pathPart.slice(1);
  } else {
    const current = decodeURIComponent(fromId);
    const dir = current.includes("/") ? current.slice(0, current.lastIndexOf("/")) : "";
    rel = dir ? `${dir}/${pathPart}` : pathPart;
  }
  rel = normalizeRelPath(rel).replace(/\.md$/i, "");
  return rel ? encodeURIComponent(rel) : null;
}

/** Build the concept graph for the bundle at `docsPath`. */
export function buildConceptGraph(docsPath: string): ConceptGraph {
  const files = collectMd(docsPath);
  const nodes: GraphNode[] = [];
  const validIds = new Set<string>();
  const contents = new Map<string, string>();

  for (const file of files) {
    const relPath = path.relative(docsPath, file).split(path.sep).join("/");
    const id = encodeURIComponent(relPath.replace(/\.md$/i, ""));
    const content = fs.readFileSync(file, "utf-8");
    const { data, body } = parseFrontmatter(content);
    const title =
      (typeof data.title === "string" && data.title.trim()) ||
      parseFilename(path.basename(file)).title;
    const type = (typeof data.type === "string" && data.type.trim()) || deriveType(relPath);
    const folder = relPath.includes("/") ? relPath.slice(0, relPath.lastIndexOf("/")) : null;
    nodes.push({ id, title, type, folder });
    validIds.add(id);
    contents.set(id, body);
  }

  // Parse body links, excluding images and code; resolve reference links too.
  const seen = new Set<string>();
  const edges: GraphEdge[] = [];
  for (const [fromId, content] of contents) {
    marked.walkTokens(marked.lexer(content), (token) => {
      if (token.type !== "link") return;
      const to = resolveLinkTarget(token.href, fromId);
      if (!to || to === fromId || !validIds.has(to)) return;
      const key = JSON.stringify([fromId, to]);
      if (seen.has(key)) return;
      seen.add(key);
      edges.push({ from: fromId, to });
    });
  }

  return { nodes, edges };
}
