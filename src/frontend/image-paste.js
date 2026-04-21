// ── Image paste + lightbox ──────────────────────────────────────────────────
// Handles Cmd/Ctrl+V image paste in the markdown editor and the image
// lightbox overlay used when clicking an image in a rendered document.

// State for the image paste confirmation flow
let _imgPasteBlob = null;
let _imgPasteExt = "png";
let _imgPasteCursorStart = 0;
let _imgPasteCursorEnd = 0;

async function handleEditorPaste(e) {
  const items = Array.from(e.clipboardData?.items ?? []);
  const imageItem = items.find((item) => item.type.startsWith("image/"));
  if (!imageItem) return;

  e.preventDefault();

  const editor = document.getElementById("doc-editor");
  _imgPasteCursorStart = editor.selectionStart;
  _imgPasteCursorEnd = editor.selectionEnd;
  _imgPasteExt =
    imageItem.type.split("/")[1].replace("jpeg", "jpg") || "png";
  _imgPasteBlob = imageItem.getAsFile();
  if (!_imgPasteBlob) return;

  // Propose a default name: timestamp in ms
  const defaultName = Date.now().toString();
  document.getElementById("img-paste-name").value = defaultName;
  document.getElementById("img-paste-ext").textContent =
    "." + _imgPasteExt;
  document.getElementById("img-paste-modal").classList.remove("hidden");

  // Focus the name input and select all for quick renaming
  const nameInput = document.getElementById("img-paste-name");
  nameInput.focus();
  nameInput.select();
}

function imgPasteCancel() {
  document.getElementById("img-paste-modal").classList.add("hidden");
  _imgPasteBlob = null;
}

async function imgPasteConfirm() {
  const name =
    document.getElementById("img-paste-name").value.trim() ||
    Date.now().toString();
  document.getElementById("img-paste-modal").classList.add("hidden");

  const editor = document.getElementById("doc-editor");
  const msgEl = document.getElementById("edit-save-msg");

  msgEl.textContent = window.t('doc.uploading_image');
  msgEl.className = "text-xs text-gray-400";

  try {
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(_imgPasteBlob);
    });

    const res = await fetch("/api/images/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: base64, ext: _imgPasteExt, name }),
    });
    if (!res.ok) throw new Error(await res.text());

    const { filename } = await res.json();
    const mdImage = `![image](./images/${filename})`;

    const before = editor.value.slice(0, _imgPasteCursorStart);
    const after = editor.value.slice(_imgPasteCursorEnd);
    editor.value = before + mdImage + after;
    editor.selectionStart = editor.selectionEnd =
      _imgPasteCursorStart + mdImage.length;
    editor.focus();
    msgEl.textContent = "";
  } catch (err) {
    msgEl.textContent = window.t('doc.image_upload_failed') + err.message;
    msgEl.className = "text-xs text-red-500 dark:text-red-400";
  } finally {
    _imgPasteBlob = null;
  }
}

// ── Lightbox ────────────────────────────────────────────────────────────────
function openLightbox(src, alt) {
  const lb = document.getElementById("img-lightbox");
  document.getElementById("img-lightbox-img").src = src;
  document.getElementById("img-lightbox-img").alt = alt || "";
  lb.classList.remove("hidden");
}

function closeLightbox() {
  const lb = document.getElementById("img-lightbox");
  lb.classList.add("hidden");
  document.getElementById("img-lightbox-img").src = "";
}
