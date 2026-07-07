<script lang="ts">
  import { home } from "./state.svelte";
  import { t } from "../i18n.svelte";
  import { folderLabel } from "./tree";
  import Annotations from "./Annotations.svelte";
  import AccuracyGauge from "./AccuracyGauge.svelte";
  import MetadataModal from "./MetadataModal.svelte";
  import VersionsModal from "./VersionsModal.svelte";
  import EditableMarkdown from "./EditableMarkdown.svelte";
  import ConfirmDialog from "../ConfirmDialog.svelte";
  import { metadata } from "./metadata.svelte";
  import { getDocStatus, replaceStatus, isWorklogDocument } from "./docStatus";
  import { initLocalSearch } from "./localSearch";
  import { ttsPlayer, type TtsLanguage } from "./ttsPlayer.svelte";
  import { getDocumentLanguage, setDocumentLanguage, type DocumentLanguage } from "../../../../lib/documentLanguage";
  import { highlightMatches, scrollToMatch, type SearchMatch } from "./searchNotice";
  import type { DocDetail } from "./types";

  const KANBAN_MARKER_RE = /<div\s+data-ld-kanban\b/i;

  let { doc, onopen, onsave, ondelete, navHistory = [], ongoback }: {
    doc: DocDetail;
    onopen: (id: string, anchor: string | null) => void;
    onsave: (content: string) => Promise<void>;
    ondelete: () => Promise<void>;
    navHistory?: { id: string; title: string }[];
    ongoback?: (i: number) => void;
  } = $props();

  let contentEl = $state<HTMLElement | null>(null);
  let editable = $state<EditableMarkdown>(null!);
  let annotations = $state<Annotations>(null!);
  let confirmDialog = $state<ConfirmDialog>(null!);
  let metadataOpen = $state(false);
  let versionsOpen = $state(false);
  let versionsAvailable = $state(false);
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
  const isKanbanDocument = $derived(KANBAN_MARKER_RE.test(doc.content));
  const showValidate = $derived((docStatus || "").toUpperCase() === "TO BE VALIDATED");
  let editing = $state(false);
  let saveMsg = $state<{ text: string; cls: string } | null>(null);
  let fullWidth = $state(false);
  let confirmingDelete = $state(false);
  let copiedId = $state(false);
  let ttsLanguagePromptOpen = $state(false);
  let ttsLanguageSaving = $state(false);

  async function loadVersionsAvailability() {
    try {
      const res = await fetch("/api/git/status");
      const status = await res.json() as { mode?: string; ok?: boolean };
      versionsAvailable = status.mode === "enabled" && status.ok === true;
    } catch {
      versionsAvailable = false;
    }
  }

  $effect(() => {
    void doc.id;
    void isKanbanDocument;
    if (isKanbanDocument) {
      versionsAvailable = false;
      return;
    }
    void loadVersionsAvailability();
  });

  $effect(() => {
    if (isKanbanDocument && editing) {
      editing = false;
      saveMsg = null;
    }
  });

  // Scroll the content area so `target` lands just below the sticky header. The header element is
  // #home-doc-header (an earlier selector here matched nothing, so the header offset was silently
  // dropped). Smooth scrolling now lands correctly on the first click because TOC navigation is
  // JS-driven via a <button> (not <a href="#id">), so the browser's native anchor scroll — which
  // ignored the sticky header and re-jumped right after our scroll — no longer competes.
  const SCROLL_TARGET_GAP = 16;
  function alignScrollToTarget(target: HTMLElement, smooth: boolean) {
    const container = document.getElementById("home-content-area");
    if (!container) return;
    const header = document.getElementById("home-doc-header");
    const headerH = header ? header.getBoundingClientRect().height : 0;
    const offset =
      target.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;
    container.scrollTo({
      top: Math.max(0, offset - headerH - SCROLL_TARGET_GAP),
      behavior: smooth ? "smooth" : "auto",
    });
  }

  function scrollToAnchor(anchorId: string) {
    const target = document.getElementById(anchorId);
    if (target) alignScrollToTarget(target, false);
  }

  // Called by EditableMarkdown after each (re)wire of the rendered content. The
  // editable body owns rendering + inline snippet editing; DocViewer layers its
  // own concerns (annotations, in-doc search, TOC) on the same container.
  function handleContentWired(el: HTMLElement) {
    contentEl = el;
    const id = doc.id;
    const q = home.searchQuery;

    if (isKanbanDocument) {
      searchMatches = [];
      tocEntries = [];
      lastWiredId = id;
      return;
    }

    // Global-search in-doc highlight + notice (skip metadata:// queries)
    const isMeta = typeof q === "string" && q.toLowerCase().startsWith("metadata://");
    searchMatches = q && !isMeta ? highlightMatches(el, q) : [];

    // Local in-document search widget
    if (localSearchMount) initLocalSearch(el, localSearchMount, t);

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
    const headings = Array.from(el.querySelectorAll("h1,h2,h3,h4,h5,h6"));
    tocEntries = headings.map(h => ({
      id: h.id,
      text: h.textContent?.trim() ?? "",
      level: parseInt(h.tagName[1]),
    })).filter(e => e.id && e.text);
  }

  // Inline snippet deletion confirmation, using DocViewer's ConfirmDialog.
  function confirmInlineDelete(): Promise<boolean> {
    return confirmDialog.show({
      title: t("snippet.inline_delete_title"),
      message: t("snippet.inline_delete_message"),
      confirmLabel: t("snippet.inline_delete_confirm_btn"),
      cancelLabel: t("common.cancel"),
      danger: true,
    });
  }

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
  const showToc = $derived(!isKanbanDocument && tocOpen && tocEntries.length > 0);

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
    if (!target || !scrollContainer) return;

    // Open any ancestor <details> so the target is visible before measuring position
    let el: HTMLElement | null = target.parentElement;
    while (el && el !== scrollContainer) {
      if (el.tagName === "DETAILS") (el as HTMLDetailsElement).open = true;
      el = el.parentElement;
    }

    alignScrollToTarget(target, true);
  }


  // ── Misc ─────────────────────────────────────────────────────────────────────

  async function copyMcpId() {
    try {
      await navigator.clipboard.writeText(decodeURIComponent(doc.id));
      copiedId = true;
      setTimeout(() => (copiedId = false), 1800);
    } catch {}
  }

  function exportPDF() { window.print(); }

  // ── Text-to-speech ────────────────────────────────────────────────────────
  function playDocument(language: DocumentLanguage) {
    if (!contentEl) return;
    ttsPlayer.start(contentEl, {
      language: language as TtsLanguage,
      codeLabel: t("tts.code_label"),
      imageLabel: t("tts.image_label"),
      diagramLabel: t("tts.diagram_label"),
      tableLabel: t("tts.table_label"),
    });
  }

  function startReading() {
    const language = getDocumentLanguage(doc.content);
    if (!language) {
      ttsLanguagePromptOpen = true;
      return;
    }
    playDocument(language);
  }

  async function chooseReadingLanguage(language: DocumentLanguage) {
    ttsLanguageSaving = true;
    try {
      const nextContent = setDocumentLanguage(doc.content, language);
      if (nextContent !== doc.content) await onsave(nextContent);
      ttsLanguagePromptOpen = false;
      playDocument(language);
    } catch (err: unknown) {
      saveMsg = {
        text: t("tts.language_save_failed") + (err instanceof Error ? err.message : String(err)),
        cls: "text-red-500 dark:text-red-400",
      };
    } finally {
      ttsLanguageSaving = false;
    }
  }

  // Stop playback when navigating to another document or entering edit mode.
  $effect(() => {
    void doc.id;
    void editing;
    return () => {
      ttsLanguagePromptOpen = false;
      ttsPlayer.stop();
    };
  });
