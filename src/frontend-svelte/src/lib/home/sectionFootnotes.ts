const FOOTNOTES_SELECTOR = ":scope > section[data-footnotes]";
const REFERENCE_SELECTOR = "[data-ld-fn-ref]";

/**
 * Reduces the rendered footnotes to those reachable from the remaining blocks, notes cited
 * by a kept note included. Without any, the footnotes block goes away. Numbers stay those of the document.
 */
export function keepUsedFootnotes(root: HTMLElement): void {
  const footnotes = root.querySelector(FOOTNOTES_SELECTOR);
  if (!footnotes) return;
  const used = new Set<Element>();
  const follow = (references: Iterable<Element>) => {
    for (const reference of references) {
      const noteId = reference.getAttribute("href")?.slice(1);
      const note = noteId ? footnotes.querySelector(`li[id="${CSS.escape(noteId)}"]`) : null;
      if (!note || used.has(note)) continue;
      used.add(note);
      follow(note.querySelectorAll(REFERENCE_SELECTOR));
    }
  };
  follow(Array.from(root.querySelectorAll(REFERENCE_SELECTOR)).filter((reference) => !footnotes.contains(reference)));
  if (used.size === 0) {
    footnotes.remove();
    return;
  }
  for (const note of Array.from(footnotes.querySelectorAll("li"))) {
    if (note.parentElement?.parentElement === footnotes && !used.has(note)) note.remove();
  }
}
