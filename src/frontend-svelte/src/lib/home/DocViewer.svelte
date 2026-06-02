<script lang="ts">
  import { home } from "./state.svelte";
  import { t } from "../i18n.svelte";
  import { folderLabel } from "./tree";
  import { wireDocContent } from "./wireContent";
  import Annotations from "./Annotations.svelte";
  import type { DocDetail } from "./types";

  let { doc, onopen, onsave, ondelete }: {
    doc: DocDetail;
    onopen: (id: string, anchor: string | null) => void;
    onsave: (content: string) => Promise<void>;
    ondelete: () => Promise<void>;
  } = $props();

  let contentEl = $state<HTMLElement>(null!);
  let editorEl = $state<HTMLTextAreaElement>(null!);
  let annotations = $state<Annotations>(null!);
  let editing = $state(false);
  let editorValue = $state("");
  let saveMsg = $state<{ text: string; cls: string } | null>(null);
  let fullWidth = $state(false);
  let confirmingDelete = $state(false);
  let copiedId = $state(false);

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

  function scrollToAnchor(anchorId: string) {
    const container = document.getElementById("home-content-area");
    const target = document.getElementById(anchorId);
    if (!container || !target) return;
    const header = document.querySelector("#home-doc-view header");
    const headerHeight = header ? header.getBoundingClientRect().height : 0;
    container.scrollTop += target.getBoundingClientRect().top - container.getBoundingClientRect().top - headerHeight - 8;
  }

  $effect(() => {
    const _ = doc.id;
    if (editing || !contentEl) return;
    wireDocContent(contentEl, doc.html, {
      content: doc.content,
      codeBlockMaxHeight: home.codeBlockMaxHeight,
      t,
      onDocLink: (id, anchor) => onopen(id, anchor),
      onAnchor: scrollToAnchor,
    });
    annotations?.load(doc.id);
  });

  // Full-width persistence
  $effect(() => {
    try { fullWidth = localStorage.getItem("ld-full-width") === "1"; } catch {}
  });

  function toggleFullWidth() {
    fullWidth = !fullWidth;
    try { localStorage.setItem("ld-full-width", fullWidth ? "1" : "0"); } catch {}
  }

  // ── Edit mode ────────────────────────────────────────────────────────────────
  function enterEdit() {
    editorValue = doc.content;
    editing = true;
    saveMsg = null;
    requestAnimationFrame(() => editorEl?.focus());
  }

  function cancelEdit() {
    editing = false;
    saveMsg = null;
  }

  async function save() {
    saveMsg = { text: t("doc.saving"), cls: "text-gray-400" };
    try {
      await onsave(editorValue);
      editing = false;
      saveMsg = null;
    } catch (err: unknown) {
      saveMsg = { text: t("error.save") + (err instanceof Error ? err.message : String(err)), cls: "text-red-500 dark:text-red-400" };
    }
  }

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
        body: JSON.stringify({ data: base64, name: file.name }),
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

  // ── Misc ─────────────────────────────────────────────────────────────────────
  async function copyLink() {
    try { await navigator.clipboard.writeText(location.href); } catch {}
  }

  async function copyMcpId() {
    try {
      await navigator.clipboard.writeText(decodeURIComponent(doc.id));
      copiedId = true;
      setTimeout(() => (copiedId = false), 1800);
    } catch {}
  }

  function exportPDF() { window.print(); }

  // Lightbox: Shift+click on rendered images
  function onContentClick(e: MouseEvent) {
    const img = (e.target as HTMLElement).closest("img");
    if (!img || !e.shiftKey) return;
    e.preventDefault();
    e.stopPropagation();
    lightboxSrc = (img as HTMLImageElement).src;
    lightboxAlt = (img as HTMLImageElement).alt || "";
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === "Escape" && lightboxSrc) lightboxSrc = null;
  }
</script>

<svelte:window onkeydown={onKeydown} />

