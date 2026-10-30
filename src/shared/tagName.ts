const VALID_TAG_NAME = /^[a-z][a-z0-9-]*$/;
const WRAPPED_TAG = /^<([^<>]*)>$/;
const NAME_AND_TEXT = /^(\S+)(?:\s+([\s\S]*))?$/;
const FORBIDDEN_TEXT = /[<>=\n]/;

/**
 * Lone opening tag: a name, then optional free text (no `<`, `>`, `=` or newline).
 * Group 1 = name, group 2 = text. `=` keeps real HTML attributes out.
 */
export const LONE_TAG_SOURCE = '<([A-Za-z][A-Za-z0-9-]*)(?:[ \\t]+([^<>=\\n]*?))?[ \\t]*>';

/** "add-footnote", " <Add-Footnote> " → "add-footnote"; invalid → null. */
export function normalizeTagName(input: string): string | null {
  const trimmed = input.trim();
  const wrapped = WRAPPED_TAG.exec(trimmed);
  const name = (wrapped ? wrapped[1] : trimmed).trim().toLowerCase();
  return VALID_TAG_NAME.test(name) ? name : null;
}

/** "<Generate-Image : la  scène>" → { name: "generate-image", text: ": la scène" }; invalid → null. */
export function normalizeTag(input: string): { name: string; text: string } | null {
  const trimmed = input.trim();
  const wrapped = WRAPPED_TAG.exec(trimmed);
  const parts = NAME_AND_TEXT.exec((wrapped ? wrapped[1] : trimmed).trim());
  if (!parts) return null;
  const name = normalizeTagName(parts[1]);
  const text = (parts[2] ?? '').trim().replace(/[ \t]+/g, ' ');
  if (!name || FORBIDDEN_TEXT.test(text)) return null;
  return { name, text };
}
