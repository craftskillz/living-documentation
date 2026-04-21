// ── File attachments ────────────────────────────────────────────────────────
// Attach arbitrary files (pdf, docx, zip, …) to a document via drag & drop,
// paste or the Snippets panel. Files are saved under DOCS_FOLDER/files/ and
// inserted as `[📎 name.ext](./files/<server-name>.<ext>)` in the markdown.
//
// Client-side size guard matches server-side MAX_FILE_BYTES (19 MB) so the
// user gets an immediate toast when Express would otherwise reject the body.

const FILE_MAX_BYTES = 19 * 1024 * 1024;

function _fileAttachNotify(message, isError) {
  const msgEl = document.getElementById("edit-save-msg");
  if (msgEl) {
    msgEl.textContent = message;
    msgEl.className = isError
      ? "text-xs text-red-500 dark:text-red-400"
      : "text-xs text-gray-400";
  }
}

function _fileAttachReadAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function _fileAttachInsertAtCursor(markdown, start, end) {
  const editor = document.getElementById("doc-editor");
  if (!editor) return;
  const s = typeof start === "number" ? start : editor.selectionStart;
  const e = typeof end === "number" ? end : editor.selectionEnd;
  const before = editor.value.slice(0, s);
  const after = editor.value.slice(e);
  editor.value = before + markdown + after;
  editor.selectionStart = editor.selectionEnd = s + markdown.length;
  editor.focus();
}

async function uploadAttachedFile(file, cursorStart, cursorEnd) {
  if (!file) return;

  if (file.size > FILE_MAX_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    _fileAttachNotify(
      (window.t ? window.t("doc.file_too_large") : "File too large") +
        ` (${mb} MB, max 19 MB)`,
      true,
    );
    return;
  }

  _fileAttachNotify(
    window.t ? window.t("doc.uploading_file") : "Uploading file…",
    false,
  );

  try {
    const base64 = await _fileAttachReadAsBase64(file);
    const res = await fetch("/api/files/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: base64, name: file.name }),
    });
    if (!res.ok) {
      let msg = "";
      try {
        const body = await res.json();
        msg = body.error || "";
      } catch {
        msg = await res.text();
      }
      throw new Error(msg || `HTTP ${res.status}`);
    }
    const { url, originalName } = await res.json();
    const label = originalName || file.name;
    const markdown = `[📎 ${label}](${url})`;
    _fileAttachInsertAtCursor(markdown, cursorStart, cursorEnd);
    _fileAttachNotify("", false);
  } catch (err) {
    _fileAttachNotify(
      (window.t ? window.t("doc.file_upload_failed") : "File upload failed: ") +
        (err.message || String(err)),
      true,
    );
  }
}

function _fileAttachHandleDrop(e) {
  const editor = document.getElementById("doc-editor");
  if (!editor || editor.classList.contains("hidden")) return;
  const files = Array.from(e.dataTransfer?.files ?? []);
  if (files.length === 0) return;

  // Images keep flowing through image-paste.js → ignore them here.
  const nonImage = files.filter((f) => !f.type.startsWith("image/"));
  if (nonImage.length === 0) return;

  e.preventDefault();
  e.stopPropagation();

  // Drop uses the current caret, not the drop coordinates — keeps things simple.
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  (async () => {
    let offset = 0;
    for (const file of nonImage) {
      await uploadAttachedFile(file, start + offset, end + offset);
      // After insertion the caret is positioned AFTER the inserted markdown;
      // re-read it for the next file so multiple drops append correctly.
      offset = 0;
    }
  })();
}

function _fileAttachHandlePaste(e) {
  const editor = document.getElementById("doc-editor");
  if (!editor) return;
  const files = Array.from(e.clipboardData?.files ?? []);
  if (files.length === 0) return;
  const nonImage = files.filter((f) => !f.type.startsWith("image/"));
  if (nonImage.length === 0) return;

  e.preventDefault();
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  (async () => {
    for (const file of nonImage) {
      await uploadAttachedFile(file, start, end);
    }
  })();
}

function _fileAttachHandleDragOver(e) {
  const editor = document.getElementById("doc-editor");
  if (!editor || editor.classList.contains("hidden")) return;
  if (e.dataTransfer?.types?.includes("Files")) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }
}

function initFileAttach() {
  const editor = document.getElementById("doc-editor");
  if (!editor) return;
  editor.addEventListener("drop", _fileAttachHandleDrop);
  editor.addEventListener("dragover", _fileAttachHandleDragOver);
  editor.addEventListener("paste", _fileAttachHandlePaste);
}

// Triggered by the 📎 snippet button — opens the native file picker.
function openFilePicker() {
  const editor = document.getElementById("doc-editor");
  if (!editor) return;
  const start = editor.selectionStart;
  const end = editor.selectionEnd;

  let input = document.getElementById("file-attach-picker");
  if (!input) {
    input = document.createElement("input");
    input.type = "file";
    input.id = "file-attach-picker";
    input.style.display = "none";
    document.body.appendChild(input);
  }
  input.value = "";
  input.onchange = async () => {
    const file = input.files && input.files[0];
    if (file) await uploadAttachedFile(file, start, end);
  };
  input.click();
}

window.initFileAttach = initFileAttach;
window.openFilePicker = openFilePicker;
window.uploadAttachedFile = uploadAttachedFile;
