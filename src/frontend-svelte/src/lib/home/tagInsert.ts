
export type TagLocation =
  | { ok: true; index: number }
  | { ok: false; reason: 'not-found' | 'ambiguous' };

const MASK_CHAR = '\u0000';
const FENCE_LINE = /^\s*(```|~~~)/;
const TABLE_LINE = /^\s*\|/;
const FRONTMATTER_OPEN = /^---\r?\n/;
const FRONTMATTER_CLOSE = /^---\s*$/;
const INLINE_CODE = /`[^`\n]*`/g;
const REGEX_SPECIALS = /[.*+?^${}()|[\]\\]/g;
const TAG_BRACKETS_LENGTH = '<>'.length;
const WHITESPACE_RUN = /\s+/;

const mask = (text: string): string => text.replace(/[^\r\n]/g, MASK_CHAR);

/** Same-length copy of the source where non-searchable zones can never match, so offsets stay valid. */
function maskUnsearchableZones(content: string, { maskTables = true } = {}): string {
  const lines = content.split('\n');
  let inFence = false;
  let frontmatterEnd = -1;
  if (FRONTMATTER_OPEN.test(content)) {
    frontmatterEnd = lines.findIndex((line, i) => i > 0 && FRONTMATTER_CLOSE.test(line));
  }
  return lines
    .map((line, i) => {
      if (i <= frontmatterEnd) return mask(line);
      if (FENCE_LINE.test(line)) {
        inFence = !inFence;
        return mask(line);
      }
      if (inFence || (maskTables && TABLE_LINE.test(line))) return mask(line);
      return line.replace(INLINE_CODE, mask);
    })
    .join('\n');
}

/** Source offset where `after` starts, if before+after occurs exactly once in the searchable source. */
export function locateTagInsertion(content: string, before: string, after: string): TagLocation {
  if (!(before + after).trim()) return { ok: false, reason: 'not-found' };
  const toPattern = (text: string) =>
    text.split(WHITESPACE_RUN).map((part) => part.replace(REGEX_SPECIALS, '\\$&')).join('\\s+');
  // Lookahead keeps overlapping occurrences countable; the capture holds the `before` part.
  const pattern = new RegExp(`(?=(${toPattern(before)})${toPattern(after)})`, 'g');
  const starts: number[] = [];
  for (const match of maskUnsearchableZones(content).matchAll(pattern)) {
    starts.push(match.index + match[1].length);
  }
  if (starts.length === 0) return { ok: false, reason: 'not-found' };
  if (starts.length > 1) return { ok: false, reason: 'ambiguous' };
  return { ok: true, index: starts[0] };
}

export function insertTagAt(content: string, index: number, name: string): string {
  return `${content.slice(0, index)}<${name}>${content.slice(index)}`;
}

export type TagRemovalLocation =
  | { ok: true; index: number }
  | { ok: false; reason: 'not-found' | 'ambiguous' };

/** Source offset of the `occurrence`-th lone `<name>` among searchable zones; refused when the source count differs from what was rendered. */
export function locateTagRemoval(
  content: string,
  name: string,
  occurrence: number,
  renderedCount: number,
): TagRemovalLocation {
  // Tables stay searchable: markers do render inside table cells.
  const masked = maskUnsearchableZones(content, { maskTables: false });
  const pattern = new RegExp(`<${name.replace(REGEX_SPECIALS, '\\$&')}>`, 'gi');
  const starts = [...masked.matchAll(pattern)].map((match) => match.index);
  if (starts.length === 0) return { ok: false, reason: 'not-found' };
  if (starts.length !== renderedCount) return { ok: false, reason: 'ambiguous' };
  if (!Number.isInteger(occurrence) || occurrence < 0 || occurrence >= starts.length) {
    return { ok: false, reason: 'not-found' };
  }
  return { ok: true, index: starts[occurrence] };
}

export function removeTagAt(content: string, index: number, name: string): string {
  const end = index + name.length + TAG_BRACKETS_LENGTH;
  if (content.slice(index, end).toLowerCase() !== `<${name.toLowerCase()}>`) {
    throw new Error(`No <${name}> tag at offset ${index}`);
  }
  return content.slice(0, index) + content.slice(end);
}
