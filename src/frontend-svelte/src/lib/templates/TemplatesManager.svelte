<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { t } from '../i18n.svelte';
  import ConfirmDialog from '../ConfirmDialog.svelte';
  import NewDocModal from '../home/NewDocModal.svelte';
  import MarkdownPreview from './MarkdownPreview.svelte';
  import { setNavigationGuard } from '../navigationGuard';
  import { createTemplatesClient, type TemplateLibrary, type TemplateFolder, type DocumentTemplate } from './api';

  const request = createTemplatesClient();
  let library = $state<TemplateLibrary>({ version: 1, folders: [] });
  let ready = $state(false);
  let busy = $state(false);
  let error = $state('');
  let notice = $state('');
  let query = $state('');
  let folderId = $state('');
  let selectedId = $state('');
  let editing = $state(false);
  let draftId = $state('');
  let name = $state('');
  let content = $state('');
  let destination = $state('');
  let original = $state('');
  let nameError = $state('');
  let folderForm = $state<'new' | 'rename' | null>(null);
  let folderName = $state('');
  let folderOriginal = $state('');
  let folderError = $state('');
  let sourceView = $state(false);
  let previewExpanded = $state(false);
  let detailOpen = $state(false);
  let creationId = $state<string | undefined>();
  let confirmDialog: ConfirmDialog;

  const entries = $derived(library.folders.flatMap((folder) => folder.templates.map((template) => ({ ...template, folderId: folder.id, folderName: folder.name }))));
  const folder = $derived(library.folders.find((item) => item.id === folderId));
  const selected = $derived(entries.find((item) => item.id === selectedId));
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
  const filtered = $derived(entries.filter((item) => (!folderId || item.folderId === folderId) && normalize(item.name + ' ' + item.content).includes(normalize(query))));
  const draftSnapshot = () => JSON.stringify([name, content, destination]);
  const dirty = $derived((editing && draftSnapshot() !== original) || (folderForm !== null && folderName !== folderOriginal));

  async function allowLeave() {
    if (busy) return false;
    if (!dirty) return true;
    const discard = await confirmDialog.show({ title: t('templates.unsaved_title'), message: t('templates.unsaved_message'), confirmLabel: t('templates.discard'), cancelLabel: t('templates.keep_editing'), danger: true });
    if (discard) { editing = false; folderForm = null; }
    return discard;
  }
  async function change(action: () => void | Promise<void>) {
    if (!(await allowLeave())) return;
    editing = false; folderForm = null; error = ''; notice = '';
    await action();
  }
  async function load() {
    library = await request<TemplateLibrary>();
    ready = true;
    if (folderId && !library.folders.some((item) => item.id === folderId)) folderId = '';
    if (!entries.some((item) => item.id === selectedId)) selectedId = entries[0]?.id || '';
  }
  async function run(action: () => Promise<void>) {
    if (busy) return;
    busy = true; error = ''; notice = '';
    try { await action(); } catch (err) { error = err instanceof Error ? err.message : t('templates.errors.storage_error'); }
    finally { busy = false; }
  }
  const reload = () => change(() => run(load));
  onMount(() => {
    void run(load);
    return setNavigationGuard(allowLeave);
  });
  function beforeUnload(event: BeforeUnloadEvent) {
    if (dirty || busy) { event.preventDefault(); event.returnValue = ''; }
  }
  async function chooseFolder(id: string) {
    await change(() => { folderId = id; detailOpen = false; selectedId = entries.find((item) => !id || item.folderId === id)?.id || ''; });
  }
  async function chooseTemplate(id: string) {
    await change(() => { selectedId = id; detailOpen = true; sourceView = false; });
  }
  async function edit(item?: typeof selected, duplicate = false) {
    await change(async () => {
      draftId = duplicate ? '' : item?.id || '';
      destination = item?.folderId || folderId || library.folders[0]?.id || '';
      name = item?.name || '';
      if (duplicate && item) {
        const base = t('templates.copy_name', { name: item.name });
        name = base; let suffix = 2;
        while (entries.some((entry) => entry.folderId === destination && entry.name.toLocaleLowerCase() === name.toLocaleLowerCase())) name = `${base} ${suffix++}`;
      }
      content = item?.content || '';
      original = duplicate ? '' : draftSnapshot();
      nameError = ''; editing = true; detailOpen = true;
      await tick(); document.getElementById('template-name')?.focus();
    });
  }
  async function save() {
    nameError = '';
    if (!name.trim() || name.trim().length > 120) { nameError = t('templates.errors.invalid_name'); return; }
    if (entries.some((entry) => entry.id !== draftId && entry.folderId === destination && entry.name.toLocaleLowerCase() === name.trim().toLocaleLowerCase())) { nameError = t('templates.errors.duplicate_name'); return; }
    await run(async () => {
      const saved = await request<DocumentTemplate>(draftId ? `/${draftId}` : `/folders/${destination}/templates`, draftId ? 'PUT' : 'POST', { name, content, folderId: destination });
      // Apply the successful response locally: a failed follow-up GET must not
      // turn a completed creation into a retry that creates a second template.
      library = { ...library, folders: library.folders.map((item) => ({ ...item, templates: [...item.templates.filter((template) => template.id !== saved.id), ...(item.id === destination ? [saved] : [])] })) };
      selectedId = saved.id; folderId = destination; query = ''; editing = false; sourceView = false;
      notice = t('templates.saved');
      await tick(); document.getElementById('template-edit')?.focus();
    });
  }
  async function openFolderForm(mode: 'new' | 'rename') {
    await change(async () => {
      folderName = mode === 'rename' ? folder?.name || '' : '';
      folderOriginal = folderName; folderForm = mode; folderError = '';
      await tick(); document.getElementById('template-folder-input')?.focus();
    });
  }
  async function saveFolder() {
    if (!folderName.trim() || folderName.trim().length > 120) { folderError = t('templates.errors.invalid_name'); return; }
    if (library.folders.some((item) => (folderForm === 'new' || item.id !== folderId) && item.name.toLocaleLowerCase() === folderName.trim().toLocaleLowerCase())) { folderError = t('templates.errors.duplicate_name'); return; }
    await run(async () => {
      const saved = await request<TemplateFolder>(folderForm === 'new' ? '/folders' : `/folders/${folderId}`, folderForm === 'new' ? 'POST' : 'PUT', { name: folderName });
      library = { ...library, folders: folderForm === 'new' ? [...library.folders, saved] : library.folders.map((item) => item.id === saved.id ? saved : item) };
      folderId = saved.id; selectedId = saved.templates[0]?.id || ''; folderForm = null; folderError = ''; notice = t('templates.folder_saved');
    });
  }
  async function remove(isFolder: boolean) {
    if (!(await allowLeave())) return;
    const item = isFolder ? folder : selected;
    if (!item) return;
    const accepted = await confirmDialog.show({
      title: t(isFolder ? 'templates.delete_folder' : 'templates.delete_template'),
      message: t('templates.delete_message', { name: item.name }),
      detail: isFolder ? t('templates.delete_count', { count: String(folder?.templates.length || 0) }) : t('templates.independent'),
      confirmLabel: t('common.remove'), cancelLabel: t('common.cancel'), danger: true,
    });
    if (!accepted) return;
    await run(async () => {
      await request(isFolder ? `/folders/${item.id}?confirm=true` : `/${item.id}`, 'DELETE');
      library = { ...library, folders: isFolder ? library.folders.filter((entry) => entry.id !== item.id) : library.folders.map((entry) => ({ ...entry, templates: entry.templates.filter((template) => template.id !== item.id) })) };
      if (isFolder) folderId = '';
      selectedId = entries.find((entry) => !folderId || entry.folderId === folderId)?.id || '';
      editing = false; detailOpen = false; notice = t('templates.deleted');
    });
  }
  function shortcut(event: KeyboardEvent) {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's' && editing) { event.preventDefault(); if (!busy) void save(); }
  }
