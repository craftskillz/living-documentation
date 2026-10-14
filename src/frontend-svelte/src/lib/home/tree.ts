import type { DocSummary, ExplorerNode } from "./types";

/** Strip a leading numeric sort prefix and title-case a folder segment. */
export function folderLabel(seg: string): string {
  return seg
    .replace(/^\d+_/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Keeps only the documents whose id is in `ids` and the folders leading to
 * them (used while searching). Order is preserved.
 */
export function filterExplorerTree(nodes: ExplorerNode[], ids: Set<string>): ExplorerNode[] {
  const kept: ExplorerNode[] = [];
  for (const node of nodes) {
    if (node.kind === "doc") {
      if (node.id && ids.has(node.id)) kept.push(node);
    } else {
      const children = filterExplorerTree(node.children ?? [], ids);
      if (children.length) kept.push({ ...node, children });
    }
  }
  return kept;
}

/** Drops the reserved files and the entries flagged hidden by their folder manifest (and their subtree). */
export function withoutHiddenEntries(nodes: ExplorerNode[]): ExplorerNode[] {
  return nodes
    .filter((node) => !node.hidden && !node.reserved)
    .map((node) => (node.kind === "folder" ? { ...node, children: withoutHiddenEntries(node.children ?? []) } : node));
}

/** Root folders the server keeps for attachments; they cannot be renamed. */
const RESERVED_ROOT_FOLDERS = new Set(["files", "images"]);

/** Hidden entries, reserved and linked files and the reserved root folders cannot be renamed. */
export function canRenameEntry(node: ExplorerNode): boolean {
  if (node.hidden || node.reserved || node.linked) return false;
  return !(node.kind === "folder" && RESERVED_ROOT_FOLDERS.has(node.path));
}

/** Folders follow the rename rule: hidden and reserved root folders cannot be deleted. */
export function canDeleteFolder(node: ExplorerNode): boolean {
  return node.kind === "folder" && canRenameEntry(node);
}

/** The node at `path` in the tree, or null. */
export function findExplorerNode(nodes: ExplorerNode[], path: string): ExplorerNode | null {
  for (const node of nodes) {
    if (node.path === path) return node;
    if (node.kind === "folder" && path.startsWith(`${node.path}/`)) return findExplorerNode(node.children ?? [], path);
  }
  return null;
}

/** Documents in a node's subtree that match `predicate` (all when omitted). */
export function countExplorerDocs(node: ExplorerNode, predicate: (id: string) => boolean = () => true): number {
  if (node.kind === "doc") return node.id && !node.reserved && predicate(node.id) ? 1 : 0;
  return (node.children ?? []).reduce((n, child) => n + countExplorerDocs(child, predicate), 0);
}

const EXTRA_FILES_GROUP_PATH = ":extra-files:";

/**
 * Extra files (absolute ids, outside the docs folder) are not in GET /api/tree:
 * show them first, flat, in a read-only group, in the documents listing order.
 */
export function withExtraFilesGroup(tree: ExplorerNode[], docs: DocSummary[], label: string): ExplorerNode[] {
  const extras = docs.filter((doc) => decodeURIComponent(doc.id).startsWith("/") || /^[A-Za-z]:[\\/]/.test(decodeURIComponent(doc.id)));
  if (extras.length === 0) return tree;
  const children: ExplorerNode[] = extras.map((doc) => ({
    kind: "doc",
    name: doc.filename ?? `${doc.title}.md`,
    path: `${EXTRA_FILES_GROUP_PATH}${doc.id}`,
    id: doc.id,
    extra: true,
  }));
  return [{ kind: "folder", name: label, path: EXTRA_FILES_GROUP_PATH, extra: true, children }, ...tree];
}
