const SOURCE_LINES_ATTRIBUTE = "data-source-lines";
const ELEMENT_NODE = 1;
const INLINE_BLOCKS = new Set(["p", "h2", "h3", "h4"]);
const SOURCE_BLOCKS = new Set(["pre", "ul", "ol", "blockquote", "table"]);
// Their lines mean something only as written: wrapping would hide their shape.
const UNWRAPPED_SOURCE_BLOCKS = new Set(["pre", "table"]);
// One Markdown element each: their content is not text to type into.
const ATOMIC_ELEMENTS = "img, mark, sup";
const HEADING_MARKER_RE = /^#+ *$/;
const NO_BREAK_SPACE = " ";
const SOURCE_INDENT = "  ";
const HARD_BREAK_SPACES = "  ";
const SOURCE_FIELD_STYLE = [
  "display: block", "box-sizing: border-box", "width: 100%", "margin: 1rem 0", "padding: .75rem",
  "border: 2px solid #2563eb", "border-radius: 6px", "outline: none", "resize: none", "overflow-y: hidden",
  "background: #fff", "color: #111827", "font: .9rem/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
].join("; ");

export type BlockEditMode = "inline" | "source";

export interface EditableBlock {
  block: HTMLElement;
  firstLine: number;
  lastLine: number;
  /** In the page for a paragraph or heading, as Markdown in a field for what has no plain text form. */
  mode: BlockEditMode;
}

export interface BlockEditHandlers {
  /** An empty text removes the block. Returns false when saving failed: the edit stays open. */
  onCommit: (markdown: string) => Promise<boolean>;
  onClose: () => void;
}

export interface InlineEditHandlers extends BlockEditHandlers {
  /** The block's current Markdown, null when it no longer converts. */
  read: () => string | null;
  /** The edit stays open: what was typed is not lost. */
  onUnconvertible: () => void;
}

interface EditSession {
  /** Null when the edit cannot be read as Markdown. */
  read: () => string | null;
  /** An unchanged block writes nothing. */
  unchanged: (edited: string) => boolean;
  restore: () => void;
  onShiftEnter: (event: KeyboardEvent) => void;
  onUnconvertible?: () => void;
}

/** The top-level block under the pointer, with the file lines it comes from. */
export function editableBlockAt(target: EventTarget | null): EditableBlock | null {
  const node = target as Element | null;
  if (node?.nodeType !== ELEMENT_NODE) return null;
  const block = node.closest<HTMLElement>(`[${SOURCE_LINES_ATTRIBUTE}]`);
  if (!block) return null;
  const mode = INLINE_BLOCKS.has(block.localName) ? "inline" : SOURCE_BLOCKS.has(block.localName) ? "source" : null;
  if (!mode) return null;
  const [firstLine, lastLine] = (block.getAttribute(SOURCE_LINES_ATTRIBUTE) ?? "").split("-").map(Number);
  return { block, firstLine, lastLine, mode };
}

/** Same keys and same saving for both modes: Enter or leaving saves, Shift+Enter is a line, Escape cancels. */
function wireEditSession(field: HTMLElement, session: EditSession, handlers: BlockEditHandlers): AbortSignal {
  const controller = new AbortController();
  const { signal } = controller;
  let committing = false;

  function finish() {
    controller.abort();
    session.restore();
    handlers.onClose();
  }

  async function commit() {
    if (committing) return;
    const edited = session.read();
    if (edited === null) {
      session.onUnconvertible?.();
      return;
    }
    if (session.unchanged(edited)) {
      finish();
      return;
    }
    committing = true;
    const saved = await handlers.onCommit(edited);
    committing = false;
    // On success the frame reloads, and takes this edit with it.
    if (saved) controller.abort();
  }

  field.addEventListener("keydown", (event) => {
    if (event.isComposing) return;
    if (event.key === "Escape") {
      event.preventDefault();
      if (!committing) finish();
    } else if (event.key === "Enter" && event.shiftKey) {
      session.onShiftEnter(event);
    } else if (event.key === "Enter") {
      event.preventDefault();
      void commit();
    }
  }, { signal });
  field.addEventListener("blur", () => { void commit(); }, { signal });
  return signal;
}

