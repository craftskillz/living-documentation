<script lang="ts">
  import { home } from "./state.svelte";
  import { t } from "../i18n.svelte";
  import { buildFolderTree } from "./tree";
  import TreeNode from "./TreeNode.svelte";

  let { onopen, onsearch, onexport, onnewfolder, onnewdoc }: {
    onopen: (id: string) => void;
    onsearch: (q: string) => void;
    onexport: () => void;
    onnewfolder: () => void;
    onnewdoc: () => void;
  } = $props();

  const tree = $derived(
    buildFolderTree(home.filteredDocs, home.allFolderPaths, !home.searchQuery),
  );
  const docCount = $derived(home.filteredDocs.length);
  const isEmpty = $derived(home.filteredDocs.length === 0 && home.allFolderPaths.length === 0);

  // ── Resizable width ───────────────────────────────────────────────────────────
  const STORAGE_KEY = "ld-sidebar-w";
  const MIN_W = 200, MAX_W = 600;
  let width = $state<number | null>(null);
  let dragging = $state(false);
  let asideEl = $state<HTMLElement>(null!);

  $effect(() => {
    const w = parseInt(localStorage.getItem(STORAGE_KEY) || "", 10);
    if (Number.isFinite(w)) width = Math.max(MIN_W, Math.min(MAX_W, w));
  });

  function startResize(e: MouseEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startW = asideEl.getBoundingClientRect().width;
    dragging = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMove = (ev: MouseEvent) => {
      width = Math.max(MIN_W, Math.min(MAX_W, startW + ev.clientX - startX));
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      dragging = false;
      if (width != null) { try { localStorage.setItem(STORAGE_KEY, String(width)); } catch {} }
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }
</script>

<aside
  bind:this={asideEl}
  class="no-print {width == null ? 'w-72' : ''} shrink-0 flex flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-y-auto relative"
  style={width == null ? "" : `width:${width}px`}
>
  <div class="sticky top-0 z-10 bg-white dark:bg-gray-900 p-3 border-b border-gray-100 dark:border-gray-800">
    <div class="relative sm:hidden">
      <input
        type="search"
        placeholder={t("nav.search_mobile_placeholder")}
        value={home.searchQuery}
        oninput={(e) => onsearch((e.target as HTMLInputElement).value)}
        class="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <span class="absolute left-2.5 top-2 text-gray-400 text-sm pointer-events-none">🔍</span>
    </div>

    <div class="flex items-center justify-between mt-2 sm:mt-0">
      <p class="text-xs text-gray-400 dark:text-gray-500">
        {docCount} document{docCount !== 1 ? "s" : ""}
      </p>
      <div class="flex items-center gap-2">
        <button
          onclick={() => home.cycleHighlightStatus()}
          title={t("nav.toggle_status_highlight")}
          class="hover:opacity-80 transition-colors leading-none {home.highlightStatusState === 0 ? 'text-gray-400 dark:text-gray-500' : home.highlightStatusState === 1 ? 'text-green-500 dark:text-green-400' : 'text-orange-500 dark:text-orange-400'}"
        ><i class="fa-solid fa-certificate"></i></button>
        <button
          onclick={() => home.toggleHideAttachments()}
          title={t("nav.toggle_attachments")}
          class="transition-colors leading-none {home.hideAttachments ? 'text-gray-400 dark:text-gray-500' : 'text-blue-500 dark:text-blue-400'}"
        ><i class="fa-solid fa-paperclip"></i></button>
        <button
          onclick={() => home.toggleHideCategories()}
          title={t("nav.toggle_categories")}
          class="transition-colors leading-none {home.hideCategories ? 'text-gray-400 dark:text-gray-500' : 'text-blue-500 dark:text-blue-400'}"
        ><i class="fa-solid fa-tags"></i></button>
        <button onclick={onexport} title={t("nav.export")} class="text-gray-400 hover:text-blue-500 dark:text-gray-500 dark:hover:text-blue-400 transition-colors leading-none"><i class="fa-solid fa-file-export"></i></button>
        <button onclick={onnewfolder} title={t("nav.new_folder")} class="text-gray-400 hover:text-blue-500 dark:text-gray-500 dark:hover:text-blue-400 transition-colors leading-none"><i class="fa-solid fa-folder-plus"></i></button>
        <button onclick={onnewdoc} title={t("nav.new_document")} class="text-gray-400 hover:text-blue-500 dark:text-gray-500 dark:hover:text-blue-400 transition-colors leading-none"><i class="fa-solid fa-file-circle-plus"></i></button>
      </div>
    </div>
  </div>

  <nav data-testid="category-tree" class="flex-1 py-2 space-y-0.5">
    {#if isEmpty}
      <p class="px-4 py-8 text-sm text-gray-400 text-center">{t("sidebar.no_docs")}</p>
    {:else}
      <TreeNode node={tree} folderPath={[]} {onopen} />
    {/if}
  </nav>

  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    onmousedown={startResize}
    aria-hidden="true"
    class="absolute top-0 right-[-2px] w-1.5 h-full cursor-col-resize z-20 select-none transition-colors {dragging ? 'bg-blue-500/55' : 'hover:bg-blue-500/35'}"
  ></div>
</aside>
