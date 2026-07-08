<script lang="ts">
  import { t } from "./i18n.svelte";
  import { favorites } from "./favorites.svelte";

  let open = $state(false);

  // Position for the fixed dropdown, computed from the button's bounding rect.
  let dropdownTop = $state(0);
  let dropdownRight = $state(0);
  let buttonEl: HTMLButtonElement | null = null;

  // Portal action: moves the node to document.body to escape any ancestor
  // stacking context (e.g. backdrop-filter on .topbar).
  function portal(node: HTMLElement) {
    document.body.appendChild(node);
    return {
      destroy() {
        if (node.parentNode) node.parentNode.removeChild(node);
      },
    };
  }

  function computePos() {
    if (!buttonEl) return;
    const r = buttonEl.getBoundingClientRect();
    dropdownTop = r.bottom + 6;
    dropdownRight = window.innerWidth - r.right;
  }

  function toggle() {
    if (!open) computePos();
    open = !open;
  }

  function close() {
    open = false;
  }

  function openFavorite(id: string) {
    close();
    const href = `/?doc=${encodeURIComponent(id)}`;
    history.pushState(null, "", href);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
</script>

<button
  bind:this={buttonEl}
  type="button"
  class="ghost-button"
  onclick={toggle}
  aria-haspopup="true"
  aria-expanded={open}
>
  <i class="fa-solid fa-star" aria-hidden="true" style="margin-right:6px;color:#f59e0b"></i>{t("nav.favorites")}
</button>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div use:portal class="favorites-backdrop" onclick={close}></div>

  <div
    use:portal
    class="favorites-dropdown"
    role="menu"
    style="top:{dropdownTop}px;right:{dropdownRight}px"
  >
    {#if favorites.items.length === 0}
      <p class="favorites-empty">{t("favorites.empty")}</p>
    {:else}
      {#each favorites.items as fav (fav.id)}
        <div class="favorites-row">
          <button
            type="button"
            class="favorites-item"
            role="menuitem"
            title={fav.title}
            onclick={() => openFavorite(fav.id)}
          >
            <i class="fa-solid fa-star favorites-item-star" aria-hidden="true"></i>
            <span class="favorites-item-name">{fav.title || fav.id}</span>
          </button>
          <button
            type="button"
            class="favorites-remove"
            aria-label={t("favorites.remove")}
            title={t("favorites.remove")}
            onclick={() => favorites.remove(fav.id)}
          >×</button>
        </div>
      {/each}
    {/if}
  </div>
{/if}

<style>
  .favorites-backdrop {
    position: fixed;
    inset: 0;
    z-index: 9998;
  }

  .favorites-dropdown {
    position: fixed;
    z-index: 9999;
    min-width: 240px;
    max-width: 340px;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 10px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    max-height: min(70vh, 420px);
    overflow-y: auto;
  }

  .favorites-empty {
    font-size: 13px;
    color: var(--muted);
    padding: 10px 12px;
    font-style: italic;
    margin: 0;
  }

  .favorites-row {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .favorites-item {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 0;
    text-align: left;
    padding: 7px 10px;
    border-radius: 6px;
    border: none;
    background: transparent;
    cursor: pointer;
    font-family: inherit;
    font-size: 13px;
    color: var(--ink);
    transition: background 0.1s;
  }
  .favorites-item:hover { background: var(--accent-soft); }

  .favorites-item-star {
    flex-shrink: 0;
    font-size: 12px;
    color: #f59e0b;
  }

  .favorites-item-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .favorites-remove {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--muted);
    font-size: 18px;
    line-height: 1;
    cursor: pointer;
    transition: background 0.1s, color 0.1s;
  }
  .favorites-remove:hover { background: var(--red-soft); color: var(--red); }
</style>
