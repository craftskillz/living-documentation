<script lang="ts">
  import { onMount } from "svelte";
  import Topbar from "../lib/Topbar.svelte";
  import ConfirmDialog from "../lib/ConfirmDialog.svelte";
  import { t, loadI18n } from "../lib/i18n.svelte";
  import { loadState } from "../lib/survival-kit/store.svelte";
  import TasksPanel from "../lib/survival-kit/TasksPanel.svelte";
  import NotesPanel from "../lib/survival-kit/NotesPanel.svelte";
  import LinksPanel from "../lib/survival-kit/LinksPanel.svelte";
  import WordCloudModal from "../lib/home/WordCloudModal.svelte";

  let confirmDialog = $state<ConfirmDialog>(null!);
  let ready = $state(false);
  let dark = $state(false);
  let wordCloudOpen = $state(false);
  let menuRevealed = $state(false);

  // The top menu is a drawer that slides down only when the pointer nears the
  // top edge. Once revealed it stays until the pointer drops below the drawer.
  function onPointerY(clientY: number) {
    menuRevealed = clientY <= (menuRevealed ? 84 : 10);
  }
  $effect(() => {
    const onMove = (e: MouseEvent) => onPointerY(e.clientY);
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  });

  async function confirmDelete(title: string, message: string): Promise<boolean> {
    return confirmDialog.show({
      title,
      message,
      confirmLabel: t("survival.irreversible_delete"),
      cancelLabel: t("common.cancel"),
      danger: true,
    });
  }

  // Respect the same dark-mode preference as the rest of the app.
  function applyDark(v: boolean) {
    dark = v;
    document.documentElement.classList.toggle("dark", v);
  }
  function applyDarkPref() {
    let pref = false;
    try {
      const saved = localStorage.getItem("ld-dark");
      pref = saved !== null
        ? saved === "true"
        : window.matchMedia("(prefers-color-scheme: dark)").matches;
    } catch { /* default light */ }
    applyDark(pref);
  }
  function toggleDark() {
    applyDark(!dark);
    try { localStorage.setItem("ld-dark", String(dark)); } catch { /* ignore */ }
  }

  onMount(async () => {
    applyDarkPref();
    try {
      const cfg = await fetch("/api/config").then((r) => r.json());
      await loadI18n(cfg.language || "en");
    } catch { /* fallback to keys */ }
    await loadState();
    ready = true;
  });
</script>

<ConfirmDialog bind:this={confirmDialog} />