</script>

<svelte:window onbeforeunload={beforeUnload} onkeydown={shortcut} />
<ConfirmDialog bind:this={confirmDialog} />
<div class="template-library" data-testid="templates-manager" aria-busy={busy}>
  <header class="library-heading">
    <div><h1>{t('templates.library')}</h1><p>{t('templates.library_subtitle')}</p></div>
    <button class="primary-button" data-testid="template-new" disabled={busy || !ready || !library.folders.length} onclick={() => edit()}><span aria-hidden="true">＋</span> {t('templates.new_template')}</button>
  </header>
  <div class="feedback" aria-live="polite">
    {#if busy}<span>{t('common.loading')}</span>{:else if notice}<span class="success">✓ {notice}</span>{/if}
    {#if error}<div role="alert" class="error"><span>{error}</span><button class="secondary-button" disabled={busy} onclick={reload}>{t('templates.reload')}</button></div>{/if}
  </div>
  {#if !ready}
    {#if !busy && error}<p>{t('templates.load_failed')}</p>{/if}
  {:else}
    <div class="library-layout" class:show-detail={detailOpen}>
      <aside class="folder-pane" aria-label={t('templates.folders')}>
        <div class="pane-heading"><h2>{t('templates.folders')}</h2><button class="text-button" disabled={busy} onclick={() => openFolderForm('new')}>{t('templates.add_folder')}</button></div>
        <button class="folder-item" class:chosen={!folderId} aria-pressed={!folderId} disabled={busy} onclick={() => chooseFolder('')}>{t('templates.all')}<span>{entries.length}</span></button>
        {#each library.folders as item (item.id)}
          <button class="folder-item" class:chosen={folderId === item.id} aria-pressed={folderId === item.id} disabled={busy} onclick={() => chooseFolder(item.id)}><span>▱ {item.name}</span><span>{item.templates.length}</span></button>
        {/each}
        <p class="hint">{t('templates.folder_hint')}</p>
        {#if folder}
          <details class="folder-actions"><summary>{t('templates.folder_actions')}</summary><div class="actions"><button class="secondary-button" disabled={busy} onclick={() => openFolderForm('rename')}>{t('templates.rename')}</button><button class="text-button danger" data-testid="template-delete-folder" disabled={busy} onclick={() => remove(true)}>{t('common.remove')}</button></div></details>
        {/if}
        {#if folderForm}
          <form class="folder-form" onsubmit={(event) => { event.preventDefault(); void saveFolder(); }}>
            <label for="template-folder-input">{t(folderForm === 'new' ? 'templates.new_folder' : 'templates.rename_folder')}</label>
            <input id="template-folder-input" maxlength="120" bind:value={folderName} disabled={busy} aria-invalid={!!folderError} aria-describedby="template-folder-error" />
            <span id="template-folder-error" class="error" role="alert">{folderError}</span>
            <div class="actions"><button class="primary-button" data-testid="template-add-folder" disabled={busy || !folderName.trim()}>{t(folderForm === 'new' ? 'common.create' : 'common.save')}</button><button type="button" class="text-button" disabled={busy} onclick={() => change(() => {})}>{t('common.cancel')}</button></div>
          </form>
        {/if}
      </aside>
      <section class="list-pane" aria-label={t('templates.menu')}>
        <label for="template-search">{t('templates.search')}</label><input type="search" id="template-search" bind:value={query} placeholder={t('templates.search_placeholder')} />
        <div class="list-caption">{t('templates.result_count', { count: String(filtered.length) })}</div>
        <div class="template-list">
          {#each filtered as item (item.id)}
            <button class="template-item" class:chosen={selectedId === item.id} aria-pressed={selectedId === item.id} disabled={busy} onclick={() => chooseTemplate(item.id)}><span class="item-title">{item.name}</span><span class="hint">{item.folderName}</span></button>
          {:else}
            <div class="empty"><h2>{t(!library.folders.length ? 'templates.welcome' : query ? 'templates.no_results' : 'templates.folder_empty')}</h2><p>{t(!library.folders.length ? 'templates.start_hint' : query ? 'templates.search_hint' : 'templates.empty_hint')}</p>{#if !library.folders.length}<button class="primary-button" onclick={() => openFolderForm('new')}>{t('templates.new_folder')}</button>{/if}</div>
          {/each}
        </div>
      </section>
      <section class="detail-pane" aria-label={t('templates.detail')}>
        <button class="text-button mobile-back" disabled={busy} onclick={() => change(() => { detailOpen = false; })}>← {t('templates.back_list')}</button>
        {#if editing}
          <form class="edit-form" onsubmit={(event) => { event.preventDefault(); void save(); }}>
            <div class="pane-heading"><h2>{t(draftId ? 'templates.edit' : 'templates.new_template')}</h2><span class="draft-status">{t(dirty ? 'templates.unsaved' : 'templates.no_changes')}</span></div>
            <footer class="editor-footer"><span class="hint">{t('templates.save_shortcut')}</span><div class="actions"><button type="button" class="secondary-button" disabled={busy} onclick={() => change(() => {})}>{t('common.cancel')}</button><button class="primary-button" data-testid="template-save" disabled={busy || !name.trim() || !destination}>{t('templates.save_template')}</button></div></footer>
            <div class="fields"><div><label for="template-name">{t('templates.name')}</label><input id="template-name" maxlength="120" bind:value={name} disabled={busy} aria-invalid={!!nameError} aria-describedby="template-name-error" /><span class="error" id="template-name-error" role="alert">{nameError}</span></div><div><label for="template-destination">{t('templates.folder')}</label><select id="template-destination" bind:value={destination} disabled={busy}>{#each library.folders as item}<option value={item.id}>{item.name}</option>{/each}</select></div></div>
            <label for="template-content">{t('templates.content')}</label>
            <div class="editor-body"><textarea id="template-content" maxlength="1000000" bind:value={content} disabled={busy} spellcheck="false"></textarea><details class="live-preview" bind:open={previewExpanded}><summary>{t('templates.preview')}</summary>{#if previewExpanded}<MarkdownPreview {content} />{/if}</details></div>

          </form>
        {:else if selected}
          <div class="detail-heading"><span class="eyebrow">{selected.folderName} / {t('templates.template')}</span><h2>{selected.name}</h2><div class="actions"><button class="primary-button" disabled={busy} onclick={() => creationId = selected?.id}>{t('templates.use')}</button><button class="secondary-button" id="template-edit" data-testid="template-edit" disabled={busy} onclick={() => edit(selected)}>{t('templates.edit')}</button><details class="more-actions"><summary>{t('templates.more')}</summary><div class="actions"><button class="text-button" disabled={busy} onclick={() => edit(selected, true)}>{t('templates.duplicate')}</button><button class="text-button danger" disabled={busy} onclick={() => remove(false)}>{t('common.remove')}</button></div></details></div><p class="hint">{t('templates.independent')}</p></div>
          <div class="preview-heading"><h3>{t('templates.preview')}</h3><button class="text-button" aria-pressed={sourceView} onclick={() => sourceView = !sourceView}>{t(sourceView ? 'templates.formatted' : 'templates.source')}</button></div>
          <div class="preview-content">{#if sourceView}<pre>{selected.content}</pre>{:else}<MarkdownPreview content={selected.content} />{/if}</div>
        {:else}<div class="empty"><h2>{t('templates.select_template')}</h2><p>{t('templates.preview_hint')}</p></div>{/if}
      </section>
    </div>
  {/if}
</div>
{#if creationId}
  <NewDocModal open={true} initialTemplateId={creationId} onclose={() => creationId = undefined} onsuccess={(id) => { window.location.href = '/?doc=' + encodeURIComponent(id); }} />
{/if}

<style>
  .template-library { min-width:0;min-height:0; display:flex; flex-direction:column; overflow:hidden; background:var(--bg); padding:24px; color:var(--ink); }
  .library-heading,.pane-heading,.preview-heading,.editor-footer { display:flex; align-items:center; justify-content:space-between; gap:16px; }
  .library-heading h1 { font-size:24px; font-weight:700; } .library-heading p { margin-top:6px; color:var(--muted); }
  .feedback { min-height:36px; padding:8px 0; font-size:13px; } .success { color:var(--green); }
  .error { color:var(--red); font-size:13px; } div.error { display:flex;align-items:center;gap:12px; }
  .library-layout { display:grid; grid-template-columns:210px 270px minmax(0,1fr); min-height:0; flex:1; gap:20px; }
  .folder-pane,.list-pane,.detail-pane { min-width:0; min-height:0; overflow:auto; }
  .folder-pane { padding-right:16px; border-right:1px solid var(--line); } .list-pane { display:flex; flex-direction:column; }
  .detail-pane { background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:22px; display:flex; flex-direction:column; }
  h2 { font-size:17px; font-weight:650; } h3 { font-size:13px; font-weight:600; } .pane-heading { margin-bottom:16px; }
  .actions { display:flex;align-items:center;gap:8px;flex-wrap:wrap; } button { cursor:pointer; } button:disabled { opacity:.5;cursor:default; }
  .primary-button,.secondary-button { padding:9px 13px; border-radius:8px; } .text-button { background:transparent;border:0;padding:8px 4px;color:var(--accent);font:inherit;font-size:13px; }
  .danger { color:var(--red); } .folder-item,.template-item { display:flex;width:100%;border:1px solid transparent;background:transparent;color:inherit;text-align:left;border-radius:8px;padding:12px;margin-bottom:5px;gap:10px;overflow-wrap:anywhere; }
  .folder-item { align-items:center;justify-content:space-between; } .folder-item span:first-child { min-width:0; } .folder-item span:last-child { color:var(--muted);font-size:12px; }
  .template-item { flex-direction:column;gap:5px; } .chosen { background:var(--accent-soft);border-color:var(--accent); } .item-title { font-weight:600; }
  .folder-item:hover,.template-item:hover { background:var(--accent-soft); } .hint,.eyebrow,.list-caption,.draft-status { font-size:12px;color:var(--muted);line-height:1.6; } .hint { margin:12px 0; } .template-item .hint { margin:0; }
  label { display:block;font-size:13px;font-weight:600;margin:0 0 8px; } input,textarea,select { width:100%;min-width:0;border:1px solid var(--line-strong);border-radius:8px;padding:10px;background:var(--panel);color:var(--ink);font:inherit; }
  [aria-invalid="true"] { border-color:var(--red); } .list-caption { margin:12px 0; } .template-list { overflow:auto;min-height:0; }
  .folder-form { margin-top:18px;padding-top:16px;border-top:1px solid var(--line); } .folder-form .actions { margin-top:12px; } summary { cursor:pointer;font-size:13px;padding:8px 0; } .more-actions { position:relative; } .more-actions .actions { padding:8px 0; }
  .detail-heading h2 { font-size:23px;margin:8px 0 18px;overflow-wrap:anywhere; } .preview-heading { border-top:1px solid var(--line);padding:12px 0; } .preview-content { flex:1;min-height:350px; } pre { white-space:pre-wrap;overflow-wrap:anywhere;font:13px/1.7 monospace; }
  .edit-form { display:flex;flex-direction:column;min-height:0;height:100%; } .fields { display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:18px; } .editor-body { overflow:auto;flex:1;min-height:120px; } textarea { font:14px/1.7 monospace;min-height:260px;resize:vertical; } .editor-footer { border-bottom:1px solid var(--line);padding-bottom:14px;margin-bottom:16px;flex-wrap:wrap;flex-shrink:0; } .live-preview { margin-top:14px; }
  .empty { padding:30px 10px; } .empty p { color:var(--muted);font-size:14px;line-height:1.7;margin:12px 0; } .mobile-back { display:none;align-self:flex-start; }
  :global(html.dark) .template-library { --bg:#0f172a;--ink:#f1f5f9;--muted:#94a3b8;--line:#ffffff1a;--line-strong:#ffffff33;--panel:#1e293b;--accent:#93c5fd;--accent-soft:#60a5fa20;--green:#6ee7b7;--red:#fda4af; }
  @media(max-width:1150px) { .library-layout { grid-template-columns:170px 220px minmax(0,1fr);gap:12px; } .template-library { padding:16px; } .detail-pane { padding:16px; } .fields { grid-template-columns:1fr; } }
  @media(max-width:900px) { .library-layout { grid-template-columns:180px minmax(0,1fr); } .detail-pane { display:none; } .show-detail .folder-pane,.show-detail .list-pane { display:none; } .show-detail .detail-pane { display:flex;grid-column:1/-1; } .mobile-back { display:block; } .library-heading { flex-wrap:wrap; } }
  @media(max-width:520px) { .library-layout { grid-template-columns:1fr;overflow:auto; } .folder-pane { border-right:0;border-bottom:1px solid var(--line);padding:0 0 12px;max-height:230px;flex-shrink:0; } .list-pane { overflow:visible; } .template-list { overflow:visible; } .show-detail { display:flex; } .show-detail .detail-pane { width:100%; } .template-library { padding:12px; } .editor-footer { gap:4px; } }
</style>
