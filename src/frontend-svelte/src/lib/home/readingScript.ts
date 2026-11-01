// Reading-script builder for the text-to-speech feature.
//
// Turns a rendered Markdown container (#doc-content) into an ordered list of
// "segments" describing WHAT to speak and WHICH element to highlight. This layer
// is engine-agnostic and pure (DOM in → data out), so it can be unit-tested on
// its own and reused regardless of the TTS engine.
//
// Widgets (code blocks, images, Mermaid diagrams, tables) are read differently
// from prose: they are announced rather than read verbatim.

export type SegmentType =
  | "heading"
  | "paragraph"
  | "list-item"
  | "quote"
  | "code"
  | "image"
  | "diagram"
  | "table";

export interface ReadingSentence {
  text: string;
  // Character offsets within the segment element's textContent. Used by the
  // player to build a DOM Range for sentence-level highlighting. For announced
  // widgets the offsets cover the whole element (highlight the element as one).
  start: number;
  end: number;
}

export interface ReadingSegment {
  type: SegmentType;
  el: HTMLElement; // highlight target / range root
  spokenText: string; // full text handed to the TTS engine
  sentences: ReadingSentence[];
  // When true the player highlights the whole element (announced widget) rather
  // than per-sentence ranges.
  highlightWhole: boolean;
}

export interface ReadingScriptOptions {
  // Announcements (pass translated strings for i18n). `{alt}` is interpolated.
  codeLabel: string; // e.g. "Code block."
  imageLabel: string; // e.g. "Image: {alt}." — {alt} replaced, or dropped if empty
  diagramLabel: string; // e.g. "Diagram."
  tableLabel: string; // e.g. "Table."
  // Read the verbatim content of these widgets instead of announcing them.
  readCode?: boolean;
}

const DEFAULTS: ReadingScriptOptions = {
  codeLabel: "Code block.",
  imageLabel: "Image: {alt}.",
  diagramLabel: "Diagram.",
  tableLabel: "Table.",
  readCode: false,
};

const HEADING_TAGS = new Set(["H1", "H2", "H3", "H4", "H5", "H6"]);

function isMermaid(el: Element): boolean {
  return el.classList.contains("mermaid") || el.querySelector(".mermaid") !== null;
}

// Split prose into sentences, keeping offsets into the source string. Pragmatic:
// breaks on . ! ? … (and their grouped forms) followed by whitespace/end, and on
// hard line breaks. Good enough for highlighting + chunked synthesis.
export function splitSentences(text: string): ReadingSentence[] {
  const out: ReadingSentence[] = [];
  const re = /[^.!?…\n]*(?:[.!?…]+|\n+|$)/g;
  for (const m of text.matchAll(re)) {
    const raw = m[0];
    if (raw.length === 0) continue;
    const trimmedStart = raw.length - raw.trimStart().length;
    const trimmedText = raw.trim();
    if (trimmedText) {
      const start = m.index + trimmedStart;
      out.push({ text: trimmedText, start, end: start + trimmedText.length });
    }
  }
  return out;
}

// Keep the spoken script and its DOM offsets in sync. Only footnote navigation
// links are excluded: ordinary numbers, exponents and note definitions remain.
const FOOTNOTE_NAVIGATION = [
  'a[aria-describedby][id^="ld-fn-"]',
  'a[aria-label][href^="#ld-fn-"]',
  '[role="doc-noteref"]',
  '[role="doc-backlink"]',
].join(",");

export function readingTextNodes(el: HTMLElement): Text[] {
  const nodes: Text[] = [];
  const walker = el.ownerDocument.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return node.parentElement?.closest(FOOTNOTE_NAVIGATION)
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT;
    },
  });
  let node = walker.nextNode();
  while (node) {
    nodes.push(node as Text);
    node = walker.nextNode();
  }
  return nodes;
}

export interface ReadingCharacter {
  node: Text;
  offset: number;
}

// One entry per character of the segment's normalised spokenText (collapsed
// whitespace, no leading space): an index in spokenText is an index in this list.
export function readingCharacters(el: HTMLElement): ReadingCharacter[] {
  const characters: ReadingCharacter[] = [];
  let previousWasSpace = true;
  for (const node of readingTextNodes(el)) {
    for (let offset = 0; offset < node.data.length; offset++) {
      const isSpace = /\s/.test(node.data[offset]);
      if (!isSpace || !previousWasSpace) characters.push({ node, offset });
      previousWasSpace = isSpace;
    }
  }
  return characters;
}

function textSegment(el: HTMLElement, type: SegmentType): ReadingSegment | null {
  const spokenText = readingTextNodes(el).map(node => node.data).join("").replace(/\s+/g, " ").trim();
  if (!spokenText) return null;
  // Sentence offsets are computed against the normalised text the player will
  // also use; ranges are built from the same filtered text nodes.
  const sentences = splitSentences(spokenText);
  return {
    type,
    el,
    spokenText,
    sentences: sentences.length ? sentences : [{ text: spokenText, start: 0, end: spokenText.length }],
    highlightWhole: false,
  };
}

