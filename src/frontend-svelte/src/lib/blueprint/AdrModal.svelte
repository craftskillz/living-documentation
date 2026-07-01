<script lang="ts">
  import { t } from "../i18n.svelte";
  import EditableMarkdown from "../home/EditableMarkdown.svelte";
  import SnippetsModal from "../home/SnippetsModal.svelte";

  export interface Box {
    folder: { name: string; path: string; hasChildren: boolean };
    x: number; y: number; w: number; h: number;
  }

  // Fired after the blueprint document set changes (created or deleted) so the
  // host can refresh the canvas (the block's "D" badge flips green ⇄ purple+).
  let { onchanged = () => {} }: { onchanged?: () => void } = $props();

  const BLUEPRINT_FOLDER = "001_BLUEPRINT";

  function slugifyCategory(name: string): string {
    return (
      name.normalize("NFKD").replace(/[̀-ͯ]/g, "").toUpperCase()
        .replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "FOLDER"
    );
  }

  function modalFolderPath(box: Box): string {
    const raw = box.folder.path || box.folder.name;
    const clean = raw.replace(/^\/+|\/+$/g, "");
    return `/${clean || box.folder.name}`;
  }

  // "doc" shows the reused EditableMarkdown body (read + inline + snippets + edit
  // mode), giving blueprint documents the same editing experience as Home.
  type ModalView = "doc" | "form" | "folder-confirm" | "closed";

  let view = $state<ModalView>("closed");
  let modalTitle = $state("");
  let titleValue = $state("");
  let categoryValue = $state("");
  let contentValue = $state("");
  let docContent = $state("");
  let docHtml = $state("");
  let folderName = $state("");
  let folderPathTitle = $state("");
  let currentAdrId = $state<string | null>(null);
  let currentBox = $state<Box | null>(null);

  // EditableMarkdown wiring
  let editable = $state<EditableMarkdown>(null!);
  let editing = $state(false);
  let saveMsg = $state<{ text: string; cls: string } | null>(null);

  // Creation form: snippets insert into the raw textarea (no rendered body yet).
  let formEditorEl = $state<HTMLTextAreaElement>(null!);
  let formSnippetsOpen = $state(false);

  let confirmingDelete = $state(false);
  let copiedId = $state(false);

  export async function open(box: Box) {
    currentBox = box;
    currentAdrId = null;
    editing = false;
    saveMsg = null;
    const category = slugifyCategory(box.folder.name);
    categoryValue = category;
    titleValue = box.folder.name;
    contentValue = "";
    docContent = "";
    docHtml = "";
    folderPathTitle = modalFolderPath(box);
    modalTitle = t("blueprint.adr.new_title", { folder: box.folder.name });
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

  async function fetchDoc(id: string): Promise<{ title: string; html: string; content: string }> {
    return fetch(`/api/documents/${encodeURIComponent(id)}`).then((r) => r.json());
  }

  async function loadOrCreateAdr(box: Box, category: string) {
    const adrRes = (await fetch(
      `/api/blueprint/blueprint-adr?category=${encodeURIComponent(category)}`,
    ).then((r) => r.json())) as { found: boolean; doc?: { id: string; title: string } };

    if (adrRes.found && adrRes.doc) {
      currentAdrId = adrRes.doc.id;
      const doc = await fetchDoc(adrRes.doc.id);
      titleValue = doc.title;
      docContent = doc.content;
      docHtml = doc.html;
      modalTitle = doc.title;
      editing = false;
      view = "doc";
    } else {
      titleValue = box.folder.name;
      contentValue = "";
      view = "form";
    }
  }

  function close() {
    view = "closed";
    editing = false;
    currentAdrId = null;
    currentBox = null;
    folderPathTitle = "";
    copiedId = false;
  }

  async function copyMcpId() {
    if (!currentAdrId) return;
    try {
      await navigator.clipboard.writeText(decodeURIComponent(currentAdrId));
      copiedId = true;
      setTimeout(() => (copiedId = false), 1800);
    } catch {}
  }

  async function onFolderCreate() {
    await fetch("/api/blueprint/blueprint-folder", { method: "POST" });
    if (currentBox) {
      await loadOrCreateAdr(currentBox, slugifyCategory(currentBox.folder.name));
    }
  }

  // onsave for EditableMarkdown: persist the new content, then refresh the
  // rendered html so the body re-wires with the saved state.
  async function saveDoc(newContent: string): Promise<void> {
    if (!currentAdrId) return;
    await fetch(`/api/documents/${encodeURIComponent(currentAdrId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: titleValue.trim() || currentBox?.folder.name || t("common.untitled"),
        category: categoryValue,
        folder: BLUEPRINT_FOLDER,
        content: newContent,
      }),
    });
    const doc = await fetchDoc(currentAdrId);
    modalTitle = doc.title;
    docContent = doc.content;
    docHtml = doc.html;
  }

  // Creation form submit: create the doc then switch to the editable doc view.
  async function onSubmit(e: SubmitEvent) {
    e.preventDefault();
    const payload = {
      title: titleValue.trim() || currentBox?.folder.name || t("common.untitled"),
      category: categoryValue,
      folder: BLUEPRINT_FOLDER,
    };

    const res = (await fetch("/api/documents/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then((r) => r.json())) as { id: string; title: string };
    currentAdrId = res.id;
    const doc = await fetchDoc(res.id);
    modalTitle = doc.title;
    docContent = doc.content;
    docHtml = doc.html;
    editing = false;
    view = "doc";
    onchanged();
  }

  // Delete the blueprint document (read mode), after confirmation.
  async function onDelete() {
    confirmingDelete = false;
    if (!currentAdrId) return;
    await fetch(`/api/documents/${encodeURIComponent(currentAdrId)}`, { method: "DELETE" });
    close();
    onchanged();
  }
</script>

{#if view !== "closed"}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="bpadr-overlay" onclick={(e) => { if (e.target === e.currentTarget) close(); }}>
    <div class="bpadr-modal">
      <header class="bpadr-header">
        <div class="bpadr-title-row">
          <h2 class="bpadr-title">
            {#if folderPathTitle}
              <span>{t("blueprint.adr.folder_title")}</span>
              <code>{folderPathTitle}</code>
            {:else}
              {modalTitle}
            {/if}
          </h2>
          {#if currentAdrId}
            <button
              type="button"
              data-testid="bp-copy-doc-id"
              onclick={copyMcpId}
              title={t("doc.copy_mcp_id")}
              class="bpadr-copy-btn {copiedId ? 'copied' : ''}"
            >
              <i class="fa-{copiedId ? 'solid fa-check' : 'regular fa-copy'}" aria-hidden="true"></i>
            </button>
          {/if}
        </div>
        <div class="bpadr-header-actions">
          {#if view === "doc" && !editing}
            <button class="bpadr-icon-btn" data-testid="bp-edit" type="button" title={t("doc.edit")} onclick={() => editable.enterEdit()}>✏️</button>
            <button class="bpadr-icon-btn" data-testid="bp-delete" type="button" title={t("doc.delete")} onclick={() => (confirmingDelete = true)}>🗑️</button>
          {/if}
          <button class="bpadr-icon-btn" type="button" title="Close" onclick={close}>×</button>
        </div>
      </header>

      {#if view === "doc"}
        <div class="bpadr-read">
          <EditableMarkdown
            bind:this={editable}
            bind:editing
            bind:saveMsg
            docId={currentAdrId ?? ""}
            content={docContent}
            html={docHtml}
            onsave={saveDoc}
          />
        </div>
        {#if editing}
          <!-- Edit controls aligned with the creation form: labelled buttons in a footer. -->
          <footer class="bpadr-footer bpadr-doc-footer">
            {#if saveMsg}<span class="text-xs {saveMsg.cls}">{saveMsg.text}</span>{/if}
            <button type="button" class="bpadr-btn-ghost" data-testid="bp-cancel" onclick={() => editable.cancelEdit()}>{t("common.cancel")}</button>
            <button type="button" class="bpadr-btn-ghost" data-testid="bp-snippets" onclick={() => editable.openSnippets()}>{t("doc.snippets_btn")}</button>
            <button type="button" class="bpadr-btn-primary" data-testid="bp-save" onclick={() => editable.save()}>{t("common.save")}</button>
          </footer>
        {/if}

      {:else if view === "form"}
        <form class="bpadr-form" onsubmit={onSubmit}>
          <input type="hidden" name="category" value={categoryValue} />
          <input type="hidden" name="folder" value={BLUEPRINT_FOLDER} />
          <div class="bpadr-field">
            <label for="adr-title">{t("blueprint.adr.title_label")}</label>
            <input id="adr-title" type="text" class="bpadr-input" bind:value={titleValue} />
          </div>
          <div class="bpadr-field bpadr-field-grow">
            <label for="adr-content">{t("blueprint.adr.content_label")}</label>
            <textarea id="adr-content" bind:this={formEditorEl} class="bpadr-textarea" bind:value={contentValue}></textarea>
          </div>
          <footer class="bpadr-footer">
            <button
              type="button"
              class="bpadr-btn-ghost"
              onclick={() => { if (currentAdrId) view = "doc"; else close(); }}
            >{t("common.cancel")}</button>
            <button
              type="button"
              data-testid="bp-form-snippets"
              class="bpadr-btn-ghost"
              onclick={() => (formSnippetsOpen = true)}
            >{t("doc.snippets_btn")}</button>
            <button type="submit" class="bpadr-btn-primary">{t("common.save")}</button>
          </footer>
        </form>

        <SnippetsModal
          open={formSnippetsOpen}
          editor={formEditorEl}
          mode="insert"
          content={contentValue}
          onclose={() => (formSnippetsOpen = false)}
        />

      {:else if view === "folder-confirm"}
        <div class="bpadr-folder-confirm">
          <p>{@html t("blueprint.adr.folder_missing", { name: folderName })}</p>
          <p class="bpadr-muted">{t("blueprint.adr.folder_create_prompt")}</p>
          <footer class="bpadr-footer">
            <button type="button" class="bpadr-btn-ghost" onclick={close}>{t("common.cancel")}</button>
            <button type="button" class="bpadr-btn-primary" onclick={onFolderCreate}>{t("blueprint.adr.create_folder_btn")}</button>
          </footer>
        </div>
      {/if}
    </div>
  </div>
{/if}

{#if confirmingDelete}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onclick={(e) => { if (e.target === e.currentTarget) confirmingDelete = false; }}>
    <div class="w-full max-w-sm bg-white dark:bg-gray-900 border border-red-200 dark:border-red-700 rounded-xl shadow-2xl p-5 flex flex-col gap-3">
      <p class="text-sm text-gray-700 dark:text-gray-200">{t("doc.confirm_delete")}</p>
      <p class="text-xs text-gray-500 dark:text-gray-400 italic truncate">{modalTitle}</p>
      <div class="flex justify-end gap-2 mt-2">
        <button type="button" data-testid="bp-delete-cancel" onclick={() => (confirmingDelete = false)} class="text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">{t("common.cancel")}</button>
        <button type="button" data-testid="bp-delete-confirm" onclick={onDelete} class="text-sm px-4 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold transition-colors">{t("doc.confirm_delete_btn")}</button>
      </div>
    </div>
  </div>
{/if}
