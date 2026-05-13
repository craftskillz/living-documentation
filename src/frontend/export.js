// ── Export modal (Markdown / HTML / PDF) + exportAllPDF ────────────────────
// Depends on globals from state.js (allDocs) and utils.js (esc).

async function exportAllPDF() {
  const btn = document.getElementById("export-all-pdf-btn");
  const originalHtml = btn.innerHTML;
  btn.innerHTML = "⏳";
  btn.disabled = true;

  try {
    const docs =
      allDocs && allDocs.length
        ? allDocs
        : await fetch("/api/documents").then((r) => r.json());

    // Batch-fetch full HTML content (5 at a time), keyed by id
    const htmlById = {};
    const batchSize = 5;
    for (let i = 0; i < docs.length; i += batchSize) {
      const batch = docs.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map((d) =>
          fetch("/api/documents/" + d.id)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
        ),
      );
      for (const r of results) {
        if (r) htmlById[r.id ?? docs[i]?.id] = r;
      }
      // re-key by id using the batch metadata
      batch.forEach((d, j) => {
        if (results[j]) htmlById[d.id] = results[j];
      });
    }

    // Build folder tree identical to sidebar's buildFolderTree
    function buildTree(list) {
      const root = { categories: {}, children: {} };
      for (const doc of list) {
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
      return root;
    }

    // Traverse in sidebar order: General → subfolders (alpha) → other cats (alpha)
    function orderedDocs(node) {
      const result = [];
      if (node.categories["General"])
        result.push(...node.categories["General"]);
      const childKeys = Object.keys(node.children).sort((a, b) =>
        a.localeCompare(b),
      );
      for (const key of childKeys)
        result.push(...orderedDocs(node.children[key]));
      const otherCats = Object.keys(node.categories)
        .filter((c) => c !== "General")
        .sort((a, b) => a.localeCompare(b));
      for (const cat of otherCats) result.push(...node.categories[cat]);
      return result;
    }

    // Strip leading numeric prefix, same as folderLabel()
    function fLabel(seg) {
      return seg
        .replace(/^\d+_/, "")
        .replace(/[_-]+/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
    }

    // Build TOC HTML mirroring sidebar structure
    function buildTocNode(node, depth) {
      let html = "";
      const indent = depth * 1.25;
      const renderCatItems = (cat, catDocs) => {
        const catLabel =
          depth === 0 && cat === "General" ? "General" : cat;
        html += `<li style="margin-left:${indent}rem;margin-top:${depth === 0 ? "0.75" : "0.4"}rem;">`;
        html += `<span style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280;">${catLabel}</span>`;
        html += `<ul style="margin:0.2rem 0 0 0;padding:0;list-style:none;">`;
        for (const doc of catDocs) {
          html += `<li style="margin-left:${indent + 0.75}rem;padding:0.15rem 0;">`;
          html += `<a href="#doc-${doc.id}" style="color:#1d4ed8;text-decoration:none;font-size:0.875rem;">${esc(doc.title)}</a>`;
          if (doc.formattedDate)
            html += `<span style="color:#9ca3af;font-size:0.7rem;margin-left:0.5rem;">${esc(doc.formattedDate)}</span>`;
          html += `</li>`;
        }
        html += `</ul></li>`;
      };

      if (node.categories["General"])
        renderCatItems("General", node.categories["General"]);

      const childKeys = Object.keys(node.children).sort((a, b) =>
        a.localeCompare(b),
      );
      for (const key of childKeys) {
        html += `<li style="margin-left:${indent}rem;margin-top:0.75rem;">`;
        html += `<span style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#7c3aed;">&#128193; ${fLabel(key)}</span>`;
        html += `<ul style="margin:0.2rem 0 0 0;padding:0;list-style:none;">`;
        html += buildTocNode(node.children[key], depth + 1);
        html += `</ul></li>`;
      }

      const otherCats = Object.keys(node.categories)
        .filter((c) => c !== "General")
        .sort((a, b) => a.localeCompare(b));
      for (const cat of otherCats)
        renderCatItems(cat, node.categories[cat]);

      return html;
    }

    // Rewrite ?doc=X links to internal anchors #doc-X
    function rewriteDocLinks(html) {
      return html.replace(
        /href="[^"]*\?doc=([^"&#]+)(?:#[^"]*)?"/g,
        (match, docId) => `href="#doc-${docId}"`,
      );
    }

    const appTitle = esc(document.title || "Living Documentation");
    const tree = buildTree(docs);
    const ordered = orderedDocs(tree);

    const tocHtml = `
<div style="page-break-after:always;">
  <h2 style="font-size:1.25rem;font-weight:700;color:#111827;margin-bottom:1.5rem;padding-bottom:0.5rem;border-bottom:2px solid #e5e7eb;">${window.t('pdf.toc_title')}</h2>
  <ul style="list-style:none;padding:0;margin:0;">
    ${buildTocNode(tree, 0)}
  </ul>
</div>`;

    const sectionsHtml = ordered
      .map((doc, idx) => {
        const full = htmlById[doc.id];
        if (!full) return "";
        const html = rewriteDocLinks(full.html);
        const folderPath = Array.isArray(doc.folder)
          ? doc.folder.map((f) => esc(fLabel(f))).join(" › ") + " › "
          : "";
        const meta = `${folderPath}${esc(doc.category)}${doc.formattedDate ? " · " + esc(doc.formattedDate) : ""}`;
        const pageBreak =
          idx > 0
            ? '<div style="page-break-before:always;height:0;"></div>'
            : "";
        return `${pageBreak}
<section id="doc-${doc.id}" style="padding:2rem 0;">
  <div style="border-bottom:2px solid #e5e7eb;padding-bottom:0.75rem;margin-bottom:1.5rem;">
    <div style="font-size:0.7rem;color:#6b7280;margin-bottom:0.25rem;">${meta}</div>
    <h1 style="font-size:1.75rem;font-weight:800;color:#111827;margin:0;">${esc(doc.title)}</h1>
  </div>
  <div class="prose max-w-none">${html}</div>
</section>`;
      })
      .join("\n");

    const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${appTitle} — Export PDF</title>
  <script src="https://cdn.tailwindcss.com?plugins=typography"><\/script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"><\/script>
  <style>
    body { font-family: system-ui,sans-serif; max-width: 860px; margin: 0 auto; padding: 2rem; color: #111827; background: #fff; }
    .prose pre { border-radius: 0.5rem; }
    .prose img { max-width: 100%; }
    @media print {
      body { padding: 0; }
      a { color: #1d4ed8; text-decoration: underline; }
    }
  </style>
</head>
<body>
  <div style="text-align:center;margin-bottom:3rem;padding-bottom:2rem;border-bottom:3px solid #e5e7eb;page-break-after:avoid;">
    <h1 style="font-size:2rem;font-weight:900;color:#111827;margin:0;">${appTitle}</h1>
  </div>
  ${tocHtml}
  ${sectionsHtml}
  <script>
    document.querySelectorAll('pre code').forEach(b => hljs.highlightElement(b));
    setTimeout(() => window.print(), 800);
  <\/script>
</body>
</html>`;

    const w = window.open("", "_blank");
    if (!w) {
      alert(window.t('error.pdf_popup'));
      return;
    }
    w.document.write(fullHtml);
    w.document.close();
  } catch (err) {
    alert(window.t('error.pdf_export') + err.message);
  } finally {
    btn.innerHTML = originalHtml;
    btn.disabled = false;
  }
}

// ── Export modal (tabs + download actions) ──────────────────────────────────
let _exportCurrentTab = 'markdown';

function switchExportTab(tab) {
  _exportCurrentTab = tab;
  ['markdown', 'html', 'pdf'].forEach((t) => {
    const tabBtn = document.getElementById(`export-tab-${t}`);
    const content = document.getElementById(`export-content-${t}`);
    const isActive = t === tab;
    tabBtn.classList.toggle('border-b-2', isActive);
    tabBtn.classList.toggle('border-blue-500', isActive);
    tabBtn.classList.toggle('text-blue-600', isActive);
    tabBtn.classList.toggle('dark:text-blue-400', isActive);
    tabBtn.classList.toggle('font-semibold', isActive);
    tabBtn.classList.toggle('text-gray-500', !isActive);
    tabBtn.classList.toggle('dark:text-gray-400', !isActive);
    content.classList.toggle('hidden', !isActive);
  });
  // Folder list: visible for html only (lazy-loaded on first switch)
  document.getElementById('export-folder-section').classList.toggle('hidden', tab !== 'html');
  if (tab === 'html') loadExportFolders();
}

let _exportFoldersLoaded = false;

async function loadExportFolders() {
  if (_exportFoldersLoaded) return;
  const list = document.getElementById('export-folder-list');
  list.innerHTML = `<p class="text-sm text-gray-400 py-2">${window.t('common.loading')}</p>`;
  try {
    const docs = await fetch('/api/documents').then((r) => r.json());
    const groups = new Set();
    docs.forEach((doc) => groups.add(doc.folder?.[0] ?? doc.category ?? 'General'));
    const sorted = [...groups].sort((a, b) => {
      if (a === 'General') return -1;
      if (b === 'General') return 1;
      return a.localeCompare(b);
    });
    list.innerHTML = sorted.map((g) => `
      <label class="flex items-center gap-3 px-1 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
        <input type="checkbox" value="${g}"
          class="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500">
        <span class="text-sm text-gray-700 dark:text-gray-300">${g}</span>
      </label>`).join('');
    _exportFoldersLoaded = true;
  } catch {
    list.innerHTML = `<p class="text-sm text-red-500">${window.t('common.error_prefix')}failed to load folders</p>`;
  }
}

function openExportModal() {
  document.getElementById('export-modal').classList.remove('hidden');
  switchExportTab('markdown');
}

function closeExportModal() {
  document.getElementById('export-modal').classList.add('hidden');
  _exportFoldersLoaded = false;
}

async function exportMarkdown() {
  const btn  = document.getElementById('export-md-btn');
  const orig = btn.innerHTML;
  btn.innerHTML = '⏳';
  btn.disabled  = true;

  try {
    const res = await fetch('/api/export/markdown', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    if (!res.ok) throw new Error(await res.text());
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'export-markdown.zip';
    a.click();
    URL.revokeObjectURL(url);
    closeExportModal();
  } catch (err) {
    alert(window.t('common.error_prefix') + err.message);
  } finally {
    btn.innerHTML = orig;
    btn.disabled  = false;
  }
}

async function exportHtml(mode) {
  const checked = [...document.querySelectorAll('#export-folder-list input:checked')];
  const folders = checked.map((cb) => cb.value);
  if (!folders.length) return;

  const btnId = mode === 'confluence' ? 'export-confluence-btn' : 'export-notion-btn';
  const btn   = document.getElementById(btnId);
  const orig  = btn.innerHTML;
  btn.innerHTML = '⏳';
  btn.disabled  = true;

  try {
    const res = await fetch('/api/export/html', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folders, mode }),
    });
    if (!res.ok) throw new Error(await res.text());
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `export-${mode}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    closeExportModal();
  } catch (err) {
    alert(window.t('common.error_prefix') + err.message);
  } finally {
    btn.innerHTML = orig;
    btn.disabled  = false;
  }
}

async function exportAllPdfFromModal() {
  closeExportModal();
  exportAllPDF();
}