<article id="home-doc-view" class="{fullWidth ? 'max-w-none' : 'max-w-4xl'} mx-auto px-6 py-8">
  <header class="sticky top-0 z-10 bg-gray-50 dark:bg-gray-950 -mx-6 px-6 pt-8 mb-8 pb-6 border-b border-gray-300 dark:border-gray-800">
    <div class="flex items-start gap-4 flex-wrap">
      <div class="shrink min-w-0">
        <div class="flex items-center gap-2 mb-2 flex-wrap">
          <span class="flex items-center gap-2 flex-wrap">
            {#each doc.folder || [] as seg}
              <span title={seg} class="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">{folderLabel(seg)}</span>
            {/each}
            <span class="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">{doc.category}</span>
          </span>
          {#if doc.formattedDate}
            <span class="text-xs text-gray-400 dark:text-gray-500">{doc.formattedDate}</span>
          {/if}
        </div>
        <div class="flex items-center gap-2">
          <h1 class="min-w-0 text-2xl font-bold text-gray-900 dark:text-gray-50 leading-tight">{doc.title}</h1>
          <button type="button" onclick={copyMcpId} title={t("doc.copy_mcp_id")} class="no-print inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 hover:text-blue-600 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-blue-400 {copiedId ? 'text-green-600 dark:text-green-400' : ''}">
            <i class="fa-{copiedId ? 'solid fa-check' : 'regular fa-copy'}" aria-hidden="true"></i>
          </button>
        </div>
      </div>

      <div class="flex items-center gap-2 flex-wrap ml-auto">
        {#if editing}
          {#if saveMsg}<span class="text-xs {saveMsg.cls}">{saveMsg.text}</span>{/if}
          <button onclick={cancelEdit} class="text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">{t("common.cancel")}</button>
          <button onclick={save} class="text-sm px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors">{t("common.save")}</button>
        {:else}
          {@const bodyFill = home.markerActive ? "#fef08a" : "#bfdbfe"}
          {@const capFill = home.markerActive ? "#fef08a" : "#93c5fd"}
          {@const nibFill = home.markerActive ? "#fde047" : "#93c5fd"}
          <button onclick={() => home.toggleMarker()} title={t("doc.marker_mode")} class="no-print text-sm px-3 py-1.5 rounded-lg border transition-colors {home.markerActive ? 'border-yellow-400 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}">
            <svg width="18" height="18" viewBox="0 0 100 100" fill="none" style="display:inline-block;vertical-align:middle;margin-right:4px">
              <rect x="28" y="10" width="44" height="52" rx="6" transform="rotate(40 50 50)" fill={bodyFill} stroke="currentColor" stroke-width="6" />
              <rect x="52" y="8" width="22" height="30" rx="6" transform="rotate(40 50 50)" fill={capFill} stroke="currentColor" stroke-width="6" />
              <polygon points="28,60 10,80 30,80 38,72" fill={nibFill} stroke="currentColor" stroke-width="5" stroke-linejoin="round" />
              <polygon points="28,48 19,70 36,75 55,70" fill={nibFill} stroke="currentColor" stroke-width="5" stroke-linejoin="round" />
              <line x1="10" y1="90" x2="72" y2="90" stroke="currentColor" stroke-width="6" stroke-linecap="round" />
              {#if home.markerHidden}
                <g>
                  <line x1="8" y1="8" x2="92" y2="92" stroke="currentColor" stroke-width="8" stroke-linecap="round" />
                  <line x1="92" y1="8" x2="8" y2="92" stroke="currentColor" stroke-width="8" stroke-linecap="round" />
                </g>
              {/if}
            </svg>{t("doc.marker_btn")}
          </button>
          <button onclick={toggleFullWidth} title={t("doc.toggle_width")} class="no-print text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">{t(fullWidth ? "doc.full_width_narrow_btn" : "doc.full_width_btn")}</button>
          <button onclick={exportPDF} title={t("doc.export_pdf")} class="no-print text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">📄 {t("doc.export_pdf_btn")}</button>
          <button onclick={copyLink} title={t("doc.copy_link")} class="no-print text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"><i class="fa-solid fa-link"></i> {t("doc.copy_link_btn")}</button>
          <button onclick={enterEdit} title={t("doc.edit")} class="no-print text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"><i class="fa-solid fa-file-pen"></i> {t("doc.edit_btn")}</button>
          <button onclick={() => (confirmingDelete = true)} title={t("doc.delete")} class="no-print text-sm px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-700 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/40 transition-colors"><i class="fa-solid fa-trash"></i> {t("doc.delete_btn")}</button>
        {/if}
      </div>
    </div>
  </header>

  {#if editing}
    <textarea
      bind:this={editorEl}
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
      onclick={onContentClick}
      class="prose prose-gray dark:prose-invert max-w-none prose-headings:scroll-mt-4 prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-code:before:content-none prose-code:after:content-none prose-pre:bg-[#0d1117] prose-pre:border prose-pre:border-gray-700"
    ></div>
  {/if}
</article>

<Annotations bind:this={annotations} {contentEl} docId={doc.id} />

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

<!-- Delete confirmation -->
{#if confirmingDelete}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onclick={(e) => { if (e.target === e.currentTarget) confirmingDelete = false; }}>
    <div class="w-full max-w-sm bg-white dark:bg-gray-900 border border-red-200 dark:border-red-700 rounded-xl shadow-2xl p-5 flex flex-col gap-3">
      <p class="text-sm text-gray-700 dark:text-gray-200">{t("doc.confirm_delete")}</p>
      <p class="text-xs text-gray-500 dark:text-gray-400 italic truncate">{doc.title}</p>
      <div class="flex justify-end gap-2 mt-2">
        <button onclick={() => (confirmingDelete = false)} class="text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">{t("common.cancel")}</button>
        <button onclick={async () => { confirmingDelete = false; await ondelete(); }} class="text-sm px-4 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold transition-colors">{t("doc.confirm_delete_btn")}</button>
      </div>
    </div>
  </div>
{/if}

<!-- Lightbox -->
{#if lightboxSrc}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="fixed inset-0 z-50 bg-black/90 flex items-center justify-center cursor-pointer" onclick={() => (lightboxSrc = null)}>
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <img src={lightboxSrc} alt={lightboxAlt} class="max-w-full max-h-full object-contain select-none" onclick={(e) => e.stopPropagation()} />
    <button onclick={() => (lightboxSrc = null)} class="absolute top-4 right-4 text-white/70 hover:text-white text-2xl leading-none">×</button>
  </div>
{/if}
