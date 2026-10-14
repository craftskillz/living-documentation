import type { ExplorerNode } from "./types";

/** Where a dragged entry lands relative to the entry under the pointer. */
export type DropPosition = "before" | "after" | "inside";

/** Body of POST /api/tree/move. */
export interface MoveRequest {
  source: string;
  targetFolder: string;
  index: number;
}

/** Share of a folder row's height, at its top and bottom edges, that drops beside it rather than inside. */
const FOLDER_EDGE_RATIO = 0.25;

/** Drop position for a pointer at `offsetY` within a row of `height` pixels. */
export function dropPositionAt(kind: ExplorerNode["kind"], offsetY: number, height: number): DropPosition {
  const ratio = height > 0 ? offsetY / height : 0;
  if (kind === "doc") return ratio < 0.5 ? "before" : "after";
  if (ratio < FOLDER_EDGE_RATIO) return "before";
  if (ratio > 1 - FOLDER_EDGE_RATIO) return "after";
  return "inside";
}

function parentOf(path: string): string {
  const slash = path.lastIndexOf("/");
  return slash === -1 ? "" : path.slice(0, slash);
}

/** Children of the folder at `path` ("" is the root) as ordered on disk: hidden entries included, reserved files left out. */
function childrenOf(tree: ExplorerNode[], path: string): ExplorerNode[] {
  return folderChildren(tree, path).filter((node) => !node.reserved);
}

function folderChildren(tree: ExplorerNode[], path: string): ExplorerNode[] {
  if (!path) return tree;
  for (const node of tree) {
    if (node.kind !== "folder") continue;
    if (node.path === path) return node.children ?? [];
    if (path.startsWith(`${node.path}/`)) return folderChildren(node.children ?? [], path);
  }
  return [];
}

/**
 * Translates a drop on `targetPath` into a move request. The index is the
 * final position in the full list of the destination folder, hidden entries
 * included, as POST /api/tree/move expects. Returns null when nothing moves.
 */
export function dropRequest(
  tree: ExplorerNode[],
  sourcePath: string,
  targetPath: string,
  position: DropPosition,
): MoveRequest | null {
  if (sourcePath === targetPath) return null;
  const targetFolder = position === "inside" ? targetPath : parentOf(targetPath);
  const siblings = childrenOf(tree, targetFolder).filter((node) => node.path !== sourcePath);
  let index = siblings.length;
  if (position !== "inside") {
    const at = siblings.findIndex((node) => node.path === targetPath);
    if (at === -1) return null;
    index = position === "before" ? at : at + 1;
  }
  if (targetFolder === parentOf(sourcePath)) {
    const current = childrenOf(tree, targetFolder).findIndex((node) => node.path === sourcePath);
    if (current === index) return null;
  }
  return { source: sourcePath, targetFolder, index };
}

/**
 * New id of the document `id` once the entry at `sourcePath` moved to
 * `newPath`, or null when the move does not concern it. Ids are the encoded
 * docs-relative path without `.md`.
 */
export function movedDocId(id: string, sourcePath: string, newPath: string): string | null {
  const docPath = `${decodeURIComponent(id)}.md`;
  if (docPath === sourcePath) return encodeURIComponent(newPath.slice(0, -3));
  if (!docPath.startsWith(`${sourcePath}/`)) return null;
  return encodeURIComponent(`${newPath}${docPath.slice(sourcePath.length)}`.slice(0, -3));
}