<div class="app-shell sk-root">
  <!-- Thin hover strip at the very top that pulls the menu drawer down -->
  <div
    class="sk-menu-trigger"
    role="presentation"
    onmouseenter={() => (menuRevealed = true)}
  ></div>

  <div class="sk-menu-drawer" class:revealed={menuRevealed}>
    <Topbar title={t("survival.title")} subtitle={t("survival.subtitle")}>
      {#snippet actions()}
        <button onclick={() => (wordCloudOpen = true)} title={t("nav.word_cloud")} class="ghost-button" aria-label={t("nav.word_cloud")}><i class="fa-solid fa-cloud"></i></button>
        <button onclick={toggleDark} title="Toggle dark mode" class="ghost-button" aria-label="Toggle dark mode">{dark ? "☀" : "☾"}</button>
      {/snippet}
    </Topbar>
  </div>

  {#if !ready}
    <p class="sk-loading">{t("common.loading")}</p>
  {:else}
    <div class="sk-grid">
      <section class="sk-col"><div class="sk-inner"><TasksPanel /></div></section>
      <section class="sk-col"><div class="sk-inner"><NotesPanel {confirmDelete} /></div></section>
      <section class="sk-col"><div class="sk-inner"><LinksPanel {confirmDelete} /></div></section>
    </div>
  {/if}
</div>

<WordCloudModal open={wordCloudOpen} onclose={() => (wordCloudOpen = false)} />

<style>
  .sk-loading {
    text-align: center;
    color: var(--muted);
    padding: 48px 0;
    font-size: 14px;
  }

  /* The menu is a fixed drawer, so the content row owns the full viewport. */
  .sk-root {
    background: var(--bg);
    grid-template-rows: minmax(0, 1fr);
  }

  /* ── Top menu drawer ─────────────────────────────────────────────────────── */
  .sk-menu-trigger {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 10px;
    z-index: 90;
  }
  .sk-menu-drawer {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 100;
    transform: translateY(-100%);
    transition: transform 0.28s ease;
    box-shadow: var(--shadow);
  }
  .sk-menu-drawer.revealed {
    transform: translateY(0);
  }
  /* Outside the app-shell grid the topbar loses its 72px track height and
     collapses to content height — restore it so the drawer matches the
     regular top bar. */
  .sk-menu-drawer :global(.topbar) {
    height: 72px;
  }

  /* ── Uppercase pills & buttons (matches the original kit) ────────────────── */
  :global(.sk-filters button),
  :global(.sk-tool),
  :global(.sk-add-bloc),
  :global(.sk-copy),
  :global(.sk-task-tag) {
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  /* ── Desktop: three full-height columns split by hairline dividers ───────── */
  .sk-grid {
    display: flex;
    height: 100%;
    min-height: 0;
  }
  .sk-col {
    flex: 1 1 0;
    min-width: 0;
    overflow-y: auto;
    padding: 28px 36px 80px;
    border-right: 1px solid var(--line);
  }
  .sk-col:last-child {
    border-right: none;
  }
  .sk-inner {
    max-width: 520px;
    margin: 0 auto;
  }

  /* ── Mobile: collapse the columns into stacked cards ─────────────────────── */
  @media (max-width: 1024px) {
    .sk-grid {
      flex-direction: column;
      height: 100%;
      overflow-y: auto;
      gap: 16px;
      padding: 20px;
    }
    .sk-col {
      flex: none;
      width: 100%;
      max-width: 720px;
      margin: 0 auto;
      overflow: visible;
      padding: 24px;
      border: 1px solid var(--line);
      border-right: 1px solid var(--line);
      border-radius: 16px;
      background: var(--panel);
    }
  }

  /* Panel header bits shared by the three panels (global so children can use). */
  :global(.sk-panel-head) {
    margin-bottom: 36px;
  }
  :global(.sk-panel-title) {
    margin: 0;
    font-size: 2.2rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1;
    color: var(--ink);
  }
  /* The signature orange dot from the original kit. */
  :global(.sk-accent) {
    color: #f97316;
  }
  :global(.sk-panel-sub) {
    margin: 8px 0 0;
    font-family: "Cascadia Code", "SF Mono", Consolas, monospace;
    font-size: 0.7rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--muted);
  }
  /* Section headers (note titles, link categories) echo the same mono caps. */
  :global(.sk-note-head h3),
  :global(.sk-cat-head h3) {
    font-family: "Cascadia Code", "SF Mono", Consolas, monospace;
    font-size: 0.72rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  /* ── Theme colour map (carried over from the original kit) ───────────────── */
  :global(.t-green)  { --sk-theme-soft: #dcfce7; --sk-theme-ink: #047857; }
  :global(.t-violet) { --sk-theme-soft: #ede9fe; --sk-theme-ink: #6d28d9; }
  :global(.t-amber)  { --sk-theme-soft: #fef3c7; --sk-theme-ink: #b45309; }
  :global(.t-sky)    { --sk-theme-soft: #e0f2fe; --sk-theme-ink: #0369a1; }
  :global(.t-rose)   { --sk-theme-soft: #ffe4e6; --sk-theme-ink: #be123c; }
  :global(.t-teal)   { --sk-theme-soft: #ccfbf1; --sk-theme-ink: #0f766e; }

  :global(.dark .t-green)  { --sk-theme-soft: rgb(4 120 87 / 18%);  --sk-theme-ink: #6ee7b7; }
  :global(.dark .t-violet) { --sk-theme-soft: rgb(109 40 217 / 22%); --sk-theme-ink: #c4b5fd; }
  :global(.dark .t-amber)  { --sk-theme-soft: rgb(180 83 9 / 20%);  --sk-theme-ink: #fcd34d; }
  :global(.dark .t-sky)    { --sk-theme-soft: rgb(3 105 161 / 22%); --sk-theme-ink: #7dd3fc; }
  :global(.dark .t-rose)   { --sk-theme-soft: rgb(190 18 60 / 20%); --sk-theme-ink: #fda4af; }
  :global(.dark .t-teal)   { --sk-theme-soft: rgb(15 118 110 / 22%); --sk-theme-ink: #5eead4; }

  /* ── Dark mode ───────────────────────────────────────────────────────────
     The base palette in app.css does not flip under `.dark` (dark mode there is
     per-component). So we redefine the surface palette on the module root; the
     variables cascade into every child panel/modal automatically. */
  :global(html.dark) .sk-root {
    --bg: #0f172a;
    --ink: #f1f5f9;
    --muted: #94a3b8;
    --line: rgb(255 255 255 / 10%);
    --line-strong: rgb(255 255 255 / 18%);
    --panel: #1e293b;
    --panel-soft: rgb(255 255 255 / 5%);
    --accent: #60a5fa;
    --accent-strong: #93c5fd;
    --accent-soft: rgb(96 165 250 / 16%);
    --green: #34d399;
    --red: #f87171;
    --shadow: 0 18px 60px rgb(0 0 0 / 50%);
    color: var(--ink);
  }
</style>
