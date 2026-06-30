<script lang="ts">
  import { t } from "../i18n.svelte";

  interface GitDocumentCommit {
    hash: string;
    shortHash: string;
    date: string;
    author: string;
    subject: string;
  }

  interface GitDocumentVersions {
    ok: boolean;
    relativePath: string | null;
    baseRef: string;
    baseContent: string | null;
    commits: GitDocumentCommit[];
    message: string;
  }

  type DiffKind = "context" | "added" | "removed" | "empty";

  interface DiffLine {
    text: string;
    lineNumber: number | null;
    kind: DiffKind;
  }

  interface DiffRow {
    left: DiffLine;
    right: DiffLine;
  }

  type DiffOp =
    | { kind: "context"; oldText: string; newText: string; oldLine: number; newLine: number }
    | { kind: "removed"; text: string; oldLine: number }
    | { kind: "added"; text: string; newLine: number };

  let { open, docId, content, onclose }: {
    open: boolean;
    docId: string;
    content: string;
    onclose: () => void;
  } = $props();

  const DEFAULT_HISTORY_DAYS = 30;
  const MIN_HISTORY_DAYS = 1;
  const MAX_HISTORY_DAYS = 3650;
  const MAX_LCS_CELLS = 4_000_000;

  let sinceDaysInput = $state(DEFAULT_HISTORY_DAYS);
  let appliedSinceDays = $state(DEFAULT_HISTORY_DAYS);
  let loading = $state(false);
  let error = $state("");
  let data = $state<GitDocumentVersions | null>(null);
  let lastLoadKey = "";

  const diffRows = $derived(buildDiffRows(data?.baseContent ?? "", content));
  const hasBaseContent = $derived(data?.baseContent !== null && data?.baseContent !== undefined);

  function clampHistoryDays(value: number): number {
    if (!Number.isFinite(value)) return DEFAULT_HISTORY_DAYS;
    return Math.max(MIN_HISTORY_DAYS, Math.min(MAX_HISTORY_DAYS, Math.floor(value)));
  }

  function splitLines(value: string): string[] {
    return value.length ? value.replace(/\r\n/g, "\n").split("\n") : [];
  }

  function emptyLine(): DiffLine {
    return { text: "", lineNumber: null, kind: "empty" };
  }

  function buildSimpleDiffRows(oldLines: string[], newLines: string[]): DiffRow[] {
    const rows: DiffRow[] = [];
    const max = Math.max(oldLines.length, newLines.length);
    for (let index = 0; index < max; index += 1) {
      const oldText = oldLines[index];
      const newText = newLines[index];
      if (oldText === newText) {
        rows.push({
          left: { text: oldText ?? "", lineNumber: oldText === undefined ? null : index + 1, kind: oldText === undefined ? "empty" : "context" },
          right: { text: newText ?? "", lineNumber: newText === undefined ? null : index + 1, kind: newText === undefined ? "empty" : "context" },
        });
      } else {
        rows.push({
          left: oldText === undefined ? emptyLine() : { text: oldText, lineNumber: index + 1, kind: "removed" },
          right: newText === undefined ? emptyLine() : { text: newText, lineNumber: index + 1, kind: "added" },
        });
      }
    }
    return rows;
  }

  function appendChangedBlock(rows: DiffRow[], block: DiffOp[]) {
    const removed = block.filter((op): op is Extract<DiffOp, { kind: "removed" }> => op.kind === "removed");
    const added = block.filter((op): op is Extract<DiffOp, { kind: "added" }> => op.kind === "added");
    const max = Math.max(removed.length, added.length);
    for (let index = 0; index < max; index += 1) {
      const left = removed[index];
      const right = added[index];
      rows.push({
        left: left ? { text: left.text, lineNumber: left.oldLine, kind: "removed" } : emptyLine(),
        right: right ? { text: right.text, lineNumber: right.newLine, kind: "added" } : emptyLine(),
      });
    }
  }

  function buildDiffRows(baseContent: string, currentContent: string): DiffRow[] {
    const oldLines = splitLines(baseContent);
    const newLines = splitLines(currentContent);
    if (oldLines.length * newLines.length > MAX_LCS_CELLS) {
      return buildSimpleDiffRows(oldLines, newLines);
    }

    const cols = newLines.length + 1;
    const dp = new Uint32Array((oldLines.length + 1) * cols);
    for (let i = oldLines.length - 1; i >= 0; i -= 1) {
      for (let j = newLines.length - 1; j >= 0; j -= 1) {
        const current = i * cols + j;
        dp[current] = oldLines[i] === newLines[j]
          ? dp[(i + 1) * cols + j + 1] + 1
          : Math.max(dp[(i + 1) * cols + j], dp[i * cols + j + 1]);
      }
    }

    const ops: DiffOp[] = [];
    let i = 0;
    let j = 0;
    while (i < oldLines.length || j < newLines.length) {
      if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
        ops.push({ kind: "context", oldText: oldLines[i], newText: newLines[j], oldLine: i + 1, newLine: j + 1 });
        i += 1;
        j += 1;
      } else if (j < newLines.length && (i === oldLines.length || dp[i * cols + j + 1] >= dp[(i + 1) * cols + j])) {
        ops.push({ kind: "added", text: newLines[j], newLine: j + 1 });
        j += 1;
      } else if (i < oldLines.length) {
        ops.push({ kind: "removed", text: oldLines[i], oldLine: i + 1 });
        i += 1;
      }
    }

    const rows: DiffRow[] = [];
    let block: DiffOp[] = [];
    for (const op of ops) {
      if (op.kind === "context") {
        if (block.length) {
          appendChangedBlock(rows, block);
          block = [];
        }
        rows.push({
          left: { text: op.oldText, lineNumber: op.oldLine, kind: "context" },
          right: { text: op.newText, lineNumber: op.newLine, kind: "context" },
        });
      } else {
        block.push(op);
      }
    }
    if (block.length) appendChangedBlock(rows, block);
    return rows;
  }

  function lineClass(kind: DiffKind): string {
    if (kind === "added") return "bg-green-50 text-green-900 dark:bg-green-950/40 dark:text-green-100";
    if (kind === "removed") return "bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-100";
    if (kind === "empty") return "bg-gray-50 dark:bg-gray-900/60";
    return "bg-white text-gray-800 dark:bg-gray-950 dark:text-gray-200";
  }

  function lineNumberClass(kind: DiffKind): string {
    if (kind === "added") return "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300";
    if (kind === "removed") return "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300";
    return "bg-gray-100 text-gray-400 dark:bg-gray-900 dark:text-gray-500";
  }

  function formatDate(value: string): string {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  }

  async function loadVersions() {
    const days = clampHistoryDays(appliedSinceDays);
    const key = `${docId}:${days}`;
    if (!open || loading || key === lastLoadKey) return;
    loading = true;
    error = "";
    try {
      const params = new URLSearchParams({ documentId: docId, sinceDays: String(days) });
      const res = await fetch(`/api/git/document-versions?${params.toString()}`);
      const body = await res.json();
      if (!res.ok || !body.ok) throw new Error(body.message || body.error || t("versions.load_failed"));
      data = body as GitDocumentVersions;
      lastLoadKey = key;
    } catch (err: unknown) {
      error = err instanceof Error ? err.message : String(err);
      data = null;
      lastLoadKey = "";
    } finally {
      loading = false;
    }
  }

  function refreshWithPeriod() {
    appliedSinceDays = clampHistoryDays(Number(sinceDaysInput));
    sinceDaysInput = appliedSinceDays;
    lastLoadKey = "";
    void loadVersions();
  }

  $effect(() => {
    if (!open) {
      lastLoadKey = "";
      return;
    }
    void docId;
    void appliedSinceDays;
    void loadVersions();
  });
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div data-testid="versions-modal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onclick={(e) => { if (e.target === e.currentTarget) onclose(); }}>
    <div class="flex h-[90vh] w-full max-w-7xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-950">
      <header class="flex shrink-0 items-start justify-between gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-800">
        <div>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-50"><i class="fa-solid fa-code-branch mr-2"></i>{t("versions.title")}</h2>
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {data?.relativePath || t("versions.path_pending")}
          </p>
        </div>
        <button type="button" onclick={onclose} title={t("common.close")} class="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </header>

      <div class="shrink-0 border-b border-gray-200 px-5 py-3 dark:border-gray-800">
        <div class="flex flex-wrap items-end gap-3">
          <label class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {t("versions.period_label")}
            <input
              type="number"
              min={MIN_HISTORY_DAYS}
              max={MAX_HISTORY_DAYS}
              bind:value={sinceDaysInput}
              class="mt-1 block w-28 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
          </label>
          <button type="button" onclick={refreshWithPeriod} class="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50" disabled={loading}>
            <i class="fa-solid fa-arrows-rotate mr-1"></i>{t("versions.refresh")}
          </button>
          <div class="text-xs text-gray-500 dark:text-gray-400">
            {t("versions.base_ref").replace("{ref}", data?.baseRef || "HEAD")}
          </div>
        </div>

        {#if data?.commits?.length}
          <div class="mt-3 flex gap-2 overflow-x-auto pb-1">
            {#each data.commits as commit (commit.hash)}
              <div class="min-w-64 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-900">
                <div class="flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-100">
                  <span class="font-mono text-blue-600 dark:text-blue-400">{commit.shortHash}</span>
                  <span class="truncate">{commit.subject}</span>
                </div>
                <div class="mt-1 text-gray-500 dark:text-gray-400">{formatDate(commit.date)} · {commit.author}</div>
              </div>
            {/each}
          </div>
        {:else if data && !loading}
          <p class="mt-3 text-sm text-gray-500 dark:text-gray-400">{t("versions.no_commits")}</p>
        {/if}
      </div>

      <section class="min-h-0 flex-1 overflow-hidden">
        {#if loading}
          <div class="flex h-full items-center justify-center text-sm text-gray-500 dark:text-gray-400">{t("common.loading")}</div>
        {:else if error}
          <div class="m-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">{error}</div>
        {:else if data}
          {#if !hasBaseContent}
            <div class="mx-5 mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
              {t("versions.no_head_content")}
            </div>
          {/if}
          <div class="h-full overflow-auto p-5">
            <div class="grid min-w-[900px] grid-cols-2 overflow-hidden rounded-lg border border-gray-200 text-xs dark:border-gray-800">
              <div class="border-b border-r border-gray-200 bg-gray-100 px-3 py-2 font-semibold text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200">{t("versions.left_title")}</div>
              <div class="border-b border-gray-200 bg-gray-100 px-3 py-2 font-semibold text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200">{t("versions.right_title")}</div>
              {#each diffRows as row, index (index)}
                <div class="grid grid-cols-[4rem_1fr] border-r border-gray-200 font-mono leading-5 dark:border-gray-800 {lineClass(row.left.kind)}">
                  <span class="select-none px-2 py-0.5 text-right {lineNumberClass(row.left.kind)}">{row.left.lineNumber ?? ""}</span>
                  <pre class="m-0 whitespace-pre-wrap break-words px-2 py-0.5 font-mono">{row.left.text}</pre>
                </div>
                <div class="grid grid-cols-[4rem_1fr] font-mono leading-5 {lineClass(row.right.kind)}">
                  <span class="select-none px-2 py-0.5 text-right {lineNumberClass(row.right.kind)}">{row.right.lineNumber ?? ""}</span>
                  <pre class="m-0 whitespace-pre-wrap break-words px-2 py-0.5 font-mono">{row.right.text}</pre>
                </div>
              {/each}
            </div>
          </div>
        {:else}
          <div class="flex h-full items-center justify-center text-sm text-gray-500 dark:text-gray-400">{t("versions.path_pending")}</div>
        {/if}
      </section>
    </div>
  </div>
{/if}
