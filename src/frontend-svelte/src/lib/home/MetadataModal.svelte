<script lang="ts">
  import { t } from "../i18n.svelte";
  import { metadata } from "./metadata.svelte";
  import { getDocStatus } from "./docStatus";

  let { open, docId, content, onclose }: {
    open: boolean;
    docId: string;
    content: string;
    onclose: () => void;
  } = $props();

  const report = $derived(metadata.report);
  const readOnly = $derived(getDocStatus(content) === "SuperSeeded");

  let error = $state("");
  let refreshing = $state(false);

  // Source browser
  let browserOpen = $state(false);
  let browseCurrent = $state("");
  let browseParent = $state<string | null>(null);
  let browseDirs = $state<{ name: string; path: string }[]>([]);
  let browseFiles = $state<{ name: string; path: string }[]>([]);
  let browseLoading = $state(false);
  let browseError = $state("");

  $effect(() => {
    if (!open) { browserOpen = false; browseCurrent = ""; error = ""; }
  });

  function showError(msg: string) {
    error = t("common.error_prefix") + msg;
    setTimeout(() => { error = ""; }, 5000);
  }

  function summaryHtml(): string {
    if (!report || report.total === 0) return "";
    const pct = Math.round(report.accuracy * 100);
    return `<span class="font-semibold">${pct}%</span> · ${report.unchanged}/${report.total} ${t("metadata.status.unchanged")} · ${report.modified} ${t("metadata.status.modified")} · ${report.missing} ${t("metadata.status.missing")}`;
  }

  async function refresh() {
    refreshing = true;
    try { await metadata.refresh(docId); } catch (e: unknown) { showError(e instanceof Error ? e.message : String(e)); }
    finally { refreshing = false; }
  }

  async function removePath(path: string) {
    try { await metadata.removePath(docId, path); if (browserOpen) loadBrowse(browseCurrent); }
    catch (e: unknown) { showError(e instanceof Error ? e.message : String(e)); }
  }

  async function addPath(path: string) {
    try { await metadata.addPath(docId, path); if (browserOpen) loadBrowse(browseCurrent); }
    catch (e: unknown) { showError(e instanceof Error ? e.message : String(e)); }
  }

  function toggleBrowser() {
    browserOpen = !browserOpen;
    if (browserOpen) loadBrowse("");
  }

  async function loadBrowse(relPath: string) {
    browseLoading = true;
    browseError = "";
    try {
      const r = await fetch("/api/browse-source?path=" + encodeURIComponent(relPath || ""));
      if (!r.ok) { const b = await r.json().catch(() => ({})); throw new Error(b.error || r.statusText); }
      const data = await r.json();
      browseCurrent = data.current || "";
      browseParent = data.parent;
      browseDirs = data.dirs || [];
      const attached = new Set((report?.items || []).map(it => it.path));
      browseFiles = (data.files || []).filter((f: { path: string }) => !attached.has(f.path));
    } catch (e: unknown) {
      browseError = e instanceof Error ? e.message : String(e);
    } finally {
      browseLoading = false;
    }
  }

  function browseUp() {
    if (browseParent !== null) loadBrowse(browseParent);
  }
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onclick={(e) => { if (e.target === e.currentTarget) onclose(); }}>
    <div data-testid="metadata-modal" class="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-2xl mx-4 p-6 space-y-4">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h3 class="text-base font-semibold text-gray-900 dark:text-gray-50"><i class="fa-solid fa-code-compare mr-1"></i> {t("metadata.title")}</h3>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{t("metadata.subtitle")}</p>
        </div>
        <button onclick={onclose} title={t("common.close")} class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"><i class="fa-solid fa-xmark text-lg"></i></button>
      </div>

      <!-- Summary -->
      <div class="text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">{@html summaryHtml()}</div>

      <!-- Read-only banner -->
      {#if readOnly}
        <div data-testid="metadata-readonly-banner" class="text-xs text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/30 border-l-4 border-amber-500 rounded-r px-3 py-2">{t("metadata.readonly_banner")}</div>
      {/if}

      <!-- List -->
      <div data-testid="metadata-list" class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div class="max-h-64 overflow-y-auto">
          {#if !report || report.items.length === 0}
            <div class="px-3 py-4 text-center text-xs text-gray-400">{t("metadata.empty")}</div>
          {:else}
            {#each report.items as it (it.path)}
              <div class="flex items-center gap-2 px-3 py-2 border-b border-gray-100 dark:border-gray-800">
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-mono truncate text-gray-800 dark:text-gray-200" title={it.path}>{it.path}</div>
                </div>
                {#if it.status === "unchanged"}
                  <span class="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"><i class="fa-solid fa-check"></i> {t("metadata.status.unchanged")}</span>
                {:else if it.status === "modified"}
                  <span class="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"><i class="fa-solid fa-triangle-exclamation"></i> {t("metadata.status.modified")}</span>
                {:else}
                  <span class="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"><i class="fa-solid fa-circle-xmark"></i> {t("metadata.status.missing")}</span>
                {/if}
                {#if !readOnly}
                  <button onclick={() => removePath(it.path)} title={t("metadata.remove")} class="metadata-row-remove text-xs px-2 py-1 rounded-lg border border-red-200 dark:border-red-700 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/40 transition-colors"><i class="fa-solid fa-trash"></i></button>
                {/if}
              </div>
            {/each}
          {/if}
        </div>
      </div>

      <!-- Actions -->
      {#if !readOnly}
        <div class="flex items-center gap-2 flex-wrap">
          <button onclick={toggleBrowser} data-testid="metadata-add-btn" class="text-sm px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"><i class="fa-solid fa-plus"></i> {t("metadata.add")}</button>
          <button onclick={refresh} data-testid="metadata-refresh-btn" disabled={refreshing} class="text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"><i class="fa-solid fa-arrows-rotate"></i> {t("metadata.refresh")}</button>
        </div>
      {/if}

      <!-- Source browser -->
      {#if browserOpen}
        <div class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden text-sm">
          <div class="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <button onclick={browseUp} disabled={browseParent === null} class="text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-30 disabled:pointer-events-none shrink-0">{t("common.up")}</button>
            <span class="text-xs text-gray-500 dark:text-gray-400 font-mono truncate flex-1">{browseCurrent ? "/" + browseCurrent : "/ (sourceRoot)"}</span>
          </div>
          <div class="max-h-56 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
            {#if browseLoading}
              <div class="px-3 py-2 text-xs text-gray-400">{t("common.loading")}</div>
            {:else if browseError}
              <div class="px-3 py-2 text-xs text-red-500">{browseError}</div>
            {:else if browseDirs.length === 0 && browseFiles.length === 0}
              <div class="px-3 py-2 text-xs text-gray-400">{t("common.empty_dir")}</div>
            {:else}
              {#each browseDirs as d (d.path)}
                <button onclick={() => loadBrowse(d.path)} class="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"><i class="fa-solid fa-folder text-yellow-500"></i> <span class="truncate">{d.name}</span></button>
              {/each}
              {#each browseFiles as f (f.path)}
                <button onclick={() => addPath(f.path)} class="w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/30 flex items-center gap-2"><i class="fa-solid fa-file text-gray-400"></i> <span class="truncate">{f.name}</span> <i class="fa-solid fa-plus ml-auto text-blue-500 text-xs"></i></button>
              {/each}
            {/if}
          </div>
        </div>
      {/if}

      {#if error}<p class="text-xs text-red-500">{error}</p>{/if}

      <div class="flex justify-end">
        <button onclick={onclose} class="text-sm px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">{t("common.close")}</button>
      </div>
    </div>
  </div>
{/if}
