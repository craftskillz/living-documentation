<script lang="ts">
  import { t } from "../i18n.svelte";
  import { home } from "./state.svelte";

  let { open, onclose, onsuccess }: {
    open: boolean;
    onclose: () => void;
    onsuccess: () => void;
  } = $props();

  let docsFolder = $state("");
  let browseCurrent = $state<string | null>(null);
  let browseParent = $state<string | null>(null);
  let selectedPath = $state("");

  let name = $state("");
  let locationDisplay = $state("/ (root)");
  let browserOpen = $state(false);
  let browsePath = $state("");
  let browseDirs = $state<{ name: string; path: string }[]>([]);
  let browseLoading = $state(false);
  let browseLoadError = $state(false);
  let error = $state("");
  let creating = $state(false);

  let nameInputEl = $state<HTMLInputElement | null>(null);

  let wasOpen = false;
  $effect(() => {
    if (open && !wasOpen) { wasOpen = true; init(); }
    else if (!open) { wasOpen = false; }
  });

  async function init() {
    try {
      const cfg = await fetch("/api/config").then((r) => r.json());
      docsFolder = cfg.docsFolder || "";
    } catch {
      docsFolder = "";
    }

    let prefillFolder = "";
    if (home.currentDocId) {
      const decodedId = decodeURIComponent(home.currentDocId);
      if (!decodedId.startsWith("/")) {
        const segments = decodedId.split("/");
        if (segments.length > 1) prefillFolder = segments.slice(0, -1).join("/");
      }
    }

    selectedPath = prefillFolder ? docsFolder + "/" + prefillFolder : docsFolder;
    browseCurrent = selectedPath;
    browseParent = null;

    name = "";
    locationDisplay = prefillFolder ? "/" + prefillFolder : "/ (root)";
    browserOpen = false;
    error = "";
    creating = false;

    setTimeout(() => nameInputEl?.focus(), 50);
  }

  const preview = $derived.by(() => {
    const trimmed = name.trim();
    if (!trimmed) return t("modal.new_folder.enter_name");
    const base = selectedPath || docsFolder;
    const rel = base.startsWith(docsFolder)
      ? base.slice(docsFolder.length).replace(/^\//, "")
      : "";
    return (rel ? rel + "/" : "") + trimmed;
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
      selectedPath = data.current;
      browsePath = data.current;

      const rel = data.current.startsWith(docsFolder + "/")
        ? data.current.slice(docsFolder.length)
        : data.current === docsFolder
          ? ""
          : data.current;
      locationDisplay = rel ? rel : "/ (root)";

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
    if (browseParent) loadBrowse(browseParent);
  }

  async function create() {
    const trimmed = name.trim();
    error = "";

    if (!trimmed) { error = t("modal.new_folder.error_empty"); return; }
    if (!/^[a-zA-Z0-9_\-. ]+$/.test(trimmed)) {
      error = t("modal.new_folder.error_invalid_chars");
      return;
    }

    const base = selectedPath || docsFolder;
    const atDocsRoot = base === docsFolder;
    if (atDocsRoot && (trimmed === "files" || trimmed === "images")) {
      error = t("modal.new_folder.error_reserved");
      return;
    }
    const fullPath = base.endsWith("/") ? base + trimmed : base + "/" + trimmed;

    creating = true;
    try {
      const res = await fetch("/api/browse/mkdir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: fullPath }),
      });
      if (!res.ok) throw new Error(await res.text());
      onclose();
      onsuccess();
    } catch (err: unknown) {
      creating = false;
      error = t("common.error_prefix") + (err instanceof Error ? err.message : String(err));
    }
  }
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onclick={(e) => { if (e.target === e.currentTarget) onclose(); }}>
    <div class="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md mx-4 p-6 space-y-4">
      <h3 class="text-base font-semibold text-gray-900 dark:text-gray-50">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" class="inline-block mr-1 align-text-bottom">
          <path d="M2 5a2 2 0 012-2h3.586a1 1 0 01.707.293L9.707 4.707A1 1 0 0010.414 5H16a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V5z" stroke="currentColor" stroke-width="1.5" fill="none" />
          <line x1="10" y1="8" x2="10" y2="14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          <line x1="7" y1="11" x2="13" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
        <span>{t("modal.new_folder.title")}</span>
      </h3>

      <!-- Folder name -->
      <div class="space-y-1.5">
        <label for="new-folder-name" class="block text-xs font-medium text-gray-500 dark:text-gray-400">{t("modal.new_folder.name_label")}</label>
        <input
          id="new-folder-name"
          bind:this={nameInputEl}
          bind:value={name}
          type="text"
          placeholder={t("modal.new_folder.name_placeholder")}
          class="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <!-- Location -->
      <div class="space-y-1.5">
        <label class="block text-xs font-medium text-gray-500 dark:text-gray-400">{t("modal.new_folder.location_label")}</label>
        <div class="flex items-center gap-2">
          <span class="flex-1 text-sm text-gray-600 dark:text-gray-300 font-mono truncate">{locationDisplay}</span>
          <button onclick={toggleBrowser} class="text-xs px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shrink-0">{t("modal.new_folder.browse_btn")}</button>
        </div>
        <!-- Inline browser -->
        {#if browserOpen}
          <div class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden text-sm">
            <div class="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <button onclick={browseUp} disabled={atRoot} class="text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-30 disabled:pointer-events-none shrink-0">{t("common.up")}</button>
              <span class="text-xs text-gray-500 dark:text-gray-400 font-mono truncate flex-1">{browsePath}</span>
            </div>
            <div class="max-h-40 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
              {#if browseLoading}
                <p class="px-3 py-4 text-xs text-gray-400 text-center">{t("common.loading")}</p>
              {:else if browseLoadError}
                <p class="px-3 py-3 text-xs text-red-400 text-center">{t("modal.new_folder.error_loading")}</p>
              {:else if browseDirs.length === 0}
                <p class="px-3 py-3 text-xs text-gray-400 text-center">{t("modal.new_folder.no_subfolders")}</p>
              {:else}
                {#each browseDirs as dir (dir.path)}
                  <button onclick={() => loadBrowse(dir.path)} class="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <span class="text-gray-400 shrink-0">&#128193;</span>
                    <span class="truncate text-gray-700 dark:text-gray-300">{dir.name}</span>
                  </button>
                {/each}
              {/if}
            </div>
          </div>
        {/if}
      </div>

      <!-- Preview -->
      <div class="space-y-1">
        <label class="block text-xs font-medium text-gray-500 dark:text-gray-400">{t("modal.new_folder.will_be_created")}</label>
        <p class="text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2 truncate">{preview}</p>
      </div>

      {#if error}<p class="text-xs text-red-500">{error}</p>{/if}

      <div class="flex justify-end gap-3 pt-1">
        <button onclick={onclose} class="text-sm px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">{t("common.cancel")}</button>
        <button onclick={create} disabled={creating} class="text-sm px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors">
          {creating ? t("modal.new_folder.creating_btn") : t("modal.new_folder.create_btn")}
        </button>
      </div>
    </div>
  </div>
{/if}
