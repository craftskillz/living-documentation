// ── Marker (stabilo) annotations ────────────────────────────────────────────
// Depends on globals from state.js (currentDocId, annotationCounts) and
// sidebar state (refreshSidebar from state.js).

let stabiloActive = false;
let stabiloHidden = false; // state 3: highlights hidden
let stabiloPendingRange = null;
let stabiloAnnotations = [];
let stabiloDeleteTargetId = null;
let stabiloReadPopupAnnotationId = null;
let stabiloReadHideTimer = null;

// Cycles: normal → active → hidden → normal
function toggleMarker() {
  const btn = document.getElementById("stabilo-btn");
  const fills = btn.querySelectorAll("rect, polygon");
  const crossEl = document.getElementById("stabilo-cross");

  if (!stabiloActive && !stabiloHidden) {
    // normal → active
    stabiloActive = true;
    btn.classList.remove(
      "border-gray-200",
      "dark:border-gray-700",
      "text-gray-600",
      "dark:text-gray-400",
    );
    btn.classList.add(
      "border-yellow-400",
      "bg-yellow-100",
      "dark:bg-yellow-900/40",
      "text-yellow-700",
      "dark:text-yellow-300",
    );
    fills.forEach((el) =>
      el.setAttribute(
        "fill",
        el.tagName === "polygon" ? "#fde047" : "#fef08a",
      ),
    );
    crossEl.style.display = "none";
  } else if (stabiloActive) {
    // active → hidden
    stabiloActive = false;
    stabiloHidden = true;
    btn.classList.remove(
      "border-yellow-400",
      "bg-yellow-100",
      "dark:bg-yellow-900/40",
      "text-yellow-700",
      "dark:text-yellow-300",
    );
    btn.classList.add(
      "border-gray-200",
      "dark:border-gray-700",
      "text-gray-600",
      "dark:text-gray-400",
    );
    fills.forEach((el) =>
      el.setAttribute(
        "fill",
        el.tagName === "polygon"
          ? "#93c5fd"
          : el.previousElementSibling
            ? "#93c5fd"
            : "#bfdbfe",
      ),
    );
    crossEl.style.display = "block";
    closeMarkerPopup();
    setHighlightsVisible(false);
  } else {
    // hidden → normal
    stabiloHidden = false;
    crossEl.style.display = "none";
    setHighlightsVisible(true);
  }
}

function setHighlightsVisible(visible) {
  document.querySelectorAll("mark[data-annotation-id]").forEach((m) => {
    m.style.background = visible ? "rgba(250,204,21,0.5)" : "transparent";
    m.style.cursor = visible ? "pointer" : "default";
    m.style.pointerEvents = visible ? "auto" : "none";
  });
  const elevator = document.getElementById("stabilo-elevator");
  if (elevator)
    elevator.style.visibility = visible ? "visible" : "hidden";
}

// Load and apply annotations for current doc
async function loadAnnotations(docId) {
  stabiloAnnotations = [];
  try {
    stabiloAnnotations = await fetch(
      "/api/annotations/" + encodeURIComponent(docId),
    ).then((r) => r.json());
  } catch {
    stabiloAnnotations = [];
  }
  applyAnnotationHighlights();
  renderElevator();
}

// Re-apply all highlight marks in the rendered content
function applyAnnotationHighlights() {
  const contentEl = document.getElementById("doc-content");
  if (!contentEl) return;

  // Remove existing marks (unwrap, keep text content)
  contentEl
    .querySelectorAll("mark[data-annotation-id]")
    .forEach((mark) => {
      const parent = mark.parentNode;
      parent.replaceChild(
        document.createTextNode(mark.textContent),
        mark,
      );
      parent.normalize();
    });

  for (const ann of stabiloAnnotations) {
    highlightAnnotation(contentEl, ann);
  }

  // Remove empty marks left by block-boundary splitting
  contentEl
    .querySelectorAll("mark[data-annotation-id]")
    .forEach((mark) => {
      if (!mark.textContent.trim()) mark.remove();
    });
}

