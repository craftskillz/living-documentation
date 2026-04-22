// ── Documents: load, open, edit, save, delete, navigate ─────────────────────
// Depends on globals from state.js, utils.js, search.js, sidebar.js,
// annotations (loadAnnotations, applyAnnotationHighlights, renderElevator),
// and image-paste.js (handleEditorPaste).

// Cache of the last rendered doc HTML so search input changes can re-wire
// the content without a round-trip to the server.
let _lastDocHtml = null;
let _lastDocIdRendered = null;

function _wireDocContent(html) {
  const contentEl = document.getElementById("doc-content");
  if (!contentEl) return;
  contentEl.innerHTML = html;

  contentEl.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((h) => {
    if (!h.id) {
      h.id = h.textContent
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");
    }
  });

  contentEl.querySelectorAll("pre code").forEach((block) => {
    hljs.highlightElement(block);
  });

  contentEl.querySelectorAll("a[href]").forEach((a) => {
    const href = a.getAttribute("href");
    const m = href && href.match(/[?&]doc=([^&#]+)/);
    if (!m) return;
    const hashIdx = href.indexOf("#");
    const anchorTarget = hashIdx !== -1 ? href.slice(hashIdx + 1) : null;
    a.addEventListener("click", (e) => {
      e.preventDefault();
      openDocument(decodeURIComponent(m[1]), false, true, anchorTarget);
    });
  });

  contentEl.querySelectorAll('a[href^="#"]').forEach((a) => {
    const href = a.getAttribute("href");
    if (!href || href.length < 2) return;
    a.addEventListener("click", (e) => {
      e.preventDefault();
      scrollToAnchor(href.slice(1));
    });
  });

  contentEl.querySelectorAll("table").forEach((t) => {
    const wrapper = document.createElement("div");
    wrapper.className = "overflow-x-auto";
    t.parentNode.insertBefore(wrapper, t);
    wrapper.appendChild(t);
  });

  const notice = document.getElementById("search-notice");
  const isMetaQuery =
    typeof searchQuery === "string" &&
    searchQuery.toLowerCase().startsWith("metadata://");
  if (searchQuery && !isMetaQuery) {
    const matches = highlightMatches(contentEl, searchQuery);
    buildSearchNotice(matches, searchQuery);
    notice.classList.remove("hidden");
  } else {
    notice.classList.add("hidden");
  }
}

function refreshSearchInCurrentDoc() {
  if (
    !currentDocId ||
    _lastDocHtml === null ||
    currentDocId !== _lastDocIdRendered
  ) {
    return;
  }
  const contentArea = document.getElementById("content-area");
  const scrollTop = contentArea ? contentArea.scrollTop : 0;
  _wireDocContent(_lastDocHtml);
  if (typeof loadAnnotations === "function") loadAnnotations(currentDocId);
  if (contentArea) contentArea.scrollTop = scrollTop;
}

window.refreshSearchInCurrentDoc = refreshSearchInCurrentDoc;

async function loadDocuments() {
  try {
    [allDocs] = await Promise.all([
      fetch("/api/documents").then((r) => r.json()),
    ]);
    // Also fetch all directories so empty folders appear in the sidebar
    try {
      const cfg = await fetch("/api/config").then((r) => r.json());
      if (cfg.docsFolder) {
        allFolderPaths = await fetch(
          "/api/browse/alldirs?path=" +
            encodeURIComponent(cfg.docsFolder),
        ).then((r) => r.json());
      }
    } catch {
      allFolderPaths = [];
    }
    await Promise.all([
      refreshAnnotationCounts(),
      refreshFileAttachmentCounts(),
    ]);
    renderSidebar(allDocs);
  } catch {
    document.getElementById("category-tree").innerHTML =
      `<p class="px-4 py-4 text-sm text-red-500">${window.t('sidebar.failed_to_load')}</p>`;
  }
}

async function refreshAnnotationCounts() {
  try {
    const raw = await fetch("/api/annotations").then((r) => r.json());
    annotationCounts = {};
    for (const [docId, n] of Object.entries(raw || {})) {
      annotationCounts[docId] = n;
      try {
        annotationCounts[encodeURIComponent(docId)] = n;
      } catch {}
    }
  } catch {
    annotationCounts = {};
  }
}

async function refreshFileAttachmentCounts() {
  try {
    const raw = await fetch("/api/documents/file-counts").then((r) => r.json());
    fileAttachmentCounts = {};
    for (const [docId, n] of Object.entries(raw || {})) {
      fileAttachmentCounts[docId] = n;
    }
  } catch {
    fileAttachmentCounts = {};
  }
}

async function openDocument(id, skipHistory = false, fromLink = false, anchor = null) {
  // Track navigation history for breadcrumb trail
  // fromLink===true  : forward navigation via in-doc link → push current to stack
  //                   (unless target is already in the stack → rewind instead of loop)
  // fromLink==="restore" : back navigation via history breadcrumb → stack already trimmed, don't touch
  // fromLink===false : sidebar/direct navigation → reset stack
  if (fromLink === true && currentDocId && currentDocId !== id) {
    const existingIdx = navHistory.findIndex((e) => e.id === id);
    if (existingIdx !== -1) {
      navHistory = navHistory.slice(0, existingIdx);
    } else {
      const prev = allDocs && allDocs.find((d) => d.id === currentDocId);
      navHistory.push({
        id: currentDocId,
        title: prev ? prev.title : currentDocId,
      });
    }
  } else if (!fromLink) {
    navHistory = [];
  }

  // Update back-link banner
  const backEl = document.getElementById("doc-back");
  if (navHistory.length > 0) {
    backEl.innerHTML = navHistory
      .map(
        (entry, i) =>
          `<button onclick="goBackToIndex(${i})"
        class="no-print text-blue-600 dark:text-blue-400 hover:underline">&#8592; ${esc(entry.title)}</button>`,
      )
      .join(
        '<span class="text-gray-300 dark:text-gray-600 mx-1">·</span>',
      );
    backEl.classList.remove("hidden");
  } else {
    backEl.classList.add("hidden");
    backEl.innerHTML = "";
  }

  currentDocId = id;

  // Expand sidebar path to reveal the document
  const doc = allDocs && allDocs.find((d) => d.id === id);
  if (doc) {
    const folder = doc.folder || [];
    // Expand every ancestor folder
    for (let i = 0; i < folder.length; i++) {
      expandedFolders.add(folder.slice(0, i + 1).join("|"));
    }
    // Expand the category at this folder level
    expandedCategories.add([...folder, doc.category].join("|"));
    refreshSidebar();
  }

  // Update active state in sidebar
  document
    .querySelectorAll(".doc-item")
    .forEach((el) => el.classList.remove("active"));
  const activeItem = document.getElementById("item-" + id);
  if (activeItem) {
    activeItem.classList.add("active");
    activeItem.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  // Update URL
  if (!skipHistory) {
    const url = new URL(location.href);
    url.searchParams.set("doc", id);
    url.hash = anchor ? `#${anchor}` : "";
    history.pushState({ docId: id, anchor: anchor || null }, "", url);
  }

  document.getElementById("welcome").classList.add("hidden");
  const docView = document.getElementById("doc-view");
  docView.classList.remove("hidden");
  document.getElementById("doc-content").innerHTML =
    `<p class="animate-pulse text-gray-400">${window.t('common.loading')}</p>`;

  try {
    const doc = await fetch("/api/documents/" + id).then((r) => {
      if (!r.ok) throw new Error(r.statusText);
      return r.json();
    });

    currentDocContent = doc.content;
    exitEditMode();

    document.getElementById("doc-title").textContent = doc.title;
    {
      const crumbs = document.getElementById("doc-breadcrumbs");
      const folderPills = (doc.folder || []).map(
        (seg) =>
          `<span title="${esc(seg)}" class="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">${esc(folderLabel(seg))}</span>`,
      );
      const catPill = `<span class="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">${esc(doc.category)}</span>`;
      crumbs.innerHTML = [...folderPills, catPill].join("");
    }
    document.getElementById("doc-date").textContent =
      doc.formattedDate || "";

    _lastDocHtml = doc.html;
    _lastDocIdRendered = id;
    _wireDocContent(doc.html);

    // Load annotations for this document
    loadAnnotations(id);

    // Load source-file metadata report (drives the accuracy gauge)
    if (typeof loadMetadataReport === "function") {
      loadMetadataReport(id);
    }

    document.title = doc.title;

    // Scroll to anchor if present (explicit param wins over URL hash)
    const targetAnchor =
      anchor || (window.location.hash ? window.location.hash.slice(1) : "");
    if (targetAnchor) {
      scrollToAnchor(targetAnchor);
    } else {
      document.getElementById("content-area").scrollTop = 0;
    }
  } catch (err) {
    document.getElementById("doc-content").innerHTML =
      `<p class="text-red-500">${window.t('doc.failed_to_load')}${err.message}</p>`;
  }
}

// ── Edit mode ────────────────────────────────────────────────────────────────
let _editScrollTop = 0;

function enterEditMode() {
  _editScrollTop = document.getElementById("content-area").scrollTop;
  const editor = document.getElementById("doc-editor");
  editor.value = currentDocContent;
  document.getElementById("doc-content").classList.add("hidden");
  editor.classList.remove("hidden");
  document.getElementById("view-actions").classList.add("hidden");
  document.getElementById("edit-actions").classList.remove("hidden");
  editor.focus();
  editor.addEventListener("paste", handleEditorPaste);
}

function exitEditMode() {
  const editor = document.getElementById("doc-editor");
  editor.removeEventListener("paste", handleEditorPaste);
  editor.classList.add("hidden");
  document.getElementById("doc-content").classList.remove("hidden");
  document.getElementById("edit-actions").classList.add("hidden");
  document.getElementById("view-actions").classList.remove("hidden");
  document.getElementById("edit-save-msg").textContent = "";
  document.getElementById("content-area").scrollTop = _editScrollTop;
}

// ── Delete ───────────────────────────────────────────────────────────────────
function askDeleteDocument() {
  if (!currentDocId) return;
  const doc = allDocs.find((d) => d.id === currentDocId);
  const titleEl = document.getElementById("doc-confirm-delete-title");
  if (titleEl) titleEl.textContent = doc ? doc.title : "";
  document.getElementById("doc-confirm-delete").classList.remove("hidden");
}

function cancelDeleteDocument(e) {
  if (e && e.target && e.target.id && e.target.id !== "doc-confirm-delete") {
    // clicked inside the card, not the backdrop
    return;
  }
  document.getElementById("doc-confirm-delete").classList.add("hidden");
}

async function confirmDeleteDocument() {
  if (!currentDocId) return;
  const deletedId = currentDocId;
  try {
    const r = await fetch(
      "/api/documents/" + encodeURIComponent(deletedId),
      { method: "DELETE" },
    );
    if (!r.ok) throw new Error("delete failed");
  } catch {
    document.getElementById("doc-confirm-delete").classList.add("hidden");
    return;
  }
  document.getElementById("doc-confirm-delete").classList.add("hidden");

  // Drop from local state
  allDocs = allDocs.filter((d) => d.id !== deletedId);
  if (Array.isArray(searchResults)) {
    searchResults = searchResults.filter((d) => d.id !== deletedId);
  }
  delete annotationCounts[deletedId];
  try {
    delete annotationCounts[decodeURIComponent(deletedId)];
  } catch {}
  delete fileAttachmentCounts[deletedId];
  currentDocId = null;

  // Return to welcome screen
  document.getElementById("doc-view").classList.add("hidden");
  document.getElementById("welcome").classList.remove("hidden");
  history.pushState({}, "", window.location.pathname);

  refreshSidebar();
}

// ── Save (in-place edit) ─────────────────────────────────────────────────────
async function saveDocument() {
  if (!currentDocId) return;
  const content = document.getElementById("doc-editor").value;
  const msgEl = document.getElementById("edit-save-msg");
  msgEl.textContent = window.t('doc.saving');
  msgEl.className = "text-xs text-gray-400";

  try {
    const res = await fetch("/api/documents/" + currentDocId, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) throw new Error(await res.text());

    currentDocContent = content;

    // Re-fetch rendered HTML and update view
    const doc = await fetch("/api/documents/" + currentDocId).then((r) =>
      r.json(),
    );
    _lastDocHtml = doc.html;
    _lastDocIdRendered = currentDocId;
    _wireDocContent(doc.html);

    applyAnnotationHighlights();
    renderElevator();

    const fileLinkMatches = content.match(/\]\(\s*\.?\/files\/[^)\s]+/g);
    const fileLinkCount = fileLinkMatches ? fileLinkMatches.length : 0;
    if (fileLinkCount > 0) fileAttachmentCounts[currentDocId] = fileLinkCount;
    else delete fileAttachmentCounts[currentDocId];
    refreshSidebar();

    exitEditMode();
  } catch (err) {
    msgEl.textContent = window.t('error.save') + err.message;
    msgEl.className = "text-xs text-red-500 dark:text-red-400";
  }
}

// ── Back breadcrumb navigation ──────────────────────────────────────────────
function goBackToIndex(i) {
  const entry = navHistory[i];
  if (!entry) return;
  navHistory = navHistory.slice(0, i); // drop this entry and everything after
  openDocument(entry.id, false, "restore");
}
