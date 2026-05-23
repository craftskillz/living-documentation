// ── Snippets — Markdown builders ───────────────────────────────────────────
// Pure Markdown reconstruction helpers used by the snippets modal.
// Loaded before snippets.js so the modal only gathers DOM values.

function ldSnippetValueOr(value, fallback) {
  return value || fallback;
}

function ldBuildCollapsibleSnippetMarkdown(data) {
  const summary = ldSnippetValueOr(data.summary, data.summaryFallback);
  const body = data.body && data.body.trim() !== ""
    ? data.body
    : data.bodyFallback;
  return `<details>\n<summary>${summary}</summary>\n\n${body}\n\n</details>`;
}

function ldBuildLinkSnippetMarkdown(data) {
  const text = ldSnippetValueOr(data.text, data.textFallback);
  const url = ldSnippetValueOr(data.url, "https://...");
  return `<a href="${url}" target="_blank">${text}</a>`;
}

function ldBuildDocLinkSnippetMarkdown(data) {
  const text = ldSnippetValueOr(data.text, data.title || data.docId);
  return `[${text}](?doc=${encodeURIComponent(data.docId)})`;
}

function ldBuildAnchorLinkSnippetMarkdown(data) {
  const text = ldSnippetValueOr(data.text, data.textFallback);
  const anchor = ldSnippetValueOr(data.anchor, data.anchorFallback);
  return `[${text}](#${anchor})`;
}

function ldBuildAnchorDocLinkSnippetMarkdown(data) {
  const text = ldSnippetValueOr(data.text, data.textFallback);
  const anchor = ldSnippetValueOr(data.anchor, data.anchorFallback);
  return `[${text}](?doc=${encodeURIComponent(data.docId)}#${anchor})`;
}

function ldBuildCodeBlockSnippetMarkdown(data) {
  const lang = data.lang || "";
  const code = ldSnippetValueOr(data.code, "// code ici");
  const block = `\`\`\`${lang}\n${code}\n\`\`\``;
  if (!data.inlineIndent) return block;
  return block
    .split("\n")
    .map((line) => data.inlineIndent + line)
    .join("\n");
}

function ldBuildBlockquoteSnippetMarkdown(data) {
  const content = ldSnippetValueOr(data.content, "Citation ici\n\n— Auteur");
  return content
    .split("\n")
    .map((line) => (line.trim() ? `> ${line}` : ">"))
    .join("\n");
}

function ldBuildHeadingSnippetMarkdown(type, data) {
  const level = Number(type.slice(-1));
  const text = ldSnippetValueOr(data.text && data.text.trim(), data.fallback);
  return `${"#".repeat(level)} ${text}`;
}

function ldBuildImageSnippetMarkdown(data) {
  const alt = ldSnippetValueOr(data.alt, "image");
  const url = ldSnippetValueOr(data.url, "./images/mon-image.png");
  return `![${alt}](${url})`;
}

function ldBuildTableSnippetMarkdown(data) {
  const prefix = ldBuildTableAttributesPrefix({
    style: data.style || "",
    border: data.bordered ? "bordered" : "",
    color: data.color || "",
  });
  return (prefix ? prefix + "\n" : "") + data.markdown;
}

function ldBuildDiagramSnippetMarkdown(data) {
  return `[![${data.label}](./images/${data.imageName})](/diagram?id=${data.id})`;
}

function ldBuildColoredTextSnippetMarkdown(data) {
  return `<span style="color:${data.color.border};">${data.content}</span>`;
}

function ldBuildColoredSectionSnippetMarkdown(data) {
  return `<div style="background:${data.color.bg};border-left:4px solid ${data.color.border};color:${data.color.text};padding:1rem 1.25rem;border-radius:0.375rem;margin:1rem 0;">\n\n${data.content}\n\n</div>`;
}

function ldBuildSnippetMarkdown(type, data) {
  switch (type) {
    case "collapsible":
      return ldBuildCollapsibleSnippetMarkdown(data);
    case "link":
      return ldBuildLinkSnippetMarkdown(data);
    case "doc-link":
      return ldBuildDocLinkSnippetMarkdown(data);
    case "anchor-link":
      return ldBuildAnchorLinkSnippetMarkdown(data);
    case "anchor-doc-link":
      return ldBuildAnchorDocLinkSnippetMarkdown(data);
    case "ordered-list":
      return ldBuildOrderedListMarkdown(data.content);
    case "unordered-list":
      return ldBuildUnorderedListMarkdown(data.content);
    case "code-block":
      return ldBuildCodeBlockSnippetMarkdown(data);
    case "blockquote":
      return ldBuildBlockquoteSnippetMarkdown(data);
    case "separator":
      return `\n---\n`;
    case "heading-1":
    case "heading-2":
    case "heading-3":
    case "heading-4":
      return ldBuildHeadingSnippetMarkdown(type, data);
    case "image":
      return ldBuildImageSnippetMarkdown(data);
    case "table":
      return ldBuildTableSnippetMarkdown(data);
    case "tree":
      return data.markdown;
    case "diagram":
      return ldBuildDiagramSnippetMarkdown(data);
    case "colored-text":
      return ldBuildColoredTextSnippetMarkdown(data);
    case "colored-section":
      return ldBuildColoredSectionSnippetMarkdown(data);
    case "emojis":
      return data.value;
    case "local-search":
      return `<div data-ld-local-search></div>`;
    default:
      return "";
  }
}
