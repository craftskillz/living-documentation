<script lang="ts">
  import { t } from "../i18n.svelte";
  import { skStore, persist } from "./store.svelte";
  import { SK_THEMES, type SkCategory, type SkLink } from "./types";
  import SkModal from "./SkModal.svelte";

  let { confirmDelete }: { confirmDelete: (title: string, message: string) => Promise<boolean> } =
    $props();

  let editMode = $state(false);
  let expanded = $state<Record<string, boolean>>({});

  // ── Category modal ──
  let catOpen = $state(false);
  let catName = $state("");
  let catTheme = $state<string>("t-green");

  // ── Link modal (add or edit) ──
  let linkOpen = $state(false);
  let linkCatIdx = $state(-1);
  let linkIdx = $state(-1); // -1 = adding
  let linkNom = $state("");
  let linkDesc = $state("");
  let linkUrl = $state("");

  const themeLabels: Record<string, string> = {
    "t-green": "survival.color_green",
    "t-violet": "survival.color_violet",
    "t-amber": "survival.color_amber",
    "t-sky": "survival.color_sky",
    "t-rose": "survival.color_rose",
    "t-teal": "survival.color_teal",
  };

  let allExpanded = $derived(
    skStore.links.length > 0 && skStore.links.every((c) => expanded[c.titre]),
  );

  function toggleCat(titre: string) {
    expanded[titre] = !expanded[titre];
  }
  function toggleAll() {
    if (allExpanded) {
      expanded = {};
    } else {
      const next: Record<string, boolean> = {};
      skStore.links.forEach((c) => (next[c.titre] = true));
      expanded = next;
    }
  }

  // ── Category CRUD ──
  function openCat() {
    catName = "";
    catTheme = "t-green";
    catOpen = true;
  }
  function confirmCat() {
    const nom = catName.trim();
    if (!nom) return;
    skStore.links.push({ theme: catTheme, titre: nom, liens: [] });
    persist();
    catOpen = false;
  }
  async function deleteCat(idx: number) {
    const cat = skStore.links[idx];
    const ok = await confirmDelete(
      t("survival.confirm_del_cat_title"),
      t("survival.confirm_del_cat_msg"),
    );
    if (!ok) return;
    skStore.links.splice(idx, 1);
    persist();
  }

  // ── Link CRUD ──
  function openAddLink(catIdx: number) {
    linkCatIdx = catIdx;
    linkIdx = -1;
    linkNom = "";
    linkDesc = "";
    linkUrl = "";
    linkOpen = true;
  }
  function openEditLink(e: Event, catIdx: number, idx: number) {
    e.preventDefault();
    const l = skStore.links[catIdx].liens[idx];
    linkCatIdx = catIdx;
    linkIdx = idx;
    linkNom = l.nom;
    linkDesc = l.desc;
    linkUrl = l.url;
    linkOpen = true;
  }
  function confirmLink() {
    const nom = linkNom.trim();
    const url = linkUrl.trim();
    if (!nom || !url) return;
    const entry: SkLink = { nom, desc: linkDesc.trim(), url };
    if (linkIdx === -1) skStore.links[linkCatIdx].liens.push(entry);
    else skStore.links[linkCatIdx].liens[linkIdx] = entry;
    persist();
    linkOpen = false;
  }
  async function deleteLink(e: Event, catIdx: number, idx: number) {
    e.preventDefault();
    const ok = await confirmDelete(
      t("survival.confirm_del_link_title"),
      t("survival.irreversible"),
    );
    if (!ok) return;
    skStore.links[catIdx].liens.splice(idx, 1);
    persist();
  }
</script>

<div class="sk-panel-head">
  <h2 class="sk-panel-title">{t("survival.links_title")}<span class="sk-accent">.</span></h2>
  <p class="sk-panel-sub">{t("survival.links_subtitle")}</p>
</div>

<div class="sk-toolbar">
  <button type="button" class="sk-tool" onclick={() => (editMode = !editMode)}>
    {editMode ? t("survival.btn_read_mode") : t("survival.btn_edit_mode")}
  </button>
  <button type="button" class="sk-tool" onclick={toggleAll}>
    {allExpanded ? t("survival.btn_collapse_all") : t("survival.btn_expand_all")}
  </button>
  <button type="button" class="sk-tool sk-tool--add" onclick={openCat}>
    {t("survival.links_btn_add_cat")}
  </button>
</div>

