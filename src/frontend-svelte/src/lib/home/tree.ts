import type { DocSummary, TreeNode } from "./types";

export function buildFolderTree(
  docs: DocSummary[],
  allFolderPaths: string[],
  includeEmpty: boolean,
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
  if (!includeEmpty) return root;
  for (const folderPath of allFolderPaths) {
    const segments = folderPath.split("/").filter(Boolean);
    let node = root;
    for (const seg of segments) {
      if (!node.children[seg]) node.children[seg] = { categories: {}, children: {} };
      node = node.children[seg];
    }
  }
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

export function flatSortedDocs(node: TreeNode): DocSummary[] {
  return Object.values(node.categories)
    .flat()
    .sort((a, b) => (a.filename || "").localeCompare(b.filename || ""));
}
