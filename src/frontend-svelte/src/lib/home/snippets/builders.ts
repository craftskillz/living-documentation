// Snippets — Markdown builders (ported from snippet-builders.js).

import { buildTableAttributesPrefix } from "../tableAttributes";
import {
  buildOrderedListMarkdown,
  buildUnorderedListMarkdown,
} from "./listMarkdown";
import { buildImageAttributesPrefix } from "../imageAttributes";
import { buildCodeBlockAttributesPrefix } from "../codeBlockAttributes";

function ldSnippetValueOr(value: string | undefined, fallback: string): string {
  return value || fallback;
}

function cleanMermaidLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

const MERMAID_PIE_MAX_TOTAL = 100;
const MERMAID_TREE_MAX_LEVEL = 6;
const MERMAID_TREE_INDENT_WIDTH = 4;

export function ldBuildCollapsibleSnippetMarkdown(data: {
  summary?: string;
  summaryFallback: string;
  body?: string;
  bodyFallback: string;
}): string {
  const summary = ldSnippetValueOr(data.summary, data.summaryFallback);
  const body = data.body && data.body.trim() !== "" ? data.body : data.bodyFallback;
  return `<details>\n<summary>${summary}</summary>\n\n${body}\n\n</details>`;
}

export function ldBuildLinkSnippetMarkdown(data: {
  text?: string;
  textFallback: string;
  url?: string;
}): string {
  const text = ldSnippetValueOr(data.text, data.textFallback);
  const url = ldSnippetValueOr(data.url, "https://...");
  return `<a href="${url}" target="_blank">${text}</a>`;
}

export function ldBuildDocLinkSnippetMarkdown(data: {
  text?: string;
  title?: string;
  docId: string;
}): string {
  const text = ldSnippetValueOr(data.text, data.title || data.docId);
  return `[${text}](?doc=${encodeURIComponent(data.docId)})`;
}

export function ldBuildAnchorLinkSnippetMarkdown(data: {
  text?: string;
  textFallback: string;
  anchor?: string;
  anchorFallback: string;
}): string {
  const text = ldSnippetValueOr(data.text, data.textFallback);
  const anchor = ldSnippetValueOr(data.anchor, data.anchorFallback);
  return `[${text}](#${anchor})`;
}

export function ldBuildAnchorDocLinkSnippetMarkdown(data: {
  text?: string;
  textFallback: string;
  anchor?: string;
  anchorFallback: string;
  docId: string;
}): string {
  const text = ldSnippetValueOr(data.text, data.textFallback);
  const anchor = ldSnippetValueOr(data.anchor, data.anchorFallback);
  return `[${text}](?doc=${encodeURIComponent(data.docId)}#${anchor})`;
}

export function ldBuildCodeBlockSnippetMarkdown(data: {
  lang?: string;
  code?: string;
  inlineIndent?: string;
  width?: string;
  align?: string;
}): string {
  const lang = data.lang || "";
  const code = ldSnippetValueOr(data.code, "// code ici");
  const prefix = buildCodeBlockAttributesPrefix({
    language: lang,
    width: data.width,
    align: data.align,
  });
  const fenced = `\`\`\`${lang}\n${code}\n\`\`\``;
  const block = prefix ? `${prefix}\n${fenced}` : fenced;
  if (!data.inlineIndent) return block;
  return block
    .split("\n")
    .map((line) => data.inlineIndent + line)
    .join("\n");
}

export function ldBuildBlockquoteSnippetMarkdown(data: {
  content?: string;
  type?: string;
  title?: string;
  icon?: boolean;
}): string {
  const content = ldSnippetValueOr(data.content, "Citation ici\n\n— Auteur");
  const bq = content
    .split("\n")
    .map((line) => (line.trim() ? `> ${line}` : ">"))
    .join("\n");
  const prefixLines: string[] = [];
  if (data.type)  prefixLines.push(`<!-- quote-type: ${data.type} -->`);
  if (data.title) prefixLines.push(`<!-- quote-title: ${data.title} -->`);
  if (data.icon)  prefixLines.push(`<!-- quote-icon -->`);
  return prefixLines.length > 0 ? `${prefixLines.join("\n")}\n${bq}` : bq;
}

export function ldBuildHeadingSnippetMarkdown(
  type: string,
  data: { text?: string; fallback: string },
): string {
  const level = Number(type.slice(-1));
  const text = ldSnippetValueOr(data.text?.trim(), data.fallback);
  return `${"#".repeat(level)} ${text}`;
}

