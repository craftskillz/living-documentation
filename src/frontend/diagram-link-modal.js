// ── Diagram link modal ──────────────────────────────────────────────────────
// Depends on globals from state.js (currentDocId, currentDocContent) and
// utils.js (esc).

let _diagrams = [];

async function openDiagramLinkModal() {
  if (!currentDocId) return;
  // Fetch diagram list
  try {
    _diagrams = await fetch("/api/diagrams").then((r) => r.json());
  } catch {
    _diagrams = [];
  }

  const sel = document.getElementById("diag-select");
  sel.innerHTML = _diagrams.length
    ? _diagrams
        .map(
          (d) => `<option value="${esc(d.id)}">${esc(d.title)}</option>`,
        )
        .join("")
    : `<option value="" disabled>${window.t('modal.diag_link.no_diagrams')}</option>`;

  // Pre-fill image name from current doc title
  const docTitle = document
    .getElementById("doc-title")
    .textContent.trim();
  const slug = docTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  document.getElementById("diag-img-name").value = slug
    ? slug + ".png"
    : "diagram.png";
  document.getElementById("diag-new-name").value = docTitle
    ? docTitle + " Diagram"
    : "";

  // Default mode
  document.getElementById("diag-mode-existing").checked = true;
  diagModeChanged();

  document.getElementById("diag-link-modal").classList.remove("hidden");
}

function closeDiagramLinkModal() {
  document.getElementById("diag-link-modal").classList.add("hidden");
}

function diagModeChanged() {
  const isNew = document.getElementById("diag-mode-new").checked;
  document
    .getElementById("diag-existing-section")
    .classList.toggle("hidden", isNew);
  document
    .getElementById("diag-new-section")
    .classList.toggle("hidden", !isNew);
  diagUpdatePreview();
}

function diagUpdatePreview() {
  const isNew = document.getElementById("diag-mode-new").checked;
  const imgName =
    document.getElementById("diag-img-name").value.trim() ||
    "diagram.png";
  let diagId, diagLabel;
  if (isNew) {
    diagId = "d" + Date.now();
    diagLabel =
      document.getElementById("diag-new-name").value.trim() || "Diagram";
  } else {
    const sel = document.getElementById("diag-select");
    diagId = sel.value;
    diagLabel = sel.options[sel.selectedIndex]?.text || "Diagram";
  }
  const md = `\n\n[![${diagLabel}](./images/${imgName})](/diagram?id=${diagId})`;
  document.getElementById("diag-preview").textContent = md.trim();
  // store for insertDiagramLink
  document.getElementById("diag-insert-btn").dataset.diagId = diagId;
  document.getElementById("diag-insert-btn").dataset.diagLabel =
    diagLabel;
  document.getElementById("diag-insert-btn").dataset.imgName = imgName;
  document.getElementById("diag-insert-btn").dataset.isNew = isNew
    ? "1"
    : "0";
}

async function insertDiagramLink() {
  const btn = document.getElementById("diag-insert-btn");
  const diagId = btn.dataset.diagId;
  const diagLabel = btn.dataset.diagLabel;
  const imgName = btn.dataset.imgName;
  const isNew = btn.dataset.isNew === "1";

  btn.disabled = true;
  btn.textContent = window.t('modal.diag_link.saving_btn');

  try {
    // Create new diagram if needed
    if (isNew) {
      await fetch(`/api/diagrams/${diagId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: diagLabel, nodes: [], edges: [] }),
      });
    }

    // Append markdown to document and save
    const md = `\n\n[![${diagLabel}](./images/${imgName})](/diagram?id=${diagId})`;
    const newContent = currentDocContent + md;
    const res = await fetch("/api/documents/" + currentDocId, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newContent }),
    });
    if (!res.ok) throw new Error(await res.text());
    currentDocContent = newContent;

    // Re-render the document so the page is up-to-date when the user navigates back
    const doc = await fetch("/api/documents/" + currentDocId).then((r) =>
      r.json(),
    );
    const contentEl = document.getElementById("doc-content");
    contentEl.innerHTML = doc.html;
    contentEl
      .querySelectorAll("pre code")
      .forEach((b) => hljs.highlightElement(b));

    closeDiagramLinkModal();
    window.location.href = `/diagram?id=${diagId}`;
  } catch (err) {
    btn.disabled = false;
    btn.textContent = window.t('modal.diag_link.insert_btn');
    alert(window.t('common.error_prefix') + err.message);
  }
}
