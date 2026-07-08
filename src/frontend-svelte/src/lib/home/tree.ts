import type { DocSummary, TreeNode } from "./types";

export type SidebarSort = "recent" | "oldest" | "alphabetical";

/**
 * Leading `YYYY_MM_DD[_HH_mm]` date prefix of a document's basename, or "" when
 * absent. `filename` is the folder-relative path (e.g. `ADRS/2026_..._x.md`), so
 * the date is matched on the basename — not the whole path.
 */
function docDateKey(doc: DocSummary): string {
  const base = (doc.filename || "").split("/").pop() ?? "";
  return base.match(/^(\d{4}_\d{2}_\d{2}(?:_\d{2}_\d{2})?)/)?.[1] ?? "";
}

/**
 * Comparator for the configurable sidebar order. Dated documents are always
 * grouped before undated ones; "recent" sorts them newest→oldest, "oldest"
 * oldest→newest, "alphabetical" ignores dates and sorts by title. Undated docs
 * fall back to their filename.
 */
export function compareDocs(mode: SidebarSort): (a: DocSummary, b: DocSummary) => number {
  if (mode === "alphabetical") {
    return (a, b) =>
      (a.title || a.filename || "").localeCompare(b.title || b.filename || "");
  }
  return (a, b) => {
    const ka = docDateKey(a);
    const kb = docDateKey(b);
    if (ka && kb) return mode === "oldest" ? ka.localeCompare(kb) : kb.localeCompare(ka);
    if (ka) return -1;
    if (kb) return 1;
    return (a.filename || "").localeCompare(b.filename || "");
  };
}

function sortTreeCategories(
  node: TreeNode,
  cmp: (a: DocSummary, b: DocSummary) => number,
): void {
  for (const arr of Object.values(node.categories)) arr.sort(cmp);
  for (const child of Object.values(node.children)) sortTreeCategories(child, cmp);
}

export function buildFolderTree(
  docs: DocSummary[],
  allFolderPaths: string[],
  includeEmpty: boolean,
  sortMode: SidebarSort = "recent",
): TreeNode {
  const root: TreeNode = { categories: {}, children: {} };
  for (const doc of docs) {
    let node = root;
    for (const seg of doc.folder || []) {
      if (!node.children[seg]) node.children[seg] = { categories: {}, children: {} };
      node = node.children[seg];
    }
    if (!node.categories[doc.category]) node.categories[doc.category] = [];
    node.categories[doc.category].push(doc);
  }
  if (includeEmpty) {
    for (const folderPath of allFolderPaths) {
      const segments = folderPath.split("/").filter(Boolean);
      let node = root;
      for (const seg of segments) {
        if (!node.children[seg]) node.children[seg] = { categories: {}, children: {} };
        node = node.children[seg];
      }
    }
  }
  sortTreeCategories(root, compareDocs(sortMode));
  return root;
}

export function countTreeDocs(node: TreeNode): number {
  let n = Object.values(node.categories).reduce((s, arr) => s + arr.length, 0);
  for (const child of Object.values(node.children)) n += countTreeDocs(child);
  return n;
}

export function countTreeAnnotatedDocs(node: TreeNode, counts: Record<string, number>): number {
  let n = 0;
  for (const arr of Object.values(node.categories))
    for (const doc of arr) if (counts[doc.id] > 0) n += 1;
  for (const child of Object.values(node.children)) n += countTreeAnnotatedDocs(child, counts);
  return n;
}

export function countTreeFileAttachedDocs(node: TreeNode, counts: Record<string, number>): number {
  let n = 0;
  for (const arr of Object.values(node.categories))
    for (const doc of arr) if (counts[doc.id] > 0) n += 1;
  for (const child of Object.values(node.children)) n += countTreeFileAttachedDocs(child, counts);
  return n;
}

/** Strip a leading numeric sort prefix and title-case a folder segment. */
export function folderLabel(seg: string): string {
  return seg
    .replace(/^\d+_/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}

export function sortedChildKeys(node: TreeNode): string[] {
  return Object.keys(node.children).sort((a, b) => a.localeCompare(b));
}

export function otherCategoryKeys(node: TreeNode): string[] {
  return Object.keys(node.categories)
    .filter(c => c !== "General")
    .sort((a, b) => a.localeCompare(b));
}

export function flatSortedDocs(node: TreeNode, sortMode: SidebarSort = "recent"): DocSummary[] {
  return Object.values(node.categories).flat().sort(compareDocs(sortMode));
}
