<script lang="ts">
  import { onMount } from "svelte";
  import "../lib/home/home.css";
  import { home } from "../lib/home/state.svelte";
  import { t, loadI18n } from "../lib/i18n.svelte";
  import * as api from "../lib/home/api";
  import Sidebar from "../lib/home/Sidebar.svelte";
  import DocViewer from "../lib/home/DocViewer.svelte";
  import type { DocDetail } from "../lib/home/types";

  let currentDoc = $state<DocDetail | null>(null);
  let loadingDoc = $state(false);
  let docError = $state("");
  let dark = $state(false);
  let appTitle = $state("Living AI Documentation");
  let welcomePattern = $state("YYYY_MM_DD_HH_mm_[Category]_title.md");

  let searchTimer: number | null = null;

  const navLinks = [
    { label: "Workspace", href: "/workspace" },
    { label: "Agents", href: "/agents" },
    { label: "Blueprint", href: "/blueprint" },
    { label: "Files", href: "/files" },
    { label: "AI Context", href: "/context" },
    { label: "Admin", href: "/admin" },
  ];

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

  // ── Document open ──────────────────────────────────────────────────────────────
  async function openDoc(id: string, skipHistory = false, anchor: string | null = null) {
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
    currentDoc = fresh;
    // Update file-attachment count from links in content
    const fileLinks = content.match(/\]\(\s*\.?\/files\/[^)\s]+/g);
    const next = { ...home.fileAttachmentCounts };
    if (fileLinks && fileLinks.length) next[id] = fileLinks.length;
    else delete next[id];
    home.fileAttachmentCounts = next;
  }

  async function deleteDoc() {
    if (!currentDoc) return;
    const id = currentDoc.id;
    const res = await fetch("/api/documents/" + encodeURIComponent(id), { method: "DELETE" });
    if (!res.ok) return;
    home.allDocs = home.allDocs.filter(d => d.id !== id);
    if (Array.isArray(home.searchResults)) home.searchResults = home.searchResults.filter(d => d.id !== id);
    const counts = { ...home.annotationCounts }; delete counts[id]; home.annotationCounts = counts;
    const fcounts = { ...home.fileAttachmentCounts }; delete fcounts[id]; home.fileAttachmentCounts = fcounts;
    home.currentDocId = null;
    currentDoc = null;
    history.pushState({}, "", location.pathname);
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
    if (home.codeBlockMaxHeight > 0) {
      document.documentElement.style.setProperty("--ld-code-max-h", home.codeBlockMaxHeight + "px");
    }
    if (home.expandedCategories.size === 0) home.expandedCategories = new Set(["General"]);

    await loadDocuments();

    const params = new URLSearchParams(location.search);
    const docId = params.get("doc");
    if (docId) {
      openDoc(docId, true, location.hash ? location.hash.slice(1) : null);
    } else {
      const first = home.allDocs.find(d => d.category === "General") ?? home.allDocs[0];
      if (first) openDoc(first.id, true);
    }

    const onPop = (e: PopStateEvent) => {
      const id = e.state?.docId || new URLSearchParams(location.search).get("doc");
      const anchor = e.state?.anchor || (location.hash.length > 1 ? location.hash.slice(1) : null);
      if (id) openDoc(id, true, anchor);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  });
</script>

<div class="h-screen flex flex-col bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
  <!-- Header -->
  <header class="no-print h-14 shrink-0 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center gap-3 px-4">
    <div class="flex items-center gap-3 min-w-0">
      <span class="text-blue-600 dark:text-blue-400 text-xl select-none" aria-hidden="true">📚</span>
      <div class="min-w-0">
        <h1 class="text-base font-semibold tracking-tight truncate">{appTitle}</h1>
      </div>
    </div>

    <div class="relative ml-4 hidden sm:block">
      <input
        type="search"
        placeholder={t("nav.search_placeholder")}
        value={home.searchQuery}
        oninput={(e) => onSearch((e.target as HTMLInputElement).value)}
        class="w-56 pl-8 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <span class="absolute left-2.5 top-2 text-gray-400 text-sm pointer-events-none">🔍</span>
    </div>

    <nav class="flex items-center gap-1.5 ml-auto">
      {#each navLinks as link}
        <a href={link.href} class="text-sm px-2.5 py-1.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">{link.label}</a>
      {/each}
      <button onclick={toggleDark} title="Toggle dark mode" class="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors leading-none">
        {dark ? "☀" : "☾"}
      </button>
    </nav>
  </header>

  <!-- Body -->
  <div class="flex flex-1 overflow-hidden">
    <Sidebar onopen={(id) => openDoc(id)} onsearch={onSearch} />

    <main id="home-content-area" class="flex-1 overflow-y-auto">
      {#if currentDoc}
        {#if docError}
          <p class="p-8 text-red-500">{docError}</p>
        {:else}
          <DocViewer doc={currentDoc} onopen={(id, anchor) => openDoc(id, false, anchor)} onsave={saveDoc} ondelete={deleteDoc} />
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
