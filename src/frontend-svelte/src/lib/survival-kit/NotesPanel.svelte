<script lang="ts">
  import { t } from "../i18n.svelte";
  import { skStore, persist } from "./store.svelte";
  import { SK_THEMES, type SkBloc, type BlocType } from "./types";
  import SkModal from "./SkModal.svelte";

  let { confirmDelete }: { confirmDelete: (title: string, message: string) => Promise<boolean> } =
    $props();

  let editMode = $state(false);
  let expanded = $state<Record<number, boolean>>({});
  let copied = $state<string | null>(null);

  // ── Note modal ──
  let noteOpen = $state(false);
  let noteIdx = $state(-1); // -1 = adding
  let noteTitre = $state("");
  let noteTheme = $state<string>("t-green");

  // ── Bloc modal ──
  let blocOpen = $state(false);
  let blocNoteIdx = $state(-1);
  let blocIdx = $state(-1); // -1 = adding
  let blocType = $state<BlocType>("p");
  let blocContent = $state("");

  const themeLabels: Record<string, string> = {
    "t-green": "survival.color_green",
    "t-violet": "survival.color_violet",
    "t-amber": "survival.color_amber",
    "t-sky": "survival.color_sky",
    "t-rose": "survival.color_rose",
    "t-teal": "survival.color_teal",
  };

  let allExpanded = $derived(
    skStore.notes.length > 0 && skStore.notes.every((n) => expanded[n.id]),
  );

  function toggleNote(id: number) {
    expanded[id] = !expanded[id];
  }
  function toggleAll() {
    if (allExpanded) {
      expanded = {};
    } else {
      const next: Record<number, boolean> = {};
      skStore.notes.forEach((n) => (next[n.id] = true));
      expanded = next;
    }
  }

  // ── Note CRUD ──
  function openAddNote() {
    noteIdx = -1;
    noteTitre = "";
    noteTheme = "t-green";
    noteOpen = true;
  }
  function openEditNote(idx: number) {
    noteIdx = idx;
    noteTitre = skStore.notes[idx].titre;
    noteTheme = skStore.notes[idx].theme;
    noteOpen = true;
  }
  function confirmNote() {
    const titre = noteTitre.trim();
    if (!titre) return;
    if (noteIdx === -1) {
      const id = Date.now();
      skStore.notes.push({ id, theme: noteTheme, titre, blocs: [] });
      expanded[id] = true;
    } else {
      skStore.notes[noteIdx].titre = titre;
      skStore.notes[noteIdx].theme = noteTheme;
    }
    persist();
    noteOpen = false;
  }
  async function deleteNote(idx: number) {
    const ok = await confirmDelete(
      t("survival.confirm_del_note_title"),
      t("survival.confirm_del_note_msg"),
    );
    if (!ok) return;
    skStore.notes.splice(idx, 1);
    persist();
  }

  // ── Bloc CRUD ──
  function blocToText(bloc: SkBloc): string {
    if (bloc.type === "ul") return bloc.items.join("\n");
    if (bloc.type === "table")
      return [bloc.headers.join(" | "), ...bloc.rows.map((r) => r.join(" | "))].join("\n");
    return bloc.content;
  }
  function openAddBloc(nIdx: number) {
    blocNoteIdx = nIdx;
    blocIdx = -1;
    blocType = "p";
    blocContent = "";
    blocOpen = true;
  }
  function openEditBloc(nIdx: number, bIdx: number) {
    blocNoteIdx = nIdx;
    blocIdx = bIdx;
    const bloc = skStore.notes[nIdx].blocs[bIdx];
    blocType = bloc.type;
    blocContent = blocToText(bloc);
    blocOpen = true;
  }
  function buildBloc(): SkBloc | null {
    const raw = blocContent;
    if (!raw.trim()) return null;
    if (blocType === "ul") {
      const items = raw.split("\n").map((s) => s.trim()).filter(Boolean);
      if (!items.length) return null;
      return { type: "ul", items };
    }
    if (blocType === "table") {
      const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
      if (!lines.length) return null;
      const headers = lines[0].split("|").map((c) => c.trim());
      const rows = lines.slice(1).map((l) => l.split("|").map((c) => c.trim()));
      return { type: "table", headers, rows };
    }
    return { type: blocType, content: raw };
  }
  function confirmBloc() {
    const bloc = buildBloc();
    if (!bloc) return;
    if (blocIdx === -1) skStore.notes[blocNoteIdx].blocs.push(bloc);
    else skStore.notes[blocNoteIdx].blocs[blocIdx] = bloc;
    persist();
    blocOpen = false;
  }
  async function deleteBloc(nIdx: number, bIdx: number) {
    const ok = await confirmDelete(
      t("survival.confirm_del_bloc_title"),
      t("survival.irreversible"),
    );
    if (!ok) return;
    skStore.notes[nIdx].blocs.splice(bIdx, 1);
    persist();
  }

  async function copyPre(content: string, key: string) {
    try {
      await navigator.clipboard.writeText(content);
      copied = key;
      setTimeout(() => (copied = copied === key ? null : copied), 1500);
    } catch { /* clipboard unavailable */ }
  }

  let blocPlaceholder = $derived(
    blocType === "ul"
      ? t("survival.modal_bloc_placeholder_ul")
      : blocType === "pre"
        ? t("survival.modal_bloc_placeholder_pre")
        : blocType === "table"
          ? t("survival.modal_bloc_placeholder_table")
          : blocType === "b"
            ? t("survival.modal_bloc_placeholder_b")
            : t("survival.modal_bloc_placeholder_p"),
  );
