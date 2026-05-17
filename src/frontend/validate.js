// ── Document validation ──────────────────────────────────────────────────────
// Wires the "Validate" toolbar button: visible only when the loaded document's
// frontmatter contains `**status:** To be validated`. Clicking flips the status
// to `Accepted` via PUT /api/documents/:id; if the document's reliability is
// below 100%, the confirmation modal also warns that source-file hashes will be
// re-baselined, and POST /api/metadata/:id/refresh is called after the PUT.

// Frontmatter may use this project's historical `**key:** value` convention or
// regular YAML-style `key: value` lines. The status line is the only field this
// module touches.
const _STATUS_LINE_RE = /^(\s*(?:\*\*status:\*\*|status:)\s*).+?\s*$/im;

function isWorklogDocument(docId) {
  if (/%5BWORKLOG%5D/i.test(docId)) return true;
  return false;
}

function getDocStatus(content) {
  if (typeof content !== "string") return null;
  const fence = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!fence) return null;
  const m = fence[1].match(/^\s*(?:\*\*status:\*\*|status:)\s*(.+?)\s*$/im);
  return m ? m[1].trim() : null;
}

function _replaceStatus(content, newStatus) {
  return content.replace(_STATUS_LINE_RE, `$1${newStatus}`);
}

function updateValidateButtonForCurrentDoc() {
  const btn = document.getElementById("validate-btn");
  if (!btn) return;
  const status = getDocStatus(
    typeof currentDocContent !== "undefined" ? currentDocContent : "",
  );
  if (status && status.toUpperCase() === "TO BE VALIDATED") {
    btn.classList.remove("hidden");
  } else {
    btn.classList.add("hidden");
  }
}

async function validateCurrentDoc() {
  const id = typeof currentDocId !== "undefined" ? currentDocId : null;
  if (!id) return;

  // Snapshot accuracy now so the confirm modal warns when re-baselining is implied.
  let accuracy = 1;
  try {
    const r = await fetch("/api/metadata/" + encodeURIComponent(id));
    if (r.ok) {
      const rep = await r.json();
      if (typeof rep.accuracy === "number") accuracy = rep.accuracy;
    }
  } catch {
    // Fall through with accuracy = 1; worst case we skip the warning. The
    // refresh step is still gated on the same value, so semantics stay aligned.
  }
  const pct = Math.round(accuracy * 100);
  const lowAccuracy = pct < 100;
  const detail = lowAccuracy
    ? window
        .t("doc.validate_detail_low_accuracy")
        .replace("{accuracy}", pct + "%")
    : "";

  const ok = await window.showConfirm({
    title: window.t("doc.validate_title"),
    message: window.t(
      isWorklogDocument(currentDocId)
        ? "doc.validate_worklog_message"
        : "doc.validate_message",
    ),
    detail,
    detailTone: lowAccuracy ? "warning" : undefined,
    confirmLabel: window.t("doc.validate_confirm"),
  });
  if (!ok) return;

  const btn = document.getElementById("validate-btn");
  if (btn) btn.disabled = true;

  try {
    const newContent = _replaceStatus(
      currentDocContent,
      isWorklogDocument(currentDocId) ? "Done" : "Accepted",
    );
    if (newContent === currentDocContent) {
      throw new Error("status line not found in frontmatter");
    }
    const putRes = await fetch("/api/documents/" + encodeURIComponent(id), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newContent }),
    });
    if (!putRes.ok) throw new Error(putRes.statusText || "save failed");

    if (lowAccuracy) {
      const refRes = await fetch(
        "/api/metadata/" + encodeURIComponent(id) + "/refresh",
        { method: "POST" },
      );
      if (!refRes.ok) throw new Error(refRes.statusText || "refresh failed");
    }

    if (typeof openDocument === "function") {
      await openDocument(id, /* skipHistory */ true);
    }
    if (typeof loadMetadataReport === "function") {
      await loadMetadataReport(id);
    }
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    alert(window.t("doc.validate_failed") + msg);
  } finally {
    if (btn) btn.disabled = false;
  }
}

window.validateCurrentDoc = validateCurrentDoc;
window.updateValidateButtonForCurrentDoc = updateValidateButtonForCurrentDoc;
window.getDocStatus = getDocStatus;
