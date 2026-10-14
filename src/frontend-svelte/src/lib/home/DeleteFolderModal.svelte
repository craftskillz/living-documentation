<script lang="ts">
  import { t } from "../i18n.svelte";
  import { home } from "./state.svelte";
  import { deleteTreeFolder } from "./api";
  import { countExplorerDocs, findExplorerNode } from "./tree";
  import type { ExplorerNode } from "./types";

  let { node, onclose, ondeleted }: {
    /** Folder being deleted; the dialog is closed when null. */
    node: ExplorerNode | null;
    onclose: () => void;
    /** The folder at `path` is gone from disk. */
    ondeleted: (path: string) => void;
  } = $props();

  let error = $state("");
  let deleting = $state(false);

  // Counted on the full tree: the sidebar one may hide entries or be filtered by a search.
  const docCount = $derived.by(() => {
    if (!node) return 0;
    const full = findExplorerNode(home.explorerTree ?? [], node.path) ?? node;
    return countExplorerDocs(full);
  });

  $effect(() => {
    if (!node) return;
    error = "";
    deleting = false;
  });

  async function submit() {
    if (!node || deleting) return;
    deleting = true;
    const ok = await deleteTreeFolder(node.path);
    deleting = false;
    if (ok) return ondeleted(node.path);
    error = t("modal.delete_folder.failed");
  }

  function onKeydown(e: KeyboardEvent) {
    if (node && e.key === "Escape") { e.preventDefault(); onclose(); }
  }
</script>

<svelte:window onkeydown={onKeydown} />

{#if node}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onclick={(e) => { if (e.target === e.currentTarget) onclose(); }}>
    <div role="dialog" data-testid="delete-folder-dialog" class="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md mx-4 p-6 space-y-4">
      <h3 class="text-base font-semibold text-gray-900 dark:text-gray-50">
        <i class="fa-solid fa-trash mr-1 text-red-500"></i>
        <span>{t("modal.delete_folder.title")}</span>
      </h3>

      <div class="space-y-1.5 text-sm text-gray-700 dark:text-gray-300">
        <p>{t("modal.delete_folder.message", { name: node.name })}</p>
        {#if docCount > 0}
          <p data-testid="delete-folder-count">
            {docCount === 1 ? t("modal.delete_folder.docs_one") : t("modal.delete_folder.docs_many", { count: String(docCount) })}
          </p>
        {/if}
        <p class="text-xs text-gray-400 dark:text-gray-500">{t("modal.delete_folder.irreversible")}</p>
      </div>

      {#if error}<p data-testid="delete-folder-error" class="text-xs text-red-500">{error}</p>{/if}

      <div class="flex justify-end gap-3 pt-1">
        <button onclick={onclose} class="text-sm px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">{t("common.cancel")}</button>
        <button data-testid="delete-folder-submit" onclick={submit} disabled={deleting} class="text-sm px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors">
          {deleting ? t("modal.delete_folder.deleting_btn") : t("modal.delete_folder.submit_btn")}
        </button>
      </div>
    </div>
  </div>
{/if}
