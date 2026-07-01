<script lang="ts">
  import { t } from "../i18n.svelte";
  import { home } from "./state.svelte";
  import type { DocSummary } from "./types";
  import { renderColumnLayoutsInHtml } from "./wireContent";

  let { open, onclose }: {
    open: boolean;
    onclose: () => void;
  } = $props();

  type Tab = "markdown" | "html" | "pdf";
  let activeTab = $state<Tab>("markdown");

  let foldersLoaded = false;
  let foldersLoading = $state(false);
  let foldersError = $state(false);
  let folderGroups = $state<string[]>([]);
  let checkedFolders = $state<Record<string, boolean>>({});

  let mdBusy = $state(false);
  let notionBusy = $state(false);
  let confluenceBusy = $state(false);
  let pdfBusy = $state(false);

  let wasOpen = false;
  $effect(() => {
    if (open && !wasOpen) {
      wasOpen = true;
      activeTab = "markdown";
      foldersLoaded = false;
      folderGroups = [];
      checkedFolders = {};
    } else if (!open) {
      wasOpen = false;
    }
  });

  function esc(s: string): string {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function switchTab(tab: Tab) {
    activeTab = tab;
    if (tab === "html") loadFolders();
  }

  async function loadFolders() {
    if (foldersLoaded) return;
    foldersLoading = true;
    foldersError = false;
    try {
      const docs: DocSummary[] = await fetch("/api/documents").then((r) => r.json());
      const groups = new Set<string>();
      docs.forEach((doc) => groups.add(doc.folder?.[0] ?? doc.category ?? "General"));
      folderGroups = [...groups].sort((a, b) => {
        if (a === "General") return -1;
        if (b === "General") return 1;
        return a.localeCompare(b);
      });
      foldersLoaded = true;
    } catch {
      foldersError = true;
    } finally {
      foldersLoading = false;
    }
  }

  async function exportMarkdown() {
    mdBusy = true;
    try {
      const res = await fetch("/api/export/markdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "export-markdown.zip";
      a.click();
      URL.revokeObjectURL(url);
      onclose();
    } catch (err: unknown) {
      alert(t("common.error_prefix") + (err instanceof Error ? err.message : String(err)));
    } finally {
      mdBusy = false;
    }
  }

  async function exportHtml(mode: "notion" | "confluence") {
    const folders = folderGroups.filter((g) => checkedFolders[g]);
    if (!folders.length) return;

    if (mode === "confluence") confluenceBusy = true;
    else notionBusy = true;

    try {
      const res = await fetch("/api/export/html", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folders, mode }),
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `export-${mode}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      onclose();
    } catch (err: unknown) {
      alert(t("common.error_prefix") + (err instanceof Error ? err.message : String(err)));
    } finally {
      confluenceBusy = false;
      notionBusy = false;
    }
  }

  interface TreeNode {
    categories: Record<string, DocSummary[]>;
    children: Record<string, TreeNode>;
  }

  async function exportAllPDF() {
    pdfBusy = true;
    try {
      const docs: DocSummary[] =
        home.allDocs && home.allDocs.length
          ? home.allDocs
          : await fetch("/api/documents").then((r) => r.json());

      // Batch-fetch full HTML content (5 at a time), keyed by id
      const htmlById: Record<string, { id: string; html: string }> = {};
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
        batch.forEach((d, j) => {
          if (results[j]) htmlById[d.id] = results[j];
        });
      }

      function buildTree(list: DocSummary[]): TreeNode {
        const root: TreeNode = { categories: {}, children: {} };
        for (const doc of list) {
          let node = root;
          for (const seg of doc.folder || []) {
            if (!node.children[seg]) node.children[seg] = { categories: {}, children: {} };
            node = node.children[seg];
          }
          if (!node.categories[doc.category]) node.categories[doc.category] = [];
          node.categories[doc.category].push(doc);
        }
        return root;
      }

      function orderedDocs(node: TreeNode): DocSummary[] {
        const result: DocSummary[] = [];
        if (node.categories["General"]) result.push(...node.categories["General"]);
        const childKeys = Object.keys(node.children).sort((a, b) => a.localeCompare(b));
        for (const key of childKeys) result.push(...orderedDocs(node.children[key]));
        const otherCats = Object.keys(node.categories)
          .filter((c) => c !== "General")
          .sort((a, b) => a.localeCompare(b));
        for (const cat of otherCats) result.push(...node.categories[cat]);
        return result;
      }

      function fLabel(seg: string): string {
        return seg
          .replace(/^\d+_/, "")
          .replace(/[_-]+/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
      }

      function buildTocNode(node: TreeNode, depth: number): string {
        let html = "";
        const indent = depth * 1.25;
        const renderCatItems = (cat: string, catDocs: DocSummary[]) => {
          const catLabel = depth === 0 && cat === "General" ? "General" : cat;
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

        if (node.categories["General"]) renderCatItems("General", node.categories["General"]);

        const childKeys = Object.keys(node.children).sort((a, b) => a.localeCompare(b));
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
        for (const cat of otherCats) renderCatItems(cat, node.categories[cat]);

        return html;
      }

      function rewriteDocLinks(html: string): string {
        return html.replace(
          /href="[^"]*\?doc=([^"&#]+)(?:#[^"]*)?"/g,
          (_match, docId) => `href="#doc-${docId}"`,
        );
      }

      const appTitle = esc(document.title || "Living Documentation");
      const tree = buildTree(docs);
      const ordered = orderedDocs(tree);

      const tocHtml = `
<div style="page-break-after:always;">
  <h2 style="font-size:1.25rem;font-weight:700;color:#111827;margin-bottom:1.5rem;padding-bottom:0.5rem;border-bottom:2px solid #e5e7eb;">${t("pdf.toc_title")}</h2>
  <ul style="list-style:none;padding:0;margin:0;">
    ${buildTocNode(tree, 0)}
  </ul>
</div>`;

      const sectionsHtml = ordered
        .map((doc, idx) => {
          const full = htmlById[doc.id];
          if (!full) return "";
          const html = rewriteDocLinks(renderColumnLayoutsInHtml(full.html));
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
    .prose .ld-columns { display: grid; gap: 1rem; align-items: center; margin: 1rem 0; }
    .prose .ld-columns.ld-valign-top { align-items: start; }
    .prose .ld-columns.ld-valign-bottom { align-items: end; }
    .prose .ld-columns.ld-valign-stretch { align-items: stretch; }
    .prose .ld-columns.ld-gap-sm { gap: 0.5rem; }
    .prose .ld-columns.ld-gap-lg { gap: 2rem; }
    .prose .ld-columns.ld-text-left .ld-column { text-align: left; }
    .prose .ld-columns.ld-text-center .ld-column { text-align: center; }
    .prose .ld-columns.ld-text-right .ld-column { text-align: right; }
    .prose .ld-columns.ld-text-justify .ld-column { text-align: justify; }
    .prose .ld-column { min-width: 0; }
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
        alert(t("error.pdf_popup"));
        return;
      }
      w.document.write(fullHtml);
      w.document.close();
      onclose();
    } catch (err: unknown) {
      alert(t("error.pdf_export") + (err instanceof Error ? err.message : String(err)));
    } finally {
      pdfBusy = false;
    }
  }

  const tabActiveClass = "px-4 py-2 text-sm border-b-2 border-blue-500 text-blue-600 dark:text-blue-400 font-semibold transition-colors";
  const tabInactiveClass = "px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors";
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onclick={(e) => { if (e.target === e.currentTarget) onclose(); }}>
    <div class="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-sm mx-4 p-6 space-y-4">
      <!-- Title -->
      <h3 class="text-base font-semibold text-gray-900 dark:text-gray-50">
        <i class="fa-solid fa-file-export mr-2 text-blue-500"></i>
        <span>{t("modal.export.title")}</span>
      </h3>

      <!-- Tabs -->
      <div class="flex gap-0 border-b border-gray-200 dark:border-gray-700">
        <button onclick={() => switchTab("markdown")} class={activeTab === "markdown" ? tabActiveClass : tabInactiveClass}>{t("modal.export.tab_markdown")}</button>
        <button onclick={() => switchTab("html")} class={activeTab === "html" ? tabActiveClass : tabInactiveClass}>{t("modal.export.tab_html")}</button>
        <button onclick={() => switchTab("pdf")} class={activeTab === "pdf" ? tabActiveClass : tabInactiveClass}>{t("modal.export.tab_pdf")}</button>
      </div>

      <!-- Folder list (html tab only) -->
      {#if activeTab === "html"}
        <div>
          <div class="max-h-48 overflow-y-auto space-y-0.5 border border-gray-200 dark:border-gray-700 rounded-lg p-2">
            {#if foldersLoading}
              <p class="text-sm text-gray-400 py-2">{t("common.loading")}</p>
            {:else if foldersError}
              <p class="text-sm text-red-500">{t("common.error_prefix")}failed to load folders</p>
            {:else}
              {#each folderGroups as g (g)}
                <label class="flex items-center gap-3 px-1 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                  <input type="checkbox" value={g} bind:checked={checkedFolders[g]}
                    class="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500" />
                  <span class="text-sm text-gray-700 dark:text-gray-300">{g}</span>
                </label>
              {/each}
            {/if}
          </div>
        </div>
      {/if}

      <!-- Markdown tab content -->
      {#if activeTab === "markdown"}
        <div>
          <p class="text-xs text-gray-500 dark:text-gray-400">{t("modal.export.markdown_hint")}</p>
          <div class="flex justify-end gap-3 pt-2">
            <button onclick={onclose} class="text-sm px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">{t("common.cancel")}</button>
            <button onclick={exportMarkdown} disabled={mdBusy} class="text-sm px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors">
              {mdBusy ? "⏳" : t("modal.export.markdown_btn")}
            </button>
          </div>
        </div>
      {/if}

      <!-- HTML tab content -->
      {#if activeTab === "html"}
        <div>
          <p class="text-xs text-gray-500 dark:text-gray-400">{t("modal.export_html.hint")}</p>
          <div class="flex justify-end gap-3 pt-2">
            <button onclick={onclose} class="text-sm px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">{t("common.cancel")}</button>
            <button onclick={() => exportHtml("notion")} disabled={notionBusy} class="text-sm px-4 py-2 rounded-lg border border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 font-semibold transition-colors">
              {notionBusy ? "⏳" : t("modal.export_html.notion_btn")}
            </button>
            <button onclick={() => exportHtml("confluence")} disabled={confluenceBusy} class="text-sm px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors">
              {confluenceBusy ? "⏳" : t("modal.export_html.confluence_btn")}
            </button>
          </div>
        </div>
      {/if}

      <!-- PDF tab content -->
      {#if activeTab === "pdf"}
        <div>
          <p class="text-xs text-gray-500 dark:text-gray-400">{t("modal.export.pdf_hint")}</p>
          <div class="flex justify-end gap-3 pt-2">
            <button onclick={onclose} class="text-sm px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">{t("common.cancel")}</button>
            <button onclick={exportAllPDF} disabled={pdfBusy} class="text-sm px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors">
              {pdfBusy ? "⏳" : t("modal.export.pdf_btn")}
            </button>
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}
