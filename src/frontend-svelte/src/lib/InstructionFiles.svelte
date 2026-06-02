<script lang="ts">
  import { t } from "./i18n.svelte";

  interface InstructionItem {
    path: string;
    root: string;
    type: string;
    size: number | null;
    exists: boolean;
  }

  interface BrowseEntry { name: string; path: string; }

  let {
    items = $bindable([]),
    onAdd,
    onRemove,
  }: {
    items: InstructionItem[];
    onAdd: (filePath: string) => Promise<void>;
    onRemove: (filename: string) => Promise<void>;
  } = $props();

  let showBrowser = $state(false);
  let browseCurrent = $state("");
  let browseParent = $state("");
  let browseDirs = $state<BrowseEntry[]>([]);
  let browseFiles = $state<BrowseEntry[]>([]);
  let browseLoading = $state(false);
  let browseError = $state(false);

  let instructionNames = $derived(new Set(items.map(i => basename(i.path))));

  function basename(value: string) {
    return (String(value || "").split(/[/\\]/).pop()) || "";
  }

  function documentHref(docPath: string) {
    const docId = encodeURIComponent(String(docPath || "").replace(/\.md$/i, ""));
    return "/?doc=" + encodeURIComponent(docId);
  }

  function rootLabel(value: string) { return t(`context.root.${value}`); }
  function typeLabel(value: string) { return t(`context.type.${value}`); }

  async function loadBrowse(dirPath: string) {
    browseLoading = true;
    browseError = false;
    try {
      const data = await fetch("/api/browse?path=" + encodeURIComponent(dirPath)).then(r => r.json());
      browseCurrent = data.current;
      browseParent = data.parent || "";
      browseDirs = data.dirs || [];
      browseFiles = data.files || [];
    } catch {
      browseError = true;
    } finally {
      browseLoading = false;
    }
  }

  async function toggleBrowser() {
    showBrowser = !showBrowser;
    if (showBrowser && !browseCurrent) {
      const cfgRes = await fetch("/api/context/orientation").then(r => r.json()).catch(() => ({}));
      await loadBrowse(cfgRes.sourceRoot || "");
    }
  }

  async function handleAdd(filePath: string) {
    await onAdd(filePath);
    if (showBrowser && browseCurrent) await loadBrowse(browseCurrent);
  }
</script>

<div class="section-card">
  <div class="section-header">
    <span class="section-title">{t("context.instructions_title")}</span>
    <div class="header-actions">
      <span class="count-label">{items.filter(i => i.exists).length}/{items.length}</span>
      <button class="secondary-button btn-sm" onclick={toggleBrowser}>
        {showBrowser ? t("context.hide_instruction_browser") : t("context.add_instruction_file")}
      </button>
    </div>
  </div>

  {#if showBrowser}
    <div class="file-browser">
      <div class="file-browser-toolbar">
        <button
          class="link-btn"
          disabled={!browseParent}
          onclick={() => browseParent && loadBrowse(browseParent)}
        >{t("common.up")}</button>
        <span class="file-browser-path">{browseCurrent}</span>
      </div>
      <div class="file-browser-list">
        {#if browseLoading}
          <p class="browser-msg">{t("common.loading")}</p>
        {:else if browseError}
          <p class="browser-msg browser-msg--error">{t("common.cannot_read_dir")}</p>
        {:else if !browseDirs.length && !browseFiles.length}
          <p class="browser-msg">{t("common.empty_dir")}</p>
        {:else}
          {#each browseDirs as dir}
            <button class="browser-row browser-row--dir" onclick={() => loadBrowse(dir.path)}>
              <span class="browser-row-name">📁 {dir.name}</span>
            </button>
          {/each}
          {#each browseFiles as file}
            <div class="browser-row browser-row--file">
              <span class="browser-row-name">📄 {file.name}</span>
              {#if instructionNames.has(file.name)}
                <span class="badge-added">{t("context.added")}</span>
              {:else}
                <button class="link-btn" onclick={() => handleAdd(file.path)}>{t("context.add_file_action")}</button>
              {/if}
            </div>
          {/each}
        {/if}
      </div>
    </div>
  {/if}

  <div class="instruction-list">
    {#if !items.length}
      <p class="empty-msg">{t("context.no_instructions")}</p>
    {:else}
      {#each items as item}
        <div class="instruction-row">
          <div class="instruction-info">
            <a href={documentHref(item.path)} class="instruction-path">{item.path}</a>
            <div class="instruction-meta">
              {rootLabel(item.root)} · {typeLabel(item.type)}
              {#if item.size !== null} · {Math.round(item.size / 1024)} KB{/if}
            </div>
          </div>
          <div class="instruction-actions">
            <span class={item.exists ? "status-ok" : "status-missing"}>
              {item.exists ? t("context.exists") : t("context.missing")}
            </span>
            {#if item.exists}
              <button class="remove-btn" onclick={() => onRemove(basename(item.path))}>
                {t("common.remove")}
              </button>
            {/if}
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .section-card {
    border: 1px solid var(--line);
    border-radius: 12px;
    background: var(--panel);
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .section-title { font-size: 13px; font-weight: 600; color: var(--ink); }
  .header-actions { display: flex; align-items: center; gap: 8px; }
  .count-label { font-size: 12px; color: var(--muted); }
  .instruction-list { display: flex; flex-direction: column; gap: 8px; }
  .instruction-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 8px 12px;
  }
  .instruction-info { min-width: 0; }
  .instruction-path {
    font-family: monospace;
    font-size: 11px;
    word-break: break-all;
    color: var(--accent);
    text-decoration: none;
  }
  .instruction-path:hover { text-decoration: underline; }
  .instruction-meta { font-size: 11px; color: var(--muted); margin-top: 2px; }
  .instruction-actions { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
  .status-ok { font-size: 12px; font-weight: 600; color: var(--green); }
  .status-missing { font-size: 12px; font-weight: 600; color: var(--red); }
  .empty-msg { font-size: 13px; color: var(--muted); margin: 0; }
</style>
