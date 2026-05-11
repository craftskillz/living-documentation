// ── Generic confirmation modal ──────────────────────────────────────────────
// Promise-based replacement for window.confirm(). Any module can call:
//   const ok = await showConfirm({ title, message, detail, confirmLabel, danger });
// The modal sits at z-[60] so it stacks above other app modals (z-50).

let _confirmResolve = null;

function _confirmT(key, fallback) {
  return window.t ? window.t(key) : fallback;
}

function _confirmClose(result) {
  const modal = document.getElementById("confirm-modal");
  if (modal) modal.classList.add("hidden");
  document.removeEventListener("keydown", _confirmKeyHandler);
  const fn = _confirmResolve;
  _confirmResolve = null;
  if (fn) fn(result);
}

function _confirmKeyHandler(e) {
  if (e.key === "Escape") {
    e.preventDefault();
    _confirmClose(false);
  } else if (e.key === "Enter") {
    e.preventDefault();
    _confirmClose(true);
  }
}

function _confirmModalBackdrop(e) {
  if (e.target && e.target.id === "confirm-modal") _confirmClose(false);
}

function showConfirm(opts) {
  const o = opts || {};
  const modal = document.getElementById("confirm-modal");
  if (!modal) return Promise.resolve(false);

  const titleEl = document.getElementById("confirm-modal-title");
  const messageEl = document.getElementById("confirm-modal-message");
  const detailEl = document.getElementById("confirm-modal-detail");
  const cancelBtn = document.getElementById("confirm-modal-cancel");
  const okBtn = document.getElementById("confirm-modal-ok");

  titleEl.textContent = o.title || "";
  titleEl.style.display = o.title ? "" : "none";
  messageEl.textContent = o.message || "";
  messageEl.style.display = o.message ? "" : "none";
  detailEl.textContent = o.detail || "";
  detailEl.style.display = o.detail ? "" : "none";

  cancelBtn.textContent = o.cancelLabel || _confirmT("common.cancel", "Cancel");
  okBtn.textContent = o.confirmLabel || _confirmT("common.confirm", "Confirm");
  const baseCls = "text-sm px-4 py-1.5 rounded-lg text-white font-semibold transition-colors";
  okBtn.className = o.danger
    ? `${baseCls} bg-red-500 hover:bg-red-600`
    : `${baseCls} bg-blue-600 hover:bg-blue-700`;

  modal.classList.remove("hidden");
  setTimeout(() => okBtn.focus(), 0);

  return new Promise((resolve) => {
    if (_confirmResolve) _confirmResolve(false); // resolve any pending
    _confirmResolve = resolve;
    cancelBtn.onclick = () => _confirmClose(false);
    okBtn.onclick = () => _confirmClose(true);
    document.addEventListener("keydown", _confirmKeyHandler);
  });
}

window.showConfirm = showConfirm;
window._confirmModalBackdrop = _confirmModalBackdrop;
