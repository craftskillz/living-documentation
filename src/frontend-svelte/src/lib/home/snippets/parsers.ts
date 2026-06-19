// Snippets — Markdown parsers (ported from snippet-parsers.js).

import { parseTableSnippetMarkdown } from "./table";
import { parseTreeSnippetMarkdown } from "./tree";
import { parseImageAttributesFromMarkdown } from "../imageAttributes";
import {
  normalizeCodeBlockMarkdown,
  parseCodeBlockAttributesFromMarkdown,
  stripCodeBlockAttributesPrefix,
} from "../codeBlockAttributes";

export function ldParseCollapsibleSnippetMarkdown(markdown: string): {
  summary?: string;
  body: string;
} {
  const summaryMatch = markdown.match(/<summary>([\s\S]*?)<\/summary>/i);
  const bodyMatch = markdown.match(
    /<details\b[^>]*>[\s\S]*?<\/summary>\s*\n?([\s\S]*?)\s*<\/details>\s*$/i,
  );
  return {
    summary: summaryMatch ? summaryMatch[1].trim() : undefined,
    body: bodyMatch ? bodyMatch[1].trim() : "",
  };
}

export function ldParseLinkSnippetMarkdown(markdown: string): {
  text?: string;
  url?: string;
} {
  const match = markdown.match(/^\[([\s\S]*?)\]\(([\s\S]*?)\)$/);
  return match ? { text: match[1], url: match[2] } : {};
}

export function ldParseDocLinkSnippetMarkdown(markdown: string): {
  text?: string;
  docId?: string;
} {
  const match = markdown.match(/^\[([\s\S]*?)\]\(\?doc=([\s\S]*?)\)$/);
  return match ? { text: match[1], docId: decodeURIComponent(match[2]) } : {};
}

export function ldParseAnchorLinkSnippetMarkdown(markdown: string): {
  text?: string;
  anchor?: string;
} {
  const match = markdown.match(/^\[([\s\S]*?)\]\(#([\s\S]*?)\)$/);
  return match ? { text: match[1], anchor: match[2] } : {};
}

export function ldParseAnchorDocLinkSnippetMarkdown(markdown: string): {
  text?: string;
  docId?: string;
  anchor?: string;
} {
  const match = markdown.match(/^\[([\s\S]*?)\]\(\?doc=([\s\S]*?)#([\s\S]*?)\)$/);
  return match
    ? { text: match[1], docId: decodeURIComponent(match[2]), anchor: match[3] }
    : {};
}

export function ldParseCodeBlockSnippetMarkdown(
  markdown: string,
  options: { inlineIndent?: string } = {},
): { lang: string; code: string; width: string; align: string } {
  const normalized = normalizeCodeBlockMarkdown(markdown, options.inlineIndent || "");
  const attrs = parseCodeBlockAttributesFromMarkdown(normalized);
  const body = stripCodeBlockAttributesPrefix(normalized);
  const match = body.match(/^```[ \t]*([^\n]*)\n([\s\S]*?)\n[ \t]*```$/);
  if (!match) return { lang: "", code: "", width: "", align: "" };
  return {
    lang: match[1].trim(),
    code: match[2],
    width: attrs.width || "",
    align: attrs.align || "",
  };
}

const BLOCKQUOTE_TYPE_RE  = /^<!--\s*quote-type:\s*([a-z][a-z0-9_-]*)\s*-->$/;
const BLOCKQUOTE_TITLE_RE = /^<!--\s*quote-title:\s*(.+?)\s*-->$/;
const BLOCKQUOTE_ICON_RE  = /^<!--\s*quote-icon\s*-->$/;
const BLOCKQUOTE_TYPE_ALIASES: Record<string, string> = {
  note: "info", tip: "success", caution: "warning", danger: "error",
};

export function ldParseBlockquoteSnippetMarkdown(markdown: string): {
  type: string;
  title: string;
  icon: boolean;
  content: string;
} {
  const lines = markdown.split("\n");
  let type = "";
  let title = "";
  let icon = false;
  const contentLines: string[] = [];
  let pastPrefix = false;

  for (const line of lines) {
    if (!pastPrefix) {
      const tm = line.match(BLOCKQUOTE_TYPE_RE);
      if (tm) { type = BLOCKQUOTE_TYPE_ALIASES[tm[1]] ?? tm[1]; continue; }
      const titm = line.match(BLOCKQUOTE_TITLE_RE);
      if (titm) { title = titm[1]; continue; }
      if (BLOCKQUOTE_ICON_RE.test(line)) { icon = true; continue; }
      if (line.trim() === "") continue;
      pastPrefix = true;
    }
    contentLines.push(line.replace(/^>\s?/, ""));
  }

  return { type, title, icon, content: contentLines.join("\n") };
}

export function ldParseImageSnippetMarkdown(markdown: string): {
  alt?: string;
  url?: string;
  width: string;
  align: string;
} {
  const attrs = parseImageAttributesFromMarkdown(markdown);
  const match = markdown.match(/!\[([^\]\n]*?)\]\(([^\n]+?)\)\s*$/);
  return match
    ? { alt: match[1], url: match[2], width: attrs.width || "", align: attrs.align || "" }
    : { width: attrs.width || "", align: attrs.align || "" };
}

export function ldParseHeadingSnippetMarkdown(
  type: string,
  markdown: string,
): { text: string } {
  const level = Number(type.slice(-1));
  const match = markdown.match(new RegExp(`^#{${level}}\\s+(.+)$`));
  return { text: match ? match[1].trim() : "" };
}

export function ldParseColoredTextSnippetMarkdown(markdown: string): {
  color?: string;
  content?: string;
} {
  const match = markdown.match(/^<span\s[^>]*color:([^;>"]+)[^>]*>([\s\S]*)<\/span>$/);
  return match ? { color: match[1].trim(), content: match[2] } : {};
}

export function ldParseColoredSectionSnippetMarkdown(markdown: string): {
  borderColor?: string;
  content?: string;
} {
  const borderMatch = markdown.match(/border-left:[^;]*solid\s+(#[0-9a-fA-F]{6})/);
  const contentMatch = markdown.match(/^<div[^>]*>\n\n([\s\S]*?)\n\n<\/div>$/);
  return {
    borderColor: borderMatch ? borderMatch[1] : undefined,
    content: contentMatch ? contentMatch[1] : undefined,
  };
}

export function ldParseSnippetMarkdown(
  type: string,
  markdown: string,
  options: { inlineIndent?: string } = {},
): any {
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
      return ldParseCodeBlockSnippetMarkdown(markdown || "", options);
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
      return parseTableSnippetMarkdown(text);
    case "tree":
      return parseTreeSnippetMarkdown(text);
    case "colored-text":
      return ldParseColoredTextSnippetMarkdown(text);
    case "colored-section":
      return ldParseColoredSectionSnippetMarkdown(text);
    case "compare": {
      const m = text.match(/^:::compare[ \t]*\n([\s\S]*?)\n?:::[ \t]*$/);
      return { content: m ? m[1] : "" };
    }
    default:
      return {};
  }
}
