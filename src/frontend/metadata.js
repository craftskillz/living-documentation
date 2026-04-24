// ── Metadata (source-file dependencies) ─────────────────────────────────────
// Exposes: openMetadataModal(), closeMetadataModal(),
//          metadataRefresh(), metadataAddPath(), metadataRemovePath(),
//          loadMetadataReport(docId) → used by accuracy-gauge.js

let metadataReport = null;
let metadataBrowseCurrent = ""; // relative to sourceRoot
let metadataBrowseCache = null;

function metadataCurrentDocId() {
  return typeof currentDocId !== "undefined" ? currentDocId : null;
}

async function loadMetadataReport(docId) {
  if (!docId) {
    metadataReport = null;
    return null;
  }
  try {
    const r = await fetch(
      "/api/metadata/" + encodeURIComponent(docId),
    );
    if (!r.ok) throw new Error(r.statusText);
    metadataReport = await r.json();
  } catch {
    metadataReport = null;
  }
  if (typeof renderAccuracyGauge === "function") {
    renderAccuracyGauge(metadataReport);
  }
  return metadataReport;
}

function statusBadge(status) {
  if (status === "unchanged") {
    return `<span class="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
      <i class="fa-solid fa-check"></i>
      <span data-i18n="metadata.status.unchanged">Unchanged</span>
    </span>`;
  }
  if (status === "modified") {
    return `<span class="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
      <i class="fa-solid fa-triangle-exclamation"></i>
      <span data-i18n="metadata.status.modified">Modified</span>
    </span>`;
  }
  return `<span class="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
    <i class="fa-solid fa-circle-xmark"></i>
    <span data-i18n="metadata.status.missing">Missing</span>
  </span>`;
}

function renderMetadataList() {
  const listEl = document.getElementById("metadata-list");
  const emptyEl = document.getElementById("metadata-empty");
  if (!listEl || !emptyEl) return;

  const items = (metadataReport && metadataReport.items) || [];
  if (items.length === 0) {
    listEl.innerHTML = "";
    emptyEl.classList.remove("hidden");
    return;
  }
  emptyEl.classList.add("hidden");

  listEl.innerHTML = items
    .map((it) => {
      const safePath = esc(it.path);
      return `<div class="flex items-center gap-2 px-3 py-2 border-b border-gray-100 dark:border-gray-800">
        <div class="flex-1 min-w-0">
          <div class="text-sm font-mono truncate text-gray-800 dark:text-gray-200" title="${safePath}">${safePath}</div>
        </div>
        ${statusBadge(it.status)}
        <button
          onclick="metadataRemovePath('${safePath.replace(/'/g, "\\'")}')"
          data-i18n-title="metadata.remove"
          title="Remove"
          class="text-xs px-2 py-1 rounded-lg border border-red-200 dark:border-red-700 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/40 transition-colors"
        >
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>`;
    })
    .join("");

  if (typeof window.applyI18n === "function") window.applyI18n();
}

function renderMetadataSummary() {
  const el = document.getElementById("metadata-summary");
  if (!el) return;
  if (!metadataReport || metadataReport.total === 0) {
    el.textContent = "";
    return;
  }
  const pct = Math.round(metadataReport.accuracy * 100);
  const { total, unchanged, modified, missing } = metadataReport;
  el.innerHTML = `<span class="font-semibold">${pct}%</span> · ${unchanged}/${total} ${window.t("metadata.status.unchanged")} · ${modified} ${window.t("metadata.status.modified")} · ${missing} ${window.t("metadata.status.missing")}`;
}

async function openMetadataModal() {
  const docId = metadataCurrentDocId();
  if (!docId) return;
  await loadMetadataReport(docId);
  renderMetadataList();
  renderMetadataSummary();
  document.getElementById("metadata-modal").classList.remove("hidden");
  document.getElementById("metadata-error").classList.add("hidden");
  // Reset browser
  metadataBrowseCurrent = "";
  metadataBrowseCache = null;
  document.getElementById("metadata-browser").classList.add("hidden");
}

function closeMetadataModal() {
  document.getElementById("metadata-modal").classList.add("hidden");
}

