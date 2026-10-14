<script lang="ts">
  import { t } from "../i18n.svelte";
  import { renameTreeEntry } from "./api";
  import type { ExplorerNode } from "./types";

  let { node, onclose, onrenamed }: {
    /** Entry being renamed; the dialog is closed when null. */
    node: ExplorerNode | null;
    onclose: () => void;
    /** The entry moved from `source` to `path` on disk. */
    onrenamed: (source: string, path: string) => void;
  } = $props();

  const HTTP_BAD_REQUEST = 400;
  const HTTP_CONFLICT = 409;

  let name = $state("");
  let error = $state("");
  let saving = $state(false);
  let inputEl = $state<HTMLInputElement | null>(null);

  // A document is renamed by its file name, shown without the `.md` the server keeps.
  $effect(() => {
    if (!node) return;
    name = node.kind === "doc" ? node.name.replace(/\.md$/i, "") : node.name;
    error = "";
    saving = false;
    queueMicrotask(() => inputEl?.select());
  });

  async function submit() {
    if (!node || saving) return;
    if (!name.trim()) { error = t("modal.rename_entry.invalid"); return; }
    saving = true;
    const outcome = await renameTreeEntry(node.path, name);
    saving = false;
    if (outcome.ok) return onrenamed(node.path, outcome.path);
    error = t(
      outcome.status === HTTP_CONFLICT ? "modal.rename_entry.conflict"
        : outcome.status === HTTP_BAD_REQUEST ? "modal.rename_entry.invalid"
        : "modal.rename_entry.failed",
    );
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") { e.preventDefault(); submit(); }
    else if (e.key === "Escape") { e.preventDefault(); onclose(); }
  }
</script>

{#if node}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onclick={(e) => { if (e.target === e.currentTarget) onclose(); }}>
    <div class="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md mx-4 p-6 space-y-4">
      <h3 class="text-base font-semibold text-gray-900 dark:text-gray-50">
        <i class="fa-solid fa-pen mr-1"></i>
        <span>{t(node.kind === "folder" ? "modal.rename_entry.title_folder" : "modal.rename_entry.title_doc")}</span>
      </h3>

      <div class="space-y-1.5">
        <label for="rename-entry-name" class="block text-xs font-medium text-gray-500 dark:text-gray-400">{t("modal.rename_entry.name_label")}</label>
        <input
          id="rename-entry-name"
          data-testid="rename-entry-input"
          bind:this={inputEl}
          bind:value={name}
          oninput={() => (error = "")}
          onkeydown={onKeydown}
          type="text"
          class="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p class="text-xs text-gray-400 dark:text-gray-500">{t("modal.rename_entry.links_hint")}</p>
      </div>

      {#if error}<p data-testid="rename-entry-error" class="text-xs text-red-500">{error}</p>{/if}

      <div class="flex justify-end gap-3 pt-1">
        <button onclick={onclose} class="text-sm px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">{t("common.cancel")}</button>
        <button data-testid="rename-entry-submit" onclick={submit} disabled={saving} class="text-sm px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors">
          {saving ? t("modal.rename_entry.saving_btn") : t("modal.rename_entry.submit_btn")}
        </button>
      </div>
    </div>
  </div>
{/if}
