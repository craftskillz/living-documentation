import { markdownSectionAtLine, type MarkdownSection } from "../../../../lib/markdownSection";

export function sectionAtTarget(root: HTMLElement, content: string, target: EventTarget | null): MarkdownSection | null {
  if (!(target instanceof Element) || !root.contains(target)) return null;
  // Generated notes and unmapped UI have no unambiguous source block.
  const block = target.closest("[data-source-lines]");
  if (!block || !root.contains(block)) return null;
  const line = Number(block.getAttribute("data-source-lines")?.split("-")[0]);
  return markdownSectionAtLine(content, line);
}
