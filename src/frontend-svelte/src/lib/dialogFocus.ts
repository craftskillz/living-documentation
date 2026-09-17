/** Trap keyboard focus while a modal is mounted, then restore the opener. */
export function dialogFocus(node: HTMLElement, onEscape: () => void) {
  const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const focusable = () => Array.from(node.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]')).filter((item) => item.getClientRects().length > 0);
  queueMicrotask(() => focusable()[0]?.focus());
  const keydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onEscape(); }
    if (event.key !== 'Tab') return;
    const items = focusable();
    const first = items[0], last = items[items.length - 1];
    if (!first) { event.preventDefault(); return; }
    if (event.shiftKey && (document.activeElement === first || !node.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && (document.activeElement === last || !node.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
  };
  node.addEventListener('keydown', keydown);
  return { destroy() { node.removeEventListener('keydown', keydown); if (previous?.isConnected) previous.focus(); } };
}
