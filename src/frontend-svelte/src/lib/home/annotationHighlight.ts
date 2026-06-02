export interface Annotation {
  id: string;
  selectedText: string;
  contextBefore?: string;
  contextAfter?: string;
  note: string;
  createdAt: string;
}

const MARK_STYLE = "background:rgba(250,204,21,0.5);border-radius:2px;cursor:pointer;padding:0 1px;";

export function applyHighlights(contentEl: HTMLElement, annotations: Annotation[], hidden: boolean) {
  // Remove existing marks (unwrap, keep text)
  contentEl.querySelectorAll("mark[data-annotation-id]").forEach(mark => {
    const parent = mark.parentNode!;
    parent.replaceChild(document.createTextNode(mark.textContent || ""), mark);
    parent.normalize();
  });

  for (const ann of annotations) highlightOne(contentEl, ann);

  contentEl.querySelectorAll("mark[data-annotation-id]").forEach(mark => {
    if (!(mark.textContent || "").trim()) mark.remove();
  });

  if (hidden) setHighlightsVisible(contentEl, false);
}

export function setHighlightsVisible(contentEl: HTMLElement, visible: boolean) {
  contentEl.querySelectorAll("mark[data-annotation-id]").forEach(m => {
    const el = m as HTMLElement;
    el.style.background = visible ? "rgba(250,204,21,0.5)" : "transparent";
    el.style.cursor = visible ? "pointer" : "default";
    el.style.pointerEvents = visible ? "auto" : "none";
  });
}

function highlightOne(contentEl: HTMLElement, ann: Annotation) {
  const selText = (ann.selectedText || "").replace(/\s+/g, " ").trim();
  const ctxBefore = (ann.contextBefore || "").replace(/\s+/g, " ").trim();
  const ctxAfter = (ann.contextAfter || "").replace(/\s+/g, " ").trim();
  if (!selText) return;

  const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const toPat = (s: string) => s.split(/\s+/).filter(Boolean).map(escRe).join("\\s+");

  const text = contentEl.textContent || "";
  const selPat = toPat(selText);
  let match: RegExpExecArray | null = null;

  if (ctxBefore || ctxAfter) {
    const fullPat =
      (ctxBefore ? toPat(ctxBefore) + "\\s*" : "") +
      "(" + selPat + ")" +
      (ctxAfter ? "\\s*" + toPat(ctxAfter) : "");
    try { match = new RegExp(fullPat, "d").exec(text); } catch {}
  }
  if (!match) {
    try { match = new RegExp("(" + selPat + ")", "d").exec(text); } catch { return; }
  }
  const indices = match && (match as RegExpExecArray & { indices?: Array<[number, number]> }).indices;
  if (!match || !indices || !indices[1]) return;

  const [startOff, endOff] = indices[1];

  const walker = document.createTreeWalker(contentEl, NodeFilter.SHOW_TEXT);
  const slices: { node: Text; start: number; end: number }[] = [];
  let pos = 0;
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const len = node.nodeValue!.length;
    const nStart = pos, nEnd = pos + len;
    pos = nEnd;
    if (nEnd <= startOff) continue;
    if (nStart >= endOff) break;
    const sStart = Math.max(0, startOff - nStart);
    const sEnd = Math.min(len, endOff - nStart);
    if (sStart < sEnd) slices.push({ node, start: sStart, end: sEnd });
  }

  for (const { node, start, end } of slices) {
    let target = node;
    if (start > 0 && start < target.nodeValue!.length) target = target.splitText(start);
    const wantLen = end - start;
    if (wantLen > 0 && wantLen < target.nodeValue!.length) target.splitText(wantLen);
    const mark = document.createElement("mark");
    mark.setAttribute("data-annotation-id", ann.id);
    mark.setAttribute("style", MARK_STYLE);
    target.parentNode!.insertBefore(mark, target);
    mark.appendChild(target);
  }
}
