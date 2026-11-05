import { markdownSectionAtLine, type MarkdownSection } from "../../../../lib/markdownSection";

// An element of an iframe is not an instance of this window's Element.
function isElement(target: EventTarget | null): target is Element {
  return (target as Node | null)?.nodeType === Node.ELEMENT_NODE;
}

export function sectionAtTarget(root: HTMLElement, content: string, target: EventTarget | null): MarkdownSection | null {
  if (!isElement(target) || !root.contains(target)) return null;
  // Generated notes and unmapped UI have no unambiguous source block.
  const block = target.closest("[data-source-lines]");
  if (!block || !root.contains(block)) return null;
  const line = Number(block.getAttribute("data-source-lines")?.split("-")[0]);
  return markdownSectionAtLine(content, line);
}
