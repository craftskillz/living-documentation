// ── Snippets — Markdown parsers ────────────────────────────────────────────
// Pure Markdown parsing helpers used by the snippets modal.
// Loaded before snippets.js so the modal only writes parsed values to the DOM.

function ldStripCodeBlockIndent(code, indent) {
  if (!indent) return code;
  const escapedIndent = indent.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return code.replace(new RegExp("^" + escapedIndent, "gm"), "");
}

function ldParseCollapsibleSnippetMarkdown(markdown) {
  const summaryMatch = markdown.match(/<summary>([\s\S]*?)<\/summary>/i);
  const bodyMatch = markdown.match(
    /<details\b[^>]*>[\s\S]*?<\/summary>\s*\n?([\s\S]*?)\s*<\/details>\s*$/i,
  );
  return {
    summary: summaryMatch ? summaryMatch[1].trim() : undefined,
    body: bodyMatch ? bodyMatch[1].trim() : "",
  };
}

function ldParseLinkSnippetMarkdown(markdown) {
  const match = markdown.match(/^\[([\s\S]*?)\]\(([\s\S]*?)\)$/);
  return match ? { text: match[1], url: match[2] } : {};
}

function ldParseDocLinkSnippetMarkdown(markdown) {
  const match = markdown.match(/^\[([\s\S]*?)\]\(\?doc=([\s\S]*?)\)$/);
  return match ? { text: match[1], docId: decodeURIComponent(match[2]) } : {};
}

function ldParseAnchorLinkSnippetMarkdown(markdown) {
  const match = markdown.match(/^\[([\s\S]*?)\]\(#([\s\S]*?)\)$/);
  return match ? { text: match[1], anchor: match[2] } : {};
}

function ldParseAnchorDocLinkSnippetMarkdown(markdown) {
  const match = markdown.match(
    /^\[([\s\S]*?)\]\(\?doc=([\s\S]*?)#([\s\S]*?)\)$/,
  );
  return match
    ? { text: match[1], docId: decodeURIComponent(match[2]), anchor: match[3] }
    : {};
}

function ldParseCodeBlockSnippetMarkdown(markdown, options = {}) {
  const match = markdown.match(/^```[ \t]*([^\n]*)\n([\s\S]*?)\n[ \t]*```$/);
  if (!match) return { lang: "", code: "" };
  return {
    lang: match[1].trim(),
    code: ldStripCodeBlockIndent(match[2], options.inlineIndent || ""),
  };
}

function ldParseBlockquoteSnippetMarkdown(markdown) {
  return {
    content: markdown
      .split("\n")
      .map((line) => line.replace(/^>\s?/, ""))
      .join("\n"),
  };
}

function ldParseImageSnippetMarkdown(markdown) {
  const match = markdown.match(/^!\[([\s\S]*?)\]\(([\s\S]*?)\)$/);
  return match ? { alt: match[1], url: match[2] } : {};
}

function ldParseHeadingSnippetMarkdown(type, markdown) {
  const level = Number(type.slice(-1));
  const match = markdown.match(new RegExp(`^#{${level}}\\s+(.+)$`));
  return { text: match ? match[1].trim() : "" };
}

function ldParseTableSnippetMarkdown(markdown) {
  const attrs = ldParseTableAttributesFromMarkdown(markdown);
  const allLines = markdown
    .split("\n")
    .filter((line) => /^\|.*\|$/.test(line.trim()));
  const dataLines = allLines.filter(
    (line) => !ldIsMarkdownTableSeparatorLine(line),
  );
  const rows = dataLines.map(ldParseMarkdownTableCells);
  const maxCols = rows.length ? Math.max(...rows.map((row) => row.length)) : 0;
  rows.forEach((row) => {
    while (row.length < maxCols) row.push("");
  });
  return { attrs, rows };
}

function ldParseTreeSnippetMarkdown(markdown) {
  const inner = markdown.replace(/^```text\n/, "").replace(/\n```$/, "");
  return {
    items: inner.split("\n").map((line) => {
      const match = line.match(/^((?:│   |    )*)(?:├── |└── )([\s\S]+)$/);
      if (match) return { name: match[2], depth: match[1].length / 4 + 1 };
      return { name: line, depth: 0 };
    }),
  };
}

function ldParseColoredTextSnippetMarkdown(markdown) {
  const match = markdown.match(
    /^<span\s[^>]*color:([^;>"]+)[^>]*>([\s\S]*)<\/span>$/,
  );
  return match ? { color: match[1].trim(), content: match[2] } : {};
}

function ldParseColoredSectionSnippetMarkdown(markdown) {
  const borderMatch = markdown.match(/border-left:[^;]*solid\s+(#[0-9a-fA-F]{6})/);
  const contentMatch = markdown.match(/^<div[^>]*>\n\n([\s\S]*?)\n\n<\/div>$/);
  return {
    borderColor: borderMatch ? borderMatch[1] : undefined,
    content: contentMatch ? contentMatch[1] : undefined,
  };
}

function ldParseSnippetMarkdown(type, markdown, options = {}) {
  const text = (markdown || "").trim();
  switch (type) {
    case "collapsible":
      return ldParseCollapsibleSnippetMarkdown(text);
    case "link":
      return ldParseLinkSnippetMarkdown(text);
    case "doc-link":
      return ldParseDocLinkSnippetMarkdown(text);
    case "anchor-link":
      return ldParseAnchorLinkSnippetMarkdown(text);
    case "anchor-doc-link":
      return ldParseAnchorDocLinkSnippetMarkdown(text);
    case "ordered-list":
    case "unordered-list":
      return { content: text };
    case "code-block":
      return ldParseCodeBlockSnippetMarkdown(text, options);
    case "blockquote":
      return ldParseBlockquoteSnippetMarkdown(text);
    case "image":
      return ldParseImageSnippetMarkdown(text);
    case "heading-1":
    case "heading-2":
    case "heading-3":
    case "heading-4":
      return ldParseHeadingSnippetMarkdown(type, text);
    case "table":
      return ldParseTableSnippetMarkdown(text);
    case "tree":
      return ldParseTreeSnippetMarkdown(text);
    case "colored-text":
      return ldParseColoredTextSnippetMarkdown(text);
    case "colored-section":
      return ldParseColoredSectionSnippetMarkdown(text);
    default:
      return {};
  }
}
