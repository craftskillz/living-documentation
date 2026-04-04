// ── Toast notifications ───────────────────────────────────────────────────────
// Minimal sonner-style toasts, no dependencies.

export function showToast(message, type = 'success', duration = 3500) {
  const container = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = 'ld-toast ld-toast--' + type;
  el.textContent = message;
  container.appendChild(el);

  // Animate in on next frame
  requestAnimationFrame(() => el.classList.add('ld-toast--visible'));

  const hide = () => {
    el.classList.remove('ld-toast--visible');
    el.addEventListener('transitionend', () => el.remove(), { once: true });
  };

  const timer = setTimeout(hide, duration);
  el.addEventListener('click', () => { clearTimeout(timer); hide(); });
}