function highlightAnnotation(contentEl, ann) {
  const selText = (ann.selectedText || "").replace(/\s+/g, " ").trim();
  const ctxBefore = (ann.contextBefore || "")
    .replace(/\s+/g, " ")
    .trim();
  const ctxAfter = (ann.contextAfter || "").replace(/\s+/g, " ").trim();
  if (!selText) return;

  const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Build a pattern that allows any whitespace between words
  const toPat = (s) =>
    s
      .split(/\s+/)
      .filter(Boolean)
      .map(escRe)
      .join("\\s+");

  const text = contentEl.textContent;
  const selPat = toPat(selText);
  let match;

  // Try with context first for disambiguation
  if (ctxBefore || ctxAfter) {
    const fullPat =
      (ctxBefore ? toPat(ctxBefore) + "\\s*" : "") +
      "(" + selPat + ")" +
      (ctxAfter ? "\\s*" + toPat(ctxAfter) : "");
    try {
      match = new RegExp(fullPat, "d").exec(text);
    } catch {
      /* fall through */
    }
  }
  if (!match) {
    try {
      match = new RegExp("(" + selPat + ")", "d").exec(text);
    } catch {
      return;
    }
  }
  if (!match || !match.indices || !match.indices[1]) return;

  const [startOff, endOff] = match.indices[1];

  // Locate the text-node slices that cover [startOff, endOff)
  const walker = document.createTreeWalker(
    contentEl,
    NodeFilter.SHOW_TEXT,
  );
  const slices = [];
  let pos = 0;
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const len = node.nodeValue.length;
    const nStart = pos;
    const nEnd = pos + len;
    pos = nEnd;
    if (nEnd <= startOff) continue;
    if (nStart >= endOff) break;
    const sStart = Math.max(0, startOff - nStart);
    const sEnd = Math.min(len, endOff - nStart);
    if (sStart < sEnd) slices.push({ node, start: sStart, end: sEnd });
  }

  // Wrap each slice in its own <mark> within its current parent block.
  // This produces valid DOM regardless of table/code/list/heading boundaries.
  const markStyle =
    "background:rgba(250,204,21,0.5);border-radius:2px;cursor:pointer;padding:0 1px;";
  for (const { node, start, end } of slices) {
    let target = node;
    if (start > 0 && start < target.nodeValue.length) {
      target = target.splitText(start);
    }
    const wantLen = end - start;
    if (wantLen > 0 && wantLen < target.nodeValue.length) {
      target.splitText(wantLen);
    }
    const mark = document.createElement("mark");
    mark.setAttribute("data-annotation-id", ann.id);
    mark.setAttribute("style", markStyle);
    target.parentNode.insertBefore(mark, target);
    mark.appendChild(target);
  }
}

// ── Selection capture ───────────────────────────────────────────────────────
document.addEventListener("mouseup", (e) => {
  if (!stabiloActive) return;
  if (
    document.getElementById("stabilo-popup") &&
    !document.getElementById("stabilo-popup").classList.contains("hidden")
  )
    return;

  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || !sel.toString().trim()) return;

  const contentEl = document.getElementById("doc-content");
  if (!contentEl || !contentEl.contains(sel.anchorNode)) return;

  const range = sel.getRangeAt(0);
  stabiloPendingRange = range.cloneRange();

  // Compute the *actual* offset of the selection in contentEl.textContent,
  // not via indexOf (which would match the first occurrence anywhere).
  const preRange = document.createRange();
  preRange.selectNodeContents(contentEl);
  preRange.setEnd(range.startContainer, range.startOffset);
  const rawStart = preRange.toString().length;
  const rawSelected = range.toString();
  const fullText = contentEl.textContent;

  // Extract context (30 chars before/after) then normalize whitespace
  const normalize = (s) => s.replace(/\s+/g, " ").trim();
  const selectedText = normalize(rawSelected);
  const ctxBefore = normalize(
    fullText.slice(Math.max(0, rawStart - 30), rawStart),
  );
  const ctxAfter = normalize(
    fullText.slice(
      rawStart + rawSelected.length,
      rawStart + rawSelected.length + 30,
    ),
  );

  stabiloPendingRange._selectedText = selectedText;
  stabiloPendingRange._contextBefore = ctxBefore;
  stabiloPendingRange._contextAfter = ctxAfter;

  // Position popup near selection
  const rect = range.getBoundingClientRect();
  positionPopup(
    "stabilo-popup",
    rect.left + window.scrollX,
    rect.bottom + window.scrollY + 8,
  );
  document.getElementById("stabilo-selected-preview").textContent =
    selectedText.length > 120
      ? selectedText.slice(0, 120) + "…"
      : selectedText;
  document.getElementById("stabilo-note-input").value = "";
  document.getElementById("stabilo-popup").classList.remove("hidden");
  setTimeout(
    () => document.getElementById("stabilo-note-input").focus(),
    50,
  );
});

