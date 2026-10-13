<script lang="ts">
  import { home } from "./state.svelte";
  import { t } from "../i18n.svelte";
  import { fetchTree, moveTreeEntry, setTreeHidden } from "./api";
  import { filterExplorerTree, withoutHiddenEntries } from "./tree";
  import { dropRequest, type DropPosition } from "./treeDrop";
  import { showPersistentToast } from "../persistentToast";
  import type { ExplorerNode } from "./types";
  import TreeNode from "./TreeNode.svelte";

  let { onopen, onsearch, onexport, onnewfolder, onnewdoc, onmoved }: {
    onopen: (id: string) => void;
    /** An entry moved from `source` to `path` on disk; ids under it changed. */
    onmoved: (source: string, path: string) => void;
    onsearch: (q: string) => void;
    onexport: () => void;
    onnewfolder: () => void;
    onnewdoc: () => void;
  } = $props();

  // Hidden entries stay out of the tree and of its search unless revealed.
  const visibleTree = $derived(home.showHiddenEntries ? home.explorerTree : withoutHiddenEntries(home.explorerTree));
  const tree = $derived(
    home.searchQuery
      ? filterExplorerTree(visibleTree, new Set(home.filteredDocs.map((d) => d.id)))
      : visibleTree,
  );

  // ── Entry context menu (hide / show) ──────────────────────────────────────────
  let entryMenu = $state<{ x: number; y: number; node: ExplorerNode } | null>(null);

  function openEntryMenu(e: MouseEvent, node: ExplorerNode) {
    e.preventDefault();
    entryMenu = { x: e.clientX, y: e.clientY, node };
  }

  async function toggleEntryHidden() {
    if (!entryMenu) return;
    const { node } = entryMenu;
    entryMenu = null;
    if (await setTreeHidden(node.path, !node.hidden)) home.explorerTree = await fetchTree();
  }

  // ── Drag and drop move ─────────────────────────────────────────────────────────
  const HTTP_CONFLICT = 409;

  async function moveEntry(source: string, targetPath: string, position: DropPosition) {
    const request = dropRequest(home.explorerTree, source, targetPath, position);
    if (!request) return;
    const outcome = await moveTreeEntry(request);
    if (outcome.ok) return onmoved(source, outcome.path);
    const name = source.split("/").pop() ?? source;
    const key = outcome.status === HTTP_CONFLICT ? "sidebar.move_conflict" : "sidebar.move_failed";
    showPersistentToast(t(key, { name }), "error");
    home.explorerTree = await fetchTree();
  }

  const docCount = $derived(home.filteredDocs.length);
  const isEmpty = $derived(tree.length === 0);

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
          data-testid="toggle-show-hidden"
          onclick={() => home.toggleShowHiddenEntries()}
          title={t("nav.toggle_hidden_entries")}
          class="transition-colors leading-none {home.showHiddenEntries ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}"
        ><i class="fa-solid {home.showHiddenEntries ? 'fa-eye' : 'fa-eye-slash'}"></i></button>
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
      <TreeNode nodes={tree} folderPath={[]} {onopen} onentrymenu={openEntryMenu} onmove={moveEntry} />
    {/if}
  </nav>

  {#if entryMenu}
    <!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
    <div class="fixed inset-0 z-40" onclick={() => (entryMenu = null)} oncontextmenu={(e) => { e.preventDefault(); entryMenu = null; }}></div>
    <div
      role="menu"
      class="fixed z-50 min-w-[8rem] py-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg text-sm"
      style="left:{entryMenu.x}px; top:{entryMenu.y}px"
    >
      <button
        role="menuitem"
        data-testid="tree-menu-toggle-hidden"
        onclick={toggleEntryHidden}
        class="w-full text-left px-3 py-1.5 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <i class="fa-solid {entryMenu.node.hidden ? 'fa-eye' : 'fa-eye-slash'} mr-2"></i>{t(entryMenu.node.hidden ? "sidebar.show_entry" : "sidebar.hide_entry")}
      </button>
    </div>
  {/if}

  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    onmousedown={startResize}
    aria-hidden="true"
    class="absolute top-0 right-[-2px] w-1.5 h-full cursor-col-resize z-20 select-none transition-colors {dragging ? 'bg-blue-500/55' : 'hover:bg-blue-500/35'}"
  ></div>
</aside>
