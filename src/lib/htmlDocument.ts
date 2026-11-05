/**
 * Turns the HTML rendered from a Markdown document into what an HTML template presents:
 * a title, a lead, one <section> per top-level h2 and a table of contents.
 * Pure string logic: no parser dependency, the input is the output of marked.
 */

export interface StructuredHtml {
  /** Plain text, already HTML-escaped. */
  title: string;
  toc: string;
  content: string;
}

export interface HtmlTemplateValues extends StructuredHtml {
  language: string;
}

const LEADING_H1_RE = /^\s*<h1\b[^>]*>([\s\S]*?)<\/h1>\s*/i;
const TAG_RE = /<(\/?)([a-zA-Z][\w-]*)\b(?:[^>"']|"[^"]*"|'[^']*')*?(\/?)>/g;
const H2_RE = /^<h2\b[^>]*>([\s\S]*?)<\/h2>/i;
const VOID_ELEMENTS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
const PLACEHOLDER_RE = /\{\{(title|language|toc|content)\}\}/g;
// The page is served under /api/html-templates: relative images would no longer resolve from the root as in the viewer.
const RELATIVE_IMAGE_SRC_RE = /\bsrc="(?:\.\/)?(images(?:-ai)?\/)/g;

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

function decodeNumericEntities(text: string): string {
  return text.replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)));
}

function slugify(text: string): string {
  const slug = decodeNumericEntities(text)
    .replace(/&[a-z]+;/gi, " ")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "section";
}

/** Offsets of the h2 opening tags that are direct children of the document. */
function topLevelH2Offsets(html: string): number[] {
  const offsets: number[] = [];
  let depth = 0;
  for (const match of html.matchAll(TAG_RE)) {
    const [, closing, rawName, selfClosing] = match;
    const name = rawName.toLowerCase();
    if (VOID_ELEMENTS.has(name) || selfClosing) continue;
    if (closing) {
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (name === "h2" && depth === 0) offsets.push(match.index);
    depth += 1;
  }
  return offsets;
}

function uniqueAnchor(text: string, used: Map<string, number>): string {
  const slug = slugify(text);
  const count = (used.get(slug) ?? 0) + 1;
  used.set(slug, count);
  return count === 1 ? slug : `${slug}-${count}`;
}

export function structureHtml(html: string, fallbackTitle: string): StructuredHtml {
  const leadingH1 = html.match(LEADING_H1_RE);
  const title = leadingH1 ? stripTags(leadingH1[1]) : escapeHtml(fallbackTitle);
  const body = (leadingH1 ? html.slice(leadingH1[0].length) : html)
    .replace(/href="\?doc=/g, 'href="/?doc=')
    .replace(RELATIVE_IMAGE_SRC_RE, 'src="/$1');

  const offsets = topLevelH2Offsets(body);
  const lead = body.slice(0, offsets[0] ?? body.length).trim();
  const anchors = new Map<string, number>();
  const tocItems: string[] = [];
  const sections = offsets.map((start, index) => {
    const section = body.slice(start, offsets[index + 1] ?? body.length).trim();
    const heading = stripTags(section.match(H2_RE)?.[1] ?? "");
    const anchor = uniqueAnchor(heading, anchors);
    tocItems.push(`<li><a href="#${anchor}">${heading}</a></li>`);
    return `<section class="ld-section" id="${anchor}">${section}</section>`;
  });

  return {
    title,
    toc: tocItems.length ? `<ol>${tocItems.join("")}</ol>` : "",
    content: (lead ? `<div class="ld-lead">${lead}</div>` : "") + sections.join("\n"),
  };
}

/** Single pass: placeholders written in the document itself stay literal. */
export function fillHtmlTemplate(template: string, values: HtmlTemplateValues): string {
  return template.replace(PLACEHOLDER_RE, (_, key: keyof HtmlTemplateValues) => values[key]);
}