function announce(el: HTMLElement, type: SegmentType, text: string): ReadingSegment | null {
  const spokenText = text.trim();
  if (!spokenText) return null;
  return {
    type,
    el,
    spokenText,
    sentences: [{ text: spokenText, start: 0, end: spokenText.length }],
    highlightWhole: true,
  };
}

// Recursively walk the rendered container, emitting one segment per terminal
// block. Containers (lists, wrapper divs) are descended into.
function walk(node: Element, opts: ReadingScriptOptions, out: ReadingSegment[]): void {
  for (const child of Array.from(node.children) as HTMLElement[]) {
    const tag = child.tagName;

    // Widgets first (order matters: a <pre> may contain <code>).
    if (isMermaid(child)) {
      push(out, announce(child, "diagram", opts.diagramLabel));
      continue;
    }
    if (tag === "PRE" || (tag === "DIV" && child.querySelector(":scope > pre"))) {
      push(out, opts.readCode ? textSegment(child, "code") : announce(child, "code", opts.codeLabel));
      continue;
    }
    if (tag === "TABLE") {
      push(out, announce(child, "table", opts.tableLabel));
      continue;
    }
    if (tag === "IMG" || (tag === "FIGURE" && child.querySelector("img"))) {
      const img = (tag === "IMG" ? child : child.querySelector("img")) as HTMLImageElement | null;
      const alt = img?.getAttribute("alt")?.trim() ?? "";
      const label = opts.imageLabel.includes("{alt}")
        ? alt
          ? opts.imageLabel.replace("{alt}", alt)
          : opts.imageLabel.replace(/:?\s*\{alt\}/, "").trim() || "Image."
        : opts.imageLabel;
      push(out, announce(child, "image", label));
      continue;
    }

    // Prose blocks (terminal — do not descend).
    if (HEADING_TAGS.has(tag)) {
      push(out, textSegment(child, "heading"));
      continue;
    }
    if (tag === "P") {
      push(out, textSegment(child, "paragraph"));
      continue;
    }
    if (tag === "LI") {
      push(out, textSegment(child, "list-item"));
      continue;
    }
    if (tag === "BLOCKQUOTE") {
      // Descend if it wraps block children, else read as a quote.
      if (child.querySelector(":scope > p, :scope > ul, :scope > ol")) {
        walk(child, opts, out);
      } else {
        push(out, textSegment(child, "quote"));
      }
      continue;
    }

    // Containers — descend.
    if (tag === "UL" || tag === "OL" || tag === "DIV" || tag === "SECTION" || tag === "DETAILS") {
      walk(child, opts, out);
      continue;
    }

    if (tag === "HR") continue; // skip separators
  }
}

function push(out: ReadingSegment[], seg: ReadingSegment | null): void {
  if (seg) out.push(seg);
}

export function buildReadingScript(
  container: HTMLElement,
  options: Partial<ReadingScriptOptions> = {},
): ReadingSegment[] {
  const opts = { ...DEFAULTS, ...options };
  const out: ReadingSegment[] = [];
  walk(container, opts, out);
  return out;
}

// Stable across a re-render of the same content, unlike a DOM Range.
export interface ReadingStart {
  segment: number;
  offset: number; // in the segment's spokenText
}

// A drag can begin in the middle of a word: the reading starts on the whole word.
function wordStart(segment: ReadingSegment, offset: number): number {
  const floor = segment.sentences.find(sentence => sentence.end > offset)?.start ?? 0;
  let start = offset;
  while (start > floor && /\S/.test(segment.spokenText[start - 1])) start--;
  return start;
}

// Where a reading starts for this selection: its first readable character, or
// the next one when it begins on text that is not spoken (footnote marker,
// separator, end of a block). Null when the selection is not in the document.
export function readingStartFromSelection(
  root: HTMLElement,
  selection: Selection | null,
  options: Partial<ReadingScriptOptions> = {},
): ReadingStart | null {
  if (!selection || selection.isCollapsed || !selection.rangeCount) return null;
  const range = selection.getRangeAt(0);
  if (!range.intersectsNode(root)) return null;
  const point = range.cloneRange();
  point.collapse(true);

  const segments = buildReadingScript(root, options);
  for (const [index, segment] of segments.entries()) {
    if (point.comparePoint(segment.el, segment.el.childNodes.length) < 0) continue;
    if (segment.highlightWhole) return { segment: index, offset: 0 };
    let offset = readingCharacters(segment.el).findIndex(
      character => point.comparePoint(character.node, character.offset) >= 0,
    );
    if (offset < 0) continue;
    while (/\s/.test(segment.spokenText[offset] ?? "")) offset++;
    if (offset >= segment.spokenText.length) continue;
    return { segment: index, offset: wordStart(segment, offset) };
  }
  return null;
}
