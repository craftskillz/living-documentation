// ── Pure snippet format detection ────────────────────────────────────────────
// Given a raw piece of Markdown/HTML text, returns the canonical snippet type
// used by the snippets modal, or null if no format matches.
// Loaded as a classic script; exposes `detectSnippetType` as a global.

function detectSnippetType(text) {
  const t = text.trim();
  // anchor-doc-link before doc-link and anchor-link
  if (/^\[.*?\]\(\?doc=.+#.+\)$/.test(t)) return "anchor-doc-link";
  if (/^\[.*?\]\(\?doc=.+\)$/.test(t)) return "doc-link";
  if (/^\[.*?\]\(#.+\)$/.test(t)) return "anchor-link";
  if (/^!\[.*?\]\(.*?\)$/.test(t)) return "image";
  if (/^\[.*?\]\(.*?\)$/.test(t)) return "link";
  if (/^<details[\s>]/i.test(t)) return "collapsible";
  if (/^<span\s[^>]*color:[^>]*>[\s\S]*<\/span>$/.test(t)) return "colored-text";
  if (/^<div\s[^>]*border-left[^>]*>/.test(t)) return "colored-section";
  if (/^```text\n/.test(t) && /[├└│]/.test(t)) return "tree";
  if (/^```/.test(t)) return "code-block";
  if (/^(\| *.*? *\|)+\n(\| *-+.*\|)+/.test(t)) return "table";
  if (/^> /.test(t)) return "blockquote";
  if (/^(---|\n---\n)$/.test(t)) return "separator";
  if (/^1\. /.test(t)) return "ordered-list";
  if (/^- /.test(t)) return "unordered-list";
  return null;
}
