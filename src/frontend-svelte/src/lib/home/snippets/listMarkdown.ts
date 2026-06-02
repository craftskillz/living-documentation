// Snippets — List Markdown helpers (ported from snippet-list-markdown.js).

const ORDERED_LIST_DEFAULT = [
  "1. Élément 1",
  "2. Élément 2",
  "   1. Sous-élément 2.1",
  "   2. Sous-élément 2.2",
  "3. Élément 3",
  "   1. Sous-élément 3.1",
  "      1. Sous-sous-élément 3.1.1",
].join("\n");

const UNORDERED_LIST_DEFAULT = [
  "- Élément 1",
  "- Élément 2",
  "  - Sous-élément 2.1",
  "  - Sous-élément 2.2",
  "- Élément 3",
  "  - Sous-élément 3.1",
  "    - Sous-sous-élément 3.1.1",
].join("\n");

export function orderedListDefaultMarkdown(): string {
  return ORDERED_LIST_DEFAULT;
}

export function unorderedListDefaultMarkdown(): string {
  return UNORDERED_LIST_DEFAULT;
}

export function looksLikeOrderedListSnippet(markdown: string): boolean {
  return /^1\. /.test((markdown || "").trim());
}

export function looksLikeUnorderedListSnippet(markdown: string): boolean {
  return /^[-*+] /.test((markdown || "").trim());
}

function nonEmptyMarkdownLines(markdown: string): string[] {
  return (markdown || "").split("\n").filter((line) => line.trim());
}

export function buildOrderedListMarkdown(markdown: string): string {
  const content = markdown || orderedListDefaultMarkdown();
  if (/^\s*\d+\.\s+/m.test(content)) {
    return nonEmptyMarkdownLines(content).join("\n");
  }

  const countersByIndent = new Map<number, number>();
  return nonEmptyMarkdownLines(content)
    .map((line) => {
      const indent = line.match(/^\s*/)![0];
      const trimmed = line.trim();
      if (/^[-*+]\s+/.test(trimmed)) {
        return `${indent}${trimmed}`;
      }
      const indentLength = indent.length;
      for (const knownIndent of Array.from(countersByIndent.keys())) {
        if (knownIndent > indentLength) countersByIndent.delete(knownIndent);
      }
      const next = (countersByIndent.get(indentLength) || 0) + 1;
      countersByIndent.set(indentLength, next);
      return `${indent}${next}. ${trimmed}`;
    })
    .join("\n");
}

export function buildUnorderedListMarkdown(markdown: string): string {
  const content = markdown || unorderedListDefaultMarkdown();
  if (/^\s*[-*+]\s+/m.test(content)) {
    return nonEmptyMarkdownLines(content).join("\n");
  }

  return nonEmptyMarkdownLines(content)
    .map((line) => {
      const indent = line.match(/^\s*/)![0];
      return `${indent}- ${line.trim()}`;
    })
    .join("\n");
}
