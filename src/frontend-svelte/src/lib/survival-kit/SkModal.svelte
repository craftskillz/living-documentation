<script lang="ts">
  import { t } from "../i18n.svelte";

  let {
    open = false,
    title = "",
    confirmLabel = t("common.save"),
    danger = false,
    onConfirm,
    onClose,
    children,
  }: {
    open?: boolean;
    title?: string;
    confirmLabel?: string;
    danger?: boolean;
    onConfirm: () => void;
    onClose: () => void;
    children: import("svelte").Snippet;
  } = $props();

  function onBackdrop(e: MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }
  function onKey(e: KeyboardEvent) {
    if (e.key === "Escape") onClose();
  }
</script>

{#if open}
  <div
    class="sk-modal-backdrop"
    role="presentation"
    onclick={onBackdrop}
    onkeydown={onKey}
  >
    <div class="sk-modal" role="dialog" aria-modal="true">
      <h3 class="sk-modal-title">{title}</h3>
      <div class="sk-modal-body">
        {@render children()}
      </div>
      <div class="sk-modal-actions">
        <button type="button" class="sk-btn" onclick={onClose}>{t("common.cancel")}</button>
        <button
          type="button"
          class="sk-btn sk-btn--primary"
          class:sk-btn--danger={danger}
          onclick={onConfirm}>{confirmLabel}</button
        >
      </div>
    </div>
  </div>
{/if}

<style>
  .sk-modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgb(15 23 42 / 45%);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 16px;
  }
  .sk-modal {
    width: 100%;
    max-width: 440px;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 14px;
    box-shadow: var(--shadow);
    padding: 22px 24px;
  }
  .sk-modal-title {
    margin: 0 0 16px;
    font-size: 15px;
    font-weight: 600;
    color: var(--ink);
  }
  .sk-modal-body :global(label) {
    display: block;
    font-size: 12px;
    font-weight: 500;
    color: var(--muted);
    margin: 12px 0 4px;
  }
  .sk-modal-body :global(input),
  .sk-modal-body :global(select),
  .sk-modal-body :global(textarea) {
    width: 100%;
    padding: 8px 10px;
    font-size: 13px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--panel-soft);
    color: var(--ink);
    font-family: inherit;
  }
  .sk-modal-body :global(textarea) {
    resize: vertical;
    min-height: 110px;
    font-family: "SF Mono", Consolas, monospace;
  }
  .sk-modal-body :global(input:focus),
  .sk-modal-body :global(select:focus),
  .sk-modal-body :global(textarea:focus) {
    outline: none;
    border-color: var(--accent);
  }
  .sk-modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 22px;
  }
  .sk-btn {
    font-size: 12px;
    padding: 7px 16px;
    border-radius: 8px;
    border: 1px solid var(--line-strong);
    background: var(--panel-soft);
    color: var(--ink);
    cursor: pointer;
    font-family: inherit;
  }
  .sk-btn:hover {
    background: var(--accent-soft);
  }
  .sk-btn--primary {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
  }
  .sk-btn--primary:hover {
    background: var(--accent-strong);
  }
  .sk-btn--danger {
    background: var(--red);
    border-color: var(--red);
  }
  .sk-btn--danger:hover {
    background: var(--red);
    opacity: 0.9;
  }
</style>
