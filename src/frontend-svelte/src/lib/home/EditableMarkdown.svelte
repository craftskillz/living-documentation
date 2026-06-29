<script lang="ts">
  import { onMount } from "svelte";
  import { home } from "./state.svelte";
  import { t } from "../i18n.svelte";
  import { wireDocContent } from "./wireContent";
  import SnippetsModal from "./SnippetsModal.svelte";
  import { initInlineSnippetEditing, type InlineSnippetRange } from "./inlineSnippetEdit";

  // Reusable editable-markdown body: rendered view + inline snippet editing
  // (right-click), full-text textarea edit mode, the snippets modal (insert /
  // inline-edit / inline-insert), image-paste + file-attach, and the image
  // lightbox. Extracted from DocViewer so blueprint documents (AdrModal) get the
  // exact same editing experience. The host owns its chrome/toolbar and drives
  // this component through the exposed methods + bindable `editing`/`saveMsg`.
  let {
    docId,
    content,
    html,
    onsave,
    onopen = () => {},
    onanchor = defaultScrollToAnchor,
    onconfirmdelete = undefined,
    oncontentwired = undefined,
    // Opaque value: when it changes the rendered view is re-wired and
    // `oncontentwired` re-fires. DocViewer passes the global search query so its
    // highlight refreshes; other hosts can leave it undefined.
    rewireSignal = undefined,
    editing = $bindable(false),
    saveMsg = $bindable(null),
  }: {
    docId: string;
    content: string;
    html: string;
    onsave: (content: string) => Promise<void>;
    onopen?: (id: string, anchor: string | null) => void;
    onanchor?: (anchorId: string) => void;
    onconfirmdelete?: (() => Promise<boolean>) | undefined;
    oncontentwired?: (el: HTMLElement) => void;
    rewireSignal?: unknown;
    editing?: boolean;
    saveMsg?: { text: string; cls: string } | null;
  } = $props();

  let contentEl = $state<HTMLElement>(null!);
  let editorEl = $state<HTMLTextAreaElement>(null!);
  let editorValue = $state("");
  let disposeInline: (() => void) | null = null;

  let snippetsOpen = $state(false);
  let snippetMode = $state<"insert" | "inline-edit" | "inline-insert">("insert");
  let snippetRange = $state<InlineSnippetRange | null>(null);
  let snippetInsertPos = $state(0);

  // Image paste modal state
  let imgModalOpen = $state(false);
  let imgName = $state("");
  let imgExt = $state("png");
  let imgBlob: File | null = null;
  let imgCursorStart = 0;
  let imgCursorEnd = 0;

  // Lightbox
  let lightboxSrc = $state<string | null>(null);
  let lightboxAlt = $state("");

  const DIACRITICS = /[̀-ͯ]/g;
  function sanitizeImageName(s: string): string {
    return (s || "").normalize("NFD").replace(DIACRITICS, "").toLowerCase().replace(/[^a-z0-9]/g, "_");
  }

  function defaultScrollToAnchor(anchorId: string) {
    document.getElementById(anchorId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Programmatic entry points for the snippets modal. These mirror the snippet
  // buttons in the UI and double as a stable automation surface for e2e tests.
  onMount(() => {
    const w = window as unknown as Record<string, unknown>;
    w.openSnippetsModal = () => { snippetMode = "insert"; snippetsOpen = true; };
    w.openSnippetsModalForInlineInsert = (pos: number) => {
      snippetMode = "inline-insert";
      snippetInsertPos = Math.max(0, Number(pos) || 0);
      snippetsOpen = true;
    };
    return () => {
      delete w.openSnippetsModal;
      delete w.openSnippetsModalForInlineInsert;
    };
  });

  // ── Render + wire the read view ───────────────────────────────────────────────
  $effect(() => {
    void rewireSignal; // re-wire when the host bumps this signal
    void html;
    void content;
    disposeInline?.();
    disposeInline = null;
    if (editing || !contentEl) return;

    wireDocContent(contentEl, html, {
      content,
      codeBlockMaxHeight: home.codeBlockMaxHeight,
      t,
      onDocLink: (linkId, anchor) => onopen(linkId, anchor),
      onAnchor: onanchor,
    });

    disposeInline = initInlineSnippetEditing(contentEl, content, {
      onEdit: (range) => { snippetMode = "inline-edit"; snippetRange = range; snippetsOpen = true; },
      onInsert: (pos) => { snippetMode = "inline-insert"; snippetInsertPos = pos; snippetsOpen = true; },
      onDelete: async (range) => {
        const ok = onconfirmdelete
          ? await onconfirmdelete()
          : confirm(t("snippet.inline_delete_message"));
        if (!ok) return;
        await onsave(content.slice(0, range.start) + content.slice(range.end));
      },
    });

    oncontentwired?.(contentEl);

    return () => { disposeInline?.(); disposeInline = null; };
  });

  // ── Edit mode (exposed API) ───────────────────────────────────────────────────
  export function enterEdit() {
    editorValue = content;
    editing = true;
    saveMsg = null;
    requestAnimationFrame(() => editorEl?.focus());
  }

  export function cancelEdit() {
    editing = false;
    saveMsg = null;
  }

  export async function save() {
    saveMsg = { text: t("doc.saving"), cls: "text-gray-400" };
    try {
      await onsave(editorValue);
      editing = false;
      saveMsg = null;
    } catch (err: unknown) {
      saveMsg = { text: t("error.save") + (err instanceof Error ? err.message : String(err)), cls: "text-red-500 dark:text-red-400" };
    }
  }

  export function openSnippets() { snippetMode = "insert"; snippetsOpen = true; }
  export function isEditing(): boolean { return editing; }

  // ── Image paste / file attach in editor ──────────────────────────────────────
  function onEditorPaste(e: ClipboardEvent) {
    const items = Array.from(e.clipboardData?.items ?? []);
    const imageItem = items.find(it => it.type.startsWith("image/"));
    if (imageItem) {
      e.preventDefault();
      imgCursorStart = editorEl.selectionStart;
      imgCursorEnd = editorEl.selectionEnd;
      imgExt = imageItem.type.split("/")[1].replace("jpeg", "jpg") || "png";
      const blob = imageItem.getAsFile();
      if (!blob) return;
      imgBlob = blob;
      imgName = sanitizeImageName(Date.now().toString());
      imgModalOpen = true;
      return;
    }
    const files = Array.from(e.clipboardData?.files ?? []).filter(f => !f.type.startsWith("image/"));
    if (files.length) {
      e.preventDefault();
      const start = editorEl.selectionStart, end = editorEl.selectionEnd;
      (async () => { for (const f of files) await uploadFile(f, start, end); })();
    }
  }

  function onEditorDrop(e: DragEvent) {
    const files = Array.from(e.dataTransfer?.files ?? []).filter(f => !f.type.startsWith("image/"));
    if (!files.length) return;
    e.preventDefault();
    e.stopPropagation();
    const start = editorEl.selectionStart, end = editorEl.selectionEnd;
    (async () => { for (const f of files) await uploadFile(f, start, end); })();
  }

  function onEditorDragOver(e: DragEvent) {
    if (e.dataTransfer?.types?.includes("Files")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  }

  function readAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function insertAtCursor(markdown: string, start: number, end: number) {
    const before = editorValue.slice(0, start);
    const after = editorValue.slice(end);
    editorValue = before + markdown + after;
    requestAnimationFrame(() => {
      editorEl.selectionStart = editorEl.selectionEnd = start + markdown.length;
      editorEl.focus();
    });
  }

  const FILE_MAX = 19 * 1024 * 1024;
  async function uploadFile(file: File, start: number, end: number) {
    if (file.size > FILE_MAX) {
      saveMsg = { text: t("doc.file_too_large") + ` (${(file.size / 1024 / 1024).toFixed(1)} MB, max 19 MB)`, cls: "text-red-500 dark:text-red-400" };
      return;
    }
    saveMsg = { text: t("doc.uploading_file"), cls: "text-gray-400" };
    try {
      const base64 = await readAsBase64(file);
      const res = await fetch("/api/files/upload", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: base64, name: file.name, documentId: docId }),
      });
      if (!res.ok) {
        let msg = ""; try { msg = (await res.json()).error || ""; } catch { msg = await res.text(); }
        throw new Error(msg || `HTTP ${res.status}`);
      }
      const { url, originalName } = await res.json();
      insertAtCursor(`[📎 ${originalName || file.name}](${url})`, start, end);
      saveMsg = null;
    } catch (err: unknown) {
      saveMsg = { text: t("doc.file_upload_failed") + (err instanceof Error ? err.message : String(err)), cls: "text-red-500 dark:text-red-400" };
    }
  }

  function cancelImgPaste() {
    imgModalOpen = false;
    imgBlob = null;
  }

  async function confirmImgPaste() {
    const name = sanitizeImageName(imgName) || Date.now().toString();
    imgModalOpen = false;
    if (!imgBlob) return;
    saveMsg = { text: t("doc.uploading_image"), cls: "text-gray-400" };
    try {
      const base64 = await readAsBase64(imgBlob);
      const res = await fetch("/api/images/upload", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: base64, ext: imgExt, name }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { filename } = await res.json();
      insertAtCursor(`![image](/images/${filename})`, imgCursorStart, imgCursorEnd);
      saveMsg = null;
    } catch (err: unknown) {
      saveMsg = { text: t("doc.image_upload_failed") + (err instanceof Error ? err.message : String(err)), cls: "text-red-500 dark:text-red-400" };
    } finally {
      imgBlob = null;
    }
  }

  function closeLightbox() {
    lightboxSrc = null;
    lightboxAlt = "";
  }

  // Lightbox: Shift+click or Command+click on rendered images or Mermaid diagrams.
  function onContentClick(e: MouseEvent) {
    if (!e.shiftKey && !e.metaKey) return;
    const target = e.target as HTMLElement;
    const img = target.closest("img");
    const mermaidSvg = target.closest(".mermaid")?.querySelector("svg");
    if (!img && !mermaidSvg) return;
    e.preventDefault();
    e.stopPropagation();
    if (img) {
      lightboxSrc = (img as HTMLImageElement).src;
      lightboxAlt = (img as HTMLImageElement).alt || "";
      return;
    }
    const svgMarkup = new XMLSerializer().serializeToString(mermaidSvg!);
    lightboxSrc = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`;
    lightboxAlt = t("doc.mermaid_diagram_alt");
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === "Escape" && lightboxSrc) closeLightbox();
  }
</script>

<svelte:window onkeydown={onKeydown} />

{#if editing}
  <textarea
    bind:this={editorEl}
    id="doc-editor"
    data-testid="doc-editor"
    bind:value={editorValue}
    onpaste={onEditorPaste}
    ondrop={onEditorDrop}
    ondragover={onEditorDragOver}
    spellcheck="false"
    class="w-full min-h-[70vh] px-4 py-3 text-sm font-mono leading-relaxed rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
  ></textarea>
{:else}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    bind:this={contentEl}
    id="doc-content"
    data-testid="doc-content"
    onclick={onContentClick}
    class="prose prose-gray dark:prose-invert max-w-none prose-headings:scroll-mt-4 prose-headings:font-semibold prose-h1:text-[2.1875rem] prose-h2:text-[1.8125rem] prose-h3:text-[1.5rem] prose-h4:text-[1.25rem] prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-code:before:content-none prose-code:after:content-none {home.codeBlockLightTheme ? 'prose-pre:bg-[#f6f8fa] prose-pre:text-gray-800 prose-pre:border prose-pre:border-gray-200 prose-pre:rounded-lg dark:prose-pre:bg-[#0d1117] dark:prose-pre:text-gray-100 dark:prose-pre:border-gray-700' : 'prose-pre:bg-[#0d1117] prose-pre:border prose-pre:border-gray-700'} {home.imageRoundedCorners ? '[&_img]:rounded-xl' : ''} {home.imageCentered ? '[&_img]:mx-auto [&_img]:block' : ''} {home.imageBorder ? '[&_img]:[box-shadow:0_0_0_1px_rgba(0,0,0,0.10),0_4px_12px_rgba(0,0,0,0.04)] dark:[&_img]:[box-shadow:0_0_0_1px_rgba(255,255,255,0.08),0_4px_12px_rgba(255,255,255,0.25)]' : ''}"
  ></div>
{/if}

<SnippetsModal
  open={snippetsOpen}
  editor={editorEl}
  mode={snippetMode}
  docId={docId}
  content={content}
  range={snippetRange}
  insertPos={snippetInsertPos}
  onsave={onsave}
  onclose={() => (snippetsOpen = false)}
/>

<!-- Image paste modal -->
{#if imgModalOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div class="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-sm mx-4 p-6 space-y-5">
      <h3 class="text-base font-semibold text-gray-900 dark:text-gray-50">🖼️ {t("modal.img_paste.title")}</h3>
      <div class="space-y-1.5">
        <label for="img-paste-name" class="block text-xs font-medium text-gray-500 dark:text-gray-400">
          {t("modal.img_paste.filename_label")} <span class="font-normal text-gray-400">{t("modal.img_paste.saved_hint")}</span>
        </label>
        <div class="flex items-center gap-2">
          <input id="img-paste-name" type="text" value={imgName} oninput={(e) => (imgName = sanitizeImageName((e.target as HTMLInputElement).value))} class="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <span class="text-xs text-gray-400 shrink-0">.{imgExt}</span>
        </div>
      </div>
      <div class="flex justify-end gap-3 pt-1">
        <button onclick={cancelImgPaste} class="text-sm px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">{t("common.cancel")}</button>
        <button onclick={confirmImgPaste} class="text-sm px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors">{t("modal.img_paste.paste_btn")}</button>
      </div>
    </div>
  </div>
{/if}

<!-- Lightbox -->
{#if lightboxSrc}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div data-testid="content-lightbox" class="fixed inset-0 z-50 bg-white flex items-center justify-center cursor-pointer p-4" onclick={closeLightbox}>
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <img data-testid="lightbox-image" src={lightboxSrc} alt={lightboxAlt} class="max-w-full max-h-full object-contain select-none" onclick={(e) => e.stopPropagation()} />
    <button onclick={closeLightbox} class="absolute top-4 right-4 text-gray-500 hover:text-gray-950 text-2xl leading-none">×</button>
  </div>
{/if}