function positionPopup(id, x, y) {
  const el = document.getElementById(id);
  const w = 320;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let left = x;
  let top = y;
  if (left + w > vw - 16) left = vw - w - 16;
  if (left < 8) left = 8;
  el.style.left = left + "px";
  el.style.top = Math.min(top, vh - 260) + "px";
}

function closeMarkerPopup() {
  document.getElementById("stabilo-popup").classList.add("hidden");
  stabiloPendingRange = null;
  window.getSelection()?.removeAllRanges();
}

function cancelMarkerPopup() {
  closeMarkerPopup();
}

async function saveAnnotation() {
  if (!stabiloPendingRange || !currentDocId) return;
  const note = document.getElementById("stabilo-note-input").value.trim();
  if (!note) {
    document.getElementById("stabilo-note-input").focus();
    return;
  }

  try {
    const ann = await fetch(
      "/api/annotations/" + encodeURIComponent(currentDocId),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedText: stabiloPendingRange._selectedText,
          contextBefore: stabiloPendingRange._contextBefore,
          contextAfter: stabiloPendingRange._contextAfter,
          note,
        }),
      },
    ).then((r) => r.json());

    stabiloAnnotations.push(ann);
    closeMarkerPopup();
    applyAnnotationHighlights();
    renderElevator();
    annotationCounts[currentDocId] = (annotationCounts[currentDocId] || 0) + 1;
    refreshSidebar();
  } catch {
    /* ignore */
  }
}

