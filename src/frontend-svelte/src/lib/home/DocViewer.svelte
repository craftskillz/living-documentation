<script lang="ts">
  import { onMount } from "svelte";
  import { home } from "./state.svelte";
  import { t } from "../i18n.svelte";
  import { folderLabel } from "./tree";
  import { wireDocContent } from "./wireContent";
  import Annotations from "./Annotations.svelte";
  import AccuracyGauge from "./AccuracyGauge.svelte";
  import MetadataModal from "./MetadataModal.svelte";
  import SnippetsModal from "./SnippetsModal.svelte";
  import ConfirmDialog from "../ConfirmDialog.svelte";
  import { metadata } from "./metadata.svelte";
  import { getDocStatus, replaceStatus, isWorklogDocument } from "./docStatus";
  import { initLocalSearch } from "./localSearch";
  import { highlightMatches, scrollToMatch, type SearchMatch } from "./searchNotice";
  import { initInlineSnippetEditing, type InlineSnippetRange } from "./inlineSnippetEdit";
  import type { DocDetail } from "./types";

  let { doc, onopen, onsave, ondelete, navHistory = [], ongoback }: {
    doc: DocDetail;
    onopen: (id: string, anchor: string | null) => void;
    onsave: (content: string) => Promise<void>;
    ondelete: () => Promise<void>;
    navHistory?: { id: string; title: string }[];
    ongoback?: (i: number) => void;
  } = $props();

  let contentEl = $state<HTMLElement>(null!);
  let editorEl = $state<HTMLTextAreaElement>(null!);
  let annotations = $state<Annotations>(null!);
  let confirmDialog = $state<ConfirmDialog>(null!);
  let metadataOpen = $state(false);
  let snippetsOpen = $state(false);
  let snippetMode = $state<"insert" | "inline-edit" | "inline-insert">("insert");
  let snippetRange = $state<InlineSnippetRange | null>(null);
  let snippetInsertPos = $state(0);
  let disposeInline: (() => void) | null = null;

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
  let localSearchMount = $state<HTMLElement>(null!);
  let searchMatches = $state<SearchMatch[]>([]);
  let lastWiredId = "";

  const noticeTitle = $derived(
    searchMatches.length
      ? t(searchMatches.length === 1 ? "search.notice_singular" : "search.notice_plural")
          .replace("{count}", String(searchMatches.length))
          .replace("{query}", home.searchQuery)
      : "",
  );

  const docStatus = $derived(getDocStatus(doc.content));
  const showValidate = $derived((docStatus || "").toUpperCase() === "TO BE VALIDATED");
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
    const id = doc.id;
    const q = home.searchQuery; // re-wire when the global search query changes
    disposeInline?.();
    disposeInline = null;
    if (editing || !contentEl) return;

    wireDocContent(contentEl, doc.html, {
      content: doc.content,
      codeBlockMaxHeight: home.codeBlockMaxHeight,
      t,
      onDocLink: (linkId, anchor) => onopen(linkId, anchor),
      onAnchor: scrollToAnchor,
    });

    // Global-search in-doc highlight + notice (skip metadata:// queries)
    const isMeta = typeof q === "string" && q.toLowerCase().startsWith("metadata://");
    searchMatches = q && !isMeta ? highlightMatches(contentEl, q) : [];

    // Local in-document search widget
    if (localSearchMount) initLocalSearch(contentEl, localSearchMount, t);

    // Inline snippet editing (right-click on rendered snippets)
    disposeInline = initInlineSnippetEditing(contentEl, doc.content, {
      onEdit: (range) => { snippetMode = "inline-edit"; snippetRange = range; snippetsOpen = true; },
      onInsert: (pos) => { snippetMode = "inline-insert"; snippetInsertPos = pos; snippetsOpen = true; },
      onDelete: async (range) => {
        const ok = await confirmDialog.show({
          title: t("snippet.inline_delete_title"),
          message: t("snippet.inline_delete_message"),
          confirmLabel: t("snippet.inline_delete_confirm_btn"),
          cancelLabel: t("common.cancel"),
          danger: true,
        });
        if (!ok) return;
        await onsave(doc.content.slice(0, range.start) + doc.content.slice(range.end));
      },
    });

    if (id !== lastWiredId) {
      // New document: (re)fetch annotations + metadata
      lastWiredId = id;
      annotations?.load(id);
      metadata.load(id);
    } else {
      // Same doc, re-wired for a search change: re-apply in-memory annotation marks
      annotations?.apply();
    }

    // Extract TOC headings after HTML is wired
    const headings = Array.from(contentEl.querySelectorAll("h1,h2,h3,h4,h5,h6"));
    tocEntries = headings.map(h => ({
      id: h.id,
      text: h.textContent?.trim() ?? "",
      level: parseInt(h.tagName[1]),
    })).filter(e => e.id && e.text);
  });

  async function validate() {
    let accuracy = 1;
    try { const rep = await metadata.load(doc.id); if (rep && typeof rep.accuracy === "number") accuracy = rep.accuracy; } catch {}
    const pct = Math.round(accuracy * 100);
    const lowAccuracy = pct < 100;
    const worklog = isWorklogDocument(doc.id);
    const message = t(worklog ? "doc.validate_worklog_message" : "doc.validate_message");
    const detail = lowAccuracy
      ? t("doc.validate_detail_low_accuracy").replace("{accuracy}", pct + "%")
      : undefined;
    const ok = await confirmDialog.show({
      title: t("doc.validate_title"),
      message,
      detail,
      confirmLabel: t("doc.validate_confirm"),
      cancelLabel: t("common.cancel"),
    });
    if (!ok) return;
    const newContent = replaceStatus(doc.content, worklog ? "Done" : "Accepted");
    if (newContent === doc.content) return;
    try {
      await onsave(newContent);
      if (lowAccuracy) await fetch("/api/metadata/" + encodeURIComponent(doc.id) + "/refresh", { method: "POST" });
      await metadata.load(doc.id);
      home.docStatuses = { ...home.docStatuses, [doc.id]: worklog ? "Done" : "Accepted" };
    } catch (err: unknown) {
      saveMsg = { text: t("doc.validate_failed") + (err instanceof Error ? err.message : String(err)), cls: "text-red-500 dark:text-red-400" };
    }
  }

  // Full-width persistence
  $effect(() => {
    try { fullWidth = localStorage.getItem("ld-full-width") === "1"; } catch {}
  });

  function toggleFullWidth() {
    fullWidth = !fullWidth;
    try { localStorage.setItem("ld-full-width", fullWidth ? "1" : "0"); } catch {}
  }

  // ── Table of contents ─────────────────────────────────────────────────────────
  type TocEntry = { id: string; text: string; level: number };
  let tocOpen = $state(false);
  let tocEntries = $state<TocEntry[]>([]);
  const showToc = $derived(tocOpen && tocEntries.length > 0);

  // Resizable TOC panel
  const TOC_KEY = "ld-toc-w";
  const TOC_MIN = 160, TOC_MAX = 400, TOC_DEFAULT = 224;
  let tocDragging = $state(false);
  let tocEl = $state<HTMLElement | null>(null);

  // The header is full-width above the content row; the TOC must stick right below
  // it. We track the header's live height so the sticky `top` matches its natural
  // position exactly → zero sticky travel (the TOC never moves while scrolling).
  let headerEl = $state<HTMLElement | null>(null);
  let headerH = $state(0);
  $effect(() => {
    if (!headerEl) return;
    const ro = new ResizeObserver(() => { headerH = headerEl!.offsetHeight; });
    ro.observe(headerEl);
    headerH = headerEl.offsetHeight;
    return () => ro.disconnect();
  });

  function startTocResize(e: MouseEvent) {
    e.preventDefault();
    if (!tocEl) return;
    const startX = e.clientX;
    const startW = tocEl.getBoundingClientRect().width;
    tocDragging = true;
    tocEl.style.transition = "none";
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    const onMove = (ev: MouseEvent) => {
      // dragging left border → moving left increases width
      const w = Math.max(TOC_MIN, Math.min(TOC_MAX, startW - (ev.clientX - startX)));
      tocEl!.style.width = w + "px";
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      tocDragging = false;
      tocEl!.style.transition = "";
      try { localStorage.setItem(TOC_KEY, String(parseInt(tocEl!.style.width, 10))); } catch {}
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  $effect(() => {
    try { tocOpen = localStorage.getItem("ld-toc-open") === "1"; } catch {}
    try {
      const saved = parseInt(localStorage.getItem(TOC_KEY) || "", 10);
      if (tocEl && saved >= TOC_MIN && saved <= TOC_MAX) tocEl.style.width = saved + "px";
    } catch {}
  });

  function toggleToc() {
    tocOpen = !tocOpen;
    try { localStorage.setItem("ld-toc-open", tocOpen ? "1" : "0"); } catch {}
  }

  function scrollToHeading(id: string) {
    const target = document.getElementById(id);
    const scrollContainer = document.getElementById("home-content-area");
    const header = document.getElementById("home-doc-header") as HTMLElement | null;
    if (!target || !scrollContainer) return;

    // Open any ancestor <details> so the target is visible before measuring position
    let el: HTMLElement | null = target.parentElement;
    while (el && el !== scrollContainer) {
      if (el.tagName === "DETAILS") (el as HTMLDetailsElement).open = true;
      el = el.parentElement;
    }

    const headerH = header ? header.getBoundingClientRect().height : 0;
    const targetTop = target.getBoundingClientRect().top - scrollContainer.getBoundingClientRect().top + scrollContainer.scrollTop;
    scrollContainer.scrollTo({ top: targetTop - headerH - 16, behavior: "smooth" });
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

  function closeLightbox() {
    lightboxSrc = null;
    lightboxAlt = "";
  }

  // Lightbox: Shift+click or Command+click on rendered images or Mermaid diagrams.
  // Option and Control are intentionally left available for other interactions.
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

<header id="home-doc-header" bind:this={headerEl} class="sticky top-0 z-10 bg-gray-50 dark:bg-gray-950 px-6 pt-8 pb-6 border-b border-gray-300 dark:border-gray-800">
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
          <h1 data-testid="doc-title" class="min-w-0 text-2xl font-bold text-gray-900 dark:text-gray-50 leading-tight">{doc.title}</h1>
          <button type="button" data-testid="copy-doc-id-btn" onclick={copyMcpId} title={t("doc.copy_mcp_id")} class="no-print inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 hover:text-blue-600 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-blue-400 {copiedId ? 'text-green-600 dark:text-green-400' : ''}">
            <i class="fa-{copiedId ? 'solid fa-check' : 'regular fa-copy'}" aria-hidden="true"></i>
          </button>
        </div>
      </div>

      <div class="flex items-center gap-2 flex-wrap ml-auto">
        {#if editing}
          <div data-testid="edit-actions" class="flex items-center gap-2">
          {#if saveMsg}<span class="text-xs {saveMsg.cls}">{saveMsg.text}</span>{/if}
          <button onclick={cancelEdit} class="text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">{t("common.cancel")}</button>
          <button onclick={() => { snippetMode = "insert"; snippetsOpen = true; }} title={t("doc.snippets")} class="text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">{t("doc.snippets_btn")}</button>
          <button onclick={save} class="text-sm px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors">{t("common.save")}</button>
          </div>
        {:else}
          {@const bodyFill = home.markerActive ? "#fef08a" : "#bfdbfe"}
          {@const capFill = home.markerActive ? "#fef08a" : "#93c5fd"}
          {@const nibFill = home.markerActive ? "#fde047" : "#93c5fd"}
          <div data-testid="view-actions" class="flex items-center gap-2">
          {#if showValidate}
            <button onclick={validate} data-testid="validate-btn" title={t("doc.validate_mode")} class="no-print text-sm px-3 py-1.5 rounded-lg border border-green-700 bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors"><i class="fa-solid fa-check" style="margin-right:4px"></i>{t("doc.validate_btn")}</button>
          {/if}
          <button onclick={() => home.toggleMarker()} title={t("doc.marker_mode")} class="no-print text-sm px-3 py-1.5 rounded-lg border transition-colors {home.markerActive ? 'border-yellow-400 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}">
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

          <button onclick={exportPDF} title={t("doc.export_pdf")} class="no-print text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">📄 {t("doc.export_pdf_btn")}</button>
          <button onclick={copyLink} title={t("doc.copy_link")} class="no-print text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"><i class="fa-solid fa-link"></i> {t("doc.copy_link_btn")}</button>
          <button onclick={() => (metadataOpen = true)} data-testid="metadata-btn" title={t("metadata.button_title")} class="no-print text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"><i class="fa-solid fa-code-compare"></i> {t("metadata.button")}</button>
          <button onclick={enterEdit} title={t("doc.edit")} class="no-print text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"><i class="fa-solid fa-file-pen"></i> {t("doc.edit_btn")}</button>
          <button onclick={() => (confirmingDelete = true)} title={t("doc.delete")} class="no-print text-sm px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-700 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/40 transition-colors"><i class="fa-solid fa-trash"></i> {t("doc.delete_btn")}</button>
          <button onclick={toggleToc} title={t("doc.toc_toggle")} class="no-print text-sm px-3 py-1.5 rounded-lg border transition-colors {tocOpen ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}"><i class="fa-solid fa-list-ul"></i></button>
          </div>
        {/if}
      </div>
    </div>
    {#if !editing}
      <AccuracyGauge onopen={() => (metadataOpen = true)} />
    {/if}

    {#if !editing && navHistory.length}
      <div class="no-print mt-2 flex flex-wrap gap-1 text-xs">
        {#each navHistory as entry, i (i)}
          {#if i > 0}<span class="text-gray-300 dark:text-gray-600 mx-1">·</span>{/if}
          <button class="text-blue-600 dark:text-blue-400 hover:underline" onclick={() => ongoback?.(i)}>← {entry.title}</button>
        {/each}
      </div>
    {/if}

    {#if !editing && searchMatches.length && home.searchQuery}
      <div class="mt-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-sm text-yellow-800 dark:text-yellow-300 overflow-hidden">
        <div class="px-3 py-2 font-medium border-b border-yellow-200 dark:border-yellow-800">{noticeTitle}</div>
        <ol class="max-h-40 overflow-y-auto divide-y divide-yellow-100 dark:divide-yellow-900/40 list-none m-0 p-0">
          {#each searchMatches as m, i (m.id)}
            <li>
              <button onclick={() => scrollToMatch(m.id)} class="w-full text-left px-3 py-1.5 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors">
                <span class="text-yellow-600 dark:text-yellow-500 font-mono text-xs mr-2">{i + 1}.</span><span class="text-xs">{m.snippet}</span>
              </button>
            </li>
          {/each}
        </ol>
      </div>
    {/if}

    <!-- Local in-document search widget mount (populated imperatively) -->
    <div bind:this={localSearchMount} class="hidden no-print"></div>
</header>

<div class="flex min-h-full items-start">
<article id="home-doc-view" data-testid="doc-view" class="flex-1 min-w-0 px-6 pt-8 pb-8">
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
</article>

{#if showToc}
  <!-- Resize handle on the left border of the TOC -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    onmousedown={startTocResize}
    class="no-print w-1 shrink-0 self-stretch cursor-col-resize select-none transition-colors {tocDragging ? 'bg-blue-500/60' : 'bg-transparent hover:bg-blue-500/40'}"
  ></div>
  <aside
    bind:this={tocEl}
    class="no-print shrink-0 sticky self-start overflow-y-auto py-8 pr-4 pl-3 ld-toc-aside"
    style="width: {TOC_DEFAULT}px; top: {headerH}px; max-height: calc(100vh - {headerH}px)"
  >
    <p class="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">{t("doc.toc_title")}</p>
    <nav>
      <ul class="space-y-1 list-none m-0 p-0">
        {#each tocEntries as entry}
          <li class="m-0 p-0" style="padding-left: {(entry.level - 1) * 0.75}rem">
            <a
              href="#{entry.id}"
              onmousedown={(e) => e.preventDefault()}
              onclick={(e) => { e.preventDefault(); scrollToHeading(entry.id); }}
              class="block text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:underline py-0.5 leading-snug transition-colors truncate"
              title={entry.text}
            >{entry.text}</a>
          </li>
        {/each}
      </ul>
    </nav>
  </aside>
{/if}
</div>

<Annotations bind:this={annotations} {contentEl} docId={doc.id} />

<MetadataModal open={metadataOpen} docId={doc.id} content={doc.content} onclose={() => (metadataOpen = false)} />
<SnippetsModal
  open={snippetsOpen}
  editor={editorEl}
  mode={snippetMode}
  content={doc.content}
  range={snippetRange}
  insertPos={snippetInsertPos}
  onsave={onsave}
  onclose={() => (snippetsOpen = false)}
/>
<ConfirmDialog bind:this={confirmDialog} />

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
  <div data-testid="content-lightbox" class="fixed inset-0 z-50 bg-white flex items-center justify-center cursor-pointer p-4" onclick={closeLightbox}>
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <img data-testid="lightbox-image" src={lightboxSrc} alt={lightboxAlt} class="max-w-full max-h-full object-contain select-none" onclick={(e) => e.stopPropagation()} />
    <button onclick={closeLightbox} class="absolute top-4 right-4 text-gray-500 hover:text-gray-950 text-2xl leading-none">×</button>
  </div>
{/if}