async function metadataRefresh() {
  const docId = metadataCurrentDocId();
  if (!docId) return;
  const btn = document.getElementById("metadata-refresh-btn");
  if (btn) btn.disabled = true;
  try {
    const r = await fetch(
      "/api/metadata/" + encodeURIComponent(docId) + "/refresh",
      { method: "POST" },
    );
    if (!r.ok) throw new Error(r.statusText);
    metadataReport = await r.json();
    renderMetadataList();
    renderMetadataSummary();
    if (typeof renderAccuracyGauge === "function") {
      renderAccuracyGauge(metadataReport);
    }
  } catch (err) {
    showMetadataError(err.message);
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function metadataRemovePath(path) {
  const docId = metadataCurrentDocId();
  if (!docId) return;
  try {
    const r = await fetch(
      "/api/metadata/" + encodeURIComponent(docId),
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      },
    );
    if (!r.ok) throw new Error(r.statusText);
    metadataReport = await r.json();
    renderMetadataList();
    renderMetadataSummary();
    if (typeof renderAccuracyGauge === "function") {
      renderAccuracyGauge(metadataReport);
    }
    refreshBrowserIfOpen();
  } catch (err) {
    showMetadataError(err.message);
  }
}

async function metadataAddPath(relPath) {
  const docId = metadataCurrentDocId();
  if (!docId) return;
  try {
    const r = await fetch(
      "/api/metadata/" + encodeURIComponent(docId),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: relPath }),
      },
    );
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      throw new Error(body.error || r.statusText);
    }
    metadataReport = await r.json();
    renderMetadataList();
    renderMetadataSummary();
    if (typeof renderAccuracyGauge === "function") {
      renderAccuracyGauge(metadataReport);
    }
    refreshBrowserIfOpen();
  } catch (err) {
    showMetadataError(err.message);
  }
}

function refreshBrowserIfOpen() {
  const b = document.getElementById("metadata-browser");
  if (b && !b.classList.contains("hidden")) {
    metadataBrowseLoad(metadataBrowseCurrent);
  }
}

function showMetadataError(msg) {
  const el = document.getElementById("metadata-error");
  if (!el) return;
  el.textContent = window.t("common.error_prefix") + msg;
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 5000);
}

// ── Source browser ─────────────────────────────────────────────────────────

function metadataToggleBrowser() {
  const b = document.getElementById("metadata-browser");
  if (b.classList.contains("hidden")) {
    b.classList.remove("hidden");
    metadataBrowseLoad("");
  } else {
    b.classList.add("hidden");
  }
}

async function metadataBrowseLoad(relPath) {
  const listEl = document.getElementById("metadata-browse-list");
  const pathEl = document.getElementById("metadata-browse-path");
  const upBtn = document.getElementById("metadata-browse-up");
  if (!listEl) return;
  listEl.innerHTML = `<div class="px-3 py-2 text-xs text-gray-400">${esc(window.t("common.loading"))}</div>`;
  try {
    const r = await fetch(
      "/api/browse-source?path=" + encodeURIComponent(relPath || ""),
    );
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      throw new Error(body.error || r.statusText);
    }
    const data = await r.json();
    metadataBrowseCache = data;
    metadataBrowseCurrent = data.current || "";
    pathEl.textContent = data.current ? "/" + data.current : "/ (sourceRoot)";
    upBtn.disabled = data.parent === null;
    upBtn.classList.toggle("opacity-30", data.parent === null);
    upBtn.classList.toggle("pointer-events-none", data.parent === null);

    const dirRows = data.dirs.map(
      (d) => `<button
        onclick="metadataBrowseLoad('${d.path.replace(/'/g, "\\'")}')"
        class="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
      >
        <i class="fa-solid fa-folder text-yellow-500"></i>
        <span class="truncate">${esc(d.name)}</span>
      </button>`,
    );
    const attached = new Set(
      ((metadataReport && metadataReport.items) || []).map((it) => it.path),
    );
    const fileRows = data.files
      .filter((f) => !attached.has(f.path))
      .map(
        (f) => `<button
        onclick="metadataAddPath('${f.path.replace(/'/g, "\\'")}')"
        class="w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/30 flex items-center gap-2"
      >
        <i class="fa-solid fa-file text-gray-400"></i>
        <span class="truncate">${esc(f.name)}</span>
        <i class="fa-solid fa-plus ml-auto text-blue-500 text-xs"></i>
      </button>`,
      );
    const rows = [...dirRows, ...fileRows];
    listEl.innerHTML = rows.length
      ? rows.join("")
      : `<div class="px-3 py-2 text-xs text-gray-400" data-i18n="common.empty_dir">${esc(window.t("common.empty_dir"))}</div>`;
  } catch (err) {
    listEl.innerHTML = `<div class="px-3 py-2 text-xs text-red-500">${esc(err.message)}</div>`;
  }
}

function metadataBrowseUp() {
  if (!metadataBrowseCache || metadataBrowseCache.parent === null) return;
  metadataBrowseLoad(metadataBrowseCache.parent);
}

// Expose
window.openMetadataModal = openMetadataModal;
window.closeMetadataModal = closeMetadataModal;
window.metadataRefresh = metadataRefresh;
window.metadataRemovePath = metadataRemovePath;
window.metadataAddPath = metadataAddPath;
window.metadataToggleBrowser = metadataToggleBrowser;
window.metadataBrowseLoad = metadataBrowseLoad;
window.metadataBrowseUp = metadataBrowseUp;
window.loadMetadataReport = loadMetadataReport;
