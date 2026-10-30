<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "../i18n.svelte";

  // Small confirmation popup at the click point: propose deleting one opening tag.
  let { x, y, name, onconfirm, oncancel }: {
    x: number;
    y: number;
    name: string;
    onconfirm: () => void;
    oncancel: () => void;
  } = $props();

  let confirmEl = $state<HTMLButtonElement>(null!);
  let popupEl = $state<HTMLElement>(null!);

  function onKey(e: KeyboardEvent) {
    if (e.key === "Escape") { e.preventDefault(); oncancel(); }
  }

  onMount(() => {
    confirmEl?.focus();
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
  data-testid="tag-remove-popup"
  role="dialog"
  tabindex="-1"
  onkeydown={onKey}
  class="fixed z-50 w-64 bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-3 text-sm"
  style="left: {x}px; top: {y}px"
>
  <div class="font-semibold text-gray-800 dark:text-gray-100 mb-2">{t("tags.remove.title", { name })}</div>
  <div class="flex gap-2">
    <button
      bind:this={confirmEl}
      data-testid="tag-remove-confirm"
      onclick={onconfirm}
      class="flex-1 px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700"
    >{t("tags.remove.confirm")}</button>
    <button
      data-testid="tag-remove-cancel"
      onclick={oncancel}
      class="flex-1 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
    >{t("tags.remove.cancel")}</button>
  </div>
</div>
