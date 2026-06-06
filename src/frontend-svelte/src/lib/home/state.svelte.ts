import type { DocSummary } from "./types";

function readBool(key: string): boolean {
  try { return localStorage.getItem(key) === "1"; } catch { return false; }
}

function readHighlight(): number {
  try {
    const v = parseInt(localStorage.getItem("ld-highlight-status") || "0", 10);
    return v === 1 || v === 2 ? v : 0;
  } catch { return 0; }
}

class HomeState {
  allDocs = $state<DocSummary[]>([]);
  allFolderPaths = $state<string[]>([]);
  annotationCounts = $state<Record<string, number>>({});
  fileAttachmentCounts = $state<Record<string, number>>({});
  docStatuses = $state<Record<string, string>>({});
  currentDocId = $state<string | null>(null);

  searchQuery = $state("");
  searchResults = $state<DocSummary[] | null>(null);

  expandedCategories = $state<Set<string>>(new Set());
  expandedFolders = $state<Set<string>>(new Set());

  hideCategories = $state(readBool("ld-hide-categories"));
  hideAttachments = $state(readBool("ld-hide-attachments"));
  highlightStatusState = $state(readHighlight());

  exclusiveFolderExpansion = $state(false);
  exclusiveCategoryExpansion = $state(false);
  codeBlockMaxHeight = $state(400);
  imageRoundedCorners = $state(false);
  imageCentered = $state(false);
  imageBorder = $state(false);

  // Marker (stabilo): "normal" | "active" | "hidden"
  markerState = $state<"normal" | "active" | "hidden">("normal");

  get markerActive() { return this.markerState === "active"; }
  get markerHidden() { return this.markerState === "hidden"; }

  initMarker() {
    let saved = "normal";
    try { saved = localStorage.getItem("ld-marker-state") || "normal"; } catch {}
    this.markerState = saved === "active" ? "active" : saved === "hidden" ? "hidden" : "normal";
  }

  /** Cycle normal → active → hidden → normal. Returns the new state. */
  toggleMarker(): "normal" | "active" | "hidden" {
    if (this.markerState === "normal") this.markerState = "active";
    else if (this.markerState === "active") this.markerState = "hidden";
    else this.markerState = "normal";
    try { localStorage.setItem("ld-marker-state", this.markerState); } catch {}
    return this.markerState;
  }

  get filteredDocs(): DocSummary[] {
    if (!this.searchQuery) return this.allDocs;
    if (Array.isArray(this.searchResults)) return this.searchResults;
    const q = this.searchQuery.toLowerCase();
    return this.allDocs.filter(
      d => d.title.toLowerCase().includes(q) || d.category.toLowerCase().includes(q),
    );
  }

  toggleHideCategories() {
    this.hideCategories = !this.hideCategories;
    try { localStorage.setItem("ld-hide-categories", this.hideCategories ? "1" : "0"); } catch {}
  }

  toggleHideAttachments() {
    this.hideAttachments = !this.hideAttachments;
    try { localStorage.setItem("ld-hide-attachments", this.hideAttachments ? "1" : "0"); } catch {}
  }

  cycleHighlightStatus() {
    this.highlightStatusState = (this.highlightStatusState + 1) % 3;
    try { localStorage.setItem("ld-highlight-status", String(this.highlightStatusState)); } catch {}
  }

  toggleCategory(key: string) {
    const next = new Set(this.expandedCategories);
    if (next.has(key)) {
      next.delete(key);
    } else {
      if (this.exclusiveCategoryExpansion) {
        const parent = key.split("|").slice(0, -1).join("|");
        for (const other of [...next]) {
          if (other.split("|").slice(0, -1).join("|") === parent) next.delete(other);
        }
      }
      next.add(key);
    }
    this.expandedCategories = next;
  }

  toggleFolder(pathKey: string) {
    const next = new Set(this.expandedFolders);
    if (next.has(pathKey)) {
      next.delete(pathKey);
      // collapse descendants
      const prefix = pathKey + "|";
      for (const k of [...next]) if (k.startsWith(prefix)) next.delete(k);
      const cats = new Set(this.expandedCategories);
      for (const k of [...cats]) if (k.startsWith(prefix)) cats.delete(k);
      this.expandedCategories = cats;
    } else {
      if (this.exclusiveFolderExpansion) {
        const parent = pathKey.split("|").slice(0, -1).join("|");
        for (const other of [...next]) {
          if (other.split("|").slice(0, -1).join("|") === parent) {
            next.delete(other);
            const op = other + "|";
            for (const k of [...next]) if (k.startsWith(op)) next.delete(k);
          }
        }
      }
      next.add(pathKey);
    }
    this.expandedFolders = next;
  }

  /** Expand the sidebar path to reveal a document. */
  revealDoc(doc: DocSummary) {
    const folders = new Set(this.expandedFolders);
    const cats = new Set(this.expandedCategories);
    const folder = doc.folder || [];
    for (let i = 0; i < folder.length; i++) {
      folders.add(folder.slice(0, i + 1).join("|"));
    }
    cats.add([...folder, doc.category].join("|"));
    this.expandedFolders = folders;
    this.expandedCategories = cats;
  }
}

export const home = new HomeState();
