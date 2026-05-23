// ── New Folder modal ────────────────────────────────────────────────────────
// Depends on globals from state.js (currentDocId) and documents.js
// (loadDocuments).

let _newFolderDocsFolder = "";
let _newFolderBrowseCurrent = null;
let _newFolderBrowseParent = null;
let _newFolderSelectedPath = "";

async function openNewFolderModal() {
  try {
    const cfg = await fetch("/api/config").then((r) => r.json());
    _newFolderDocsFolder = cfg.docsFolder || "";
  } catch {
    _newFolderDocsFolder = "";
  }

  // Pre-fill location from currently open document
  let prefillFolder = "";
  if (currentDocId) {
    const decodedId = decodeURIComponent(currentDocId);
    if (!decodedId.startsWith("/")) {
      const segments = decodedId.split("/");
      if (segments.length > 1)
        prefillFolder = segments.slice(0, -1).join("/");
    }
  }

  _newFolderSelectedPath = prefillFolder
    ? _newFolderDocsFolder + "/" + prefillFolder
    : _newFolderDocsFolder;
  _newFolderBrowseCurrent = _newFolderSelectedPath;
  _newFolderBrowseParent = null;

  document.getElementById("new-folder-name").value = "";
  document.getElementById("new-folder-location-display").textContent =
    prefillFolder ? "/" + prefillFolder : "/ (root)";
  document.getElementById("new-folder-browser").classList.add("hidden");
  document.getElementById("new-folder-error").classList.add("hidden");
  const btn = document.getElementById("new-folder-create-btn");
  btn.disabled = false;
  btn.textContent = window.t('modal.new_folder.create_btn');
  newFolderUpdatePreview();
  document.getElementById("new-folder-modal").classList.remove("hidden");
  setTimeout(
    () => document.getElementById("new-folder-name").focus(),
    50,
  );
}

function closeNewFolderModal() {
  document.getElementById("new-folder-modal").classList.add("hidden");
}

function newFolderToggleBrowser() {
  const browser = document.getElementById("new-folder-browser");
  const isHidden = browser.classList.toggle("hidden");
  if (!isHidden)
    newFolderLoadBrowse(_newFolderBrowseCurrent || _newFolderDocsFolder);
}

async function newFolderLoadBrowse(dirPath) {
  const list = document.getElementById("new-folder-browse-list");
  list.innerHTML =
    `<p class="px-3 py-4 text-xs text-gray-400 text-center">${window.t('common.loading')}</p>`;
  try {
    const data = await fetch(
      "/api/browse?path=" + encodeURIComponent(dirPath),
    ).then((r) => r.json());
    _newFolderBrowseCurrent = data.current;
    _newFolderBrowseParent = data.parent;
    _newFolderSelectedPath = data.current;

    document.getElementById("new-folder-browse-path").textContent =
      data.current;
    const atRoot = data.current === _newFolderDocsFolder;
    document.getElementById("new-folder-browse-up").disabled = atRoot;

    const rel = data.current.startsWith(_newFolderDocsFolder + "/")
      ? data.current.slice(_newFolderDocsFolder.length)
      : data.current === _newFolderDocsFolder
        ? ""
        : data.current;
    document.getElementById("new-folder-location-display").textContent = rel
      ? rel
      : "/ (root)";
    newFolderUpdatePreview();

    list.innerHTML = data.dirs.length
      ? data.dirs
          .map(
            (dir) => `
          <button data-path="${esc(dir.path)}" onclick="newFolderLoadBrowse(this.dataset.path)"
            class="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <span class="text-gray-400 shrink-0">&#128193;</span>
            <span class="truncate text-gray-700 dark:text-gray-300">${esc(dir.name)}</span>
          </button>`,
          )
          .join("")
      : `<p class="px-3 py-3 text-xs text-gray-400 text-center">${window.t('modal.new_folder.no_subfolders')}</p>`;
  } catch {
    list.innerHTML =
      `<p class="px-3 py-3 text-xs text-red-400 text-center">${window.t('modal.new_folder.error_loading')}</p>`;
  }
}

function newFolderBrowseUp() {
  if (_newFolderBrowseParent) newFolderLoadBrowse(_newFolderBrowseParent);
}

function newFolderUpdatePreview() {
  const name = document.getElementById("new-folder-name").value.trim();
  const previewEl = document.getElementById("new-folder-preview");
  if (!name) {
    previewEl.textContent = window.t('modal.new_folder.enter_name');
    return;
  }
  const base = _newFolderSelectedPath || _newFolderDocsFolder;
  const rel = base.startsWith(_newFolderDocsFolder)
    ? base.slice(_newFolderDocsFolder.length).replace(/^\//, "")
    : "";
  previewEl.textContent = (rel ? rel + "/" : "") + name;
}

async function createNewFolder() {
  const name = document.getElementById("new-folder-name").value.trim();
  const errEl = document.getElementById("new-folder-error");
  errEl.classList.add("hidden");

  if (!name) {
    errEl.textContent = window.t('modal.new_folder.error_empty');
    errEl.classList.remove("hidden");
    return;
  }
  if (!/^[a-zA-Z0-9_\-. ]+$/.test(name)) {
    errEl.textContent = window.t('modal.new_folder.error_invalid_chars');
    errEl.classList.remove("hidden");
    return;
  }

  const base = _newFolderSelectedPath || _newFolderDocsFolder;
  const atDocsRoot = base === _newFolderDocsFolder;
  if (atDocsRoot && (name === "files" || name === "images")) {
    errEl.textContent = window.t('modal.new_folder.error_reserved');
    errEl.classList.remove("hidden");
    return;
  }
  const fullPath = base.endsWith("/") ? base + name : base + "/" + name;

  const btn = document.getElementById("new-folder-create-btn");
  btn.disabled = true;
  btn.textContent = window.t('modal.new_folder.creating_btn');

  try {
    const res = await fetch("/api/browse/mkdir", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: fullPath }),
    });
    if (!res.ok) throw new Error(await res.text());
    closeNewFolderModal();
    await loadDocuments();
  } catch (err) {
    btn.disabled = false;
    btn.textContent = window.t('modal.new_folder.create_btn');
    errEl.textContent = window.t('common.error_prefix') + err.message;
    errEl.classList.remove("hidden");
  }
}
