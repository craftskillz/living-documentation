import { getFirstField } from "./frontmatter";

/** Frontmatter field holding the id of the HTML template chosen for a document. */
const HTML_TEMPLATE_FIELD = "html_template";

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
const FIELD_LINE_RE = new RegExp(`^${HTML_TEMPLATE_FIELD}\\s*:.*$`, "m");

export function getDocumentHtmlTemplate(content: string): string | null {
  return getFirstField(content, [HTML_TEMPLATE_FIELD])?.trim() || null;
}

export function setDocumentHtmlTemplate(content: string, templateId: string): string {
  const line = `${HTML_TEMPLATE_FIELD}: ${templateId}`;
  const frontmatter = content.match(FRONTMATTER_RE);
  if (!frontmatter) return `---\n${line}\n---\n\n${content}`;
  const fields = frontmatter[1];
  const nextFields = FIELD_LINE_RE.test(fields) ? fields.replace(FIELD_LINE_RE, line) : `${fields}\n${line}`;
  return `---\n${nextFields}\n---\n${content.slice(frontmatter[0].length)}`;
}
