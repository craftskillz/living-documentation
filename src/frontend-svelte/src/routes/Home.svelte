<script lang="ts">
  import { onMount } from "svelte";
  import "../lib/home/home.css";
  import { home } from "../lib/home/state.svelte";
  import { t, loadI18n } from "../lib/i18n.svelte";
  import * as api from "../lib/home/api";
  import Topbar from "../lib/Topbar.svelte";
  import Sidebar from "../lib/home/Sidebar.svelte";
  import DocViewer from "../lib/home/DocViewer.svelte";
  import NewFolderModal from "../lib/home/NewFolderModal.svelte";
  import NewDocModal from "../lib/home/NewDocModal.svelte";
  import ExportModal from "../lib/home/ExportModal.svelte";
  import WordCloudModal from "../lib/home/WordCloudModal.svelte";
  import type { DocDetail, DocSummary } from "../lib/home/types";

  let newFolderOpen = $state(false);
  let newDocOpen = $state(false);
  let exportOpen = $state(false);
  let wordCloudOpen = $state(false);

  let currentDoc = $state<DocDetail | null>(null);
  let loadingDoc = $state(false);
  let docError = $state("");
  let dark = $state(false);
  let appTitle = $state("Living AI Documentation");
  let welcomePattern = $state("YYYY_MM_DD_HH_mm_[Category]_title.md");

  let searchTimer: number | null = null;

  // ── Dark mode ────────────────────────────────────────────────────────────────
  function loadDarkPref(): boolean {
    try {
      const saved = localStorage.getItem("ld-dark");
      if (saved !== null) return saved === "true";
    } catch {}
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  function applyDark(v: boolean) {
    dark = v;
    document.documentElement.classList.toggle("dark", v);
  }
  function toggleDark() {
    applyDark(!dark);
    try { localStorage.setItem("ld-dark", String(dark)); } catch {}
  }

  // ── Code block hljs theme swap ───────────────────────────────────────────────
  $effect(() => {
    const hljsDark = document.getElementById('hljs-dark') as HTMLLinkElement | null;
    const hljsLight = document.getElementById('hljs-light') as HTMLLinkElement | null;
    if (!hljsDark || !hljsLight) return;
    const useLightTheme = home.codeBlockLightTheme && !dark;
    hljsDark.disabled = useLightTheme;
    hljsLight.disabled = !useLightTheme;
    document.body.classList.toggle('ld-code-light', useLightTheme);
  });

  // ── Search ───────────────────────────────────────────────────────────────────
  function onSearch(q: string) {
    const trimmed = q.trim();
    if (searchTimer) clearTimeout(searchTimer);
    if (!trimmed) {
      home.searchQuery = "";
      home.searchResults = null;
      return;
    }
    home.searchQuery = trimmed;
    home.searchResults = home.allDocs.filter(
      d => d.title.toLowerCase().includes(trimmed.toLowerCase()) ||
           d.category.toLowerCase().includes(trimmed.toLowerCase()),
    );
    searchTimer = window.setTimeout(async () => {
      try {
        const results = await api.searchDocuments(trimmed);
        if (trimmed === home.searchQuery) home.searchResults = results;
      } catch {}
    }, 350);
  }

  // ── Navigation history (back-link trail when following in-doc links) ───────────
  let navHistory = $state<{ id: string; title: string }[]>([]);

  function goBack(i: number) {
    const entry = navHistory[i];
    if (!entry) return;
    navHistory = navHistory.slice(0, i); // drop this entry and everything after
    openDoc(entry.id, false, "restore");
  }

  // ── Document open ──────────────────────────────────────────────────────────────
  async function openDoc(
    id: string,
    skipHistory = false,
    fromLink: boolean | "restore" = false,
    anchor: string | null = null,
  ) {
    // Maintain the breadcrumb trail.
    if (fromLink === true && home.currentDocId && home.currentDocId !== id) {
      const existingIdx = navHistory.findIndex(e => e.id === id);
      if (existingIdx !== -1) {
        navHistory = navHistory.slice(0, existingIdx);
      } else {
        const prev = home.allDocs.find(d => d.id === home.currentDocId);
        navHistory = [...navHistory, { id: home.currentDocId, title: prev ? prev.title : home.currentDocId }];
      }
    } else if (!fromLink) {
      navHistory = [];
    }

    home.currentDocId = id;
    const summary = home.allDocs.find(d => d.id === id);
    if (summary) home.revealDoc(summary);

    if (!skipHistory) {
      const url = new URL(location.href);
      url.searchParams.set("doc", id);
      url.hash = anchor ? `#${anchor}` : "";
      history.pushState({ docId: id, anchor: anchor || null }, "", url);
    }

    loadingDoc = true;
    docError = "";
    try {
      const doc = await api.fetchDocument(id);
      doc.id = id; // API omits `id` for normal docs — reinject the requested id
      currentDoc = doc;
      document.title = doc.title;
      requestAnimationFrame(() => {
        const area = document.getElementById("home-content-area");
        if (anchor) {
          const target = document.getElementById(anchor);
          if (target && area) {
            area.scrollTop += target.getBoundingClientRect().top - area.getBoundingClientRect().top - 80;
          }
        } else if (area) {
          area.scrollTop = 0;
        }
      });
    } catch (err: unknown) {
      docError = t("doc.failed_to_load") + (err instanceof Error ? err.message : String(err));
    } finally {
      loadingDoc = false;
    }
  }

  async function saveDoc(content: string) {
    if (!currentDoc) return;
    const id = currentDoc.id;
    const res = await fetch("/api/documents/" + id, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) throw new Error(await res.text());
    const fresh = await api.fetchDocument(id);
    fresh.id = id;
    currentDoc = fresh;
    // Update file-attachment count from links in content
    const fileLinks = content.match(/\]\(\s*\.?\/files\/[^)\s]+/g);
    const next = { ...home.fileAttachmentCounts };
    if (fileLinks && fileLinks.length) next[id] = fileLinks.length;
    else delete next[id];
    home.fileAttachmentCounts = next;
  }

  /** After deleting a doc, find the next sibling in the same folder to auto-select. */
  function pickNextSibling(deletedId: string): string | null {
    const deleted = home.allDocs.find(d => d.id === deletedId);
    if (!deleted) return null;
    const deletedFolder = (deleted.folder || []).join("/");
    const inSameFolder = (d: DocSummary) => (d.folder || []).join("/") === deletedFolder;
    // Match the sidebar's ordering: flat mode lists every doc of the folder by
    // filename; category mode keeps same-category docs in their insertion order.
    const siblings = home.hideCategories
      ? home.allDocs.filter(inSameFolder).slice().sort((a, b) => (a.filename || "").localeCompare(b.filename || ""))
      : home.allDocs.filter(d => inSameFolder(d) && d.category === deleted.category);
    const idx = siblings.findIndex(d => d.id === deletedId);
    if (idx === -1) return null;
    const next = siblings[idx + 1] ?? siblings[idx - 1];
    return next ? next.id : null;
  }

  async function deleteDoc() {
    if (!currentDoc) return;
    const id = currentDoc.id;
    const res = await fetch("/api/documents/" + encodeURIComponent(id), { method: "DELETE" });
    if (!res.ok) return;
    const nextId = pickNextSibling(id);
    home.allDocs = home.allDocs.filter(d => d.id !== id);
    if (Array.isArray(home.searchResults)) home.searchResults = home.searchResults.filter(d => d.id !== id);
    const counts = { ...home.annotationCounts }; delete counts[id]; home.annotationCounts = counts;
    const fcounts = { ...home.fileAttachmentCounts }; delete fcounts[id]; home.fileAttachmentCounts = fcounts;
    if (nextId) {
      await openDoc(nextId);
    } else {
      home.currentDocId = null;
      currentDoc = null;
      history.pushState({}, "", location.pathname);
    }
  }

  async function loadDocuments() {
    const [docs, cfg] = await Promise.all([api.fetchDocuments(), api.fetchConfig()]);
    home.allDocs = docs;
    if (cfg.docsFolder) {
      try { home.allFolderPaths = await api.fetchAllDirs(cfg.docsFolder as string); } catch { home.allFolderPaths = []; }
    }
    const [ann, files, statuses] = await Promise.all([
      api.fetchAnnotationCounts(), api.fetchFileCounts(), api.fetchDocStatuses(),
    ]);
    home.annotationCounts = ann;
    home.fileAttachmentCounts = files;
    home.docStatuses = statuses;
  }

  onMount(async () => {
    applyDark(loadDarkPref());
    const cfg = await api.fetchConfig();
    await loadI18n((cfg.language as string) || "en");
    if (cfg.title) { document.title = cfg.title as string; appTitle = cfg.title as string; }
    if (cfg.filenamePattern) welcomePattern = (cfg.filenamePattern as string) + ".md";
    home.exclusiveFolderExpansion = !!cfg.exclusiveFolderExpansion;
    home.exclusiveCategoryExpansion = !!cfg.exclusiveCategoryExpansion;
    home.codeBlockMaxHeight = typeof cfg.codeBlockMaxHeight === "number" ? cfg.codeBlockMaxHeight : 400;
    home.imageRoundedCorners = !!cfg.imageRoundedCorners;
    home.imageCentered = !!cfg.imageCentered;
    home.imageBorder = !!cfg.imageBorder;
    home.codeBlockLightTheme = !!cfg.codeBlockLightTheme;
    if (home.codeBlockMaxHeight > 0) {
      document.documentElement.style.setProperty("--ld-code-max-h", home.codeBlockMaxHeight + "px");
    }
    if (home.expandedCategories.size === 0) home.expandedCategories = new Set(["General"]);

    await loadDocuments();

    const params = new URLSearchParams(location.search);
    const docId = params.get("doc");
    if (docId) {
      openDoc(docId, true, false, location.hash ? location.hash.slice(1) : null);
    } else {
      const first = home.allDocs.find(d => d.category === "General") ?? home.allDocs[0];
      if (first) openDoc(first.id, true);
    }

    const onPop = (e: PopStateEvent) => {
      const id = e.state?.docId || new URLSearchParams(location.search).get("doc");
      const anchor = e.state?.anchor || (location.hash.length > 1 ? location.hash.slice(1) : null);
      if (id) openDoc(id, true, false, anchor);
    };
    window.addEventListener("popstate", onPop);

    // An agent run (or any global action) created/changed documents: refresh the
    // sidebar tree in place by re-fetching the list, without a full page reload.
    const onDocumentsChanged = () => { void loadDocuments(); };
    window.addEventListener("ld:documents-changed", onDocumentsChanged);

    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("ld:documents-changed", onDocumentsChanged);
    };
  });
