// ── Sidebar rendering ────────────────────────────────────────────────────────
// Depends on globals from state.js, utils.js, sidebar-helpers.js, and
// `currentDocId` (updated by documents.js when a doc opens).

function renderSidebar(docs) {
  const tree = document.getElementById("category-tree");
  const countEl = document.getElementById("doc-count");

  if (!docs.length && !allFolderPaths.length) {
    tree.innerHTML =
      `<p class="px-4 py-8 text-sm text-gray-400 text-center">${window.t('sidebar.no_docs')}</p>`;
    countEl.textContent = "";
    return;
  }

  countEl.textContent = `${docs.length} document${docs.length !== 1 ? "s" : ""}`;

  // Auto-expand only root General initially
  if (expandedCategories.size === 0) expandedCategories.add("General");

  tree.innerHTML = renderTreeNode(buildFolderTree(docs), []);
}

// Build a recursive tree: each node holds { categories: {cat: docs[]}, children: {label: node} }
function buildFolderTree(docs) {
  const root = { categories: {}, children: {} };
  for (const doc of docs) {
    let node = root;
    for (const seg of doc.folder || []) {
      if (!node.children[seg])
        node.children[seg] = { categories: {}, children: {} };
      node = node.children[seg];
    }
    if (!node.categories[doc.category])
      node.categories[doc.category] = [];
    node.categories[doc.category].push(doc);
  }
  // Ensure empty folders appear in the tree (only when no active filter)
  if (searchQuery) return root;
  for (const folderPath of allFolderPaths) {
    const segments = folderPath.split("/").filter(Boolean);
    let node = root;
    for (const seg of segments) {
      if (!node.children[seg])
        node.children[seg] = { categories: {}, children: {} };
      node = node.children[seg];
    }
  }
  return root;
}

// Render a tree node at a given folder path (array of segment strings)
function renderTreeNode(node, folderPath) {
  let html = "";

  // Flat mode: categories are hidden — merge all docs in this node and sort by filename
  if (hideCategories) {
    const flatDocs = Object.values(node.categories)
      .flat()
      .sort((a, b) => (a.filename || "").localeCompare(b.filename || ""));
    html += flatDocs.map((doc) => renderDocItem(doc)).join("");

    // Subfolders (recursive) — folders are still shown
    const childKeys = Object.keys(node.children).sort((a, b) =>
      a.localeCompare(b),
    );
    for (const key of childKeys) {
      const childPath = [...folderPath, key];
      const pathKey = childPath.join("|");
      const nodeId =
        "folder-" + childPath.map((s) => s.replace(/\W/g, "-")).join("-");
      const isExpanded = expandedFolders.has(pathKey);
      const docCount = countTreeDocs(node.children[key]);
      const folderAnnotatedDocs = countTreeAnnotatedDocs(node.children[key]);
      const folderFileDocs = countTreeFileAttachedDocs(node.children[key]);
      html += `
<div class="mb-1">
  <button onclick="toggleFolder('${esc(pathKey)}')"
          class="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold
                 text-violet-600 dark:text-violet-400 uppercase tracking-wider
                 hover:bg-gray-50 dark:hover:bg-gray-800/60 rounded-md transition-colors">
    <span class="flex items-center gap-2 min-w-0">
      <span title="${esc(key)}" class="truncate">&#128193; ${esc(folderLabel(key))}</span>
      ${annotatedDocsBadge(folderAnnotatedDocs)}
      ${fileAttachedDocsBadge(folderFileDocs)}
    </span>
    <span class="flex items-center gap-1.5">
      <span class="font-normal normal-case text-gray-400">${docCount}</span>
      <span class="transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}" id="arrow-${nodeId}">&#9656;</span>
    </span>
  </button>
  <div id="${nodeId}" class="category-docs pl-3 ${isExpanded ? "expanded" : "collapsed"}">
    ${renderTreeNode(node.children[key], childPath)}
  </div>
</div>`;
    }
    return html;
  }

  // Helper to render one category group
  const renderCat = (cat) => {
    const catPathKey = [...folderPath, cat].join("|");
    const catNodeId =
      "cat-" +
      [...folderPath, cat].map((s) => s.replace(/\W/g, "-")).join("-");
    const isExpanded = expandedCategories.has(catPathKey);
    const catAnnotatedDocs = node.categories[cat].reduce(
      (s, d) => s + (annotationCounts[d.id] > 0 ? 1 : 0),
      0,
    );
    const catFileDocs = node.categories[cat].reduce(
      (s, d) => s + (fileAttachmentCounts[d.id] > 0 ? 1 : 0),
      0,
    );
    return `
<div class="mb-0.5">
  <button onclick="toggleCategory('${esc(catPathKey)}')"
          class="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold
                 text-gray-500 dark:text-gray-400 uppercase tracking-wider
                 hover:bg-gray-50 dark:hover:bg-gray-800/60 rounded-md transition-colors">
    <span class="flex items-center gap-2">
      <span>${esc(cat)}</span>
      ${annotatedDocsBadge(catAnnotatedDocs)}
      ${fileAttachedDocsBadge(catFileDocs)}
    </span>
    <span class="flex items-center gap-1.5">
      <span class="font-normal normal-case text-gray-400">${node.categories[cat].length}</span>
      <span class="transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}" id="arrow-${catNodeId}">&#9656;</span>
    </span>
  </button>
  <div id="${catNodeId}" class="category-docs pl-2 ${isExpanded ? "expanded" : "collapsed"}">
    ${node.categories[cat].map((doc) => renderDocItem(doc)).join("")}
  </div>
</div>`;
  };

  // General always first
  if (node.categories["General"]) html += renderCat("General");

  // Subfolders (sorted alphabetically — numeric prefix like "1_" sorts naturally)
  const childKeys = Object.keys(node.children).sort((a, b) =>
    a.localeCompare(b),
  );
  for (const key of childKeys) {
    const childPath = [...folderPath, key];
    const pathKey = childPath.join("|");
    const nodeId =
      "folder-" + childPath.map((s) => s.replace(/\W/g, "-")).join("-");
    const isExpanded = expandedFolders.has(pathKey);
    const docCount = countTreeDocs(node.children[key]);
    const folderAnnotatedDocs = countTreeAnnotatedDocs(node.children[key]);
    const folderFileDocs = countTreeFileAttachedDocs(node.children[key]);
    html += `
<div class="mb-1">
  <button onclick="toggleFolder('${esc(pathKey)}')"
          class="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold
                 text-violet-600 dark:text-violet-400 uppercase tracking-wider
                 hover:bg-gray-50 dark:hover:bg-gray-800/60 rounded-md transition-colors">
    <span class="flex items-center gap-2 min-w-0">
      <span title="${esc(key)}" class="truncate">&#128193; ${esc(folderLabel(key))}</span>
      ${annotatedDocsBadge(folderAnnotatedDocs)}
      ${fileAttachedDocsBadge(folderFileDocs)}
    </span>
    <span class="flex items-center gap-1.5">
      <span class="font-normal normal-case text-gray-400">${docCount}</span>
      <span class="transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}" id="arrow-${nodeId}">&#9656;</span>
    </span>
  </button>
  <div id="${nodeId}" class="category-docs pl-3 ${isExpanded ? "expanded" : "collapsed"}">
    ${renderTreeNode(node.children[key], childPath)}
  </div>
</div>`;
  }

  // Non-General category groups (sorted alphabetically)
  const otherCats = Object.keys(node.categories)
    .filter((c) => c !== "General")
    .sort((a, b) => a.localeCompare(b));
  for (const cat of otherCats) html += renderCat(cat);

  return html;
}

