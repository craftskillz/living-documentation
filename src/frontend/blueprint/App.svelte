<script lang="ts">
  import BlueprintCanvas from "./BlueprintCanvas.svelte";
  import FileExplorer from "./FileExplorer.svelte";
  import AdrModal from "./AdrModal.svelte";
  import type { Box, BreadcrumbEntry } from "./BlueprintCanvas.svelte";

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
    await explorer.open(box.folder.path);
  }

  function closeExplorer() {
    activeExplorerPath = null;
  }

  async function onNavigate(path: string) {
    await canvas.navigateToFolder(path);
  }
</script>

<main class="app-shell">
  <header class="topbar">
    <div class="brand-lockup">
      <span class="brand-mark">LD</span>
      <div>
        <h1>Blueprint</h1>
        <p>Source folder explorer</p>
      </div>
    </div>

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

    <div class="topbar-right">
      <a href="/workspace" class="ghost-button">Workspace</a>
      <a href="/" class="ghost-button">Home</a>
    </div>
  </header>

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
</main>

<AdrModal bind:this={modal} />
