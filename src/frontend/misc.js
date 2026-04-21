// ── Misc viewer helpers ─────────────────────────────────────────────────────

function toggleFullWidth() {
  const article = document.getElementById("doc-view");
  const btn = document.getElementById("full-width-btn");
  const isWide = article.classList.toggle("max-w-none");
  article.classList.toggle("max-w-4xl", !isWide);
  article.classList.toggle("mx-auto", !isWide);
  btn.textContent = isWide ? window.t('doc.full_width_narrow_btn') : window.t('doc.full_width_btn');
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
