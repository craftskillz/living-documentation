import { getCalloutIcon, imageWidthClass, parseCalloutType, parseImageComments } from "./contentAnnotations";

/**
 * Applies the viewer annotations to the HTML rendered for a generated page, where no script runs.
 * marked keeps these comments right before their block and escapes those written in code,
 * so only real annotations match.
 */

const QUOTE_TYPE_RE = /<!--\s*quote-type:\s*([a-z][a-z0-9_-]*)\s*-->/;
const QUOTE_TITLE_RE = /<!--\s*quote-title:\s*(.+?)\s*-->/;
const QUOTE_ICON_RE = /<!--\s*quote-icon\s*-->/;
const ANNOTATED_BLOCKQUOTE_RE = /((?:<!--\s*quote-(?:type|title|icon)\b[^\n]*?-->\s*)+)<blockquote( [^>]*)?>(\s*<p>)?/g;
const ANNOTATED_IMAGE_RE = /((?:<!--\s*image-(?:width|align):[^\n]*?-->\s*)+)(<p\b[^>]*>)?<img\b/g;

function escapeText(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function iconSpan(type: string | null, extraClass = ""): string {
  return `<span class="ld-callout-icon${extraClass}">${getCalloutIcon(type)}</span>`;
}

function annotateBlockquote(match: string, comments: string, attributes = "", firstParagraph = ""): string {
  const typeValue = comments.match(QUOTE_TYPE_RE)?.[1];
  const type = typeValue ? parseCalloutType(typeValue) : null;
  const title = comments.match(QUOTE_TITLE_RE)?.[1] ?? null;
  const icon = QUOTE_ICON_RE.test(comments);
  if (!type && !title && !icon) return match;

  const open = `<blockquote class="${type ? `ld-callout ld-callout-${type}` : "ld-callout"}"${attributes}>`;
  if (!title) return open + firstParagraph + (icon ? iconSpan(type, " ld-callout-icon-inline") : "");
  const titleSpan = `<span class="ld-callout-title">${escapeText(title)}</span>`;
  return `${open}<div class="ld-callout-header">${icon ? iconSpan(type) : ""}${titleSpan}</div>${firstParagraph}`;
}

function annotateImage(match: string, comments: string, paragraph = ""): string {
  const { width, align } = parseImageComments(comments);
  const classes = [width && imageWidthClass(width), align && `ld-image-align-${align}`].filter(Boolean);
  return classes.length ? `${paragraph}<img class="${classes.join(" ")}"` : match;
}

export function applyViewerAnnotations(html: string): string {
  return html.replace(ANNOTATED_BLOCKQUOTE_RE, annotateBlockquote).replace(ANNOTATED_IMAGE_RE, annotateImage);
}

/** Injected into every template. Untyped callouts keep the blockquote look of the template. */
export const ANNOTATION_STYLES = `<style>
  img[class*="ld-image-width-"] { max-width: 100%; max-height: none; height: auto; }
  img.ld-image-width-full { width: 100%; }
  img.ld-image-width-three-quarters { width: 75%; }
  img.ld-image-width-two-thirds { width: 66.6667%; }
  img.ld-image-width-half { width: 50%; }
  img.ld-image-width-third { width: 33.3333%; }
  img.ld-image-width-quarter { width: 25%; }
  img[class*="ld-image-align-"] { display: block; }
  img.ld-image-align-left { margin-left: 0; margin-right: auto; }
  img.ld-image-align-center { margin-left: auto; margin-right: auto; }
  img.ld-image-align-right { margin-left: auto; margin-right: 0; }
  blockquote.ld-callout-info { --callout-accent: rgb(59 130 246); --callout-bg: rgb(239 246 255); --callout-title: rgb(30 58 138); }
  blockquote.ld-callout-success { --callout-accent: rgb(34 197 94); --callout-bg: rgb(240 253 244); --callout-title: rgb(20 83 45); }
  blockquote.ld-callout-warning { --callout-accent: rgb(245 158 11); --callout-bg: rgb(255 251 235); --callout-title: rgb(120 53 15); }
  blockquote.ld-callout-error { --callout-accent: rgb(239 68 68); --callout-bg: rgb(254 242 242); --callout-title: rgb(127 29 29); }
  blockquote[class*="ld-callout-"] { background: var(--callout-bg); border-left-color: var(--callout-accent); }
  .ld-callout-header { display: flex; align-items: center; gap: .5rem; margin-bottom: .5rem; font-weight: 700; line-height: 1.3; color: var(--callout-title, inherit); }
  .ld-callout-icon { display: inline-flex; flex-shrink: 0; color: var(--callout-accent, currentColor); transform: scale(1.35); margin-right: .15rem; }
  .ld-callout-icon-inline { vertical-align: middle; margin-right: .4rem; transform: scale(1.2); }
</style>
`;
