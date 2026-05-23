// ── Snippets — List Markdown helpers ────────────────────────────────────────
// Shared capture/build rules for ordered and unordered Markdown lists.
// Loaded as a classic script before snippet detection, inline editing and snippets.

const _LD_ORDERED_LIST_DEFAULT = [
  "1. Élément 1",
  "2. Élément 2",
  "   1. Sous-élément 2.1",
  "   2. Sous-élément 2.2",
  "3. Élément 3",
  "   1. Sous-élément 3.1",
  "      1. Sous-sous-élément 3.1.1",
].join("\n");

const _LD_UNORDERED_LIST_DEFAULT = [
  "- Élément 1",
  "- Élément 2",
  "  - Sous-élément 2.1",
  "  - Sous-élément 2.2",
  "- Élément 3",
  "  - Sous-élément 3.1",
  "    - Sous-sous-élément 3.1.1",
].join("\n");

function ldOrderedListDefaultMarkdown() {
  return _LD_ORDERED_LIST_DEFAULT;
}

function ldUnorderedListDefaultMarkdown() {
  return _LD_UNORDERED_LIST_DEFAULT;
}

function ldOrderedListBlockRegex() {
  return /^1\. .*(?:\n(?![ \t]*$)(?:\d+\. .*| {3,}.*|(?!(?:[-*+] |#{1,6}\s|>|```|~~~|\|)).+))*/gm;
}

function ldUnorderedListBlockRegex() {
  return /^[-*+] .*(?:\n(?![ \t]*$)(?:[-*+] .*| {2,}.*|(?!(?:\d+\. |#{1,6}\s|>|```|~~~|\|)).+))*/gm;
}

function ldLooksLikeOrderedListSnippet(markdown) {
  return /^1\. /.test((markdown || "").trim());
}

function ldLooksLikeUnorderedListSnippet(markdown) {
  return /^[-*+] /.test((markdown || "").trim());
}

function ldNonEmptyMarkdownLines(markdown) {
  return (markdown || "")
    .split("\n")
    .filter((line) => line.trim());
}

function ldBuildOrderedListMarkdown(markdown) {
  const content = markdown || ldOrderedListDefaultMarkdown();
  if (/^\s*\d+\.\s+/m.test(content)) {
    return ldNonEmptyMarkdownLines(content).join("\n");
  }

  const countersByIndent = new Map();
  return ldNonEmptyMarkdownLines(content)
    .map((line) => {
      const indent = line.match(/^\s*/)[0];
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

function ldBuildUnorderedListMarkdown(markdown) {
  const content = markdown || ldUnorderedListDefaultMarkdown();
  if (/^\s*[-*+]\s+/m.test(content)) {
    return ldNonEmptyMarkdownLines(content).join("\n");
  }

  return ldNonEmptyMarkdownLines(content)
    .map((line) => {
      const indent = line.match(/^\s*/)[0];
      return `${indent}- ${line.trim()}`;
    })
    .join("\n");
}
