// ── New Document modal ──────────────────────────────────────────────────────
// Depends on globals from state.js (currentDocId, allDocs), documents.js
// (loadDocuments, openDocument) and utils.js (esc).

let _newDocBrowseCurrent = null;
let _newDocBrowseParent = null;
let _newDocSelectedFolder = "";
let _newDocDocsFolder = "";
let _newDocPattern = "YYYY_MM_DD_HH_mm_[Category]_title";

async function openNewDocModal() {
  try {
    const cfg = await fetch("/api/config").then((r) => r.json());
    _newDocDocsFolder = cfg.docsFolder || "";
    _newDocPattern =
      cfg.filenamePattern || "YYYY_MM_DD_HH_mm_[Category]_title";
  } catch {
    _newDocDocsFolder = "";
    _newDocPattern = "YYYY_MM_DD_HH_mm_[Category]_title";
  }
  // Pre-fill from currently open document if any
  const currentDoc =
    currentDocId && allDocs.find((d) => d.id === currentDocId);
  const prefillCategory =
    (currentDoc && currentDoc.category) || "General";
  // Derive folder from currentDocId (encoded relative path, e.g. "1_tutorial%2Fsome_file")
  // For extra files (absolute paths), skip.
  let prefillFolder = "";
  if (currentDocId) {
    const decodedId = decodeURIComponent(currentDocId);
    if (!decodedId.startsWith("/")) {
      const segments = decodedId.split("/");
      if (segments.length > 1) {
        prefillFolder = segments.slice(0, -1).join("/");
      }
    }
  }
  const prefillFolderAbs = prefillFolder
    ? _newDocDocsFolder + "/" + prefillFolder
    : "";

  _newDocSelectedFolder = prefillFolder;
  _newDocBrowseCurrent = prefillFolderAbs || null;
  _newDocBrowseParent = null;
  document.getElementById("new-doc-title").value = "";
  document.getElementById("new-doc-category").value = prefillCategory;
  document.getElementById("new-doc-folder-display").textContent =
    prefillFolder ? "/" + prefillFolder : "/ (root)";
  document.getElementById("new-doc-browser").classList.add("hidden");
  document.getElementById("new-doc-new-folder-name").value = "";
  document.getElementById("new-doc-error").classList.add("hidden");
  const createBtn = document.getElementById("new-doc-create-btn");
  createBtn.disabled = false;
  createBtn.textContent = window.t('common.create');
  newDocUpdatePreview();
  document.getElementById("new-doc-modal").classList.remove("hidden");
  setTimeout(() => document.getElementById("new-doc-title").focus(), 50);
}

function closeNewDocModal() {
  document.getElementById("new-doc-modal").classList.add("hidden");
}

function newDocToggleBrowser() {
  const browser = document.getElementById("new-doc-browser");
  const isHidden = browser.classList.toggle("hidden");
  if (!isHidden)
    newDocLoadBrowse(_newDocBrowseCurrent || _newDocDocsFolder);
}

async function newDocLoadBrowse(dirPath) {
  const list = document.getElementById("new-doc-browse-list");
  list.innerHTML =
    `<p class="px-3 py-4 text-xs text-gray-400 text-center">${window.t('common.loading')}</p>`;
  try {
    const data = await fetch(
      "/api/browse?path=" + encodeURIComponent(dirPath),
    ).then((r) => r.json());
    _newDocBrowseCurrent = data.current;
    _newDocBrowseParent = data.parent;
    document.getElementById("new-doc-browse-path").textContent =
      data.current;
    const atRoot = data.current === _newDocDocsFolder;
    document.getElementById("new-doc-browse-up").disabled = atRoot;

    const rows = data.dirs.map(
      (dir) =>
        `<div class="flex items-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <button data-path="${esc(dir.path)}" onclick="newDocLoadBrowse(this.dataset.path)"
            class="flex-1 flex items-center gap-2 px-3 py-2 text-sm text-left">
            <span class="text-gray-400 shrink-0">&#128193;</span>
            <span class="text-gray-700 dark:text-gray-300 truncate">${esc(dir.name)}</span>
          </button>
          <button data-path="${esc(dir.path)}" onclick="newDocSelectFolder(this.dataset.path)"
            title="${window.t('modal.new_doc.use_folder_btn')}"
            class="shrink-0 text-blue-400 hover:text-blue-600 px-3 py-2 text-sm transition-colors">&#10003;</button>
        </div>`,
    );

    const selectBtn = `<button onclick="newDocSelectCurrentFolder()"
      class="w-full px-3 py-2 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-left font-medium border-t border-gray-100 dark:border-gray-800">
      ${window.t('modal.new_doc.use_folder_btn')}
    </button>`;

    list.innerHTML =
      (rows.length
        ? rows.join("")
        : `<p class="px-3 py-3 text-xs text-gray-400 text-center">${window.t('modal.new_doc.no_subfolders')}</p>`) +
      selectBtn;
  } catch {
    list.innerHTML =
      `<p class="px-3 py-4 text-xs text-red-400 text-center">${window.t('common.cannot_read_dir')}</p>`;
  }
}

