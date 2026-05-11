// ── Shared module state ──────────────────────────────────────────────────────
// Loaded first (defer, before all other modules). All symbols are globals.

let allDocs = [];
let allFolderPaths = [];
let annotationCounts = {};
let fileAttachmentCounts = {};
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
