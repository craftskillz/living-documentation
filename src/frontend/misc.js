// ── Misc viewer helpers ─────────────────────────────────────────────────────

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

function copyLink() {
  navigator.clipboard.writeText(location.href).then(() => {
    const btn = document.getElementById("copy-link-btn");
    const orig = btn.innerHTML;
    btn.textContent = window.t('doc.copied');
    setTimeout(() => {
      btn.innerHTML = orig;
    }, 1800);
  });
}

function exportPDF() {
  window.print();
}