function newDocBrowseUp() {
  if (_newDocBrowseCurrent !== _newDocDocsFolder && _newDocBrowseParent) {
    newDocLoadBrowse(_newDocBrowseParent);
  }
}

function _newDocAbsToRel(absPath) {
  const base = _newDocDocsFolder;
  if (absPath === base) return "";
  if (absPath.startsWith(base + "/"))
    return absPath.slice(base.length + 1);
  return absPath;
}

function newDocSelectFolder(absPath) {
  _newDocSelectedFolder = _newDocAbsToRel(absPath);
  _newDocBrowseCurrent = absPath;
  document.getElementById("new-doc-folder-display").textContent =
    _newDocSelectedFolder ? "/" + _newDocSelectedFolder : "/ (root)";
  document.getElementById("new-doc-browser").classList.add("hidden");
  newDocUpdatePreview();
}

function newDocSelectCurrentFolder() {
  newDocSelectFolder(_newDocBrowseCurrent || _newDocDocsFolder);
}

function newDocCreateFolder() {
  const name = document
    .getElementById("new-doc-new-folder-name")
    .value.trim();
  if (!name) return;
  const parent = _newDocBrowseCurrent || _newDocDocsFolder;
  const newRelPath =
    (_newDocAbsToRel(parent) ? _newDocAbsToRel(parent) + "/" : "") + name;
  _newDocSelectedFolder = newRelPath;
  document.getElementById("new-doc-folder-display").textContent =
    "/" + newRelPath;
  document.getElementById("new-doc-new-folder-name").value = "";
  document.getElementById("new-doc-browser").classList.add("hidden");
  newDocUpdatePreview();
}

function newDocUpdatePreview() {
  const title = document.getElementById("new-doc-title").value.trim();
  const category =
    document.getElementById("new-doc-category").value.trim() || "General";
  const previewEl = document.getElementById("new-doc-filename-preview");

  if (!title) {
    previewEl.textContent = window.t('modal.new_doc.title_placeholder');
    return;
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const titleSlug =
    title
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "") || "document";

  const filename =
    _newDocPattern
      .replace("YYYY", year)
      .replace("MM", month)
      .replace("DD", day)
      .replace("HH", hours)
      .replace("mm", minutes)
      .replace(/\[Category\]/i, `[${category}]`)
      .replace(
        /(?<![a-z0-9])(?:title_words|title)(?![a-z0-9])/i,
        titleSlug,
      ) + ".md";

  previewEl.textContent = _newDocSelectedFolder
    ? _newDocSelectedFolder + "/" + filename
    : filename;
}

async function createNewDocument() {
  const title = document.getElementById("new-doc-title").value.trim();
  const category =
    document.getElementById("new-doc-category").value.trim() || "General";
  const errorEl = document.getElementById("new-doc-error");
  const btn = document.getElementById("new-doc-create-btn");

  if (!title) {
    errorEl.textContent = window.t('modal.new_doc.error_empty_title');
    errorEl.classList.remove("hidden");
    return;
  }

  errorEl.classList.add("hidden");
  btn.disabled = true;
  btn.textContent = window.t('modal.new_folder.creating_btn');

  try {
    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        category,
        folder: _newDocSelectedFolder,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Creation failed");
    }

    const doc = await res.json();
    closeNewDocModal();
    await loadDocuments();
    openDocument(doc.id);
  } catch (err) {
    errorEl.textContent = window.t('common.error_prefix') + err.message;
    errorEl.classList.remove("hidden");
    btn.disabled = false;
    btn.textContent = window.t('common.create');
  }
}

// Allow Enter key in title/category to submit
document.addEventListener("DOMContentLoaded", () => {
  ["new-doc-title", "new-doc-category"].forEach((id) => {
    document.getElementById(id)?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") createNewDocument();
      if (e.key === "Escape") closeNewDocModal();
    });
  });
  document
    .getElementById("new-doc-new-folder-name")
    ?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") newDocCreateFolder();
    });
});
