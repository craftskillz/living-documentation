<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "../i18n.svelte";
  import { home } from "./state.svelte";
  import { normalizeTagName } from "../../../../shared/tagName";

  // Small popup at the click point: free-text tag name + datalist suggestions.
  let { x, y, onconfirm, oncancel }: {
    x: number;
    y: number;
    onconfirm: (name: string) => void;
    oncancel: () => void;
  } = $props();

  let value = $state("");
  let invalid = $state(false);
  let inputEl = $state<HTMLInputElement>(null!);
  let popupEl = $state<HTMLElement>(null!);

  function confirm() {
    const name = normalizeTagName(value);
    if (!name) { invalid = true; return; }
    onconfirm(name);
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === "Enter") { e.preventDefault(); confirm(); }
    else if (e.key === "Escape") { e.preventDefault(); oncancel(); }
  }

  onMount(() => {
    inputEl?.focus();
    const onDown = (e: MouseEvent) => {
      if (!popupEl.contains(e.target as Node)) oncancel();
    };
    // Deferred so the opening right-click itself does not cancel the popup.
    const timer = setTimeout(() => document.addEventListener("mousedown", onDown, true), 0);
    return () => { clearTimeout(timer); document.removeEventListener("mousedown", onDown, true); };
  });
</script>

<div
  bind:this={popupEl}
  data-testid="tag-insert-popup"
  class="fixed z-50 w-64 bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-3 text-sm"
  style="left: {x}px; top: {y}px"
>
  <div class="font-semibold text-gray-800 dark:text-gray-100 mb-2">{t("tags.insert.title")}</div>
  <input
    bind:this={inputEl}
    bind:value
    data-testid="tag-insert-input"
    list="tag-insert-suggestions"
    placeholder={t("tags.insert.placeholder")}
    onkeydown={onKey}
    oninput={() => { invalid = false; }}
    class="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
  />
  <datalist id="tag-insert-suggestions">
    {#each home.tagSuggestions as name (name)}
      <option value={name}></option>
    {/each}
  </datalist>
  {#if invalid}
    <p class="mt-1 text-xs text-red-600 dark:text-red-400">{t("tags.insert.invalid")}</p>
  {/if}
  <button
    data-testid="tag-insert-confirm"
    onclick={confirm}
    class="mt-2 w-full px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
  >{t("tags.insert.confirm")}</button>
</div>
