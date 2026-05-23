// ── Generic confirmation modal ──────────────────────────────────────────────
// Promise-based replacement for window.confirm(). Any module can call:
//   const ok = await showConfirm({ title, message, detail, confirmLabel, danger, detailTone });
// The modal sits at z-[60] so it stacks above other app modals (z-50).
// `detailTone: "warning"` renders the detail block as an amber callout when the
// secondary message carries a consequence the user should not miss.

let _confirmResolve = null;

const _DETAIL_NEUTRAL_CLS =
  "text-xs text-gray-500 dark:text-gray-400 italic break-all";
const _DETAIL_WARNING_CLS =
  "text-xs text-amber-800 dark:text-amber-200 break-all bg-amber-50 dark:bg-amber-900/30 border-l-4 border-amber-500 rounded-r px-3 py-2";

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
  detailEl.className =
    o.detailTone === "warning" ? _DETAIL_WARNING_CLS : _DETAIL_NEUTRAL_CLS;

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
