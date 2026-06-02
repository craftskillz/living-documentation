<script lang="ts">
  import { t } from "../i18n.svelte";
  import { home } from "./state.svelte";

  let { open, onclose, onsuccess }: {
    open: boolean;
    onclose: () => void;
    onsuccess: (createdId: string) => void;
  } = $props();

  let docsFolder = $state("");
  let pattern = $state("YYYY_MM_DD_HH_mm_[Category]_title");

  let browseCurrent = $state<string | null>(null);
  let browseParent = $state<string | null>(null);
  let selectedFolder = $state("");

  let title = $state("");
  let category = $state("");
  let folderDisplay = $state("/ (root)");
  let browserOpen = $state(false);
  let browsePath = $state("");
  let browseDirs = $state<{ name: string; path: string }[]>([]);
  let browseLoading = $state(false);
  let browseLoadError = $state(false);
  let newFolderName = $state("");
  let categoryOptions = $state<string[]>([]);
  let error = $state("");
  let creating = $state(false);

  let titleInputEl = $state<HTMLInputElement | null>(null);

  function normalizeCategory(raw: string): string {
    return (raw || "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, "");
  }

  function absToRel(absPath: string): string {
    const base = docsFolder;
    if (absPath === base) return "";
    if (absPath.startsWith(base + "/")) return absPath.slice(base.length + 1);
    return absPath;
  }

  let wasOpen = false;
  $effect(() => {
    if (open && !wasOpen) { wasOpen = true; init(); }
    else if (!open) { wasOpen = false; }
  });

  async function init() {
    try {
      const cfg = await fetch("/api/config").then((r) => r.json());
      docsFolder = cfg.docsFolder || "";
      pattern = cfg.filenamePattern || "YYYY_MM_DD_HH_mm_[Category]_title";
    } catch {
      docsFolder = "";
      pattern = "YYYY_MM_DD_HH_mm_[Category]_title";
    }

    const currentDoc =
      home.currentDocId && home.allDocs.find((d) => d.id === home.currentDocId);
    const prefillCategory =
      normalizeCategory((currentDoc && currentDoc.category) || "General") || "GENERAL";

    let prefillFolder = "";
    if (home.currentDocId) {
      const decodedId = decodeURIComponent(home.currentDocId);
      if (!decodedId.startsWith("/")) {
        const segments = decodedId.split("/");
        if (segments.length > 1) prefillFolder = segments.slice(0, -1).join("/");
      }
    }
    const prefillFolderAbs = prefillFolder ? docsFolder + "/" + prefillFolder : "";

    selectedFolder = prefillFolder;
    browseCurrent = prefillFolderAbs || null;
    browseParent = null;
    populateCategoryOptions();

    title = "";
    category = prefillCategory;
    folderDisplay = prefillFolder ? "/" + prefillFolder : "/ (root)";
    browserOpen = false;
    newFolderName = "";
    error = "";
    creating = false;

    setTimeout(() => titleInputEl?.focus(), 50);
  }

  function populateCategoryOptions() {
    const seen = new Set<string>();
    (home.allDocs || []).forEach((d) => {
      const cat = normalizeCategory(d.category || "");
      if (cat) seen.add(cat);
    });
    categoryOptions = Array.from(seen).sort((a, b) => a.localeCompare(b));
  }

  function sanitizeCategoryInput() {
    const normalized = normalizeCategory(category);
    if (category !== normalized) category = normalized;
  }

  const filenamePreview = $derived.by(() => {
    const trimmed = title.trim();
    if (!trimmed) return t("modal.new_doc.title_placeholder");

    const cat = normalizeCategory(category) || "GENERAL";
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const titleSlug =
      trimmed
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "") || "document";

    const filename =
      pattern
        .replace("YYYY", String(year))
        .replace("MM", month)
        .replace("DD", day)
        .replace("HH", hours)
        .replace("mm", minutes)
        .replace(/\[Category\]/i, `[${cat}]`)
        .replace(/(?<![a-z0-9])(?:title_words|title)(?![a-z0-9])/i, titleSlug) + ".md";

    return selectedFolder ? selectedFolder + "/" + filename : filename;
  });

  function toggleBrowser() {
    browserOpen = !browserOpen;
    if (browserOpen) loadBrowse(browseCurrent || docsFolder);
  }

  async function loadBrowse(dirPath: string) {
    browseLoading = true;
    browseLoadError = false;
    try {
      const data = await fetch(
        "/api/browse?path=" + encodeURIComponent(dirPath),
      ).then((r) => r.json());
      browseCurrent = data.current;
      browseParent = data.parent;
      selectedFolder = absToRel(data.current);
      browsePath = data.current;
      folderDisplay = selectedFolder ? "/" + selectedFolder : "/ (root)";
      browseDirs = data.dirs || [];
    } catch {
      browseLoadError = true;
      browseDirs = [];
    } finally {
      browseLoading = false;
    }
  }

  const atRoot = $derived(browseCurrent === docsFolder);

  function browseUp() {
    if (browseCurrent !== docsFolder && browseParent) loadBrowse(browseParent);
  }

  function createFolder() {
    const trimmed = newFolderName.trim();
    if (!trimmed) return;
    const parent = browseCurrent || docsFolder;
    const atDocsRoot = parent === docsFolder;
    if (atDocsRoot && (trimmed === "files" || trimmed === "images")) {
      error = t("modal.new_folder.error_reserved");
      return;
    }
    error = "";
    const newRelPath = (absToRel(parent) ? absToRel(parent) + "/" : "") + trimmed;
    selectedFolder = newRelPath;
    folderDisplay = "/" + newRelPath;
    newFolderName = "";
  }

  async function create() {
    const trimmedTitle = title.trim();
    const cat = normalizeCategory(category) || "GENERAL";

    if (!trimmedTitle) {
      error = t("modal.new_doc.error_empty_title");
      return;
    }

    error = "";
    creating = true;

    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmedTitle, category: cat, folder: selectedFolder }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Creation failed");
      }

      const doc = await res.json();
      onclose();
      onsuccess(doc.id);
    } catch (err: unknown) {
      error = t("common.error_prefix") + (err instanceof Error ? err.message : String(err));
      creating = false;
    }
  }

  function onMainKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") create();
    if (e.key === "Escape") onclose();
  }
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onclick={(e) => { if (e.target === e.currentTarget) onclose(); }}>
    <div class="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 space-y-4">
      <h3 class="text-base font-semibold text-gray-900 dark:text-gray-50">&#10133; <span>{t("modal.new_doc.title")}</span></h3>

      <!-- Title -->
      <div class="space-y-1.5">
        <label for="new-doc-title" class="block text-xs font-medium text-gray-500 dark:text-gray-400">{t("modal.new_doc.title_label")}</label>
        <input
          id="new-doc-title"
          bind:this={titleInputEl}
          bind:value={title}
          onkeydown={onMainKeydown}
          type="text"
          placeholder={t("modal.new_doc.title_placeholder")}
          class="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <!-- Category -->
      <div class="space-y-1.5">
        <label for="new-doc-category" class="block text-xs font-medium text-gray-500 dark:text-gray-400">{t("modal.new_doc.category_label")}</label>
        <input
          id="new-doc-category"
          bind:value={category}
          oninput={sanitizeCategoryInput}
          onkeydown={onMainKeydown}
          type="text"
          list="new-doc-category-options"
          autocomplete="off"
          placeholder="GENERAL"
          class="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <datalist id="new-doc-category-options">
          {#each categoryOptions as cat (cat)}
            <option value={cat}></option>
          {/each}
        </datalist>
      </div>

      <!-- Location -->
      <div class="space-y-1.5">
        <label class="block text-xs font-medium text-gray-500 dark:text-gray-400">{t("modal.new_doc.location_label")}</label>
        <div class="flex items-center gap-2">
          <span class="flex-1 px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-mono truncate">{folderDisplay}</span>
          <button onclick={toggleBrowser} class="text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shrink-0">&#128193; <span>{t("modal.new_doc.browse_btn")}</span></button>
        </div>
        <!-- Inline folder browser -->
        {#if browserOpen}
          <div class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div class="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <button onclick={browseUp} disabled={atRoot} class="text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-30 disabled:pointer-events-none shrink-0">&#8593; {t("common.up")}</button>
              <span class="font-mono text-xs text-gray-400 dark:text-gray-500 truncate flex-1 text-right">{browsePath}</span>
            </div>
            <div class="divide-y divide-gray-100 dark:divide-gray-800 max-h-40 overflow-y-auto">
              {#if browseLoading}
                <p class="px-3 py-4 text-xs text-gray-400 text-center">{t("common.loading")}</p>
              {:else if browseLoadError}
                <p class="px-3 py-4 text-xs text-red-400 text-center">{t("common.cannot_read_dir")}</p>
              {:else if browseDirs.length === 0}
                <p class="px-3 py-3 text-xs text-gray-400 text-center">{t("modal.new_doc.no_subfolders")}</p>
              {:else}
                {#each browseDirs as dir (dir.path)}
                  <button onclick={() => loadBrowse(dir.path)} class="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <span class="text-gray-400 shrink-0">&#128193;</span>
                    <span class="text-gray-700 dark:text-gray-300 truncate">{dir.name}</span>
                  </button>
                {/each}
              {/if}
            </div>
            <!-- Create new folder row -->
            <div class="border-t border-gray-200 dark:border-gray-700 flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800/50">
              <input
                bind:value={newFolderName}
                onkeydown={(e) => { if (e.key === "Enter") createFolder(); }}
                type="text"
                placeholder={t("modal.new_doc.new_folder_placeholder")}
                class="flex-1 px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
              <button onclick={createFolder} class="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shrink-0">{t("modal.new_doc.create_folder_btn")}</button>
            </div>
          </div>
        {/if}
      </div>

      <!-- Filename preview -->
      <div class="space-y-1.5">
        <label class="block text-xs font-medium text-gray-500 dark:text-gray-400">{t("modal.new_doc.filename_label")}</label>
        <p class="text-xs bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2 font-mono text-gray-600 dark:text-gray-300 break-all">{filenamePreview}</p>
      </div>

      {#if error}<p class="text-xs text-red-500">{error}</p>{/if}

      <div class="flex justify-end gap-3 pt-1">
        <button onclick={onclose} class="text-sm px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">{t("common.cancel")}</button>
        <button onclick={create} disabled={creating} class="text-sm px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors">
          {creating ? t("modal.new_folder.creating_btn") : t("common.create")}
        </button>
      </div>
    </div>
  </div>
{/if}
