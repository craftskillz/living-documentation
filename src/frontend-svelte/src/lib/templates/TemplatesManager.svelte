<script lang="ts">
  import { onMount } from 'svelte';
  import { t } from '../i18n.svelte';
  import ConfirmDialog from '../ConfirmDialog.svelte';
  import { portal, templatesRequest, type TemplateLibrary, type TemplateFolder, type DocumentTemplate } from './api';
  let { onclose }: { onclose: () => void } = $props();
  let library = $state<TemplateLibrary>({ version: 1, folders: [] });
  let folderId = $state('');
  let folderName = $state('');
  let newFolder = $state('');
  let templateId = $state('');
  let name = $state('');
  let content = $state('');
  let editing = $state(false);
  let busy = $state(false);
  let error = $state('');
  let confirmDialog: ConfirmDialog;
  const folder = $derived(library.folders.find((item) => item.id === folderId));
  async function load() { library = await templatesRequest<TemplateLibrary>(); }
  async function run(action: () => Promise<void>) {
    if (busy) return;
    busy = true; error = '';
    try { await action(); } catch (err) { error = err instanceof Error ? err.message : String(err); }
    finally { busy = false; }
  }
  onMount(() => { void run(load); });
  function chooseFolder(item: TemplateFolder) { folderId = item.id; folderName = item.name; editing = false; }
  function edit(item?: DocumentTemplate) { templateId = item?.id || ''; name = item?.name || ''; content = item?.content || ''; editing = true; }
  async function remove(isFolder: boolean, item: { id: string; name: string }) {
    await run(async () => {
      const accepted = await confirmDialog.show({
        title: t(isFolder ? 'templates.delete_folder' : 'templates.delete_template'),
        message: t('templates.delete_message', { name: item.name }),
        detail: isFolder && folder?.templates.length ? t('templates.delete_folder_detail') : undefined,
        confirmLabel: t('common.remove'), cancelLabel: t('common.cancel'), danger: true,
      });
      if (!accepted) return;
      await templatesRequest(isFolder ? `/folders/${item.id}?confirm=true` : `/${item.id}`, 'DELETE');
      editing = false;
      if (isFolder) { folderId = ''; folderName = ''; }
      await load();
    });
  }
</script>
<div use:portal class="manager-layer">
  <div role="dialog" tabindex="-1" aria-modal="true" aria-label={t('templates.manage')} data-testid="templates-manager" class="manager">
    <header><h2>{t('templates.manage')}</h2><button disabled={busy} onclick={onclose} aria-label={t('common.close')}>✕</button></header>
    <fieldset disabled={busy}>
      <div class="columns">
        <aside>
          <label for="template-new-folder">{t('templates.new_folder')}</label>
          <div class="row"><input id="template-new-folder" maxlength="120" bind:value={newFolder} /><button data-testid="template-add-folder" disabled={!newFolder.trim()} onclick={() => run(async () => { const created = await templatesRequest<TemplateFolder>('/folders', 'POST', { name: newFolder }); await load(); chooseFolder(created); newFolder = ''; })}>{t('common.create')}</button></div>
          {#each library.folders as item (item.id)}
            <button class:active={folderId === item.id} class="list-item" onclick={() => chooseFolder(item)}>📁 {item.name}</button>
          {:else}<p>{t('templates.empty')}</p>{/each}
        </aside>
        <main>
          {#if folder}
            <label for="template-folder-name">{t('templates.folder')}</label>
            <div class="row"><input id="template-folder-name" maxlength="120" bind:value={folderName} /><button data-testid="template-rename-folder" disabled={!folderName.trim()} onclick={() => run(async () => { await templatesRequest(`/folders/${folderId}`, 'PUT', { name: folderName }); await load(); })}>{t('common.save')}</button><button data-testid="template-delete-folder" onclick={() => remove(true, folder!)}>{t('common.remove')}</button></div>
            <div class="row"><h3>{t('templates.menu')}</h3><button data-testid="template-new" onclick={() => edit()}>{t('templates.new_template')}</button></div>
            {#each folder.templates as item (item.id)}
              <div class="row"><button class="list-item" onclick={() => edit(item)}>{item.name}</button><button aria-label={`${t('common.remove')} ${item.name}`} onclick={() => remove(false, item)}>{t('common.remove')}</button></div>
            {:else}<p>{t('templates.folder_empty')}</p>{/each}
            {#if editing}
              <div class="editor">
                <label for="template-name">{t('templates.name')}</label><input id="template-name" maxlength="120" bind:value={name} />
                <label for="template-content">{t('templates.content')}</label><textarea id="template-content" rows="9" maxlength="1000000" bind:value={content}></textarea>
                <div class="row"><button onclick={() => editing = false}>{t('common.cancel')}</button><button class="primary-button" data-testid="template-save" disabled={!name.trim()} onclick={() => run(async () => { await templatesRequest(templateId ? `/${templateId}` : `/folders/${folderId}/templates`, templateId ? 'PUT' : 'POST', { name, content }); await load(); editing = false; })}>{t('common.save')}</button></div>
              </div>
            {/if}
          {:else}<p>{t('templates.choose_folder')}</p>{/if}
        </main>
      </div>
    </fieldset>
    {#if busy}<p>{t('common.loading')}</p>{/if}
    {#if error}<p role="alert" class="error">{error}</p>{/if}
  </div>
  <ConfirmDialog bind:this={confirmDialog} />
</div>
<style>
  .manager-layer { position: fixed; inset: 0; z-index: 9999; background: #0008; display: flex; align-items: center; justify-content: center; padding: 16px; }
  .manager { width: min(940px, 100%); max-height: 90vh; overflow: auto; border-radius: 14px; background: var(--panel, white); color: var(--ink); padding: 24px; box-shadow: 0 16px 60px #0004; }
  header, .row { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
  header { justify-content: space-between; } h2 { font-size: 20px; font-weight: 600; } h3 { flex: 1; font-weight: 600; }
  fieldset { min-width: 0; } .columns { display: grid; grid-template-columns: 260px 1fr; gap: 24px; } main { min-width: 0; }
  label { display: block; font-size: 13px; margin: 10px 0 6px; } input, textarea { width: 100%; min-width: 0; border: 1px solid var(--line); background: var(--panel); border-radius: 6px; padding: 8px; } textarea { font-family: monospace; resize: vertical; }
  button { padding: 7px 10px; border: 1px solid var(--line); border-radius: 6px; white-space: nowrap; } button:hover, .active { background: #8882; } button:disabled { opacity: .5; }
  .list-item { width: 100%; text-align: left; margin-bottom: 4px; white-space: normal; overflow-wrap: anywhere; } p { font-size: 13px; color: var(--muted); padding: 8px 0; } .error { color: #dc2626; }
  .editor { border-top: 1px solid var(--line); padding-top: 10px; } .editor .row { justify-content: flex-end; margin-top: 12px; }
  @media (max-width: 700px) { .columns { grid-template-columns: 1fr; } }
</style>
