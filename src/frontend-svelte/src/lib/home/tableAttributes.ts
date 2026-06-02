import type { TableAttrs } from "./types";

const VALUE = "[a-z][a-z0-9_-]*";
const COMMENT = "<!--\\s*table-(?:style|border|color):\\s*" + VALUE + "\\s*-->";
const PREFIX = "(?:" + COMMENT + "\\n){0,3}";
const TABLE_START = "\\|[^\\n]*\\|\\n\\|[ \\t:|-]*-[ \\t:|-]*\\|";

function parsePrefix(prefix: string): TableAttrs {
  let style: string | null = null, border: string | null = null, color: string | null = null;
  const re = /<!--\s*table-(style|border|color):\s*([a-z][a-z0-9_-]*)\s*-->/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(prefix || ""))) {
    const [, kind, value] = m;
    if (kind === "style") style = value;
    else if (kind === "border") border = value;
    else if (kind === "color") color = value;
  }
  return { style, border, color };
}

export function collectTableAttributesFromSource(source: string): TableAttrs[] {
  if (typeof source !== "string") return [];
  const attrs: TableAttrs[] = [];
  const re = new RegExp("(" + PREFIX + ")(" + TABLE_START + ")", "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    attrs.push(parsePrefix(m[1] || ""));
  }
  return attrs;
}
