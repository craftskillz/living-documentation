<script lang="ts">
  import type { SaveDocument } from "../../../../lib/draftSave";
  import { getDocumentHtmlTemplate, setDocumentHtmlTemplate } from "../../../../lib/htmlTemplateField";
  import { dialogFocus } from "../dialogFocus";
  import { t } from "../i18n.svelte";

  interface LibraryFolder { id: string; templateIds: string[] }

  const VIEW_WINDOW_FEATURES = "popup,width=1180,height=900";

  let { doc, onsave }: { doc: { id: string; content: string }; onsave: SaveDocument } = $props();

  let folders = $state<LibraryFolder[]>([]);
  let loadFailed = $state(false);
  let pickerOpen = $state(false);
  let saving = $state(false);
  let saveError = $state("");

  const documentTemplate = $derived(getDocumentHtmlTemplate(doc.content));
  // A template removed from the library counts as no template: the next click offers the choice again.
  const activeTemplate = $derived(
    folders.some((folder) => folder.templateIds.includes(documentTemplate ?? "")) ? documentTemplate : null,
  );

  async function loadLibrary() {
    try {
      const response = await fetch("/api/html-templates");
      if (!response.ok) throw new Error(String(response.status));
      folders = (await response.json()).folders;
      loadFailed = false;
    } catch {
      loadFailed = true;
    }
  }
  void loadLibrary();

  function openPicker() {
    saveError = "";
    pickerOpen = true;
    if (loadFailed) void loadLibrary();
  }

  async function chooseTemplate(templateId: string) {
    saving = true;
    saveError = "";
    try {
      const next = setDocumentHtmlTemplate(doc.content, templateId);
      if (next !== doc.content) await onsave(next);
      pickerOpen = false;
    } catch (err: unknown) {
      saveError = t("htmlTemplates.save_failed") + (err instanceof Error ? err.message : String(err));
    } finally {
      saving = false;
    }
  }

  function openHtmlWindow() {
    // A window per document: viewing again reloads it instead of piling up new ones.
    window.open(`/html-view?doc=${encodeURIComponent(doc.id)}`, `ld-html-${doc.id}`, VIEW_WINDOW_FEATURES);
  }

  const buttonClass = "no-print text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors";
</script>

{#if activeTemplate}
  <button onclick={openHtmlWindow} data-testid="html-view-btn" title={t("htmlTemplates.view_title")} class={buttonClass}><i class="fa-solid fa-up-right-from-square"></i> {t("htmlTemplates.view")}</button>
  <button onclick={openPicker} data-testid="html-change-template-btn" title={t("htmlTemplates.change")} aria-label={t("htmlTemplates.change")} class={buttonClass}><i class="fa-solid fa-palette"></i></button>
{:else}
  <button onclick={openPicker} data-testid="html-generate-btn" title={t("htmlTemplates.generate_title")} class={buttonClass}><i class="fa-solid fa-wand-magic-sparkles"></i> {t("htmlTemplates.generate")}</button>
{/if}

{#if pickerOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div data-testid="html-template-picker" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onclick={(e) => { if (e.target === e.currentTarget) pickerOpen = false; }}>
    <div role="dialog" aria-modal="true" aria-labelledby="html-template-picker-title" use:dialogFocus={() => (pickerOpen = false)} class="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-700 dark:bg-gray-900">
      <div class="flex items-start justify-between gap-3">
        <h2 id="html-template-picker-title" class="text-base font-semibold text-gray-900 dark:text-gray-50">{t("htmlTemplates.picker_title")}</h2>
        <button type="button" onclick={() => (pickerOpen = false)} aria-label={t("common.close")} class="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">{t("htmlTemplates.picker_intro")}</p>
      {#if loadFailed}<p role="alert" class="mt-3 text-sm text-red-500 dark:text-red-400">{t("htmlTemplates.load_failed")}</p>{/if}
      {#each folders as folder (folder.id)}
        <h3 class="mt-4 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"><i class="fa-regular fa-folder"></i> {t(`htmlTemplates.folder.${folder.id}`)}</h3>
        <div class="mt-2 space-y-2">
          {#each folder.templateIds as templateId (templateId)}
            <button type="button" disabled={saving} onclick={() => chooseTemplate(templateId)} data-testid={`html-template-${templateId}`} class="block w-full rounded-lg border border-gray-200 p-3 text-left transition-colors hover:border-blue-400 hover:bg-blue-50 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-blue-900/30">
              <span class="block text-sm font-semibold text-gray-900 dark:text-gray-50">{t(`htmlTemplates.template.${templateId}.name`)}{#if templateId === activeTemplate} <span class="ml-1 text-xs font-normal text-blue-600 dark:text-blue-400">{t("htmlTemplates.selected")}</span>{/if}</span>
              <span class="mt-1 block text-xs text-gray-600 dark:text-gray-400">{t(`htmlTemplates.template.${templateId}.description`)}</span>
            </button>
          {/each}
        </div>
      {/each}
      {#if saveError}<p role="alert" class="mt-3 text-sm text-red-500 dark:text-red-400">{saveError}</p>{/if}
    </div>
  </div>
{/if}