// ── Read popup ──────────────────────────────────────────────────────────────
function showReadPopup(ann, markEl) {
  clearTimeout(stabiloReadHideTimer);
  stabiloReadPopupAnnotationId = ann.id;
  const popup = document.getElementById("stabilo-read-popup");
  const isOrphan = !document
    .getElementById("doc-content")
    .querySelector(`mark[data-annotation-id="${ann.id}"]`);
  document
    .getElementById("stabilo-read-orphan")
    .classList.toggle("hidden", !isOrphan);
  document.getElementById("stabilo-read-text").textContent = ann.note;
  document.getElementById("stabilo-read-date").textContent = new Date(
    ann.createdAt,
  ).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  document.getElementById("stabilo-delete-btn").onclick = () =>
    askDeleteAnnotation(ann.id);

  const rect = markEl.getBoundingClientRect();
  positionPopup(
    "stabilo-read-popup",
    rect.left + window.scrollX,
    rect.bottom + window.scrollY + 8,
  );
  popup.classList.remove("hidden");

  // Highlight elevator pill (preserve red for orphans)
  document.querySelectorAll(".stabilo-pill").forEach((p) => {
    const isOrphan = p.classList.contains("border-red-600");
    if (p.dataset.id === ann.id) {
      p.style.background = isOrphan ? "#b91c1c" : "#f97316";
    } else {
      p.style.background = isOrphan ? "#ef4444" : "#facc15";
    }
  });
  // Scroll elevator pill into view
  const pill = document.querySelector(
    `.stabilo-pill[data-id="${ann.id}"]`,
  );
  if (pill) pill.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function scheduleHideReadPopup() {
  stabiloReadHideTimer = setTimeout(() => {
    document.getElementById("stabilo-read-popup").classList.add("hidden");
    document.querySelectorAll(".stabilo-pill").forEach((p) => {
      p.style.background = p.classList.contains("border-red-600")
        ? "#ef4444"
        : "#facc15";
    });
  }, 300);
}

// Keep popup visible when hovering it
document
  .getElementById("stabilo-read-popup")
  .addEventListener("mouseenter", () =>
    clearTimeout(stabiloReadHideTimer),
  );
document
  .getElementById("stabilo-read-popup")
  .addEventListener("mouseleave", () => scheduleHideReadPopup());

// ── Delete ──────────────────────────────────────────────────────────────────
function askDeleteAnnotation(id) {
  stabiloDeleteTargetId = id;
  document.getElementById("stabilo-read-popup").classList.add("hidden");
  const confirmEl = document.getElementById("stabilo-confirm-delete");
  confirmEl.style.left =
    document.getElementById("stabilo-read-popup").style.left;
  confirmEl.style.top =
    document.getElementById("stabilo-read-popup").style.top;
  confirmEl.classList.remove("hidden");
}

function cancelDeleteAnnotation() {
  document
    .getElementById("stabilo-confirm-delete")
    .classList.add("hidden");
  stabiloDeleteTargetId = null;
}

async function confirmDeleteAnnotation() {
  if (!stabiloDeleteTargetId || !currentDocId) return;
  try {
    await fetch(
      `/api/annotations/${encodeURIComponent(currentDocId)}/${stabiloDeleteTargetId}`,
      { method: "DELETE" },
    );
    stabiloAnnotations = stabiloAnnotations.filter(
      (a) => a.id !== stabiloDeleteTargetId,
    );
    stabiloDeleteTargetId = null;
    document
      .getElementById("stabilo-confirm-delete")
      .classList.add("hidden");
    applyAnnotationHighlights();
    renderElevator();
    if (currentDocId) {
      const next = (annotationCounts[currentDocId] || 0) - 1;
      if (next <= 0) delete annotationCounts[currentDocId];
      else annotationCounts[currentDocId] = next;
      refreshSidebar();
    }
  } catch {
    /* ignore */
  }
}

// ── Elevator ────────────────────────────────────────────────────────────────
function renderElevator() {
  const elevator = document.getElementById("stabilo-elevator");
  const contentEl = document.getElementById("doc-content");
  if (!contentEl) return;

  if (stabiloAnnotations.length === 0) {
    elevator.classList.add("hidden");
    elevator.innerHTML = "";
    return;
  }

  elevator.classList.remove("hidden");
  const docHeight = contentEl.scrollHeight;
  const elevatorHeight = window.innerHeight;

  elevator.innerHTML = "";
  for (const ann of stabiloAnnotations) {
    const mark = contentEl.querySelector(
      `mark[data-annotation-id="${ann.id}"]`,
    );
    const relPos = mark
      ? (mark.offsetTop / Math.max(docHeight, 1)) * elevatorHeight
      : 0;
    const orphan = !mark;

    const pill = document.createElement("button");
    pill.className =
      "stabilo-pill w-8 h-8 rounded border-2 shadow text-xs flex items-center justify-center transition-colors shrink-0 " +
      (orphan ? "border-red-600" : "border-yellow-500");
    pill.dataset.id = ann.id;
    pill.style.background = orphan ? "#ef4444" : "#facc15";
    const noteShort =
      ann.note.length > 60 ? ann.note.slice(0, 60) + "…" : ann.note;
    pill.title = orphan
      ? `${window.t('annotation.orphan')}\n\n${noteShort}`
      : noteShort;
    pill.textContent = orphan ? "⚠" : "✎";
    if (orphan) pill.style.color = "#fff";

    pill.addEventListener("click", () => {
      const m = contentEl.querySelector(
        `mark[data-annotation-id="${ann.id}"]`,
      );
      if (m) {
        const docView =
          document.getElementById("doc-view") ||
          document.getElementById("content-area");
        docView.scrollTo({ top: m.offsetTop - 120, behavior: "smooth" });
      } else {
        // Orphan annotation — no mark to anchor to; show popup on the pill itself
        clearTimeout(stabiloReadHideTimer);
        showReadPopup(ann, pill);
      }
    });
    pill.addEventListener("mouseenter", () => {
      const m = contentEl.querySelector(
        `mark[data-annotation-id="${ann.id}"]`,
      );
      if (!m) {
        clearTimeout(stabiloReadHideTimer);
        showReadPopup(ann, pill);
        return;
      }
      const docView = document.getElementById("content-area");
      const markTop =
        m.getBoundingClientRect().top +
        docView.scrollTop -
        docView.getBoundingClientRect().top;
      docView.scrollTo({
        top: markTop - docView.clientHeight / 2,
        behavior: "smooth",
      });
      // Wait for scroll to fully stop before showing popup
      let scrollEndTimer;
      const onScroll = () => {
        clearTimeout(scrollEndTimer);
        scrollEndTimer = setTimeout(() => {
          docView.removeEventListener("scroll", onScroll);
          showReadPopup(ann, m);
        }, 80);
      };
      docView.addEventListener("scroll", onScroll);
      // Fallback if already at position (no scroll event fires)
      scrollEndTimer = setTimeout(() => {
        docView.removeEventListener("scroll", onScroll);
        showReadPopup(ann, m);
      }, 600);
    });
    pill.addEventListener("mouseleave", () => scheduleHideReadPopup());

    elevator.appendChild(pill);
  }
}
