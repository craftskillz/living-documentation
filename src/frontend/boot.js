// ── Boot & global listeners ─────────────────────────────────────────────────
// Depends on globals from state.js (allDocs, stabiloAnnotations), dark-mode.js
// (applyDarkMode, loadDarkPref, setupDarkToggle), search.js (setupSearch),
// wordcloud.js (wcRestorePrefs), config.js (loadConfig), documents.js
// (loadDocuments, openDocument), annotations.js (showReadPopup,
// scheduleHideReadPopup), image-paste.js (openLightbox, closeLightbox,
// imgPasteConfirm, imgPasteCancel).

document.addEventListener("DOMContentLoaded", async () => {
  applyDarkMode(loadDarkPref());
  setupDarkToggle();
  setupSearch();
  wcRestorePrefs();
  await loadConfig();
  await loadDocuments();

  // Deep-link via ?doc=id, otherwise open first General doc
  const params = new URLSearchParams(location.search);
  const docId = params.get("doc");
  if (docId) {
    openDocument(docId, true);
  } else {
    const first =
      allDocs.find((d) => d.category === "General") ?? allDocs[0];
    if (first) openDocument(first.id, true);
  }

  // Event delegation for annotation marks — survives innerHTML replacements on doc-content
  const contentEl = document.getElementById("doc-content");
  if (contentEl) {
    contentEl.addEventListener("mouseover", (e) => {
      const mark = e.target.closest("mark[data-annotation-id]");
      if (!mark) return;
      const ann = stabiloAnnotations.find(
        (a) => a.id === mark.dataset.annotationId,
      );
      if (ann) showReadPopup(ann, mark);
    });
    contentEl.addEventListener("mouseout", (e) => {
      if (!e.target.closest("mark[data-annotation-id]")) return;
      if (
        e.relatedTarget &&
        e.relatedTarget.closest("mark[data-annotation-id]")
      )
        return;
      scheduleHideReadPopup();
    });
  }
});

// ── Image lightbox (Shift+Click) / follow link (Click) ──────────────────────
// Capture phase so we intercept before link handlers on child <a> elements
document.getElementById("doc-content").addEventListener(
  "click",
  (e) => {
    const img = e.target.closest("img");
    if (!img) return;
    if (e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      openLightbox(img.src, img.alt);
    }
  },
  true,
);

// Escape closes lightbox
document.addEventListener("keydown", (e) => {
  if (
    e.key === "Escape" &&
    !document.getElementById("img-lightbox").classList.contains("hidden")
  ) {
    closeLightbox();
  }
});

// Image-paste name confirm / cancel
document
  .getElementById("img-paste-name")
  .addEventListener("keydown", (e) => {
    if (e.key === "Enter") imgPasteConfirm();
    if (e.key === "Escape") imgPasteCancel();
  });

// Browser back/forward
window.addEventListener("popstate", (e) => {
  const id =
    e.state?.docId || new URLSearchParams(location.search).get("doc");
  if (id) openDocument(id, true);
});
