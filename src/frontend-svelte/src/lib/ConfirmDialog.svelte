<script lang="ts">
  interface ConfirmOptions {
    kicker?: string;
    title: string;
    message?: string;
    cancelLabel?: string;
    confirmLabel: string;
    danger?: boolean;
  }

  let visible = $state(false);
  let options = $state<ConfirmOptions>({ title: "", confirmLabel: "OK" });
  let resolve: ((value: boolean) => void) | null = null;

  export function show(opts: ConfirmOptions): Promise<boolean> {
    options = opts;
    visible = true;
    return new Promise(r => { resolve = r; });
  }

  function confirm() {
    visible = false;
    resolve?.(true);
    resolve = null;
  }

  function cancel() {
    visible = false;
    resolve?.(false);
    resolve = null;
  }
</script>

{#if visible}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="confirm-overlay" onclick={(e) => { if (e.target === e.currentTarget) cancel(); }}>
    <section class="confirm-dialog" role="dialog" aria-modal="true">
      {#if options.kicker}
        <p class="confirm-kicker">{options.kicker}</p>
      {/if}
      <h2>{options.title}</h2>
      {#if options.message}
        <p class="confirm-message">{options.message}</p>
      {/if}
      <footer class="confirm-actions">
        <button class="secondary-button" type="button" onclick={cancel}>
          {options.cancelLabel ?? "Cancel"}
        </button>
        <button
          class={options.danger ? "danger-button" : "primary-button"}
          type="button"
          onclick={confirm}
        >
          {options.confirmLabel}
        </button>
      </footer>
    </section>
  </div>
{/if}
