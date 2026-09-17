// Round-trip between a document's diagram image and the diagram editor.
//
// A diagram snippet renders as [![label](./images/name.png)](/diagram?id=…).
// When such a link is opened from a document, the editor needs the image name
// (`?img=`) so its PNG button overwrites that image instead of copying to the
// clipboard. Once overwritten, the document must not show the browser-cached
// copy: the editor records a version per image name and the viewer appends it
// as a cache-busting query.

export const DIAGRAM_IMAGE_PARAM = "img";

const VERSION_STORAGE_PREFIX = "ld:diagram-image-version:";

// Only names the upload route writes back unchanged (it sanitizes anything else).
const DIAGRAM_IMAGE_SRC = /^(?:\.\/|\/)images\/([A-Za-z0-9_-]+\.png)$/;

const memoryVersions = new Map<string, string>();

export function markDiagramImageUpdated(imageName: string): void {
  const version = String(Date.now());
  memoryVersions.set(imageName, version);
  try {
    sessionStorage.setItem(VERSION_STORAGE_PREFIX + imageName, version);
  } catch {
    // Storage unavailable: the in-memory version still covers SPA navigation.
  }
}

function diagramImageVersion(imageName: string): string | null {
  try {
    const stored = sessionStorage.getItem(VERSION_STORAGE_PREFIX + imageName);
    if (stored) return stored;
  } catch {
    // Fall back to the in-memory version.
  }
  return memoryVersions.get(imageName) ?? null;
}

export function wireDiagramImageLinks(contentEl: HTMLElement): void {
  contentEl.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((a) => {
    const url = new URL(a.getAttribute("href") || "", window.location.origin);
    if (url.origin !== window.location.origin || url.pathname !== "/diagram") return;

    const img = a.querySelector("img");
    const match = img?.getAttribute("src")?.match(DIAGRAM_IMAGE_SRC);
    if (!img || !match) return;
    const imageName = match[1];

    if (!url.searchParams.has(DIAGRAM_IMAGE_PARAM)) {
      url.searchParams.set(DIAGRAM_IMAGE_PARAM, imageName);
      a.setAttribute("href", `${url.pathname}${url.search}${url.hash}`);
    }

    const version = diagramImageVersion(imageName);
    if (version) img.setAttribute("src", `/images/${imageName}?v=${version}`);
  });
}
