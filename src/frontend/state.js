// ── Shared module state ──────────────────────────────────────────────────────
// Loaded first (defer, before all other modules). All symbols are globals.

let allDocs = [];
let allFolderPaths = [];
let annotationCounts = {};
let fileAttachmentCounts = {};
let docStatuses = {};
let currentDocId = null;
let currentDocContent = "";
let searchQuery = "";
let searchResults = null;
let navHistory = []; // stack of { id, title } visited via in-doc links
let expandedCategories = new Set();
let expandedFolders = new Set();
let hideCategories = (() => {
  try {
    return localStorage.getItem("ld-hide-categories") === "1";
  } catch {
    return false;
  }
})();
let hideAttachments = (() => {
  try {
    return localStorage.getItem("ld-hide-attachments") === "1";
  } catch {
    return false;
  }
})();
// Tri-state status highlight: 0 = off, 1 = "To be validated" pill only,
// 2 = "To be validated" + "SuperSeeded" pills.
let highlightStatusState = (() => {
  try {
    const v = parseInt(localStorage.getItem("ld-highlight-status") || "0", 10);
    return v === 1 || v === 2 ? v : 0;
  } catch {
    return 0;
  }
})();
let exclusiveFolderExpansion = false;
let exclusiveCategoryExpansion = false;
let codeBlockMaxHeight = 400;

function filteredDocs() {
  if (!searchQuery) return allDocs;
  if (Array.isArray(searchResults)) return searchResults;
  const q = searchQuery.toLowerCase();
  return allDocs.filter(
    (d) =>
      d.title.toLowerCase().includes(q) ||
      d.category.toLowerCase().includes(q),
  );
}

function refreshSidebar() {
  renderSidebar(filteredDocs());
}
