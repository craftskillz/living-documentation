const SOURCE_LINES_ATTRIBUTE = "data-source-lines";
const ELEMENT_NODE = 1;
const EDITABLE_BLOCKS = new Set(["p", "h2", "h3", "h4"]);
// One Markdown element each: their content is not text to type into.
const ATOMIC_ELEMENTS = "img, mark, sup";
const HEADING_MARKER_RE = /^#+ *$/;
const NO_BREAK_SPACE_RE = / /g;

export interface EditableBlock {
  block: HTMLElement;
  firstLine: number;
  lastLine: number;
}

export interface InlineEditHandlers {
  /** The block's current Markdown, null when it no longer converts. */
  read: () => string | null;
  /** Returns false when saving failed: the edit stays open. */
  onCommit: (markdown: string) => Promise<boolean>;
  /** The edit stays open: what was typed is not lost. */
  onUnconvertible: () => void;
  onClose: () => void;
}

/** The top-level paragraph or heading under the pointer, with the file lines it comes from. */
export function editableBlockAt(target: EventTarget | null): EditableBlock | null {
  const node = target as Element | null;
  if (node?.nodeType !== ELEMENT_NODE) return null;
  const block = node.closest<HTMLElement>(`[${SOURCE_LINES_ATTRIBUTE}]`);
  if (!block || !EDITABLE_BLOCKS.has(block.localName)) return null;
  const [firstLine, lastLine] = (block.getAttribute(SOURCE_LINES_ATTRIBUTE) ?? "").split("-").map(Number);
  return { block, firstLine, lastLine };
}

function currentRange(frameDocument: Document): Range | null {
  const selection = frameDocument.getSelection();
  return selection?.rangeCount ? selection.getRangeAt(0) : null;
}

/** The block's lines are replaced only if its text changed and something is left. */
export function startInlineEdit(block: HTMLElement, handlers: InlineEditHandlers): void {
  const frameDocument = block.ownerDocument;
  const originalHtml = block.innerHTML;
  const baseline = handlers.read();
  const controller = new AbortController();
  const { signal } = controller;
  let committing = false;

  function finish() {
    controller.abort();
    block.innerHTML = originalHtml;
    block.removeAttribute("contenteditable");
    handlers.onClose();
  }

  // Browsers type spaces at the end of a text as no-break spaces: only those of the source are kept.
  function readEdited(): string | null {
    const markdown = handlers.read();
    if (markdown === null || baseline?.includes(" ")) return markdown?.trim() ?? null;
    return markdown.replace(NO_BREAK_SPACE_RE, " ").trim();
  }

  async function commit() {
    if (committing) return;
    const edited = readEdited();
    if (edited === null) {
      handlers.onUnconvertible();
      return;
    }
    if (edited === baseline?.trim() || !edited || HEADING_MARKER_RE.test(edited)) {
      finish();
      return;
    }
    committing = true;
    const saved = await handlers.onCommit(edited);
    committing = false;
    // On success the frame reloads, and takes this edit with it.
    if (saved) controller.abort();
  }

  block.addEventListener("keydown", (event) => {
    if (event.isComposing) return;
    if (event.key === "Escape") {
      event.preventDefault();
      if (!committing) finish();
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (event.metaKey || event.ctrlKey) void commit();
    }
  }, { signal });

  block.addEventListener("blur", () => { void commit(); }, { signal });

  // A block holds one Markdown block: no line break, no blank line and no formatting from outside.
  block.addEventListener("paste", (event) => {
    event.preventDefault();
    const text = event.clipboardData?.getData("text/plain").replace(/\s*[\r\n]+\s*/g, " ") ?? "";
    frameDocument.execCommand("insertText", false, text);
  }, { signal });
  block.addEventListener("drop", (event) => event.preventDefault(), { signal });

  // The double click selected the word under the pointer: focusing must not lose it.
  const selection = currentRange(frameDocument)?.cloneRange();
  block.querySelectorAll(ATOMIC_ELEMENTS).forEach((element) => { element.setAttribute("contenteditable", "false"); });
  block.setAttribute("contenteditable", "plaintext-only");
  block.focus({ preventScroll: true });
  if (selection) {
    frameDocument.getSelection()?.removeAllRanges();
    frameDocument.getSelection()?.addRange(selection);
  }
}
