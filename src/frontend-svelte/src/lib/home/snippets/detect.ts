// Pure snippet format detection (ported from snippet-detect.js).

import { looksLikeTableSnippet } from "../tableAttributes";
import {
  looksLikeOrderedListSnippet,
  looksLikeUnorderedListSnippet,
} from "./listMarkdown";

export function detectSnippetType(text: string): string | null {
  const t = (text || "").trim();
  if (/^\[.*?\]\(\?doc=.+#.+\)$/.test(t)) return "anchor-doc-link";
  if (/^\[.*?\]\(\?doc=.+\)$/.test(t)) return "doc-link";
  if (/^\[.*?\]\(#.+\)$/.test(t)) return "anchor-link";
  if (/^<!--\s*image-(?:width|align):/.test(t) || /^!\[.*?\]\(.*?\)$/.test(t)) return "image";
  if (/^\[.*?\]\(.*?\)$/.test(t)) return "link";
  if (/^<details[\s>]/i.test(t)) return "collapsible";
  if (/^<span\s[^>]*color:[^>]*>[\s\S]*<\/span>$/.test(t)) return "colored-text";
  if (/^<div\s[^>]*border-left[^>]*>/.test(t)) return "colored-section";
  if (/^```text\n/.test(t) && /[├└│]/.test(t)) return "tree";
  if (/^:::compare[ \t]*\n/.test(t)) return "compare";
  if (/^```/.test(t)) return "code-block";
  if (looksLikeTableSnippet(t)) return "table";
  if (/^<!--\s*quote-(?:type|title|icon)/.test(t) || /^> /.test(t)) return "blockquote";
  const headingMatch = /^(#{1,4}) [^\n]+$/.exec(t);
  if (headingMatch) return `heading-${headingMatch[1].length}`;
  if (/^(---|\n---\n)$/.test(t)) return "separator";
  if (looksLikeOrderedListSnippet(t)) return "ordered-list";
  if (looksLikeUnorderedListSnippet(t)) return "unordered-list";
  return null;
}
