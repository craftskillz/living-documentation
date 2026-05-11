// ── Misc viewer helpers ─────────────────────────────────────────────────────

const DOC_ID_COPY_FEEDBACK_MS = 1800;

async function writeClipboardText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch {
      copied = false;
    }
    document.body.removeChild(ta);
    return copied;
  }
}

function applyFullWidthState(isWide) {
  const article = document.getElementById("doc-view");
  const btn = document.getElementById("full-width-btn");
  if (!article || !btn) return;
  article.classList.toggle("max-w-none", isWide);
  article.classList.toggle("max-w-4xl", !isWide);
  article.classList.toggle("mx-auto", !isWide);
  btn.textContent = isWide ? window.t('doc.full_width_narrow_btn') : window.t('doc.full_width_btn');
}

function toggleFullWidth() {
  const article = document.getElementById("doc-view");
  const isWide = !article.classList.contains("max-w-none");
  applyFullWidthState(isWide);
  try {
    localStorage.setItem("ld-full-width", isWide ? "1" : "0");
  } catch {
    /* ignore */
  }
}

function initFullWidthState() {
  let isWide = false;
  try {
    isWide = localStorage.getItem("ld-full-width") === "1";
  } catch {
    /* ignore */
  }
  applyFullWidthState(isWide);
}

async function copyLink() {
  const copied = await writeClipboardText(location.href);
  if (!copied) return;
  const btn = document.getElementById("copy-link-btn");
  const orig = btn.innerHTML;
  btn.textContent = window.t('doc.copied');
  setTimeout(() => {
    btn.innerHTML = orig;
  }, DOC_ID_COPY_FEEDBACK_MS);
}

async function copyCurrentDocMcpId() {
  if (!currentDocId) return;
  const btn = document.getElementById("copy-doc-id-btn");
  if (!btn) return;
  const copyLabel = window.t("doc.copy_mcp_id");
  const copiedLabel = window.t("doc.copy_mcp_id_copied");
  const originalHtml = btn.innerHTML;
  const docId = decodeURIComponent(currentDocId);
  const copied = await writeClipboardText(docId);
  if (!copied) return;

  btn.title = copiedLabel;
  btn.classList.add("text-green-600", "dark:text-green-400");
  btn.innerHTML = '<i class="fa-solid fa-check" aria-hidden="true"></i>';
  setTimeout(() => {
    btn.title = copyLabel;
    btn.classList.remove("text-green-600", "dark:text-green-400");
    btn.innerHTML = originalHtml;
  }, DOC_ID_COPY_FEEDBACK_MS);
}

function exportPDF() {
  window.print();
}
