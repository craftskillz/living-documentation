<script lang="ts">
  import "../filePreview.css";
  import { t } from "../i18n.svelte";
  import type { OpenedFile } from "./types";

  interface Hljs {
    highlightElement: (el: HTMLElement) => void;
    lineNumbersBlock?: (el: HTMLElement) => void;
  }

  let { file }: { file: OpenedFile } = $props();

  let code = $state<HTMLElement>();

  // highlight.js rewrites the element: the key below gives each file a fresh one.
  $effect(() => {
    const hljs = (window as unknown as { hljs?: Hljs }).hljs;
    if (!code || !hljs) return;
    hljs.highlightElement(code);
    hljs.lineNumbersBlock?.(code);
  });
</script>

<section class="other-file-viewer" data-testid="other-file-viewer">
  {#key file}
    <div class="file-preview">
      <p class="file-preview-name">{file.name}</p>
      {#if file.preview.type === "image"}
        <img src={file.preview.url} alt={file.name} />
      {:else if file.preview.type === "video"}
        <!-- svelte-ignore a11y_media_has_caption -->
        <video src={file.preview.url} controls></video>
      {:else}
        {#if file.preview.truncated}
          <span class="file-preview-truncated">{t("other_files.truncated")}</span>
        {/if}
        <pre><code bind:this={code} class={file.preview.language && file.preview.language !== "plaintext" ? `language-${file.preview.language}` : ""}>{file.preview.content}</code></pre>
      {/if}
    </div>
  {/key}
</section>

<style>
  /* The Blueprint panel: dark whatever the page theme, like the code blocks. */
  .other-file-viewer {
    min-height: 100%;
    background: #0f172a;
    color: #c9d1d9;
  }
  .other-file-viewer :global(.file-preview img) {
    max-height: 80vh;
  }
  /* The light code theme writes dark text: follow it, as the documents do. */
  :global(html:not(.dark) body.ld-code-light) .other-file-viewer {
    background: #ffffff;
    color: #24292e;
  }
</style>