/** In plain text mode the browser adds a line ending, which Markdown makes visible only with these spaces. */
function insertHardBreak(frameDocument: Document): void {
  frameDocument.execCommand("insertText", false, HARD_BREAK_SPACES);
  frameDocument.execCommand("insertLineBreak");
}

export function startInlineEdit(block: HTMLElement, handlers: InlineEditHandlers): void {
  const frameDocument = block.ownerDocument;
  const originalHtml = block.innerHTML;
  const baseline = handlers.read();

  const signal = wireEditSession(block, {
    // Browsers type spaces at the end of a text as no-break spaces: only those of the source are kept.
    read: () => {
      const markdown = handlers.read();
      if (markdown === null) return null;
      const text = (baseline?.includes(NO_BREAK_SPACE) ? markdown : markdown.replaceAll(NO_BREAK_SPACE, " ")).trim();
      return HEADING_MARKER_RE.test(text) ? "" : text;
    },
    unchanged: (edited) => edited === baseline?.trim(),
    restore: () => {
      block.innerHTML = originalHtml;
      block.removeAttribute("contenteditable");
      block.style.removeProperty("white-space");
    },
    onShiftEnter: (event) => {
      event.preventDefault();
      // A Markdown heading holds one line.
      if (block.localName === "p") insertHardBreak(frameDocument);
    },
    onUnconvertible: handlers.onUnconvertible,
  }, handlers);

  // A block stays one Markdown block: no blank line and no formatting from outside.
  block.addEventListener("paste", (event) => {
    event.preventDefault();
    const text = event.clipboardData?.getData("text/plain").replace(/\s*[\r\n]+\s*/g, " ") ?? "";
    frameDocument.execCommand("insertText", false, text);
  }, { signal });
  block.addEventListener("drop", (event) => event.preventDefault(), { signal });

  // The double click selected the word under the pointer: focusing must not lose it.
  const selection = frameDocument.getSelection();
  const range = selection?.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
  block.querySelectorAll(ATOMIC_ELEMENTS).forEach((element) => { element.setAttribute("contenteditable", "false"); });
  // The line endings typed here have to show while editing.
  block.style.setProperty("white-space", "pre-wrap");
  block.setAttribute("contenteditable", "plaintext-only");
  block.focus({ preventScroll: true });
  if (range) {
    selection?.removeAllRanges();
    selection?.addRange(range);
  }
}

/** Shows the block's own lines in a field in its place: nothing is converted, so nothing can differ. */
export function startSourceEdit(block: HTMLElement, source: string, label: string, handlers: BlockEditHandlers): void {
  const frameDocument = block.ownerDocument;
  const field = frameDocument.createElement("textarea");
  // A field reads its line endings as \n whatever the file uses.
  const baseline = source.replace(/\r\n/g, "\n").trimEnd();
  field.value = source;
  field.spellcheck = false;
  field.setAttribute("aria-label", label);
  field.style.cssText = SOURCE_FIELD_STYLE;
  if (UNWRAPPED_SOURCE_BLOCKS.has(block.localName)) field.wrap = "off";

  function fitContent() {
    field.style.height = "auto";
    field.style.height = `${field.scrollHeight + field.offsetHeight - field.clientHeight}px`;
  }

  const signal = wireEditSession(field, {
    read: () => (field.value.trim() ? field.value.trimEnd() : ""),
    unchanged: (edited) => edited === baseline,
    restore: () => {
      field.remove();
      block.style.removeProperty("display");
    },
    // The field's own behaviour.
    onShiftEnter: () => {},
  }, handlers);

  field.addEventListener("input", fitContent, { signal });
  // Leaving the field saves: Tab has to stay in it, to indent a list or some code.
  field.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    event.preventDefault();
    if (!event.shiftKey) frameDocument.execCommand("insertText", false, SOURCE_INDENT);
  }, { signal });

  block.style.setProperty("display", "none");
  block.after(field);
  fitContent();
  field.focus({ preventScroll: true });
  field.setSelectionRange(0, 0);
}
