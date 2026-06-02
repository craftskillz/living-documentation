<script lang="ts">
  import { renderMarkdownHtml } from "../md-renderer.js";

  export interface Box {
    folder: { name: string; path: string; hasChildren: boolean };
    x: number; y: number; w: number; h: number;
  }

  const BLUEPRINT_FOLDER = "000_BLUEPRINT";

  function slugifyCategory(name: string): string {
    return (
      name.normalize("NFKD").replace(/[̀-ͯ]/g, "").toUpperCase()
        .replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "FOLDER"
    );
  }

  type ModalView = "read" | "form" | "folder-confirm" | "closed";

  let view = $state<ModalView>("closed");
  let modalTitle = $state("");
  let titleValue = $state("");
  let categoryValue = $state("");
  let contentValue = $state("");
  let renderedHtml = $state("");
  let folderName = $state("");
  let currentAdrId: string | null = null;
  let currentBox: Box | null = null;

  let renderedEl = $state<HTMLElement>(null!);

  $effect(() => {
    if (view === "read" && renderedEl && renderedHtml) {
      renderMarkdownHtml(renderedHtml, renderedEl);
    }
  });

  export async function open(box: Box) {
    currentBox = box;
    currentAdrId = null;
    const category = slugifyCategory(box.folder.name);
    categoryValue = category;
    titleValue = box.folder.name;
    contentValue = "";
    renderedHtml = "";
    modalTitle = `Création d'un nouveau Blueprint — ${box.folder.name}`;
    view = "form";

    const folderRes = (await fetch("/api/blueprint/blueprint-folder").then((r) => r.json())) as {
      exists: boolean; folder: string;
    };
    if (!folderRes.exists) {
      folderName = BLUEPRINT_FOLDER;
      view = "folder-confirm";
      return;
    }

    await loadOrCreateAdr(box, category);
  }

  async function loadOrCreateAdr(box: Box, category: string) {
    const adrRes = (await fetch(
      `/api/blueprint/blueprint-adr?category=${encodeURIComponent(category)}`,
    ).then((r) => r.json())) as { found: boolean; doc?: { id: string; title: string } };

    if (adrRes.found && adrRes.doc) {
      currentAdrId = adrRes.doc.id;
      const doc = (await fetch(`/api/documents/${encodeURIComponent(adrRes.doc.id)}`).then((r) => r.json())) as {
        title: string; html: string; content: string;
      };
      titleValue = doc.title;
      contentValue = doc.content;
      modalTitle = doc.title;
      renderedHtml = doc.html;
      view = "read";
    } else {
      titleValue = box.folder.name;
      contentValue = "";
      view = "form";
    }
  }

  function close() {
    view = "closed";
    currentAdrId = null;
    currentBox = null;
  }

  async function onFolderCreate() {
    await fetch("/api/blueprint/blueprint-folder", { method: "POST" });
    if (currentBox) {
      await loadOrCreateAdr(currentBox, slugifyCategory(currentBox.folder.name));
    }
  }

  async function onSubmit(e: SubmitEvent) {
    e.preventDefault();
    const payload = {
      title: titleValue.trim() || currentBox?.folder.name || "Untitled",
      category: categoryValue,
      folder: BLUEPRINT_FOLDER,
      content: contentValue,
    };

    if (currentAdrId) {
      await fetch(`/api/documents/${encodeURIComponent(currentAdrId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const doc = (await fetch(`/api/documents/${encodeURIComponent(currentAdrId)}`).then((r) => r.json())) as {
        title: string; html: string; content: string;
      };
      modalTitle = doc.title;
      contentValue = doc.content;
      renderedHtml = doc.html;
      view = "read";
    } else {
      const res = (await fetch("/api/documents/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then((r) => r.json())) as { id: string; title: string };
      currentAdrId = res.id;
      const doc = (await fetch(`/api/documents/${encodeURIComponent(res.id)}`).then((r) => r.json())) as {
        title: string; html: string; content: string;
      };
      modalTitle = doc.title;
      contentValue = doc.content;
      renderedHtml = doc.html;
      view = "read";
    }
  }
</script>

{#if view !== "closed"}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="bpadr-overlay" onclick={(e) => { if (e.target === e.currentTarget) close(); }}>
    <div class="bpadr-modal">
      <header class="bpadr-header">
        <h2 class="bpadr-title">{modalTitle}</h2>
        <div class="bpadr-header-actions">
          {#if view === "read"}
            <button class="bpadr-icon-btn" type="button" title="Edit" onclick={() => (view = "form")}>✏️</button>
          {/if}
          <button class="bpadr-icon-btn" type="button" title="Close" onclick={close}>×</button>
        </div>
      </header>

      {#if view === "read"}
        <div class="bpadr-read">
          <div
            bind:this={renderedEl}
            class="prose prose-gray max-w-none prose-headings:scroll-mt-4 prose-a:text-blue-600 prose-code:before:content-none prose-code:after:content-none prose-pre:bg-[#0d1117] prose-pre:border prose-pre:border-gray-700"
          ></div>
        </div>

      {:else if view === "form"}
        <form class="bpadr-form" onsubmit={onSubmit}>
          <input type="hidden" name="category" value={categoryValue} />
          <input type="hidden" name="folder" value={BLUEPRINT_FOLDER} />
          <div class="bpadr-field">
            <label for="adr-title">Title</label>
            <input id="adr-title" type="text" class="bpadr-input" bind:value={titleValue} />
          </div>
          <div class="bpadr-field bpadr-field-grow">
            <label for="adr-content">Content (Markdown)</label>
            <textarea id="adr-content" class="bpadr-textarea" bind:value={contentValue}></textarea>
          </div>
          <footer class="bpadr-footer">
            <button
              type="button"
              class="bpadr-btn-ghost"
              onclick={() => { if (currentAdrId) view = "read"; else close(); }}
            >Cancel</button>
            <button type="submit" class="bpadr-btn-primary">Save</button>
          </footer>
        </form>

      {:else if view === "folder-confirm"}
        <div class="bpadr-folder-confirm">
          <p>The folder <strong>{folderName}</strong> does not exist yet.</p>
          <p class="bpadr-muted">Create it to store Blueprint ADRs?</p>
          <footer class="bpadr-footer">
            <button type="button" class="bpadr-btn-ghost" onclick={close}>Cancel</button>
            <button type="button" class="bpadr-btn-primary" onclick={onFolderCreate}>Create folder</button>
          </footer>
        </div>
      {/if}
    </div>
  </div>
{/if}
