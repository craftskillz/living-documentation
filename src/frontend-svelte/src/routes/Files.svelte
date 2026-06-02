<script lang="ts">
  import { onMount } from "svelte";
  import Topbar from "../lib/Topbar.svelte";
  import ConfirmDialog from "../lib/ConfirmDialog.svelte";
  import { t, loadI18n } from "../lib/i18n.svelte";

  let confirmDialog = $state<ConfirmDialog>(null!);

  interface FileEntry {
    filename: string;
    displayName: string;
    size: number;
    uploadedAt: string;
    url: string;
  }

  let files = $state<FileEntry[]>([]);
  let loading = $state(true);
  let loadError = $state("");
  let actionError = $state<Record<string, string>>({});
  let replacing = $state<Record<string, boolean>>({});
  let deleting = $state<Record<string, boolean>>({});

  const MAX_BYTES = 19 * 1024 * 1024;

  function formatSize(bytes: number): string {
    if (bytes < 1024) return t("files.size_bytes").replace("{n}", String(bytes));
    if (bytes < 1024 * 1024) return t("files.size_kb").replace("{n}", (bytes / 1024).toFixed(1));
    return t("files.size_mb").replace("{n}", (bytes / 1024 / 1024).toFixed(2));
  }

  function formatDate(iso: string): string {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  async function loadFiles() {
    loading = true;
    loadError = "";
    try {
      const res = await fetch("/api/files");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      files = Array.isArray(data.files) ? data.files : [];
    } catch (err: unknown) {
      loadError = t("files.error_load") + (err instanceof Error ? err.message : String(err));
    } finally {
      loading = false;
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

  function replaceFile(entry: FileEntry) {
    const input = document.createElement("input");
    input.type = "file";
    input.style.display = "none";
    document.body.appendChild(input);
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      input.remove();
      if (!file) return;

        const ok = await confirmDialog.show({
        kicker: t("files.confirm_replace_title"),
        title: t("files.confirm_replace_message")
          .replace("{name}", entry.displayName || entry.filename)
          .replace("{newName}", file.name),
        message: t("files.confirm_replace_detail"),
        confirmLabel: t("files.replace"),
        cancelLabel: t("common.cancel"),
        danger: true,
      });
      if (!ok) return;

      if (file.size > MAX_BYTES) {
        actionError = { ...actionError, [entry.filename]: t("files.error_replace") + `${(file.size / 1024 / 1024).toFixed(1)} MB (max 19 MB)` };
        return;
      }

      replacing = { ...replacing, [entry.filename]: true };
      actionError = { ...actionError, [entry.filename]: "" };
      try {
        const base64 = await readAsBase64(file);
        const res = await fetch(`/api/files/${encodeURIComponent(entry.filename)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: base64 }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `HTTP ${res.status}`);
        }
        await loadFiles();
      } catch (err: unknown) {
        actionError = { ...actionError, [entry.filename]: t("files.error_replace") + (err instanceof Error ? err.message : String(err)) };
      } finally {
        replacing = { ...replacing, [entry.filename]: false };
      }
    });
    input.click();
  }

  async function deleteFile(entry: FileEntry) {
    const ok = await confirmDialog.show({
      kicker: t("files.confirm_delete_title"),
      title: t("files.confirm_delete_message").replace("{name}", entry.displayName || entry.filename),
      message: t("files.confirm_delete_detail"),
      confirmLabel: t("files.delete"),
      cancelLabel: t("common.cancel"),
      danger: true,
    });
    if (!ok) return;

    deleting = { ...deleting, [entry.filename]: true };
    actionError = { ...actionError, [entry.filename]: "" };
    try {
      const res = await fetch(`/api/files/${encodeURIComponent(entry.filename)}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      await loadFiles();
    } catch (err: unknown) {
      actionError = { ...actionError, [entry.filename]: t("files.error_delete") + (err instanceof Error ? err.message : String(err)) };
    } finally {
      deleting = { ...deleting, [entry.filename]: false };
    }
  }

  onMount(async () => {
    try {
      const cfg = await fetch("/api/config").then(r => r.json());
      await loadI18n(cfg.language || "en");
    } catch { /* fallback */ }
    await loadFiles();
  });
</script>

<ConfirmDialog bind:this={confirmDialog} />

<div class="app-shell">
  <Topbar title={t("files.title")} subtitle="" />

  <div class="files-page">
    {#if loading}
      <p class="files-msg">{t("common.loading")}</p>
    {:else if loadError}
      <p class="files-msg files-msg--error">{loadError}</p>
    {:else if files.length === 0}
      <p class="files-msg files-msg--empty">{t("files.empty")}</p>
    {:else}
      <ul class="files-list">
        {#each files as entry}
          <li class="files-row">
            <span class="files-icon">📎</span>
            <div class="files-info">
              <a href={entry.url} target="_blank" rel="noopener" class="files-name">
                {entry.displayName || entry.filename}
              </a>
              <div class="files-meta">
                {#if entry.uploadedAt}{formatDate(entry.uploadedAt)} · {/if}{formatSize(entry.size || 0)}
              </div>
              {#if actionError[entry.filename]}
                <p class="files-row-error">{actionError[entry.filename]}</p>
              {/if}
            </div>
            <div class="files-actions">
              <button
                type="button"
                class="files-btn"
                disabled={replacing[entry.filename] || deleting[entry.filename]}
                onclick={() => replaceFile(entry)}
              >
                {replacing[entry.filename] ? t("files.replacing") : t("files.replace")}
              </button>
              <button
                type="button"
                class="files-btn files-btn--danger"
                disabled={replacing[entry.filename] || deleting[entry.filename]}
                onclick={() => deleteFile(entry)}
              >
                {deleting[entry.filename] ? t("files.deleting") : t("files.delete")}
              </button>
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</div>

<style>
  .files-page {
    max-width: 720px;
    margin: 0 auto;
    padding: 32px 24px;
  }

  .files-msg {
    font-size: 14px;
    color: var(--muted);
    text-align: center;
    padding: 48px 0;
  }

  .files-msg--error { color: var(--red); }
  .files-msg--empty { font-style: italic; }

  .files-list {
    list-style: none;
    padding: 0;
    margin: 0;
    border: 1px solid var(--line);
    border-radius: 12px;
    background: var(--panel);
    overflow: hidden;
  }

  .files-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 20px;
    border-bottom: 1px solid var(--line);
  }

  .files-row:last-child { border-bottom: none; }

  .files-icon {
    font-size: 18px;
    flex-shrink: 0;
  }

  .files-info {
    flex: 1;
    min-width: 0;
  }

  .files-name {
    display: block;
    font-size: 14px;
    color: var(--ink);
    text-decoration: none;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .files-name:hover { text-decoration: underline; color: var(--accent); }

  .files-meta {
    font-size: 12px;
    color: var(--muted);
    margin-top: 2px;
  }

  .files-row-error {
    font-size: 12px;
    color: var(--red);
    margin: 4px 0 0;
  }

  .files-actions {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }

  .files-btn {
    font-size: 12px;
    padding: 5px 12px;
    border-radius: 8px;
    border: 1px solid var(--line-strong);
    background: var(--panel-soft);
    color: var(--ink);
    cursor: pointer;
    transition: background 0.15s;
    font-family: inherit;
  }

  .files-btn:hover { background: var(--accent-soft); border-color: var(--accent); }
  .files-btn:disabled { opacity: 0.5; pointer-events: none; }

  .files-btn--danger {
    border-color: var(--red-soft);
    color: var(--red);
  }

  .files-btn--danger:hover { background: var(--red-soft); border-color: var(--red); }
</style>