</script>

<div class="app-shell bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
  <!-- Header -->
  <Topbar title={appTitle} subtitle="">
    <div class="relative hidden sm:block">
      <input
        type="search"
        placeholder={t("nav.search_placeholder")}
        value={home.searchQuery}
        oninput={(e) => onSearch((e.target as HTMLInputElement).value)}
        class="w-56 pl-8 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <span class="absolute left-2.5 top-2 text-gray-400 text-sm pointer-events-none">🔍</span>
    </div>
    {#snippet actions()}
      <button onclick={() => (wordCloudOpen = true)} title={t("nav.word_cloud")} class="ghost-button" aria-label={t("nav.word_cloud")}><i class="fa-solid fa-cloud"></i></button>
      <button onclick={toggleDark} title="Toggle dark mode" class="ghost-button" aria-label="Toggle dark mode">{dark ? "☀" : "☾"}</button>
    {/snippet}
  </Topbar>

  <!-- Body -->
  <div class="flex overflow-hidden">
    <Sidebar
      onopen={(id) => openDoc(id)}
      onsearch={onSearch}
      onexport={() => (exportOpen = true)}
      onnewfolder={() => (newFolderOpen = true)}
      onnewdoc={() => (newDocOpen = true)}
    />

    <main id="home-content-area" class="flex-1 overflow-y-auto">
      {#if currentDoc}
        {#if docError}
          <p class="p-8 text-red-500">{docError}</p>
        {:else}
          <DocViewer doc={currentDoc} {navHistory} ongoback={goBack} onopen={(id, anchor) => openDoc(id, false, true, anchor)} onsave={saveDoc} ondelete={deleteDoc} />
        {/if}
      {:else}
        <div class="h-full flex items-center justify-center p-8">
          <div class="max-w-md text-center">
            <div class="text-5xl mb-4 select-none" aria-hidden="true">📚</div>
            <h2 class="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">{t("welcome.title")}</h2>
            <p class="text-sm text-gray-500 dark:text-gray-500">{t("welcome.hint")}</p>
            <p class="mt-4 text-xs text-gray-400 dark:text-gray-600 font-mono bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2 inline-block">{welcomePattern}</p>
            <p class="mt-2 text-xs text-gray-400">{t("welcome.pattern_hint")}</p>
          </div>
        </div>
      {/if}
    </main>
  </div>
</div>

<NewFolderModal open={newFolderOpen} onclose={() => (newFolderOpen = false)} onsuccess={loadDocuments} />
<NewDocModal open={newDocOpen} onclose={() => (newDocOpen = false)} onsuccess={async (id) => { await loadDocuments(); openDoc(id); }} />
<ExportModal open={exportOpen} onclose={() => (exportOpen = false)} />
<WordCloudModal open={wordCloudOpen} onclose={() => (wordCloudOpen = false)} />
