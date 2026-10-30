const VALID_TAG_NAME = /^[a-z][a-z0-9-]*$/;
const WRAPPED_TAG = /^<([^<>]*)>$/;

/** "add-footnote", " <Add-Footnote> " → "add-footnote"; invalid → null. */
export function normalizeTagName(input: string): string | null {
  const trimmed = input.trim();
  const wrapped = WRAPPED_TAG.exec(trimmed);
  const name = (wrapped ? wrapped[1] : trimmed).trim().toLowerCase();
  return VALID_TAG_NAME.test(name) ? name : null;
}
