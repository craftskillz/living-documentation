<script lang="ts">
  import { onMount } from "svelte";
  import { markdownLinesRange, removeMarkdownLines, replaceMarkdownLines, type MarkdownSection } from "../../../lib/markdownSection";
  import * as api from "../lib/home/api";
  import { applyMarkdownDisplayConfig } from "../lib/home/displayConfig";
  import SectionEditor from "../lib/home/SectionEditor.svelte";
  import TtsControls from "../lib/home/TtsControls.svelte";
  import { ttsPlayer } from "../lib/home/ttsPlayer.svelte";
  import { sectionAtTarget } from "../lib/home/sectionAtTarget";
  import type { DocDetail } from "../lib/home/types";
  import { blockToMarkdown, sameIgnoringWhitespace } from "../lib/html-view/blockMarkdown";
  import { wireHtmlFrame } from "../lib/html-view/htmlFrame";
  import { editableBlockAt, startInlineEdit, startSourceEdit } from "../lib/html-view/inlineEdit";
  import { loadI18n, t } from "../lib/i18n.svelte";
  import { isTauActive, loadDarkPreference } from "../lib/siteTheme";

  // Document ids are themselves URI-encoded: the query keeps them that way once decoded.
  const docId = new URLSearchParams(window.location.search).get("doc") ?? "";
  const renderUrl = `/api/html-templates/render?doc=${encodeURIComponent(docId)}`;

  let frame = $state<HTMLIFrameElement>(null!);
  let doc = $state<DocDetail | null>(null);
  let loadFailed = $state(false);
  let sectionEdit = $state<{ range: MarkdownSection; source: string } | null>(null);
  let saveError = $state("");
  let softBreaks = false;
  let inlineEditing = false;
  let scrollToRestore: number | null = null;
  let disposeFrame: (() => void) | null = null;

  async function loadDocument() {
    try {
      doc = await api.fetchDocument(docId);
      loadFailed = false;
      document.title = doc.title;
    } catch {
      loadFailed = true;
    }
  }

  function openBlockEditor(target: EventTarget | null): boolean {
    const root = frame.contentDocument?.documentElement;
    if (!doc || doc.reserved || !root) return false;
    const range = sectionAtTarget(root, doc.content, target);
    if (!range) return false;
    sectionEdit = { range, source: doc.content };
    return true;
  }

  function editBlockInPlace(target: EventTarget | null) {
    if (!doc || doc.reserved) return;
    const located = editableBlockAt(target);
    if (!located) return;
    const current = doc.content;
    const range = markdownLinesRange(current, located.firstLine, located.lastLine);
    if (!range) {
      openBlockEditor(target);
      return;
    }
    const lines = current.slice(range.start, range.end);
    const handlers = {
      onClose: () => { inlineEditing = false; saveError = ""; },
      onCommit: async (edited: string) => {
        try {
          const updated = edited ? replaceMarkdownLines(current, range, edited) : removeMarkdownLines(current, range);
          await api.updateDocument(docId, updated, current);
        } catch (error) {
          saveError = error instanceof Error ? error.message : String(error);
          return false;
        }
        saveError = "";
        await refreshPage();
        return true;
      },
    };
    if (located.mode === "source") {
      inlineEditing = true;
      startSourceEdit(located.block, lines, t("htmlView.source_label"), handlers);
      return;
    }
    const markdown = blockToMarkdown(located.block, { softBreaks });
    // Anything that does not convert back exactly would rewrite the source: Markdown is edited as Markdown.
    if (markdown === null || !sameIgnoringWhitespace(markdown, lines)) {
      openBlockEditor(target);
      return;
    }
    inlineEditing = true;
    startInlineEdit(located.block, {
      ...handlers,
      read: () => blockToMarkdown(located.block, { softBreaks }),
      onUnconvertible: () => { saveError = t("htmlView.unconvertible"); },
    });
  }

  // Only the document itself is read: the header and the table of contents stay outside <main>.
  function readingContainer(): HTMLElement | null {
    return frame.contentDocument?.querySelector("main") ?? null;
  }

  async function saveLanguage(content: string) {
    await api.updateDocument(docId, content, doc?.content);
    await loadDocument();
  }

  function onFrameLoad() {
    // The elements being read and highlighted are gone with the previous page.
    ttsPlayer.stop();
    inlineEditing = false;
    disposeFrame?.();
    disposeFrame = null;
    const frameDocument = frame.contentDocument;
    if (!frameDocument) return;
    if (scrollToRestore !== null) frame.contentWindow?.scrollTo(0, scrollToRestore);
    scrollToRestore = null;
    disposeFrame = wireHtmlFrame(frameDocument, {
      onBlockMenu: openBlockEditor,
      onBlockDoubleClick: editBlockInPlace,
      isEditing: () => inlineEditing,
    });
  }

  async function saveSection(content: string, expectedContent?: string) {
    await api.updateDocument(docId, content, expectedContent);
    return (await api.fetchDocument(docId)).content;
  }

  async function refreshPage() {
    scrollToRestore = frame.contentWindow?.scrollY ?? 0;
    await loadDocument();
    frame.contentWindow?.location.reload();
  }

  function closeEditor() {
    sectionEdit = null;
    // Also after a cancel: the editor may have saved automatically.
    void refreshPage();
  }

  onMount(() => {
    document.documentElement.classList.toggle("dark", loadDarkPreference() && !isTauActive());
    void loadDocument();
    void api.fetchConfig().then(async (config) => {
      softBreaks = !!config.markdownSoftBreaks;
      await loadI18n((config.language as string) || "en");
      applyMarkdownDisplayConfig(config);
    }).catch(() => { /* The cached language and the default display remain usable. */ });
    return () => {
      ttsPlayer.stop();
      disposeFrame?.();
    };
  });
