<script lang="ts">
  import { t } from "../i18n.svelte";

  let {
    onclose,
    onnavigate,
  }: {
    onclose: () => void;
    onnavigate: (path: string) => void;
  } = $props();

  interface ExplorerData {
    folders: string[];
    files: string[];
  }

  interface FileContent {
    type: "text" | "image" | "video" | "binary";
    content?: string;
    language?: string;
    truncated?: boolean;
    url?: string;
  }

  let currentPath = $state("");
  let folders = $state<string[]>([]);
  let files = $state<string[]>([]);
  let loading = $state(false);
  let error = $state(false);

  type PreviewState =
    | { status: "idle" }
    | { status: "loading"; name: string }
    | { status: "error"; name: string }
    | { status: "image"; name: string; url: string }
    | { status: "video"; name: string; url: string }
    | { status: "binary"; name: string }
    | { status: "text"; name: string; content: string; language?: string; truncated?: boolean };

  let preview = $state<PreviewState>({ status: "idle" });

  function breadcrumbParts(path: string) {
    if (!path) return [];
    return path.split("/").map((part, i, arr) => ({
      name: part,
      path: arr.slice(0, i + 1).join("/"),
      isLast: i === arr.length - 1,
    }));
  }

  export async function open(folderPath: string) {
    currentPath = folderPath;
    preview = { status: "idle" };
    await populate(folderPath);
  }

  async function populate(folderPath: string) {
    currentPath = folderPath;
    loading = true;
    error = false;
    try {
      const data = (await fetch(
        `/api/blueprint/files?path=${encodeURIComponent(folderPath)}`,
      ).then((r) => r.json())) as ExplorerData;
      folders = data.folders;
      files = data.files;
    } catch {
      error = true;
      folders = [];
      files = [];
    } finally {
      loading = false;
    }
  }

  async function navigateTo(path: string) {
    onnavigate(path);
    await populate(path);
  }

  async function showFilePreview(filePath: string, fileName: string) {
    preview = { status: "loading", name: fileName };
    try {
      const data = (await fetch(
        `/api/blueprint/file-content?path=${encodeURIComponent(filePath)}`,
      ).then((r) => r.json())) as FileContent;

      if (data.type === "image") {
        preview = { status: "image", name: fileName, url: data.url! };
      } else if (data.type === "video") {
        preview = { status: "video", name: fileName, url: data.url! };
      } else if (data.type === "binary") {
        preview = { status: "binary", name: fileName };
      } else if (data.type === "text" && data.content !== undefined) {
        preview = {
          status: "text",
          name: fileName,
          content: data.content,
          language: data.language,
          truncated: data.truncated,
        };
        // highlight after DOM update
        setTimeout(() => {
          const code = document.querySelector(".file-preview code") as HTMLElement;
          // @ts-ignore
          if (code && window.hljs) {
            // @ts-ignore
            window.hljs.highlightElement(code);
            // @ts-ignore
            if (window.hljs.lineNumbersBlock) window.hljs.lineNumbersBlock(code);
          }
        }, 0);
      }
    } catch {
      preview = { status: "error", name: fileName };
    }
  }

  function childPath(name: string) {
    return currentPath ? `${currentPath}/${name}` : name;
  }
</script>

<aside class="file-explorer">
  <header class="explorer-header">
    <div class="explorer-breadcrumb">
      {#if currentPath}
        <button class="explorer-breadcrumb-item" type="button" onclick={() => navigateTo("")}>~</button>
      {:else}
        <span class="explorer-breadcrumb-item current">~</span>
      {/if}
      {#each breadcrumbParts(currentPath) as part}
        <span class="explorer-breadcrumb-sep">/</span>
        {#if part.isLast}
          <span class="explorer-breadcrumb-item current">{part.name}</span>
        {:else}
          <button class="explorer-breadcrumb-item" type="button" onclick={() => navigateTo(part.path)}>{part.name}</button>
        {/if}
      {/each}
    </div>
    <button class="explorer-close" type="button" onclick={onclose}>×</button>
  </header>

  <div class="explorer-top">
    <div class="explorer-list">
      {#if loading}
        <div class="explorer-section-label">{t("blueprint.explorer.loading")}</div>
      {:else if error}
        <div class="explorer-section-label">{t("blueprint.explorer.error")}</div>
      {:else if folders.length === 0 && files.length === 0}
        <div class="explorer-section-label">{t("blueprint.explorer.empty")}</div>
      {:else}
        {#if folders.length}
          <div class="explorer-section-label">{t("blueprint.explorer.folders")}</div>
          {#each folders as name}
            <button
              class="explorer-item is-folder"
              type="button"
              onclick={() => navigateTo(childPath(name))}
            >
              <span class="explorer-item-icon">📁</span>
              <span class="explorer-item-name">{name}</span>
            </button>
          {/each}
        {/if}
        {#if files.length}
          <div class="explorer-section-label">{t("blueprint.explorer.files")}</div>
          {#each files as name}
            <button
              class="explorer-item is-file"
              type="button"
              onclick={() => showFilePreview(childPath(name), name)}
            >
              <span class="explorer-item-icon">📄</span>
              <span class="explorer-item-name">{name}</span>
            </button>
          {/each}
        {/if}
      {/if}
    </div>
  </div>

  <div class="explorer-divider"></div>

  <div class="explorer-bottom">
    <div class="file-preview">
      {#if preview.status === "idle"}
        <p class="file-preview-placeholder">{t("blueprint.preview.placeholder")}</p>
      {:else if preview.status === "loading"}
        <p class="file-preview-name">{preview.name}</p>
        <p class="file-preview-placeholder">{t("blueprint.preview.loading")}</p>
      {:else if preview.status === "error"}
        <p class="file-preview-name">{preview.name}</p>
        <p class="file-preview-placeholder">{t("blueprint.preview.error")}</p>
      {:else if preview.status === "binary"}
        <p class="file-preview-name">{preview.name}</p>
        <span class="file-preview-binary">{t("blueprint.preview.binary")}</span>
      {:else if preview.status === "image"}
        <p class="file-preview-name">{preview.name}</p>
        <img src={preview.url} alt={preview.name} />
      {:else if preview.status === "video"}
        <p class="file-preview-name">{preview.name}</p>
        <!-- svelte-ignore a11y_media_has_caption -->
        <video src={preview.url} controls></video>
      {:else if preview.status === "text"}
        <p class="file-preview-name">{preview.name}</p>
        {#if preview.truncated}
          <span class="file-preview-truncated">{t("blueprint.preview.truncated")}</span>
        {/if}
        <pre><code class={preview.language && preview.language !== "plaintext" ? `language-${preview.language}` : ""}>{preview.content}</code></pre>
      {/if}
    </div>
  </div>
</aside>
