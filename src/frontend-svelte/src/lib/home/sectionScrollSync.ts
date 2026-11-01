/** Align the visible source block, accounting for textarea wrapping and rendered block heights. */
export function createSectionScrollSync(
  editor: HTMLTextAreaElement,
  scroller: HTMLElement,
  preview: HTMLElement,
  firstSourceLine: number,
) {
  type Pane = "editor" | "preview";
  type Anchor = Record<Pane, number>;
  const SCROLL_TOLERANCE_PX = 1;
  let anchors: Anchor[] = [];
  let enabled = true;
  let valid = false;
  let destroyed = false;
  let frame = 0;
  let driver: Pane = "editor";
  const panes = { editor, preview: scroller };
  const expected = new Map<Pane, number>();

  // A hidden layout mirror measures source line starts without moving the caret or selection.
  const mirror = document.createElement("div");
  mirror.setAttribute("aria-hidden", "true");
  mirror.style.cssText = "position:absolute;top:0;left:0;height:0;overflow:hidden;visibility:hidden;pointer-events:none;white-space:pre-wrap;overflow-wrap:break-word;box-sizing:content-box;";
  editor.parentElement?.appendChild(mirror);

  function measure() {
    const style = getComputedStyle(editor);
    for (const key of ["fontFamily", "fontSize", "fontWeight", "fontStyle", "lineHeight", "letterSpacing", "wordSpacing", "tabSize", "textIndent", "textTransform", "paddingTop", "paddingLeft", "paddingRight"] as const) {
      mirror.style[key] = style[key];
    }
    mirror.style.width = `${editor.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)}px`;
    const text = document.createTextNode(editor.value + "\u200b");
    mirror.replaceChildren(text);
    const offsets = [0];
    for (let i = 0; i < editor.value.length; i++) if (editor.value[i] === "\n") offsets.push(i + 1);
    const range = document.createRange();
    const mirrorTop = mirror.getBoundingClientRect().top;
    const previewTop = scroller.getBoundingClientRect().top + scroller.clientTop - scroller.scrollTop;
    anchors = [{ editor: 0, preview: 0 }];
    for (const block of preview.querySelectorAll<HTMLElement>("[data-source-lines]")) {
      const sourceLine = Number(block.dataset.sourceLines?.split("-")[0]);
      const offset = offsets[sourceLine - firstSourceLine];
      if (offset === undefined || !block.getClientRects().length) continue;
      range.setStart(text, offset);
      range.setEnd(text, offset + 1);
      const point = { editor: range.getBoundingClientRect().top - mirrorTop, preview: block.getBoundingClientRect().top - previewTop };
      const last = anchors[anchors.length - 1];
      // Ignore hidden/nested or same-line blocks: interpolation must stay monotonic in both directions.
      if (point.editor > last.editor && point.preview > last.preview) anchors.push(point);
    }
    anchors.push({ editor: editor.scrollHeight, preview: scroller.scrollHeight });
  }

  function sync(from: Pane) {
    if (!enabled || !valid || destroyed) return;
    const to: Pane = from === "editor" ? "preview" : "editor";
    const source = panes[from], target = panes[to];
    const sourceMax = source.scrollHeight - source.clientHeight;
    const targetMax = target.scrollHeight - target.clientHeight;
    if (sourceMax <= 0 || targetMax <= 0) return;
    const top = source.scrollTop;
    let destination = 0;
    if (top >= sourceMax - SCROLL_TOLERANCE_PX) destination = targetMax;
    else if (top > 0) {
      let index = 0;
      while (index + 1 < anchors.length - 1 && anchors[index + 1][from] <= top) index++;
      const a = anchors[index], b = anchors[index + 1];
      const fraction = (top - a[from]) / Math.max(1, b[from] - a[from]);
      destination = Math.min(targetMax, Math.max(0, a[to] + fraction * (b[to] - a[to])));
    }
    if (Math.abs(target.scrollTop - destination) <= SCROLL_TOLERANCE_PX) return;
    target.scrollTop = destination;
    // Consume only the echo of this precise programmatic scroll, never the user's next movement.
    expected.set(to, target.scrollTop);
  }

  function onScroll(from: Pane) {
    const target = expected.get(from);
    expected.delete(from);
    if (target !== undefined && Math.abs(panes[from].scrollTop - target) <= SCROLL_TOLERANCE_PX) return;
    if (!valid) return;
    driver = from;
    sync(from);
  }
  const fromEditor = () => onScroll("editor");
  const fromPreview = () => onScroll("preview");
  const invalidate = () => { valid = false; driver = "editor"; expected.clear(); };
  function refresh(from: Pane = driver) {
    if (destroyed) return;
    measure();
    valid = true;
    sync(from);
  }
  function scheduleRefresh() {
    if (!valid || destroyed) return;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => { if (valid) refresh(); });
  }

  editor.addEventListener("scroll", fromEditor, { passive: true });
  scroller.addEventListener("scroll", fromPreview, { passive: true });
  editor.addEventListener("input", invalidate);
  const resize = new ResizeObserver(scheduleRefresh);
  resize.observe(editor);
  resize.observe(scroller);
  resize.observe(preview);
  preview.addEventListener("load", scheduleRefresh, true);
  void document.fonts.ready.then(scheduleRefresh);

  return {
    invalidate,
    refresh,
    setEnabled(value: boolean) { enabled = value; expected.clear(); if (valid && value) refresh(); },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(frame);
      resize.disconnect();
      editor.removeEventListener("scroll", fromEditor);
      scroller.removeEventListener("scroll", fromPreview);
      editor.removeEventListener("input", invalidate);
      preview.removeEventListener("load", scheduleRefresh, true);
      mirror.remove();
    },
  };
}