</script>

<div class="html-view">
  <header>
    <strong>{doc?.title ?? ""}</strong>
    {#if loadFailed}
      <span role="alert" class="html-view-error">{t("htmlView.load_failed")}</span>
    {:else if ttsPlayer.error}
      <span role="alert" class="html-view-error" data-testid="tts-error">{ttsPlayer.error}</span>
    {:else if saveError}
      <span role="alert" class="html-view-error" data-testid="html-view-save-error">{saveError}</span>
    {:else if doc && !doc.reserved}
      <span class="html-view-hint">{t("htmlView.hint")}</span>
    {/if}
    <div class="html-view-actions">
      {#if doc}
        <TtsControls
          content={doc.content}
          container={readingContainer}
          selection={() => frame.contentWindow?.getSelection() ?? null}
          onsave={saveLanguage}
          onlanguageerror={(message) => (saveError = message)}
        />
      {/if}
      <a href={renderUrl} target="_blank" rel="noopener" data-testid="html-view-print" title={t("htmlView.print_title")}>
        <i class="fa-solid fa-print"></i> {t("htmlView.print")}
      </a>
    </div>
  </header>
  <!-- No allow-scripts: a document can embed raw HTML, and allow-same-origin only lets this page read the frame. -->
  <iframe bind:this={frame} data-testid="html-view-frame" title={t("htmlView.frame_title")} src={renderUrl} sandbox="allow-same-origin" onload={onFrameLoad}></iframe>
</div>

{#if sectionEdit}
  <SectionEditor source={sectionEdit.source} range={sectionEdit.range} {docId} onsave={saveSection} onclose={closeEditor} />
{/if}

<style>
  .html-view { position: fixed; inset: 0; display: flex; flex-direction: column; background: white; color: #111827; }
  header { display: flex; align-items: center; gap: 1rem; padding: .4rem 1rem; border-bottom: 1px solid #e5e7eb; font-size: .85rem; }
  strong { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  .html-view-hint { color: #6b7280; }
  .html-view-error { color: #b91c1c; }
  .html-view-actions { margin-left: auto; display: flex; align-items: center; gap: .4rem; flex-shrink: 0; }
  a { flex-shrink: 0; padding: .25rem .6rem; border: 1px solid #e5e7eb; border-radius: 6px; color: inherit; text-decoration: none; }
  a:hover { background: #f3f4f6; }
  iframe { flex: 1; width: 100%; border: 0; }
  :global(.dark) .html-view { background: #111827; color: #f3f4f6; }
  :global(.dark) header, :global(.dark) a { border-color: #374151; }
  :global(.dark) a:hover { background: #1f2937; }
  :global(.dark) .html-view-hint { color: #9ca3af; }
  :global(.dark) .html-view-error { color: #fca5a5; }
</style>
