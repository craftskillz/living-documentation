// ── Files modal ─────────────────────────────────────────────────────────────
// Lists files stored under DOCS_FOLDER/files/, sorted by upload order (the
// server-assigned filename starts with a YYYYMMDDHHmmss timestamp, so a lex
// sort is chronological). Supports replacing a file with a new version
// (overwrites in place, no history kept) and deleting it.

const _filesMaxBytes = 19 * 1024 * 1024;

function _filesT(key) {
  return window.t ? window.t(key) : key;
}

function _filesEscape(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function _filesFormatSize(bytes) {
  if (bytes < 1024) {
    return _filesT("files.size_bytes").replace("{n}", String(bytes));
  }
  if (bytes < 1024 * 1024) {
    return _filesT("files.size_kb").replace("{n}", (bytes / 1024).toFixed(1));
  }
  return _filesT("files.size_mb").replace(
    "{n}",
    (bytes / 1024 / 1024).toFixed(2),
  );
}

function _filesFormatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

function _filesReadAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function _filesRender() {
  const body = document.getElementById("files-modal-body");
  if (!body) return;
  body.innerHTML = `<p class="text-sm text-gray-400">${_filesEscape(_filesT("common.loading"))}</p>`;

  let list = [];
  try {
    const res = await fetch("/api/files");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    list = Array.isArray(data.files) ? data.files : [];
  } catch (err) {
    body.innerHTML = `<p class="text-sm text-red-500 dark:text-red-400">${_filesEscape(_filesT("files.error_load"))}${_filesEscape(err.message || String(err))}</p>`;
    return;
  }

  if (list.length === 0) {
    body.innerHTML = `<p class="text-sm text-gray-500 dark:text-gray-400">${_filesEscape(_filesT("files.empty"))}</p>`;
    return;
  }

  const rows = list
    .map((f) => {
      const name = _filesEscape(f.displayName || f.filename);
      const date = _filesEscape(_filesFormatDate(f.uploadedAt));
      const size = _filesEscape(_filesFormatSize(f.size || 0));
      const url = _filesEscape(f.url);
      const filenameAttr = _filesEscape(f.filename);
      return `
        <li class="py-3 flex items-center gap-3">
          <i class="fa-solid fa-paperclip text-purple-500 shrink-0"></i>
          <div class="flex-1 min-w-0">
            <a href="${url}" target="_blank" rel="noopener"
               class="block text-sm text-gray-900 dark:text-gray-100 hover:underline truncate">
              ${name}
            </a>
            <div class="text-xs text-gray-500 dark:text-gray-400">${date}${date ? " · " : ""}${size}</div>
          </div>
          <button
            type="button"
            data-files-replace="${filenameAttr}"
            data-files-display="${name}"
            class="text-xs px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shrink-0"
          >${_filesEscape(_filesT("files.replace"))}</button>
          <button
            type="button"
            data-files-delete="${filenameAttr}"
            data-files-display="${name}"
            class="text-xs px-2 py-1 rounded-lg border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
          >${_filesEscape(_filesT("files.delete"))}</button>
        </li>`;
    })
    .join("");

  body.innerHTML = `<ul class="divide-y divide-gray-100 dark:divide-gray-800">${rows}</ul>`;

  body.querySelectorAll("[data-files-replace]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const filename = btn.getAttribute("data-files-replace");
      const display = btn.getAttribute("data-files-display") || filename;
      _filesReplace(filename, display, btn);
    });
  });
  body.querySelectorAll("[data-files-delete]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const filename = btn.getAttribute("data-files-delete");
      const display = btn.getAttribute("data-files-display") || filename;
      _filesDelete(filename, display, btn);
    });
  });
}

function _filesReplace(filename, displayName, triggerBtn) {
  const input = document.createElement("input");
  input.type = "file";
  input.style.display = "none";
  document.body.appendChild(input);
  input.addEventListener("change", async () => {
    const file = input.files && input.files[0];
    input.remove();
    if (!file) return;

    const ok = await window.showConfirm({
      title: _filesT("files.confirm_replace_title"),
      message: _filesT("files.confirm_replace_message")
        .replace("{name}", displayName)
        .replace("{newName}", file.name),
      detail: _filesT("files.confirm_replace_detail"),
      confirmLabel: _filesT("files.replace"),
      danger: true,
    });
    if (!ok) return;

    if (file.size > _filesMaxBytes) {
      const mb = (file.size / 1024 / 1024).toFixed(1);
      window.alert(
        _filesT("files.error_replace") + `${mb} MB (max 19 MB)`,
      );
      return;
    }

    const originalLabel = triggerBtn.textContent;
    triggerBtn.disabled = true;
    triggerBtn.textContent = _filesT("files.replacing");
    try {
      const base64 = await _filesReadAsBase64(file);
      const res = await fetch(
        "/api/files/" + encodeURIComponent(filename),
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: base64 }),
        },
      );
      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
          const body = await res.json();
          if (body.error) msg = body.error;
        } catch { /* ignore */ }
        throw new Error(msg);
      }
      closeFilesModal();
      if (window.runSearchImmediate) {
        window.runSearchImmediate("metadata://" + filename);
      }
    } catch (err) {
      triggerBtn.disabled = false;
      triggerBtn.textContent = originalLabel;
      window.alert(_filesT("files.error_replace") + (err.message || String(err)));
    }
  });
  input.click();
}

async function _filesDelete(filename, displayName, triggerBtn) {
  const ok = await window.showConfirm({
    title: _filesT("files.confirm_delete_title"),
    message: _filesT("files.confirm_delete_message").replace(
      "{name}",
      displayName,
    ),
    detail: _filesT("files.confirm_delete_detail"),
    confirmLabel: _filesT("files.delete"),
    danger: true,
  });
  if (!ok) return;

  const originalLabel = triggerBtn.textContent;
  triggerBtn.disabled = true;
  triggerBtn.textContent = _filesT("files.deleting");
  try {
    const res = await fetch("/api/files/" + encodeURIComponent(filename), {
      method: "DELETE",
    });
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try {
        const body = await res.json();
        if (body.error) msg = body.error;
      } catch { /* ignore */ }
      throw new Error(msg);
    }
    closeFilesModal();
    if (window.runSearchImmediate) {
      window.runSearchImmediate("metadata://" + filename);
    }
  } catch (err) {
    triggerBtn.disabled = false;
    triggerBtn.textContent = originalLabel;
    window.alert(_filesT("files.error_delete") + (err.message || String(err)));
  }
}

function openFilesModal() {
  const modal = document.getElementById("files-modal");
  if (!modal) return;
  modal.classList.remove("hidden");
  _filesRender();
}

function closeFilesModal() {
  const modal = document.getElementById("files-modal");
  if (!modal) return;
  modal.classList.add("hidden");
}

window.openFilesModal = openFilesModal;
window.closeFilesModal = closeFilesModal;
