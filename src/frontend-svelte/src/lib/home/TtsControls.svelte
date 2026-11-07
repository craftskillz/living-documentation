<script lang="ts">
  // Text-to-speech buttons and the document-language prompt, shared by the Markdown
  // viewer and the HTML view. The caller says what to read: a container element,
  // possibly inside a frame, and the selection that can set the reading start.
  import { t } from "../i18n.svelte";
  import { getDocumentLanguage, setDocumentLanguage, type DocumentLanguage } from "../../../../lib/documentLanguage";
  import { readingStartFromSelection, type ReadingStart } from "./readingScript";
  import { ttsPlayer, type TtsLanguage } from "./ttsPlayer.svelte";

  let { content, container, selection, onsave, onlanguageerror }: {
    content: string;
    container: () => HTMLElement | null;
    selection: () => Selection | null;
    onsave: (content: string) => Promise<unknown>;
    onlanguageerror: (message: string) => void;
  } = $props();

  let languagePromptOpen = $state(false);
  let languageSaving = $state(false);
  let start: ReadingStart | null = null;

  function readingLabels() {
    return {
      codeLabel: t("tts.code_label"),
      imageLabel: t("tts.image_label"),
      diagramLabel: t("tts.diagram_label"),
      tableLabel: t("tts.table_label"),
    };
  }

  function play(language: DocumentLanguage) {
    const el = container();
    if (!el) return;
    ttsPlayer.start(el, { language: language as TtsLanguage, from: start, ...readingLabels() });
  }

  function startReading() {
    // Captured now: the language prompt and its save can drop the selection.
    const el = container();
    start = el ? readingStartFromSelection(el, selection(), readingLabels()) : null;
    const language = getDocumentLanguage(content);
    if (!language) {
      languagePromptOpen = true;
      return;
    }
    play(language);
  }

  async function chooseLanguage(language: DocumentLanguage) {
    languageSaving = true;
    try {
      const nextContent = setDocumentLanguage(content, language);
      if (nextContent !== content) await onsave(nextContent);
      languagePromptOpen = false;
      play(language);
    } catch (err: unknown) {
      onlanguageerror(t("tts.language_save_failed") + (err instanceof Error ? err.message : String(err)));
    } finally {
      languageSaving = false;
    }
  }

  // Closes the prompt; the caller stops the reading when its document changes.
  export function close() {
    languagePromptOpen = false;
  }
</script>

{#if ttsPlayer.active}
  <button onclick={() => ttsPlayer.toggle()} data-testid="tts-toggle" title={ttsPlayer.status === "paused" ? t("tts.resume") : t("tts.pause")} class="no-print text-sm px-3 py-1.5 rounded-lg border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"><i class="fa-solid {ttsPlayer.status === 'paused' ? 'fa-play' : 'fa-pause'}"></i></button>
  <button onclick={() => ttsPlayer.nextSection()} disabled={!ttsPlayer.canSkipSection} data-testid="tts-next-section" title={t("tts.next_section")} aria-label={t("tts.next_section")} class="no-print text-sm px-3 py-1.5 rounded-lg border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"><i class="fa-solid fa-forward" aria-hidden="true"></i></button>
  <button onclick={() => ttsPlayer.stop()} data-testid="tts-stop" title={t("tts.stop")} class="no-print text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"><i class="fa-solid fa-stop"></i></button>
{:else}
  <button onclick={startReading} data-testid="tts-play" title={t("tts.play")} class="no-print text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"><i class="fa-solid fa-headphones" style="margin-right:4px"></i>{t("tts.play_btn")}</button>
{/if}

{#if languagePromptOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div data-testid="tts-language-modal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onclick={(e) => { if (e.target === e.currentTarget && !languageSaving) languagePromptOpen = false; }}>
    <div class="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
      <h2 class="text-base font-semibold text-gray-900 dark:text-gray-50">{t("tts.language_title")}</h2>
      <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">{t("tts.language_message")}</p>
      <div class="mt-4 grid grid-cols-2 gap-2">
        <button type="button" data-testid="tts-language-en" disabled={languageSaving} onclick={() => chooseLanguage("en")} class="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
          {t("tts.language_en")}
        </button>
        <button type="button" data-testid="tts-language-fr" disabled={languageSaving} onclick={() => chooseLanguage("fr")} class="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
          {t("tts.language_fr")}
        </button>
      </div>
      <div class="mt-3 flex justify-end">
        <button type="button" disabled={languageSaving} onclick={() => (languagePromptOpen = false)} class="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
          {t("common.cancel")}
        </button>
      </div>
    </div>
  </div>
{/if}