</script>

<header id="home-doc-header" bind:this={headerEl} class="sticky top-0 z-10 bg-gray-50 dark:bg-gray-950 px-6 pt-8 pb-6 border-b border-gray-300 dark:border-gray-800">
    <div class="flex items-start gap-4 flex-wrap">
      <div class="shrink min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="flex items-center gap-2 flex-wrap">
            {#each doc.folder || [] as seg}
              <span title={seg} class="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">{folderLabel(seg)}</span>
            {/each}
            <span class="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">{doc.category}</span>
          </span>
          {#if doc.formattedDate}
            <span class="text-xs text-gray-400 dark:text-gray-500">{doc.formattedDate}</span>
          {/if}
          <h1 data-testid="doc-title" class="min-w-0 text-xs font-normal text-gray-900 dark:text-gray-50 leading-tight">{doc.title}</h1>
          {#if !isKanbanDocument}
            <button type="button" data-testid="copy-doc-id-btn" onclick={copyMcpId} title={t("doc.copy_mcp_id")} class="no-print inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-gray-200 text-xs text-gray-500 transition-colors hover:bg-gray-50 hover:text-blue-600 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-blue-400 {copiedId ? 'text-green-600 dark:text-green-400' : ''}">
              <i class="fa-{copiedId ? 'solid fa-check' : 'regular fa-copy'}" aria-hidden="true"></i>
            </button>
          {/if}
        </div>
      </div>

      <div class="flex items-center gap-2 flex-wrap ml-auto">
        {#if editing}
          <div data-testid="edit-actions" class="flex items-center gap-2">
          {#if saveMsg}<span class="text-xs {saveMsg.cls}">{saveMsg.text}</span>{/if}
          <button onclick={() => editable.cancelEdit()} class="text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">{t("common.cancel")}</button>
          <button onclick={() => editable.openSnippets()} title={t("doc.snippets")} class="text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">{t("doc.snippets_btn")}</button>
          <button onclick={() => editable.save()} class="text-sm px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors">{t("common.save")}</button>
          </div>
        {:else}
          {@const bodyFill = home.markerActive ? "#fef08a" : "#bfdbfe"}
          {@const capFill = home.markerActive ? "#fef08a" : "#93c5fd"}
          {@const nibFill = home.markerActive ? "#fde047" : "#93c5fd"}
          <div data-testid="view-actions" class="flex items-center gap-2">
          {#if showValidate && !isKanbanDocument}
            <button onclick={validate} data-testid="validate-btn" title={t("doc.validate_mode")} class="no-print text-sm px-3 py-1.5 rounded-lg border border-green-700 bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors"><i class="fa-solid fa-check" style="margin-right:4px"></i>{t("doc.validate_btn")}</button>
          {/if}
          {#if !isKanbanDocument}
            {#if ttsPlayer.active}
              <button onclick={() => ttsPlayer.toggle()} data-testid="tts-toggle" title={ttsPlayer.status === "playing" ? t("tts.pause") : t("tts.resume")} class="no-print text-sm px-3 py-1.5 rounded-lg border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"><i class="fa-solid {ttsPlayer.status === 'playing' ? 'fa-pause' : 'fa-play'}"></i></button>
              <button onclick={() => ttsPlayer.stop()} data-testid="tts-stop" title={t("tts.stop")} class="no-print text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"><i class="fa-solid fa-stop"></i></button>
            {:else}
              <button onclick={startReading} data-testid="tts-play" title={t("tts.play")} class="no-print text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"><i class="fa-solid fa-headphones" style="margin-right:4px"></i>{t("tts.play_btn")}</button>
            {/if}
            <button onclick={() => home.toggleMarker()} data-testid="marker-doc-btn" title={t("doc.marker_mode")} class="no-print text-sm px-3 py-1.5 rounded-lg border transition-colors {home.markerActive ? 'border-yellow-400 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}">
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

            <button onclick={exportPDF} data-testid="export-pdf-btn" title={t("doc.export_pdf")} class="no-print text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">📄 {t("doc.export_pdf_btn")}</button>
            <button onclick={() => (metadataOpen = true)} data-testid="metadata-btn" title={t("metadata.button_title")} class="no-print text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"><i class="fa-solid fa-code-compare"></i> {t("metadata.button")}</button>
            {#if versionsAvailable}
              <button onclick={() => (versionsOpen = true)} data-testid="versions-btn" title={t("versions.button_title")} class="no-print text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"><i class="fa-solid fa-code-branch"></i> {t("versions.button")}</button>
            {/if}
            <button onclick={() => editable.enterEdit()} data-testid="edit-doc-btn" title={t("doc.edit")} class="no-print text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"><i class="fa-solid fa-file-pen"></i> {t("doc.edit_btn")}</button>
          {/if}
          {#if isKanbanDocument}
            <button onclick={() => editable.openKanbanColumnsEditor()} data-testid="kanban-edit-columns" title={t("kanban.edit_columns")} class="no-print text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"><i class="fa-solid fa-gear"></i> {t("kanban.edit_columns")}</button>
          {/if}
          <button onclick={() => (confirmingDelete = true)} data-testid="delete-doc-btn" title={t("doc.delete")} class="no-print text-sm px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-700 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/40 transition-colors"><i class="fa-solid fa-trash"></i> {t("doc.delete_btn")}</button>
          {#if !isKanbanDocument}
            <button onclick={toggleToc} data-testid="toc-toggle-btn" title={t("doc.toc_toggle")} class="no-print text-sm px-3 py-1.5 rounded-lg border transition-colors {tocOpen ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}"><i class="fa-solid fa-list-ul"></i></button>
          {/if}
          </div>
        {/if}
      </div>
    </div>
    {#if !editing && !isKanbanDocument}
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

    {#if !editing && !isKanbanDocument && searchMatches.length && home.searchQuery}
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

    {#if !editing && !isKanbanDocument && ttsPlayer.error}
      <div data-testid="tts-error" class="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
        {ttsPlayer.error}
      </div>
    {/if}

    <!-- Local in-document search widget mount (populated imperatively) -->
    {#if !isKanbanDocument}
      <div bind:this={localSearchMount} class="hidden no-print"></div>
    {/if}
</header>

<div class="flex min-h-full items-start">
<article id="home-doc-view" data-testid="doc-view" class="flex-1 min-w-0 px-6 pt-8 pb-8">
  <EditableMarkdown
    bind:this={editable}
    bind:editing
    bind:saveMsg
    docId={doc.id}
    content={doc.content}
    html={doc.html}
    onsave={onsave}
    onopen={onopen}
    onanchor={scrollToAnchor}
    onconfirmdelete={confirmInlineDelete}
    oncontentwired={handleContentWired}
    rewireSignal={home.searchQuery}
  />
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
    style="width: {TOC_DEFAULT}px; top: {headerH}px; min-height: calc(100vh - {headerH}px); max-height: calc(100vh - {headerH}px)"
  >
    <p class="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">{t("doc.toc_title")}</p>
    <nav>
      <ul class="space-y-1 list-none m-0 p-0">
        {#each tocEntries as entry}
          <li class="m-0 p-0" style="padding-left: {(entry.level - 1) * 0.75}rem">
            <!-- A <button>, not <a href="#id">, on purpose: the anchor's native hash navigation
                 fired after our handler on the first click and re-scrolled the heading to the very
                 top, ignoring the sticky header (the second click was a same-hash no-op, hence it
                 looked aligned). Driving the scroll purely from JS removes that competing scroll. -->
            <button
              type="button"
              onclick={() => scrollToHeading(entry.id)}
              class="block w-full text-left bg-transparent border-0 cursor-pointer text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:underline py-0.5 leading-snug transition-colors truncate"
              title={entry.text}
            >{entry.text}</button>
          </li>
        {/each}
      </ul>
    </nav>
  </aside>
{/if}
</div>

{#if !isKanbanDocument}
  <Annotations bind:this={annotations} {contentEl} docId={doc.id} />
{/if}

<MetadataModal open={metadataOpen} docId={doc.id} content={doc.content} onclose={() => (metadataOpen = false)} />
<VersionsModal open={versionsOpen} docId={doc.id} content={doc.content} {onsave} onclose={() => (versionsOpen = false)} />
<ConfirmDialog bind:this={confirmDialog} />

{#if ttsLanguagePromptOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div data-testid="tts-language-modal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onclick={(e) => { if (e.target === e.currentTarget && !ttsLanguageSaving) ttsLanguagePromptOpen = false; }}>
    <div class="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
      <h2 class="text-base font-semibold text-gray-900 dark:text-gray-50">{t("tts.language_title")}</h2>
      <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">{t("tts.language_message")}</p>
      <div class="mt-4 grid grid-cols-2 gap-2">
        <button type="button" data-testid="tts-language-en" disabled={ttsLanguageSaving} onclick={() => chooseReadingLanguage("en")} class="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
          {t("tts.language_en")}
        </button>
        <button type="button" data-testid="tts-language-fr" disabled={ttsLanguageSaving} onclick={() => chooseReadingLanguage("fr")} class="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
          {t("tts.language_fr")}
        </button>
      </div>
      <div class="mt-3 flex justify-end">
        <button type="button" disabled={ttsLanguageSaving} onclick={() => (ttsLanguagePromptOpen = false)} class="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
          {t("common.cancel")}
        </button>
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
