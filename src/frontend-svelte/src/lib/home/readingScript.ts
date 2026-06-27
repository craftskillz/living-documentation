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
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m[0].length === 0) {
      if (re.lastIndex >= text.length) break;
      re.lastIndex++;
      continue;
    }
    const raw = m[0];
    const trimmedStart = raw.length - raw.trimStart().length;
    const trimmedText = raw.trim();
    if (trimmedText) {
      const start = m.index + trimmedStart;
      out.push({ text: trimmedText, start, end: start + trimmedText.length });
    }
    if (re.lastIndex >= text.length) break;
  }
  return out;
}

function textSegment(el: HTMLElement, type: SegmentType): ReadingSegment | null {
  const spokenText = (el.textContent ?? "").replace(/\s+/g, " ").trim();
  if (!spokenText) return null;
  // Sentence offsets are computed against the normalised text the player will
  // also use; for ranges the player re-derives positions from el.textContent.
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
