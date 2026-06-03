<script lang="ts">
  interface ConfirmOptions {
    kicker?: string;
    title: string;
    message?: string;
    /** Optional secondary callout rendered as an amber warning below the message. */
    detail?: string;
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
    <section class="confirm-dialog" id="confirm-modal" data-testid="confirm-modal" role="dialog" aria-modal="true">
      {#if options.kicker}
        <p class="confirm-kicker">{options.kicker}</p>
      {/if}
      <h2>{options.title}</h2>
      {#if options.message}
        <p class="confirm-message" id="confirm-modal-message" data-testid="confirm-modal-message">{options.message}</p>
      {/if}
      {#if options.detail}
        <p
          id="confirm-modal-detail"
          data-testid="confirm-modal-detail"
          class="bg-amber-50 border border-amber-300 text-amber-800 rounded-lg px-3 py-2 text-sm"
        >{options.detail}</p>
      {/if}
      <footer class="confirm-actions">
        <button class="secondary-button" id="confirm-modal-cancel" data-testid="confirm-modal-cancel" type="button" onclick={cancel}>
          {options.cancelLabel ?? "Cancel"}
        </button>
        <button
          class={options.danger ? "danger-button" : "primary-button"}
          id="confirm-modal-ok"
          data-testid="confirm-modal-ok"
          type="button"
          onclick={confirm}
        >
          {options.confirmLabel}
        </button>
      </footer>
    </section>
  </div>
{/if}
