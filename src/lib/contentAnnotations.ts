/**
 * Vocabulary of the annotations a document carries in HTML comments (quote-*, image-*),
 * shared by the viewer and by the generated HTML pages.
 */

export type ImageWidth = "full" | "3/4" | "2/3" | "1/2" | "1/3" | "1/4";
export type ImageAlign = "left" | "center" | "right";

export interface ImageAttrs {
  width: ImageWidth | null;
  align: ImageAlign | null;
}

/** Maps alias types to their canonical form used in the select. */
const CALLOUT_TYPE_ALIASES: Record<string, string> = {
  note: "info",
  tip: "success",
  caution: "warning",
  danger: "error",
};

const ALLOWED_CALLOUT_TYPES = new Set(["info", "success", "warning", "error", ...Object.keys(CALLOUT_TYPE_ALIASES)]);

const CALLOUT_ICONS: Record<string, string> = {
  info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>',
  success:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>',
  warning:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>',
  error:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/></svg>',
};

/** The canonical callout type, or null when the value is not a known type. */
export function parseCalloutType(value: string): string | null {
  if (!ALLOWED_CALLOUT_TYPES.has(value)) return null;
  return CALLOUT_TYPE_ALIASES[value] ?? value;
}

export function getCalloutIcon(type: string | null): string {
  return CALLOUT_ICONS[parseCalloutType(type ?? "") ?? ""] ?? CALLOUT_ICONS.info;
}

const ALLOWED_WIDTHS = new Set<ImageWidth>(["full", "3/4", "2/3", "1/2", "1/3", "1/4"]);
const ALLOWED_ALIGNS = new Set<ImageAlign>(["left", "center", "right"]);

/** Reads the image-width / image-align comments of a prefix; invalid values are ignored. */
export function parseImageComments(comments: string): ImageAttrs {
  let width: ImageWidth | null = null;
  let align: ImageAlign | null = null;
  const re = /<!--\s*image-(width|align):\s*([^\s]+)\s*-->/g;
  for (const match of (comments || "").matchAll(re)) {
    const [, kind, value] = match;
    if (kind === "width" && ALLOWED_WIDTHS.has(value as ImageWidth)) {
      width = value as ImageWidth;
    }
    if (kind === "align" && ALLOWED_ALIGNS.has(value as ImageAlign)) {
      align = value as ImageAlign;
    }
  }
  return { width, align };
}

export function imageWidthClass(width: ImageWidth): string {
  return {
    full: "ld-image-width-full",
    "3/4": "ld-image-width-three-quarters",
    "2/3": "ld-image-width-two-thirds",
    "1/2": "ld-image-width-half",
    "1/3": "ld-image-width-third",
    "1/4": "ld-image-width-quarter",
  }[width];
}
