const FOOTNOTES_SELECTOR = "section[data-footnotes]";

/**
 * Exposes the file lines of each top-level block as `data-line-label`, displayed in CSS
 * only: a pseudo-element stays out of the text used by search, reading and copy.
 * The label goes on the direct child because wiring may wrap or group the source block.
 */
export function labelSourceLines(container: HTMLElement): void {
  for (const block of Array.from(container.children) as HTMLElement[]) {
    if (block.matches(FOOTNOTES_SELECTOR)) continue;
    const sources = block.matches("[data-source-lines]") ? [block] : [];
    sources.push(...block.querySelectorAll<HTMLElement>("[data-source-lines]"));
    const lines = sources.flatMap(source => source.dataset.sourceLines?.split("-").map(Number) ?? []);
    if (!lines.length) continue;
    const start = Math.min(...lines);
    const end = Math.max(...lines);
    block.dataset.lineLabel = start === end ? String(start) : `${start}-${end}`;
  }
}