<div class="sk-cats" class:edit-mode={editMode}>
  {#if skStore.links.length === 0}
    <p class="sk-empty">{t("survival.links_empty")}</p>
  {/if}
  {#each skStore.links as cat, idx (cat.titre + idx)}
    {@const collapsed = !expanded[cat.titre]}
    <section class="sk-cat {cat.theme}" class:collapsed>
      <div class="sk-cat-head">
        <h3>{cat.titre}</h3>
        <div class="sk-cat-actions">
          <button type="button" class="sk-mini" title={t("survival.links_add_link_title")} onclick={() => openAddLink(idx)}>＋</button>
          <button type="button" class="sk-mini sk-mini--del" title={t("survival.links_del_cat_title")} onclick={() => deleteCat(idx)}>✕</button>
        </div>
        <button type="button" class="sk-toggle" aria-label="toggle" onclick={() => toggleCat(cat.titre)}>
          <svg viewBox="0 0 10 6" width="10" height="6"><path d="M1 1 L5 5 L9 1" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>
      <div class="sk-links">
        {#each cat.liens as l, lidx (lidx)}
          <a href={l.url} target="_blank" rel="noopener" class="sk-link">
            <span class="sk-link-text">
              <span class="sk-link-name">{l.nom}</span>{#if l.desc}<span class="sk-link-desc"> — {l.desc}</span>{/if}
            </span>
            <span class="sk-arrow">↗</span>
            <span class="sk-link-actions">
              <button type="button" class="sk-mini" title={t("survival.links_edit_link_title")} onclick={(e) => openEditLink(e, idx, lidx)}>✎</button>
              <button type="button" class="sk-mini sk-mini--del" title={t("survival.links_del_link_title")} onclick={(e) => deleteLink(e, idx, lidx)}>✕</button>
            </span>
          </a>
        {/each}
      </div>
    </section>
  {/each}
</div>

<!-- Category modal -->
<SkModal
  open={catOpen}
  title={t("survival.modal_cat_title")}
  confirmLabel={t("common.add")}
  onConfirm={confirmCat}
  onClose={() => (catOpen = false)}
>
  <label for="sk-cat-name">{t("survival.modal_cat_label_name")}</label>
  <input id="sk-cat-name" type="text" bind:value={catName} placeholder={t("survival.modal_cat_placeholder_name")} onkeydown={(e) => e.key === "Enter" && confirmCat()} />
  <label for="sk-cat-color">{t("survival.modal_label_color")}</label>
  <select id="sk-cat-color" bind:value={catTheme}>
    {#each SK_THEMES as th}
      <option value={th}>{t(themeLabels[th])}</option>
    {/each}
  </select>
</SkModal>

<!-- Link modal -->
<SkModal
  open={linkOpen}
  title={linkIdx === -1 ? t("survival.modal_link_title") : t("survival.modal_edit_link_title")}
  confirmLabel={linkIdx === -1 ? t("common.add") : t("common.save")}
  onConfirm={confirmLink}
  onClose={() => (linkOpen = false)}
>
  <label for="sk-link-nom">{t("survival.modal_link_label_name")}</label>
  <input id="sk-link-nom" type="text" bind:value={linkNom} placeholder={t("survival.modal_link_placeholder_name")} />
  <label for="sk-link-desc">{t("survival.modal_link_label_desc")}</label>
  <input id="sk-link-desc" type="text" bind:value={linkDesc} placeholder={t("survival.modal_link_placeholder_desc")} />
  <label for="sk-link-url">{t("survival.modal_link_label_url")}</label>
  <input id="sk-link-url" type="text" bind:value={linkUrl} placeholder="https://…" onkeydown={(e) => e.key === "Enter" && confirmLink()} />
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

  .sk-cats {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .sk-cat {
    border: 1px solid var(--line);
    border-radius: 12px;
    overflow: hidden;
    background: var(--panel);
  }
  .sk-cat-head {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background: var(--sk-theme-soft);
    border-bottom: 1px solid var(--line);
  }
  .sk-cat.collapsed .sk-cat-head {
    border-bottom: none;
  }
  .sk-cat-head h3 {
    flex: 1;
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: var(--sk-theme-ink);
  }
  .sk-cat-actions {
    display: none;
    gap: 4px;
  }
  .sk-cats.edit-mode .sk-cat-actions {
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
  .sk-cat:not(.collapsed) .sk-toggle {
    transform: rotate(180deg);
  }
  .sk-links {
    display: flex;
    flex-direction: column;
  }
  .sk-cat.collapsed .sk-links {
    display: none;
  }
  .sk-link {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 9px 14px;
    text-decoration: none;
    border-bottom: 1px solid var(--line);
    color: var(--ink);
  }
  .sk-link:last-child {
    border-bottom: none;
  }
  .sk-link:hover {
    background: var(--panel-soft);
  }
  .sk-link-text {
    flex: 1;
    min-width: 0;
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .sk-link-name {
    font-weight: 500;
  }
  .sk-link-desc {
    color: var(--muted);
  }
  .sk-arrow {
    color: var(--muted);
    font-size: 12px;
    flex-shrink: 0;
  }
  .sk-link-actions {
    display: none;
    gap: 4px;
    flex-shrink: 0;
  }
  .sk-cats.edit-mode .sk-link-actions {
    display: flex;
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
