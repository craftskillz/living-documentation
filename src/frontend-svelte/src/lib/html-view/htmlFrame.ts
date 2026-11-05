const EXTERNAL_LINK_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);
const SECONDARY_BUTTON = 2;

function hasSelectedText(frameDocument: Document): boolean {
  const selection = frameDocument.getSelection();
  return !!selection && !selection.isCollapsed;
}

/**
 * The frame runs no script and cannot leave itself. Links are opened from here, and only
 * for known protocols: running a document's `javascript:` link here would give it the application.
 */
function openLink(href: string): void {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return;
  }
  if (url.origin === window.location.origin && url.pathname === "/" && url.searchParams.has("doc")) {
    window.location.assign(url.href);
  } else if (EXTERNAL_LINK_PROTOCOLS.has(url.protocol)) {
    window.open(url.href, "_blank", "noopener,noreferrer");
  }
}

export interface HtmlFrameHandlers {
  /** Returns true when it handles the right click. */
  onBlockMenu: (target: EventTarget | null) => boolean;
  onBlockDoubleClick: (target: EventTarget | null) => void;
  /** During an in-place edit, the frame's clicks belong to the text being edited. */
  isEditing: () => boolean;
}

/** Listens from the application to a generated page. */
export function wireHtmlFrame(frameDocument: Document, { onBlockMenu, onBlockDoubleClick, isEditing }: HtmlFrameHandlers): () => void {
  const controller = new AbortController();
  const { signal } = controller;
  // A right click can itself select the word under the pointer (macOS):
  // what counts is the selection before the click.
  let selectedBeforeClick: boolean | null = null;

  frameDocument.addEventListener("mousedown", (event) => {
    if (event.button === SECONDARY_BUTTON || event.ctrlKey) selectedBeforeClick = hasSelectedText(frameDocument);
  }, { capture: true, signal });

  frameDocument.addEventListener("contextmenu", (event) => {
    const selected = selectedBeforeClick ?? hasSelectedText(frameDocument);
    selectedBeforeClick = null;
    if (!selected && !isEditing() && onBlockMenu(event.target)) event.preventDefault();
  }, { signal });

  frameDocument.addEventListener("dblclick", (event) => {
    if (!isEditing()) onBlockDoubleClick(event.target);
  }, { signal });

  frameDocument.addEventListener("click", (event) => {
    const link = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
    if (!link || link.getAttribute("href")?.startsWith("#")) return;
    event.preventDefault();
    if (!isEditing()) openLink(link.href);
  }, { signal });

  return () => controller.abort();
}