</script>

<div class="sk-panel-head">
  <h2 class="sk-panel-title">{t("survival.notes_title")}<span class="sk-accent">.</span></h2>
  <p class="sk-panel-sub">{t("survival.notes_subtitle")}</p>
</div>

<div class="sk-toolbar">
  <button type="button" class="sk-tool" onclick={() => (editMode = !editMode)}>
    {editMode ? t("survival.btn_read_mode") : t("survival.btn_edit_mode")}
  </button>
  <button type="button" class="sk-tool" onclick={toggleAll}>
    {allExpanded ? t("survival.btn_collapse_all") : t("survival.btn_expand_all")}
  </button>
  <button type="button" class="sk-tool sk-tool--add" onclick={openAddNote}>
    {t("survival.notes_btn_add")}
  </button>
</div>

<div class="sk-notes" class:edit-mode={editMode}>
  {#if skStore.notes.length === 0}
    <p class="sk-empty">{t("survival.notes_empty")}</p>
  {/if}
  {#each skStore.notes as note, nIdx (note.id)}
    {@const collapsed = !expanded[note.id]}
    <div class="sk-note {note.theme}" class:collapsed>
      <div class="sk-note-head">
        <h3>{note.titre}</h3>
        <div class="sk-note-actions">
          <button type="button" class="sk-mini" onclick={() => openEditNote(nIdx)}>✎</button>
          <button type="button" class="sk-mini sk-mini--del" onclick={() => deleteNote(nIdx)}>✕</button>
        </div>
        <button type="button" class="sk-toggle" aria-label="toggle" onclick={() => toggleNote(note.id)}>
          <svg viewBox="0 0 10 6" width="10" height="6"><path d="M1 1 L5 5 L9 1" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>
      <div class="sk-note-body">
        {#each note.blocs as bloc, bIdx (bIdx)}
          <div class="sk-bloc">
            <div class="sk-bloc-content">
              {#if bloc.type === "b"}
                <strong>{bloc.content}</strong>
              {:else if bloc.type === "p"}
                <p>{bloc.content}</p>
              {:else if bloc.type === "pre"}
                {@const key = `${note.id}-${bIdx}`}
                <div class="sk-pre-wrap">
                  <pre>{bloc.content}</pre>
                  <button type="button" class="sk-copy" onclick={() => copyPre(bloc.content, key)}>
                    {copied === key ? t("survival.notes_btn_copied") : t("survival.notes_btn_copy")}
                  </button>
                </div>
              {:else if bloc.type === "ul"}
                <ul>
                  {#each bloc.items as item}<li>{item}</li>{/each}
                </ul>
              {:else if bloc.type === "table"}
                <div class="sk-table-wrap">
                  <table>
                    <thead><tr>{#each bloc.headers as h}<th>{h}</th>{/each}</tr></thead>
                    <tbody>
                      {#each bloc.rows as row}<tr>{#each row as c}<td>{c}</td>{/each}</tr>{/each}
                    </tbody>
                  </table>
                </div>
              {/if}
            </div>
            <div class="sk-bloc-actions">
              <button type="button" class="sk-mini" onclick={() => openEditBloc(nIdx, bIdx)}>✎</button>
              <button type="button" class="sk-mini sk-mini--del" onclick={() => deleteBloc(nIdx, bIdx)}>✕</button>
            </div>
          </div>
        {/each}
        <div class="sk-note-foot">
          <button type="button" class="sk-add-bloc" onclick={() => openAddBloc(nIdx)}>
            {t("survival.notes_btn_add_bloc")}
          </button>
        </div>
      </div>
    </div>
  {/each}
</div>

<!-- Note modal -->
<SkModal
  open={noteOpen}
  title={noteIdx === -1 ? t("survival.modal_note_title") : t("survival.modal_edit_note_title")}
  confirmLabel={noteIdx === -1 ? t("common.create") : t("common.save")}
  onConfirm={confirmNote}
  onClose={() => (noteOpen = false)}
>
  <label for="sk-note-titre">{t("survival.modal_note_label_title")}</label>
  <input id="sk-note-titre" type="text" bind:value={noteTitre} placeholder={t("survival.modal_note_placeholder")} onkeydown={(e) => e.key === "Enter" && confirmNote()} />
  <label for="sk-note-color">{t("survival.modal_label_color")}</label>
  <select id="sk-note-color" bind:value={noteTheme}>
    {#each SK_THEMES as th}
      <option value={th}>{t(themeLabels[th])}</option>
    {/each}
  </select>
</SkModal>

<!-- Bloc modal -->
<SkModal
  open={blocOpen}
  title={blocIdx === -1 ? t("survival.modal_bloc_new") : t("survival.modal_bloc_edit")}
  confirmLabel={t("common.save")}
  onConfirm={confirmBloc}
  onClose={() => (blocOpen = false)}
>
  <label for="sk-bloc-type">{t("survival.modal_bloc_label_type")}</label>
  <select id="sk-bloc-type" bind:value={blocType}>
    <option value="b">{t("survival.modal_bloc_type_b")}</option>
    <option value="p">{t("survival.modal_bloc_type_p")}</option>
    <option value="pre">{t("survival.modal_bloc_type_pre")}</option>
    <option value="ul">{t("survival.modal_bloc_type_ul")}</option>
    <option value="table">{t("survival.modal_bloc_type_table")}</option>
  </select>
  <label for="sk-bloc-content">{t("survival.modal_bloc_label_content")}</label>
  {#if blocType === "b"}
    <input id="sk-bloc-content" type="text" bind:value={blocContent} placeholder={blocPlaceholder} onkeydown={(e) => e.key === "Enter" && confirmBloc()} />
  {:else}
    <textarea id="sk-bloc-content" rows="6" bind:value={blocContent} placeholder={blocPlaceholder}></textarea>
  {/if}
</SkModal>

<style>
  .sk-toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 16px;
  }
  .sk-tool {
    font-size: 11px;
    padding: 5px 11px;
    border-radius: 8px;
    border: 1px solid var(--line);
    background: var(--panel-soft);
    color: var(--muted);
    cursor: pointer;
    font-family: inherit;
  }
  .sk-tool:hover {
    border-color: var(--accent);
    color: var(--accent-strong);
  }
  .sk-tool--add {
    color: var(--accent-strong);
    border-color: var(--accent);
    background: var(--accent-soft);
  }

  .sk-notes {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .sk-note {
    border: 1px solid var(--line);
    border-radius: 12px;
    overflow: hidden;
    background: var(--panel);
  }
  .sk-note-head {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background: var(--sk-theme-soft);
    border-bottom: 1px solid var(--line);
  }
  .sk-note.collapsed .sk-note-head {
    border-bottom: none;
  }
  .sk-note-head h3 {
    flex: 1;
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: var(--sk-theme-ink);
  }
  .sk-note-actions {
    display: none;
    gap: 4px;
  }
  .sk-notes.edit-mode .sk-note-actions {
    display: flex;
  }
  .sk-toggle {
    border: none;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    display: flex;
    transition: transform 0.15s;
  }
  .sk-note:not(.collapsed) .sk-toggle {
    transform: rotate(180deg);
  }
  .sk-note-body {
    padding: 12px 14px;
  }
  .sk-note.collapsed .sk-note-body {
    display: none;
  }

  .sk-bloc {
    display: flex;
    gap: 8px;
    align-items: flex-start;
  }
  .sk-bloc-content {
    flex: 1;
    min-width: 0;
    font-size: 13px;
    color: var(--ink);
  }
  .sk-bloc-content :global(p) {
    margin: 6px 0;
  }
  .sk-bloc-content :global(strong) {
    display: block;
    margin: 10px 0 4px;
    color: var(--ink);
  }
  .sk-bloc-content :global(ul) {
    margin: 6px 0;
    padding-left: 18px;
  }
  .sk-bloc-content :global(li) {
    margin: 2px 0;
  }
  .sk-pre-wrap {
    position: relative;
    margin: 6px 0;
  }
  .sk-pre-wrap :global(pre) {
    margin: 0;
    padding: 10px 12px;
    background: var(--panel-soft);
    border: 1px solid var(--line);
    border-radius: 8px;
    font-size: 12px;
    font-family: "SF Mono", Consolas, monospace;
    overflow-x: auto;
    white-space: pre;
  }
  .sk-copy {
    position: absolute;
    top: 6px;
    right: 6px;
    font-size: 10px;
    padding: 2px 8px;
    border: 1px solid var(--line);
    border-radius: 6px;
    background: var(--panel);
    color: var(--muted);
    cursor: pointer;
  }
  .sk-copy:hover {
    border-color: var(--accent);
    color: var(--accent-strong);
  }
  .sk-table-wrap {
    overflow-x: auto;
    margin: 6px 0;
  }
  .sk-table-wrap :global(table) {
    border-collapse: collapse;
    width: 100%;
    font-size: 12px;
  }
  .sk-table-wrap :global(th),
  .sk-table-wrap :global(td) {
    border: 1px solid var(--line);
    padding: 5px 8px;
    text-align: left;
  }
  .sk-table-wrap :global(th) {
    background: var(--panel-soft);
    font-weight: 600;
  }

  .sk-bloc-actions {
    display: none;
    gap: 4px;
    flex-shrink: 0;
  }
  .sk-notes.edit-mode .sk-bloc-actions {
    display: flex;
  }

  .sk-note-foot {
    display: none;
    margin-top: 8px;
  }
  .sk-notes.edit-mode .sk-note-foot {
    display: block;
  }
  .sk-add-bloc {
    font-size: 11px;
    padding: 5px 11px;
    border: 1px dashed var(--line-strong);
    border-radius: 8px;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    font-family: inherit;
  }
  .sk-add-bloc:hover {
    border-color: var(--accent);
    color: var(--accent-strong);
  }

  .sk-mini {
    border: 1px solid var(--line);
    background: var(--panel);
    border-radius: 6px;
    width: 22px;
    height: 22px;
    font-size: 11px;
    cursor: pointer;
    color: var(--muted);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .sk-mini:hover {
    border-color: var(--accent);
    color: var(--accent-strong);
  }
  .sk-mini--del:hover {
    border-color: var(--red);
    color: var(--red);
  }

  .sk-empty {
    font-size: 13px;
    color: var(--muted);
    font-style: italic;
    text-align: center;
    padding: 24px 0;
  }
</style>