function renderDocItem(doc) {
  const isActive = doc.id === currentDocId;
  const annCount = annotationCounts[doc.id] || 0;
  const fileCount = fileAttachmentCounts[doc.id] || 0;
  return `
<button onclick="openDocument('${esc(doc.id)}')"
        id="item-${esc(doc.id)}"
        class="doc-item w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors
               text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60
               ${isActive ? "active" : ""}">
  <div class="leading-snug flex items-center justify-between gap-2">
    <span class="truncate">${esc(doc.title)}</span>
    <span class="flex items-center gap-1 shrink-0">
      ${annotationBadge(annCount)}
      ${fileAttachmentBadge(fileCount)}
    </span>
  </div>
  ${doc.formattedDate ? `<div class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">${esc(doc.formattedDate)}</div>` : ""}
</button>`;
}

function toggleCategory(key) {
  const parts = key.split("|");
  const catNodeId =
    "cat-" + parts.map((p) => p.replace(/\W/g, "-")).join("-");
  const el = document.getElementById(catNodeId);
  const arrow = document.getElementById("arrow-" + catNodeId);
  if (!el) return;
  const expanding = el.classList.contains("collapsed");
  el.classList.toggle("collapsed", !expanding);
  el.classList.toggle("expanded", expanding);
  if (arrow) arrow.style.transform = expanding ? "rotate(90deg)" : "";
  if (expanding) expandedCategories.add(key);
  else expandedCategories.delete(key);
}

function toggleFolder(pathKey) {
  const parts = pathKey.split("|");
  const nodeId =
    "folder-" + parts.map((p) => p.replace(/\W/g, "-")).join("-");
  const el = document.getElementById(nodeId);
  const arrow = document.getElementById("arrow-" + nodeId);
  if (!el) return;
  const expanding = el.classList.contains("collapsed");
  el.classList.toggle("collapsed", !expanding);
  el.classList.toggle("expanded", expanding);
  if (arrow) arrow.style.transform = expanding ? "rotate(90deg)" : "";
  if (expanding) expandedFolders.add(pathKey);
  else expandedFolders.delete(pathKey);
}

function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("hidden");
}

function toggleHideCategories() {
  hideCategories = !hideCategories;
  try {
    localStorage.setItem("ld-hide-categories", hideCategories ? "1" : "0");
  } catch {
    /* ignore */
  }
  applyHideCategoriesButtonState();
  refreshSidebar();
}

function applyHideCategoriesButtonState() {
  const btn = document.getElementById("toggle-categories-btn");
  if (!btn) return;
  btn.classList.toggle("text-blue-500", !hideCategories);
  btn.classList.toggle("dark:text-blue-400", !hideCategories);
  btn.classList.toggle("text-gray-400", hideCategories);
  btn.classList.toggle("dark:text-gray-500", hideCategories);
}

function toggleHideAttachments() {
  hideAttachments = !hideAttachments;
  try {
    localStorage.setItem("ld-hide-attachments", hideAttachments ? "1" : "0");
  } catch {
    /* ignore */
  }
  applyHideAttachmentsButtonState();
  refreshSidebar();
}

function applyHideAttachmentsButtonState() {
  const btn = document.getElementById("toggle-attachments-btn");
  if (!btn) return;
  btn.classList.toggle("text-blue-500", !hideAttachments);
  btn.classList.toggle("dark:text-blue-400", !hideAttachments);
  btn.classList.toggle("text-gray-400", hideAttachments);
  btn.classList.toggle("dark:text-gray-500", hideAttachments);
}
