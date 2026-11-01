<script lang="ts">
  import { AUTOSAVE_INTERVAL_MS, createDraftSaver, type SaveDocument } from "../../../../lib/draftSave";
  import { onMount, untrack } from "svelte";
  import { t } from "../i18n.svelte";
  import { home } from "./state.svelte";
  import { dialogFocus } from "../dialogFocus";
  import { markdownClasses } from "./markdownClasses.svelte";
  import SnippetsModal from "./SnippetsModal.svelte";
  import EditorFileImport, { type FileImportStatus } from "./EditorFileImport.svelte";
  import { createSectionScrollSync } from "./sectionScrollSync";
  import { wireDocContent } from "./wireContent";
  import { renderMarkdownWithCompareBlocks } from "../../../../lib/compareBlock";
  import { markdownBodyStart, replaceMarkdownSection, type MarkdownSection } from "../../../../lib/markdownSection";

  let { source, range, docId, onsave, onclose }: {
    source: string; range: MarkdownSection; docId: string;
    onsave: SaveDocument;
    onclose: () => void;
  } = $props();
  // This component is mounted afresh for each section; the snapshot never follows later saves.
  let draft = $state(untrack(() => source.slice(range.start, range.end)));
  let preview = $state<HTMLElement>(null!);
  let dialog = $state<HTMLDialogElement>(null!);
  let editor = $state<HTMLTextAreaElement>(null!);
  let previewScroller = $state<HTMLElement>(null!);
  let scrollSynchronized = $state(true);
  let snippetsOpen = $state(false);
  let imagePromptOpen = $state(false);
  let importStatus = $state("");
  let scrollSync: ReturnType<typeof createSectionScrollSync> | undefined;
  let saving = $state(false);
  let saveStatus = $state("");
  const saver = untrack(() => createDraftSaver({
    initialDraft: draft, initialContent: source, persist: onsave,
    serialize: text => replaceMarkdownSection(source, range, text),
    onSavingChange: value => { saving = value; },
  }));
  let error = $state("");
  let previewError = $state(false);
  let breaks = $state<boolean | null>(null);
  const PREVIEW_DELAY_MS = 120;

  onMount(() => {
    dialog.showModal();
    scrollSync = createSectionScrollSync(editor, previewScroller, preview, source.slice(0, range.start).split("\n").length);
    queueMicrotask(() => {
      const editor = dialog.querySelector("textarea");
      editor?.focus({ preventScroll: true });
      editor?.setSelectionRange(0, 0);
      if (editor) editor.scrollTop = 0;
    });
    const autosave = setInterval(() => { void save(true); }, AUTOSAVE_INTERVAL_MS);
    const controller = new AbortController();
    fetch("/api/config", { signal: controller.signal }).then(async res => {
      if (!res.ok) throw new Error(String(res.status));
      breaks = !!(await res.json()).markdownSoftBreaks;
    }).catch(() => { if (!controller.signal.aborted) previewError = true; });
    return () => { clearInterval(autosave); controller.abort(); scrollSync?.destroy(); };
  });

  $effect(() => {
    const text = draft;
    const softBreaks = breaks;
    scrollSync?.invalidate();
    if (!preview || softBreaks === null) return;
    const timer = setTimeout(() => {
      try {
        const full = replaceMarkdownSection(source, range, text);
        const bodyStart = markdownBodyStart(full);
        const offset = full.slice(0, bodyStart).split("\n").length - 1;
        const html = renderMarkdownWithCompareBlocks(full.slice(bodyStart), { breaks: softBreaks }, { tagMarkers: true, sourceLineOffset: offset });
        const first = full.slice(0, range.start).split("\n").length;
        const after = full.length - (source.length - range.end);
        const last = full.slice(0, Math.max(range.start, after - 1)).split("\n").length;
        const previousPreviewScroll = previewScroller.scrollTop;
        wireDocContent(preview, html, {
          content: full, docId, preview: true, codeBlockMaxHeight: home.codeBlockMaxHeight, t,
          onDocLink: () => {}, onAnchor: () => {},
        });
        // Render in document context so references, notes and snippet styles stay accurate.
        for (const block of Array.from(preview.children)) {
          const lines = block.getAttribute("data-source-lines")?.split("-").map(Number);
          if (block.matches("section[data-footnotes]")) continue;
          if (after === range.start || !lines || lines[1] < first || lines[0] > last) block.remove();
        }
        // Keep generated anchors local to the preview, away from the reading view's ids.
        preview.querySelectorAll("[id]").forEach(el => { el.id = `section-preview-${el.id}`; });
        preview.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach(el => {
          el.setAttribute("href", `#section-preview-${el.getAttribute("href")!.slice(1)}`);
        });
        previewScroller.scrollTop = previousPreviewScroll;
        scrollSync?.refresh("editor");
        previewError = false;
      } catch { previewError = true; }
    }, PREVIEW_DELAY_MS);
    return () => clearTimeout(timer);
  });

  function toggleScrollSync() {
    scrollSynchronized = !scrollSynchronized;
    scrollSync?.setEnabled(scrollSynchronized);
  }
  function closeSnippets() { snippetsOpen = false; editor?.focus(); }
  function showImportStatus(status: FileImportStatus | null) {
    importStatus = status && !status.error ? status.text : "";
    error = status?.error ? status.text : "";
  }
  function close() {
    if (imagePromptOpen) { imagePromptOpen = false; editor?.focus(); return; }
    if (snippetsOpen) { closeSnippets(); return; }
    if (!saving) onclose();
  }
  async function saveDraftForSnippet() {
    if (await saver.save(draft) === "busy") throw new Error(t("doc.saving"));
  }
  async function save(automatic = false) {
    if (saving || (automatic && !saver.isDirty(draft))) return;
    const snapshot = draft;
    error = "";
    const area = document.getElementById("home-content-area");
    const scrollTop = area?.scrollTop;
    try {
      const result = await saver.save(snapshot);
      if (result === "busy") return;
      if (result === "saved") saveStatus = t("autosave.saved");
      // An automatic save never closes the dialog. Keep newer in-flight edits visible, too.
      if (!automatic && draft === snapshot) {
        onclose();
        requestAnimationFrame(() => { if (area && scrollTop !== undefined) area.scrollTop = scrollTop; });
      }
    } catch (err) {
      error = t("error.save") + (err instanceof Error ? err.message : String(err));
    }
  }
  function preventNavigation(event: MouseEvent) {
    if ((event.target as Element)?.closest("a")) { event.preventDefault(); event.stopPropagation(); }
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<dialog bind:this={dialog} use:dialogFocus={close} id="section-editor" aria-labelledby="section-editor-title"
  oncancel={(event) => { event.preventDefault(); close(); }} oncontextmenu={(event) => event.stopPropagation()}
  onkeydown={(event) => { if (!snippetsOpen && !imagePromptOpen && (event.metaKey || event.ctrlKey) && event.key === "Enter") { event.preventDefault(); void save(); } }}>
  <header><h2 id="section-editor-title">{t("section.edit")}</h2><p>{t("section.hint")}</p>
    <button type="button" class="section-sync" aria-pressed={scrollSynchronized} onclick={toggleScrollSync}>
      <span aria-hidden="true">{scrollSynchronized ? "☑" : "☐"}</span> {t("section.scroll_sync")}
    </button>
  </header>
  <div class="section-columns">
    <div class="section-pane"><label for="section-markdown">{t("section.markdown")}</label>
      <textarea bind:this={editor} id="section-markdown" bind:value={draft} spellcheck="false"></textarea>
    </div>
    <div class="section-pane"><h3>{t("section.preview")}</h3>
      {#if previewError}<p role="alert">{t("section.preview_error")}</p>{/if}
      <!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
      <div bind:this={previewScroller} class="section-preview-scroll" onclickcapture={preventNavigation}>
        <div id="section-preview" bind:this={preview} class={markdownClasses()}></div>
      </div>
    </div>
  </div>
  {#if error}<p class="section-error" role="alert">{error}</p>{/if}
  <footer>
    <span class="autosave-status" role="status">{saving ? t("doc.saving") : importStatus || saveStatus || t("autosave.hint")}</span>
    <button onclick={close} disabled={saving}>{t("common.cancel")}</button>
    <button data-testid="section-snippets" title={t("doc.snippets")} onclick={() => { snippetsOpen = true; }}>{t("doc.snippets_btn")}</button>
    <button class="section-save" onclick={() => save()} disabled={saving}>{saving ? t("doc.saving") : t("section.save")}</button>
  </footer>
  <!-- Inside the dialog: anything outside a modal <dialog> is inert and painted below it. -->
  <SnippetsModal open={snippetsOpen} {editor} {docId} onclose={closeSnippets}
    editorDocument={() => replaceMarkdownSection(source, range, draft)} saveEditor={saveDraftForSnippet} />
  <EditorFileImport {editor} {docId} onstatus={showImportStatus} bind:promptOpen={imagePromptOpen} />
</dialog>

<style>
  dialog { width: min(1120px, 94vw); max-width: none; height: min(720px, 86dvh); max-height: 92dvh; padding: 0; border: 1px solid var(--line, #d1d5db); border-radius: 14px; background: var(--panel, white); color: var(--ink, #111827); box-shadow: 0 24px 80px #0005; }
  dialog[open] { display: flex; flex-direction: column; }
  dialog::backdrop { background: #0007; }
  header, footer { padding: 16px 22px; flex-shrink: 0; }
  header { border-bottom: 1px solid var(--line, #d1d5db); }
  h2 { font-size: 18px; font-weight: 650; margin: 0 0 4px; }
  header p { margin: 0; font-size: 13px; opacity: .7; }
  .section-sync { margin-top: 10px; padding: 5px 9px; font-size: 12px; }
  .section-sync[aria-pressed="true"] { border-color: #3b82f6; color: #2563eb; }
  :global(.dark) .section-sync[aria-pressed="true"] { color: #93c5fd; }
  .section-columns { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); min-height: 0; flex: 1; }
  .section-pane { display: flex; flex-direction: column; min-width: 0; min-height: 0; padding: 14px; gap: 10px; }
  .section-pane + .section-pane { border-left: 1px solid var(--line, #d1d5db); }
  label, h3 { font-size: 12px; font-weight: 650; margin: 0; }
  textarea { flex: 1; min-height: 0; width: 100%; resize: none; border: 1px solid var(--line, #d1d5db); border-radius: 8px; padding: 12px; background: transparent; color: inherit; font: 13px/1.7 ui-monospace, monospace; }
  textarea:focus { outline: 2px solid #3b82f6; outline-offset: 1px; }
  .section-preview-scroll { overflow: auto; overflow-anchor: none; flex: 1; min-height: 0; padding: 0 12px; }
  footer { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 10px; border-top: 1px solid var(--line, #d1d5db); }
  button { padding: 8px 16px; border-radius: 8px; border: 1px solid var(--line, #d1d5db); font-size: 14px; }
  .autosave-status { margin-right: auto; align-self: center; font-size: 12px; opacity: .7; }
  .section-save { background: #2563eb; color: white; border-color: #2563eb; }
  button:disabled { opacity: .55; }
  .section-error { color: #ef4444; margin: 0; padding: 10px 22px; font-size: 13px; }
  :global(.dark) dialog { background: #111827; color: #f3f4f6; --line: #374151; }
  @media (max-width: 640px) { .section-columns { grid-template-columns: 1fr; grid-template-rows: 1fr 1fr; } .section-pane + .section-pane { border-left: 0; border-top: 1px solid var(--line, #d1d5db); } }
</style>