export function ldBuildImageSnippetMarkdown(data: {
  alt?: string;
  url?: string;
  width?: string;
  align?: string;
}): string {
  const alt = ldSnippetValueOr(data.alt, "image");
  const url = ldSnippetValueOr(data.url, "./images/mon-image.png");
  const prefix = buildImageAttributesPrefix({ width: data.width, align: data.align });
  const image = `![${alt}](${url})`;
  return prefix ? `${prefix}\n${image}` : image;
}

export function ldBuildTableSnippetMarkdown(data: {
  style?: string;
  bordered?: boolean;
  color?: string;
  markdown: string;
}): string {
  const prefix = buildTableAttributesPrefix({
    style: data.style || "",
    border: data.bordered ? "bordered" : "",
    color: data.color || "",
  });
  return (prefix ? `${prefix}\n` : "") + data.markdown;
}

export function ldBuildDiagramSnippetMarkdown(data: {
  label: string;
  imageName: string;
  id: string;
}): string {
  return `[![${data.label}](./images/${data.imageName})](/diagram?id=${data.id})`;
}

export function ldBuildMermaidSnippetMarkdown(data: {
  kind?: string;
  title?: string;
  titleFallback?: string;
  items?: Array<{ label?: string; value?: string | number }>;
  itemLabelFallback?: string;
  pieTitle?: string;
  pieTitleFallback?: string;
  pieItems?: Array<{ label?: string; value?: string | number }>;
  pieItemLabelFallback?: string;
  timelineTitle?: string;
  timelineTitleFallback?: string;
  timelineItems?: Array<{ period?: string; event?: string }>;
  timelinePeriodFallback?: string;
  timelineEventFallback?: string;
  treeItems?: Array<{ level?: string | number; label?: string; decorator?: string; note?: string }>;
  treeLabelFallback?: string;
  sequenceItems?: Array<{
    type?: string;
    from?: string;
    arrow?: string;
    to?: string;
    message?: string;
    notePosition?: string;
  }>;
  sequenceActorFallback?: string;
  sequenceMessageFallback?: string;
}): string {
  const kind = data.kind || "pie";
  if (kind === "timeline") {
    const title = cleanMermaidLine(
      data.timelineTitle || data.timelineTitleFallback || "DOCUMENTATION ROADMAP",
    );
    const grouped = new Map<string, string[]>();
    (data.timelineItems || []).forEach((item, index) => {
      const period = cleanMermaidLine(
        item.period || `${data.timelinePeriodFallback || "Period"} ${index + 1}`,
      );
      const event = cleanMermaidLine(
        item.event || `${data.timelineEventFallback || "Event"} ${index + 1}`,
      );
      grouped.set(period, [...(grouped.get(period) || []), event]);
    });
    const items = [...grouped.entries()].map(
      ([period, events]) => `    ${period} : ${events.join(" : ")}`,
    );
    return `\`\`\`mermaid\ntimeline\n    title ${title}\n${items.join("\n")}\n\`\`\``;
  }
  if (kind === "tree-view") {
    const items = (data.treeItems || []).map((item, index) => {
      const rawLevel = Number(item.level);
      const level = Number.isFinite(rawLevel)
        ? Math.min(MERMAID_TREE_MAX_LEVEL, Math.max(0, rawLevel))
        : 0;
      const indent = " ".repeat((level + 1) * MERMAID_TREE_INDENT_WIDTH);
      const label = cleanMermaidLine(
        item.label || `${data.treeLabelFallback || "Node"} ${index + 1}`,
      );
      const decorator = cleanMermaidLine(item.decorator || "");
      const note = cleanMermaidLine(item.note || "");
      const decoratorPart = decorator ? ` ${decorator}` : "";
      const notePart = note ? ` ## ${note}` : "";
      return `${indent}${label}${decoratorPart}${notePart}`;
    });
    return `\`\`\`mermaid\ntreeView-beta\n${items.join("\n")}\n\`\`\``;
  }
  if (kind === "sequence") {
    const items = (data.sequenceItems || []).map((item, index) => {
      const to = cleanMermaidLine(
        item.to || `${data.sequenceActorFallback || "Participant"} ${index + 1}`,
      );
      const message = cleanMermaidLine(
        item.message || `${data.sequenceMessageFallback || "Message"} ${index + 1}`,
      );
      if (item.type === "note") {
        const notePosition = cleanMermaidLine(item.notePosition || "right of");
        return `    Note ${notePosition} ${to}: ${message}`;
      }
      const from = cleanMermaidLine(
        item.from || `${data.sequenceActorFallback || "Participant"} ${index + 1}`,
      );
      const arrow = cleanMermaidLine(item.arrow || "->>");
      return `    ${from} ${arrow} ${to}: ${message}`;
    });
    return `\`\`\`mermaid\nsequenceDiagram\n${items.join("\n")}\n\`\`\``;
  }
  if (kind !== "pie") return "```mermaid\n```\n";

  const title = cleanMermaidLine(
    data.pieTitle || data.title || data.pieTitleFallback || data.titleFallback || "DOC WORKFLOW",
  );
  let remaining = MERMAID_PIE_MAX_TOTAL;
  const items = (data.pieItems || data.items || []).map((item, index) => {
    const rawLabel = (item.label || `${data.pieItemLabelFallback || data.itemLabelFallback || "Item"} ${index + 1}`).trim();
    const label = rawLabel.replace(/"/g, '\\"');
    const rawValue = Number(item.value);
    const positiveValue = Number.isFinite(rawValue) ? Math.max(0, rawValue) : 0;
    const value = Math.min(remaining, positiveValue);
    remaining -= value;
    return `         "${label}" : ${value}`;
  });
  return `\`\`\`mermaid\npie title ${title}\n${items.join("\n")}\n\`\`\``;
}

export interface SwatchColor {
  bg: string;
  border: string;
  text: string;
}

export function ldBuildColoredTextSnippetMarkdown(data: {
  color: SwatchColor;
  content: string;
}): string {
  return `<span style="color:${data.color.border};">${data.content}</span>`;
}

export function ldBuildColoredSectionSnippetMarkdown(data: {
  color: SwatchColor;
  content: string;
}): string {
  return `<div style="background:${data.color.bg};border-left:4px solid ${data.color.border};color:${data.color.text};padding:1rem 1.25rem;border-radius:0.375rem;margin:1rem 0;">\n\n${data.content}\n\n</div>`;
}

export function ldBuildColumnsSnippetMarkdown(data: {
  columns?: number;
  ratio?: string;
  verticalAlign?: string;
  textAlign?: string;
  gap?: string;
  bodyFallback: string;
}): string {
  const count = Math.max(2, Math.min(6, Math.round(Number(data.columns)) || 2));
  // Only emit options that differ from the defaults (vertical-align: center, gap: md, no
  // text-align) so the directive stays minimal. The ratio is positional, right after the colon.
  const opts: string[] = [];
  if (data.ratio?.trim()) opts.push(data.ratio.trim());
  if (data.verticalAlign && data.verticalAlign !== "center") {
    opts.push(`vertical-align: ${data.verticalAlign}`);
  }
  if (data.textAlign) opts.push(`text-align: ${data.textAlign}`);
  if (data.gap && data.gap !== "md") opts.push(`gap: ${data.gap}`);
  const header = opts.length ? `<!-- layout-columns: ${opts.join(" | ")} -->` : `<!-- layout-columns -->`;
  const columns: string[] = [];
  for (let i = 1; i <= count; i += 1) {
    columns.push(`<!-- col -->\n\n${data.bodyFallback} ${i}`);
  }
  // Blank lines around every marker are required so marked parses them as standalone blocks.
  return `${header}\n\n${columns.join("\n\n")}\n\n<!-- /layout-columns -->`;
}

export function ldBuildSnippetMarkdown(type: string, data: any): string {
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
      return buildOrderedListMarkdown(data.content);
    case "unordered-list":
      return buildUnorderedListMarkdown(data.content);
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
    case "mermaid":
      return ldBuildMermaidSnippetMarkdown(data);
    case "colored-text":
      return ldBuildColoredTextSnippetMarkdown(data);
    case "colored-section":
      return ldBuildColoredSectionSnippetMarkdown(data);
    case "emojis":
      return data.value;
    case "local-search":
      return `<div data-ld-local-search></div>`;
    case "compare":
      return `:::compare\n${data.content || ""}\n:::`;
    case "columns":
      return ldBuildColumnsSnippetMarkdown(data);
    default:
      return "";
  }
}
