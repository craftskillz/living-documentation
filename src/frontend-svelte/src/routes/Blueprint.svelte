<script lang="ts">
  import { tick, onMount } from "svelte";
  import Topbar from "../lib/Topbar.svelte";
  import { t, loadI18n } from "../lib/i18n.svelte";

  onMount(async () => {
    try {
      const cfg = await fetch("/api/config").then(r => r.json());
      await loadI18n(cfg.language || "en");
    } catch { /* fallback to keys */ }
  });
  import "../lib/blueprint/styles.css";
  import BlueprintCanvas from "../lib/blueprint/BlueprintCanvas.svelte";
  import FileExplorer from "../lib/blueprint/FileExplorer.svelte";
  import AdrModal from "../lib/blueprint/AdrModal.svelte";
  import type { Box, BreadcrumbEntry } from "../lib/blueprint/BlueprintCanvas.svelte";

  let breadcrumb = $state<BreadcrumbEntry[]>([]);
  let activeExplorerPath = $state<string | null>(null);

  let canvas = $state<BlueprintCanvas>(null!);
  let explorer = $state<FileExplorer>(null!);
  let modal = $state<AdrModal>(null!);

  function onBreadcrumbNavigate(path: string) {
    closeExplorer();
    canvas.loadPath(path, true);
  }

  async function openExplorer(box: Box) {
    activeExplorerPath = box.folder.path;
    await tick();
    await explorer.open(box.folder.path);
  }

  function closeExplorer() {
    activeExplorerPath = null;
  }

  async function onNavigate(path: string) {
    await canvas.navigateToFolder(path);
  }
</script>

<div class="app-shell">
  <Topbar title="Blueprint" subtitle={t("blueprint.subtitle")}>
    <nav class="breadcrumb">
      {#each breadcrumb as entry, i}
        {#if i > 0}<span class="breadcrumb-sep">›</span>{/if}
        {#if i === breadcrumb.length - 1}
          <span class="breadcrumb-item current">{entry.name}</span>
        {:else}
          <button class="breadcrumb-item" type="button" onclick={() => onBreadcrumbNavigate(entry.path)}>
            {entry.name}
          </button>
        {/if}
      {/each}
    </nav>
  </Topbar>

  <section class="workspace-shell">
    <BlueprintCanvas
      bind:this={canvas}
      {activeExplorerPath}
      onbreadcrumbchange={(entries) => (breadcrumb = entries)}
      onopenexplorer={openExplorer}
      onclosefilerexplorer={closeExplorer}
      onopenAdr={(box) => modal.open(box)}
    />

    {#if activeExplorerPath !== null}
      <FileExplorer
        bind:this={explorer}
        onclose={closeExplorer}
        onnavigate={onNavigate}
      />
    {/if}
  </section>
</div>

<AdrModal bind:this={modal} />
