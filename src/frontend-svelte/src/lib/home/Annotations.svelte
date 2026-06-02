<script lang="ts">
  import { home } from "./state.svelte";
  import { t } from "../i18n.svelte";
  import { applyHighlights as applyMarks, setHighlightsVisible, type Annotation } from "./annotationHighlight";

  let { contentEl, docId }: { contentEl: HTMLElement | null; docId: string } = $props();

  let list = $state<Annotation[]>([]);
  let createPopup = $state<{ x: number; y: number; preview: string; selectedText: string; contextBefore: string; contextAfter: string } | null>(null);
  let noteInput = $state("");
  let readPopup = $state<{ ann: Annotation; x: number; y: number; orphan: boolean } | null>(null);
  let deleteTarget = $state<{ id: string; x: number; y: number } | null>(null);
  let elevatorItems = $state<{ id: string; note: string; orphan: boolean }[]>([]);
  let hideTimer: number | null = null;

  function clampPos(x: number, y: number, w = 320, h = 260) {
    const vw = window.innerWidth, vh = window.innerHeight;
    let left = x; if (left + w > vw - 16) left = vw - w - 16; if (left < 8) left = 8;
    return { x: left, y: Math.min(y, vh - h) };
  }

  export async function load(id: string) {
    list = [];
    try { list = await fetch("/api/annotations/" + encodeURIComponent(id)).then(r => r.json()); } catch { list = []; }
    apply();
  }

  export function apply() {
    if (!contentEl) return;
    applyMarks(contentEl, list, home.markerHidden);
    computeElevator();
  }

  $effect(() => {
    // re-apply visibility when marker hidden toggles
    if (!contentEl) return;
    setHighlightsVisible(contentEl, !home.markerHidden);
  });

  function computeElevator() {
    if (!contentEl) { elevatorItems = []; return; }
    elevatorItems = list.map(ann => ({
      id: ann.id,
      note: ann.note.length > 60 ? ann.note.slice(0, 60) + "…" : ann.note,
      orphan: !contentEl!.querySelector(`mark[data-annotation-id="${ann.id}"]`),
    }));
  }

  // ── Selection capture ────────────────────────────────────────────────────────
  function onMouseup() {
    if (!home.markerActive || createPopup || !contentEl) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) return;
    if (!contentEl.contains(sel.anchorNode)) return;

    const range = sel.getRangeAt(0);
    const preRange = document.createRange();
    preRange.selectNodeContents(contentEl);
    preRange.setEnd(range.startContainer, range.startOffset);
    const rawStart = preRange.toString().length;
    const rawSelected = range.toString();
    const fullText = contentEl.textContent || "";
    const normalize = (s: string) => s.replace(/\s+/g, " ").trim();
    const selectedText = normalize(rawSelected);
    const contextBefore = normalize(fullText.slice(Math.max(0, rawStart - 30), rawStart));
    const contextAfter = normalize(fullText.slice(rawStart + rawSelected.length, rawStart + rawSelected.length + 30));

    const rect = range.getBoundingClientRect();
    const pos = clampPos(rect.left, rect.bottom + 8);
    createPopup = { x: pos.x, y: pos.y, preview: selectedText.length > 120 ? selectedText.slice(0, 120) + "…" : selectedText, selectedText, contextBefore, contextAfter };
    noteInput = "";
  }

  function closeCreate() {
    createPopup = null;
    window.getSelection()?.removeAllRanges();
  }

  async function saveAnnotation() {
    if (!createPopup || !docId) return;
    const note = noteInput.trim();
    if (!note) return;
    try {
      const ann = await fetch("/api/annotations/" + encodeURIComponent(docId), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedText: createPopup.selectedText, contextBefore: createPopup.contextBefore, contextAfter: createPopup.contextAfter, note }),
      }).then(r => r.json());
      list = [...list, ann];
      closeCreate();
      apply();
      home.annotationCounts = { ...home.annotationCounts, [docId]: (home.annotationCounts[docId] || 0) + 1 };
    } catch {}
  }

  // ── Read popup (hover on marks) ───────────────────────────────────────────────
  $effect(() => {
    if (!contentEl) return;
    const el = contentEl;
    const onOver = (e: Event) => {
      const mark = (e.target as HTMLElement).closest("mark[data-annotation-id]");
      if (!mark) return;
      const ann = list.find(a => a.id === (mark as HTMLElement).dataset.annotationId);
      if (ann) showRead(ann, mark as HTMLElement);
    };
    const onOut = (e: Event) => {
      const me = e as MouseEvent;
      if (!(me.target as HTMLElement).closest("mark[data-annotation-id]")) return;
      if (me.relatedTarget && (me.relatedTarget as HTMLElement).closest?.("mark[data-annotation-id]")) return;
      scheduleHide();
    };
    el.addEventListener("mouseover", onOver);
    el.addEventListener("mouseout", onOut);
    return () => { el.removeEventListener("mouseover", onOver); el.removeEventListener("mouseout", onOut); };
  });

  function showRead(ann: Annotation, anchorEl: HTMLElement) {
    if (hideTimer) clearTimeout(hideTimer);
    const orphan = !contentEl?.querySelector(`mark[data-annotation-id="${ann.id}"]`);
    const rect = anchorEl.getBoundingClientRect();
    const pos = clampPos(rect.left, rect.bottom + 8);
    readPopup = { ann, x: pos.x, y: pos.y, orphan };
  }

  function scheduleHide() {
    hideTimer = window.setTimeout(() => { readPopup = null; }, 300);
  }

  function askDelete() {
    if (!readPopup) return;
    deleteTarget = { id: readPopup.ann.id, x: readPopup.x, y: readPopup.y };
    readPopup = null;
  }

  async function confirmDelete() {
    if (!deleteTarget || !docId) return;
    const id = deleteTarget.id;
    try {
      await fetch(`/api/annotations/${encodeURIComponent(docId)}/${id}`, { method: "DELETE" });
      list = list.filter(a => a.id !== id);
      deleteTarget = null;
      apply();
      const next = (home.annotationCounts[docId] || 0) - 1;
      const counts = { ...home.annotationCounts };
      if (next <= 0) delete counts[docId]; else counts[docId] = next;
      home.annotationCounts = counts;
    } catch {}
  }

  // ── Elevator interactions ─────────────────────────────────────────────────────
  function markRectTop(m: HTMLElement, area: HTMLElement): number {
    return m.getBoundingClientRect().top + area.scrollTop - area.getBoundingClientRect().top;
  }

  function pillClick(id: string, e: MouseEvent) {
    const m = contentEl?.querySelector(`mark[data-annotation-id="${id}"]`) as HTMLElement | null;
    const area = document.getElementById("home-content-area");
    if (m && area) {
      area.scrollTo({ top: markRectTop(m, area) - 120, behavior: "smooth" });
    } else {
      const ann = list.find(a => a.id === id);
      if (ann) showRead(ann, e.currentTarget as HTMLElement);
    }
  }

  function pillEnter(id: string, e: MouseEvent) {
    if (hideTimer) clearTimeout(hideTimer);
    const ann = list.find(a => a.id === id);
    if (!ann) return;
    const m = contentEl?.querySelector(`mark[data-annotation-id="${id}"]`) as HTMLElement | null;
    const area = document.getElementById("home-content-area");
    if (!m || !area) {
      showRead(ann, e.currentTarget as HTMLElement);
      return;
    }
    // Scroll the mark to the vertical center, then show the popup once settled.
    area.scrollTo({ top: markRectTop(m, area) - area.clientHeight / 2, behavior: "smooth" });
    let settleTimer: number;
    const onScroll = () => {
      clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        area.removeEventListener("scroll", onScroll);
        showRead(ann, m);
      }, 80);
    };
    area.addEventListener("scroll", onScroll);
    settleTimer = window.setTimeout(() => {
      area.removeEventListener("scroll", onScroll);
      showRead(ann, m);
    }, 600);
  }

  function pillBackground(item: { id: string; orphan: boolean }): string {
    const isActive = readPopup?.ann.id === item.id;
    if (item.orphan) return isActive ? "#b91c1c" : "#ef4444";
    return isActive ? "#f97316" : "#facc15";
  }

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  }
</script>

