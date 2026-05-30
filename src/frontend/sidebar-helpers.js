// ── Sidebar helpers — tree traversal + annotation badges ─────────────────────
// Loaded as a classic script; all symbols are global.
// Depends on globals defined elsewhere: `annotationCounts` (index.html),
// `esc` (utils.js), `window.t` (i18n.js).

function countTreeDocs(node) {
  let n = Object.values(node.categories).reduce(
    (s, arr) => s + arr.length,
    0,
  );
  for (const child of Object.values(node.children))
    n += countTreeDocs(child);
  return n;
}

function countTreeAnnotations(node) {
  let n = 0;
  for (const arr of Object.values(node.categories)) {
    for (const doc of arr) n += annotationCounts[doc.id] || 0;
  }
  for (const child of Object.values(node.children))
    n += countTreeAnnotations(child);
  return n;
}

function countTreeAnnotatedDocs(node) {
  let n = 0;
  for (const arr of Object.values(node.categories)) {
    for (const doc of arr) if (annotationCounts[doc.id] > 0) n += 1;
  }
  for (const child of Object.values(node.children))
    n += countTreeAnnotatedDocs(child);
  return n;
}

function annotationBadge(count) {
  if (!count) return "";
  if (typeof stabiloHidden !== "undefined" && stabiloHidden) return "";
  const label = window.t
    ? window.t("sidebar.annotation_badge")
    : "annotation";
  return `<span title="${count} ${esc(label)}${count > 1 ? "s" : ""}"
                 class="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5
                        rounded-full bg-yellow-300 dark:bg-yellow-400
                        text-[10px] font-bold text-yellow-900
                        border border-yellow-500 shadow-sm">${count}</span>`;
}

function annotatedDocsBadge(count) {
  if (!count) return "";
  if (typeof stabiloHidden !== "undefined" && stabiloHidden) return "";
  const label = window.t
    ? window.t("sidebar.annotated_docs_badge")
    : "document with annotations";
  return `<span title="${count} ${esc(label)}${count > 1 ? "s" : ""}"
                 class="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5
                        rounded-full bg-orange-400 dark:bg-orange-500
                        text-[10px] font-bold text-white
                        border border-orange-600 shadow-sm">${count}</span>`;
}

function countTreeFileAttachedDocs(node) {
  let n = 0;
  for (const arr of Object.values(node.categories)) {
    for (const doc of arr) if (fileAttachmentCounts[doc.id] > 0) n += 1;
  }
  for (const child of Object.values(node.children))
    n += countTreeFileAttachedDocs(child);
  return n;
}

function fileAttachmentBadge(count) {
  if (!count) return "";
  if (typeof hideAttachments !== "undefined" && hideAttachments) return "";
  const label = window.t
    ? window.t("sidebar.file_attachment_badge")
    : "attachment";
  return `<span title="${count} ${esc(label)}${count > 1 ? "s" : ""}"
                 class="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5
                        rounded-full bg-sky-200 dark:bg-sky-300
                        text-[10px] font-bold text-sky-900
                        border border-sky-500 shadow-sm">${count}</span>`;
}

// Lifecycle pill driven by the tri-state status-highlight toggle. A document
// carries a single frontmatter `status`, so it shows at most one pill: a green
// "V" for "To be validated" (states 1 and 2) or an orange "S" for "SuperSeeded"
// (state 2 only). Status matching is case-insensitive.
function statusPill(doc) {
  if (typeof highlightStatusState === "undefined" || !highlightStatusState)
    return "";
  const status = String(docStatuses[doc.id] || "")
    .trim()
    .toLowerCase();
  if (status === "to be validated") {
    const label = window.t
      ? window.t("sidebar.status_to_validate")
      : "To be validated";
    return `<span title="${esc(label)}"
                 class="inline-flex items-center justify-center w-5 h-5
                        rounded-full bg-green-500 dark:bg-green-500
                        text-[10px] font-bold text-white
                        border border-green-600 shadow-sm">V</span>`;
  }
  if (highlightStatusState === 2 && status === "superseeded") {
    const label = window.t
      ? window.t("sidebar.status_superseeded")
      : "SuperSeeded";
    return `<span title="${esc(label)}"
                 class="inline-flex items-center justify-center w-5 h-5
                        rounded-full bg-orange-500 dark:bg-orange-500
                        text-[10px] font-bold text-white
                        border border-orange-600 shadow-sm">S</span>`;
  }
  return "";
}

function fileAttachedDocsBadge(count) {
  if (!count) return "";
  if (typeof hideAttachments !== "undefined" && hideAttachments) return "";
  const label = window.t
    ? window.t("sidebar.file_attached_docs_badge")
    : "document with attachments";
  return `<span title="${count} ${esc(label)}${count > 1 ? "s" : ""}"
                 class="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5
                        rounded-full bg-slate-400 dark:bg-slate-500
                        text-[10px] font-bold text-white
                        border border-slate-600 shadow-sm">${count}</span>`;
}
