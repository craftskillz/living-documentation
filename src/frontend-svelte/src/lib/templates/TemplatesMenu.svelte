<script lang="ts">
  import { dialogFocus } from '../dialogFocus';
  import { t } from '../i18n.svelte';
  import NewDocModal from '../home/NewDocModal.svelte';
  import { portal, templatesRequest, type TemplateLibrary } from './api';
  let open = $state(false);
  let selectedTemplate = $state<string | undefined>();
  let library = $state<TemplateLibrary>({ version: 1, folders: [] });
  let loading = $state(false);
  let error = $state('');
  let expanded = $state('');
  let query = $state('');
  const matches = $derived(library.folders.flatMap(folder => folder.templates.map(template => ({ ...template, folderName: folder.name }))).filter(template => template.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())));
  let button: HTMLButtonElement;
  let top = $state(0);
  let right = $state(0);
  async function toggle() {
    open = !open;
    if (!open) return;
    const bounds = button.getBoundingClientRect();
    top = bounds.bottom + 6; right = Math.max(8, window.innerWidth - bounds.right);
    loading = true; error = '';
    try { library = await templatesRequest<TemplateLibrary>(); }
    catch (err) { error = String(err instanceof Error ? err.message : err); }
    finally { loading = false; }
  }
</script>
<svelte:window onkeydown={(event) => { if (event.key === 'Escape') open = false; }} />
<button class="ghost-button" data-testid="templates-menu" bind:this={button} aria-haspopup="dialog" aria-expanded={open} onclick={toggle}>{t('templates.menu')}</button>
{#if open}
  <div use:portal class="template-menu-layer">
    <button class="backdrop" aria-label={t('common.close')} onclick={() => open = false}></button>
    <div class="dropdown" role="dialog" aria-label={t('templates.menu')} use:dialogFocus={() => open = false} style:top={`${top}px`} style:right={`${right}px`} data-testid="templates-dropdown">
      <label for="quick-template-search">{t('templates.search')}</label><input id="quick-template-search" type="search" bind:value={query} placeholder={t('templates.search_placeholder')} />
      {#if loading}<p>{t('common.loading')}</p>
      {:else if error}<p role="alert">{error}</p>
      {:else if !library.folders.length}<p>{t('templates.empty')}</p>
      {:else if query}
        {#each matches as template (template.id)}
          <button class="template" onclick={() => { selectedTemplate = template.id; open = false; }}>{template.name}<small>{template.folderName}</small></button>
        {:else}<p>{t('templates.no_results')}</p>{/each}
      {:else}
        {#each library.folders as folder (folder.id)}
          <button class="folder" aria-expanded={expanded === folder.id} onclick={() => expanded = expanded === folder.id ? '' : folder.id}>📁 {folder.name} <span>{expanded === folder.id ? '▾' : '▸'}</span></button>
          {#if expanded === folder.id}
            {#each folder.templates as template (template.id)}
              <button class="template" onclick={() => { selectedTemplate = template.id; open = false; }}>{template.name}</button>
            {:else}<p>{t('templates.folder_empty')}</p>{/each}
          {/if}
        {/each}
      {/if}
      <a class="manage" data-testid="manage-templates" href="/templates">{t('templates.open_library')}</a>
    </div>
  </div>
{/if}
{#if selectedTemplate}
  <div use:portal class="creation-layer">
    <NewDocModal open={true} initialTemplateId={selectedTemplate} onclose={() => selectedTemplate = undefined} onsuccess={(id) => { window.location.href = '/?doc=' + encodeURIComponent(id); }} />
  </div>
{/if}
<style>
  .template-menu-layer { position: fixed; inset: 0; z-index: 9998; }
  .backdrop { position: absolute; inset: 0; width: 100%; background: transparent; border: 0; }
  .dropdown { position: fixed; width: min(320px, calc(100vw - 16px)); max-height: 70vh; overflow: auto; background: var(--panel, white); color: var(--ink); border: 1px solid var(--line); border-radius: 12px; padding: 8px; box-shadow: 0 12px 40px #0003; }
  .dropdown button { display: block; width: 100%; text-align: left; padding: 10px; border-radius: 6px; }
  .dropdown button:hover { background: #8882; }
  .folder { font-weight: 600; } .folder span { float: right; }
  .dropdown .template { padding-left: 30px; }
  .manage { display: block; padding: 12px 10px; border-top: 1px solid var(--line); margin-top: 8px; }
  p { font-size: 13px; padding: 10px; color: var(--muted); }
  label { display:block;font-size:12px;margin:8px 6px; } input { width:100%;border:1px solid var(--line);border-radius:6px;padding:9px;background:var(--panel);color:var(--ink); } small { display:block;color:var(--muted); }
  .creation-layer { position: fixed; inset: 0; z-index: 9999; }
</style>