<svelte:window onmouseup={onMouseup} />

<!-- Create popup -->
{#if createPopup}
  <div class="fixed z-50 w-80 bg-yellow-50 dark:bg-yellow-900/80 border-2 border-yellow-300 dark:border-yellow-600 rounded-xl shadow-2xl p-4 flex flex-col gap-3" style="left:{createPopup.x}px;top:{createPopup.y}px">
    <div class="text-xs font-semibold text-yellow-700 dark:text-yellow-300 flex items-center gap-2">
      <span>✎</span><span>{t("annotation.title")}</span>
    </div>
    <div class="text-xs text-yellow-800 dark:text-yellow-200 bg-yellow-100 dark:bg-yellow-800/50 rounded px-2 py-1 italic max-h-16 overflow-y-auto border border-yellow-200 dark:border-yellow-700">{createPopup.preview}</div>
    <!-- svelte-ignore a11y_autofocus -->
    <textarea bind:value={noteInput} rows="4" autofocus placeholder={t("annotation.placeholder")} class="w-full text-sm rounded-lg border border-yellow-300 dark:border-yellow-600 bg-white dark:bg-yellow-950 text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none"></textarea>
    <div class="flex justify-end gap-2">
      <button onclick={closeCreate} class="text-sm px-3 py-1.5 rounded-lg border border-yellow-300 dark:border-yellow-600 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-800 transition-colors">{t("common.cancel")}</button>
      <button onclick={saveAnnotation} class="text-sm px-4 py-1.5 rounded-lg bg-yellow-400 hover:bg-yellow-500 dark:bg-yellow-600 dark:hover:bg-yellow-500 text-yellow-900 dark:text-white font-semibold transition-colors">{t("annotation.save_btn")}</button>
    </div>
  </div>
{/if}

<!-- Read popup -->
{#if readPopup}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed z-50 w-80 bg-yellow-50 dark:bg-yellow-900/80 border-2 border-yellow-300 dark:border-yellow-600 rounded-xl shadow-2xl p-4 flex flex-col gap-2"
    style="left:{readPopup.x}px;top:{readPopup.y}px"
    onmouseenter={() => { if (hideTimer) clearTimeout(hideTimer); }}
    onmouseleave={scheduleHide}
  >
    <div class="text-xs font-semibold text-yellow-700 dark:text-yellow-300 flex items-center gap-2">
      <span>✎</span><span class="font-normal text-yellow-600 dark:text-yellow-400">{fmtDate(readPopup.ann.createdAt)}</span>
    </div>
    {#if readPopup.orphan}
      <div class="text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded px-2 py-1">{t("annotation.orphan")}</div>
    {/if}
    <div class="text-sm text-gray-800 dark:text-gray-100 whitespace-pre-wrap max-h-48 overflow-y-auto">{readPopup.ann.note}</div>
    <div class="flex justify-end pt-1 border-t border-yellow-200 dark:border-yellow-700">
      <button onclick={askDelete} class="text-xs px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-700 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/40 transition-colors flex items-center gap-1">{t("annotation.delete_btn")}</button>
    </div>
  </div>
{/if}

<!-- Delete confirm -->
{#if deleteTarget}
  <div class="fixed z-50 w-72 bg-white dark:bg-gray-900 border border-red-200 dark:border-red-700 rounded-xl shadow-2xl p-4 flex flex-col gap-3" style="left:{deleteTarget.x}px;top:{deleteTarget.y}px">
    <p class="text-sm text-gray-700 dark:text-gray-200">{t("annotation.confirm_delete")}</p>
    <div class="flex justify-end gap-2">
      <button onclick={() => (deleteTarget = null)} class="text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">{t("common.cancel")}</button>
      <button onclick={confirmDelete} class="text-sm px-4 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold transition-colors">{t("annotation.confirm_btn")}</button>
    </div>
  </div>
{/if}

<!-- Elevator -->
{#if elevatorItems.length > 0 && !home.markerHidden}
  <div class="fixed top-14 right-0 w-10 flex flex-col items-center py-2 gap-2 z-40 overflow-y-auto" style="max-height: calc(100vh - 3.5rem)">
    {#each elevatorItems as item (item.id)}
      <button
        onclick={(e) => pillClick(item.id, e)}
        onmouseenter={(e) => pillEnter(item.id, e)}
        onmouseleave={scheduleHide}
        title={item.orphan ? `${t("annotation.orphan")}\n\n${item.note}` : item.note}
        class="w-8 h-8 rounded border-2 shadow text-xs flex items-center justify-center transition-colors shrink-0 {item.orphan ? 'border-red-600 text-white' : 'border-yellow-500'}"
        style="background:{pillBackground(item)}"
      >{item.orphan ? "⚠" : "✎"}</button>
    {/each}
  </div>
{/if}
