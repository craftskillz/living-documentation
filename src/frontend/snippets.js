// ── Snippets modal: type switching, preview, insert, parse ──────────────────
// Depends on globals from state.js (allDocs, currentDocId, currentDocContent),
// utils.js (esc), snippet-detect.js (detectSnippetType), snippet-table.js
// (_tableData, tableInit, tableRenderGrid, buildTableMarkdown) and
// snippet-tree.js (_treeItems, treeInit, treeRenderList, buildTreeMarkdown).

let _snippetSelStart = 0;
let _snippetSelEnd = 0;
const _SNIPPET_PANELS = [
  "collapsible",
  "link",
  "doc-link",
  "anchor-link",
  "anchor-doc-link",
  "code-block",
  "image",
  "table",
  "tree",
  "diagram",
  "colored-section",
  "colored-text",
];

const _COLOR_SWATCHES = {
  info:    { bg: "#eff6ff", border: "#3b82f6", text: "#1e3a5f" },
  success: { bg: "#f0fdf4", border: "#22c55e", text: "#14532d" },
  warning: { bg: "#fffbeb", border: "#f59e0b", text: "#451a03" },
  danger:  { bg: "#fef2f2", border: "#ef4444", text: "#450a0a" },
  note:    { bg: "#f5f3ff", border: "#8b5cf6", text: "#2e1065" },
  neutral: { bg: "#f9fafb", border: "#6b7280", text: "#111827" },
};
let _colorSectionSwatch = "info";
let _colorTextSwatch = "info";

function colorSectionPickSwatch(btn) {
  document.querySelectorAll(".color-swatch-btn").forEach((b) => {
    b.classList.remove("selected-swatch", "ring-offset-2");
  });
  btn.classList.add("selected-swatch", "ring-offset-2");
  const color = btn.getAttribute("data-color-swatch");
  // Apply the matching ring color
  const ringMap = { info: "ring-blue-400", success: "ring-green-400", warning: "ring-amber-400", danger: "ring-red-400", note: "ring-purple-400", neutral: "ring-gray-400" };
  btn.classList.add(ringMap[color] || "ring-blue-400");
  _colorSectionSwatch = color;
  snippetUpdatePreview();
}

function colorTextPickSwatch(btn) {
  document.querySelectorAll(".color-text-swatch-btn").forEach((b) => {
    b.classList.remove("selected-text-swatch", "ring-offset-2");
  });
  btn.classList.add("selected-text-swatch", "ring-offset-2");
  const color = btn.getAttribute("data-color-text-swatch");
  const ringMap = { info: "ring-blue-400", success: "ring-green-400", warning: "ring-amber-400", danger: "ring-red-400", note: "ring-purple-400", neutral: "ring-gray-400" };
  btn.classList.add(ringMap[color] || "ring-blue-400");
  _colorTextSwatch = color;
  snippetUpdatePreview();
}

function openSnippetsModal() {
  const editor = document.getElementById("doc-editor");
  _snippetSelStart = editor.selectionStart;
  _snippetSelEnd = editor.selectionEnd;

  const docOpts = allDocs
    .map((d) => `<option value="${d.id}">${d.title}</option>`)
    .join("");
  document.getElementById("snip-doc-select").innerHTML = docOpts;
  document.getElementById("snip-anchor-doc-select").innerHTML = docOpts;

  const msgEl = document.getElementById("snippet-detect-msg");
  const selectedText = editor.value.slice(
    _snippetSelStart,
    _snippetSelEnd,
  );

  if (selectedText) {
    const detected = detectSnippetType(selectedText);
    if (detected) {
      document.getElementById("snippet-type").value = detected;
      snippetTypeChanged();
      parseAndFillSnippet(selectedText, detected);
      const labels = {
        collapsible: window.t('snippet.collapsible'),
        link: window.t('snippet.link'),
        "doc-link": window.t('snippet.link_doc'),
        "anchor-link": window.t('snippet.link_anchor'),
        "anchor-doc-link": window.t('snippet.link_doc_anchor'),
        "ordered-list": window.t('snippet.numbered_list'),
        "unordered-list": window.t('snippet.bullet_list'),
        "code-block": window.t('snippet.code_block'),
        blockquote: window.t('snippet.blockquote'),
        separator: window.t('snippet.separator'),
        image: window.t('snippet.image'),
        table: window.t('snippet.table'),
        tree: window.t('snippet.tree'),
        "colored-section": window.t('snippet.colored_section'),
        "colored-text": window.t('snippet.colored_text'),
      };
      msgEl.textContent = window.t('snippet.detected_msg').replace('{type}', labels[detected] ?? detected);
      msgEl.className =
        "rounded-lg px-3 py-2 text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800";
    } else {
      document.getElementById("snippet-type").value = "diagram";
      snippetTypeChanged();
      msgEl.textContent = window.t('snippet.unknown_type_msg');
      msgEl.className =
        "rounded-lg px-3 py-2 text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800";
    }
    msgEl.classList.remove("hidden");
  } else {
    msgEl.classList.add("hidden");
    document.getElementById("snippet-type").value = "diagram";
    snippetTypeChanged();
  }

  document.getElementById("snippets-modal").classList.remove("hidden");
}

function closeSnippetsModal() {
  document.getElementById("snippets-modal").classList.add("hidden");
}

function snippetTypeChanged() {
  const type = document.getElementById("snippet-type").value;
  _SNIPPET_PANELS.forEach((p) => {
    const panel = document.getElementById("snip-panel-" + p);
    if (panel) panel.classList.toggle("hidden", p !== type);
  });
  if (type === "table") tableInit();
  else if (type === "tree") treeInit();
  else if (type === "diagram") snippetDiagInit();
  else snippetUpdatePreview();
}

async function snippetDiagInit() {
  let diagrams = [];
  try {
    diagrams = await fetch("/api/diagrams").then((r) => r.json());
  } catch {
    diagrams = [];
  }
  const sel = document.getElementById("snip-diag-select");
  sel.innerHTML = diagrams.length
    ? diagrams
        .map(
          (d) => `<option value="${esc(d.id)}">${esc(d.title)}</option>`,
        )
        .join("")
    : `<option value="" disabled>${window.t('snippet.diagram_no_diagrams')}</option>`;

  // Pre-fill image name from current doc title
  const docTitle = document
    .getElementById("doc-title")
    .textContent.trim();
  const slug = docTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  document.getElementById("snip-diag-img-name").value = slug
    ? slug + ".png"
    : "diagram.png";
  document.getElementById("snip-diag-new-name").value = docTitle
    ? docTitle + " Diagram"
    : "";

  document.getElementById("snip-diag-mode-existing").checked = true;
  snippetDiagModeChanged();
}

function snippetDiagModeChanged() {
  const isNew = document.getElementById("snip-diag-mode-new").checked;
  document
    .getElementById("snip-diag-existing-section")
    .classList.toggle("hidden", isNew);
  document
    .getElementById("snip-diag-new-section")
    .classList.toggle("hidden", !isNew);
  snippetDiagSyncImgName();
  snippetUpdatePreview();
}

function snippetDiagSyncImgName() {
  const isNew = document.getElementById("snip-diag-mode-new").checked;
  let label;
  if (isNew) {
    label = document.getElementById("snip-diag-new-name").value.trim();
  } else {
    const sel = document.getElementById("snip-diag-select");
    label = sel.options[sel.selectedIndex]?.text ?? "";
  }
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  document.getElementById("snip-diag-img-name").value = slug
    ? slug + ".png"
    : "diagram.png";
}

function buildSnippetMarkdown() {
  const type = document.getElementById("snippet-type").value;
  switch (type) {
    case "collapsible": {
      const summary =
        document.getElementById("snip-collapsible-summary").value ||
        window.t('snippet.collapsible_summary_value');
      return `<details>\n<summary>${summary}</summary>\n\n## Titre\n\nTexte\n\n</details>`;
    }
    case "link": {
      const text =
        document.getElementById("snip-link-text").value ||
        window.t('snippet.link_text_placeholder');
      const url =
        document.getElementById("snip-link-url").value || "https://...";
      return `<a href="${url}" target="_blank">${text}</a>`; // [${text}](${url})
    }
    case "doc-link": {
      const sel = document.getElementById("snip-doc-select");
      const docId = sel.value;
      const customText =
        document.getElementById("snip-doc-link-text").value;
      const docTitle = sel.options[sel.selectedIndex]?.text ?? docId;
      const text = customText || docTitle;
      return `[${text}](?doc=${encodeURIComponent(docId)})`;
    }
    case "anchor-link": {
      const text =
        document.getElementById("snip-anchor-text").value ||
        window.t('snippet.link_section_placeholder');
      const anchor =
        document.getElementById("snip-anchor-id").value ||
        window.t('snippet.link_anchor_placeholder');
      return `[${text}](#${anchor})`;
    }
    case "anchor-doc-link": {
      const sel = document.getElementById("snip-anchor-doc-select");
      const docId = sel.value;
      const text =
        document.getElementById("snip-anchor-doc-text").value ||
        window.t('snippet.link_section_placeholder');
      const anchor =
        document.getElementById("snip-anchor-doc-id").value ||
        window.t('snippet.link_anchor_placeholder');
      return `[${text}](?doc=${encodeURIComponent(docId)}#${anchor})`;
    }
    case "ordered-list":
      return [
        "1. Élément 1",
        "2. Élément 2",
        "   1. Sous-élément 2.1",
        "   2. Sous-élément 2.2",
        "3. Élément 3",
        "   1. Sous-élément 3.1",
        "      1. Sous-sous-élément 3.1.1",
      ].join("\n");
    case "unordered-list":
      return [
        "- Élément 1",
        "- Élément 2",
        "  - Sous-élément 2.1",
        "  - Sous-élément 2.2",
        "- Élément 3",
        "  - Sous-élément 3.1",
        "    - Sous-sous-élément 3.1.1",
      ].join("\n");
    case "code-block": {
      const lang = document.getElementById("snip-code-lang").value || "";
      return `\`\`\`${lang}\n// code ici\n\`\`\``;
    }
    case "blockquote":
      return `> Citation ici\n>\n> — Auteur`;
    case "separator":
      return `\n---\n`;
    case "image": {
      const alt =
        document.getElementById("snip-image-alt").value || "image";
      const url =
        document.getElementById("snip-image-url").value ||
        "./images/mon-image.png";
      return `![${alt}](${url})`;
    }
    case "table":
      return buildTableMarkdown();
    case "tree":
      return buildTreeMarkdown();
    case "diagram": {
      const isNew = document.getElementById("snip-diag-mode-new").checked;
      const imgName =
        document.getElementById("snip-diag-img-name").value.trim() ||
        "diagram.png";
      let diagId, diagLabel;
      if (isNew) {
        diagId = "d" + Date.now();
        diagLabel =
          document.getElementById("snip-diag-new-name").value.trim() ||
          "Diagram";
      } else {
        const sel = document.getElementById("snip-diag-select");
        diagId = sel.value;
        diagLabel = sel.options[sel.selectedIndex]?.text || "Diagram";
      }
      return `[![${diagLabel}](./images/${imgName})](/diagram?id=${diagId})`;
    }
    case "colored-text": {
      const c = _COLOR_SWATCHES[_colorTextSwatch] || _COLOR_SWATCHES.info;
      const content = document.getElementById("snip-colored-text-content").value || window.t('snippet.colored_text_content_placeholder');
      return `<span style="color:${c.border};">${content}</span>`;
    }
    case "colored-section": {
      const c = _COLOR_SWATCHES[_colorSectionSwatch] || _COLOR_SWATCHES.info;
      const content = document.getElementById("snip-colored-content").value || window.t('snippet.colored_section_content_placeholder');
      return `<div style="background:${c.bg};border-left:4px solid ${c.border};color:${c.text};padding:1rem 1.25rem;border-radius:0.375rem;margin:1rem 0;">\n\n${content}\n\n</div>`;
    }
    default:
      return "";
  }
}

function snippetUpdatePreview() {
  document.getElementById("snippet-preview").textContent =
    buildSnippetMarkdown();
}

function insertSnippet() {
  const type = document.getElementById("snippet-type").value;
  if (type === "diagram") {
    insertDiagramSnippet();
    return;
  }
  const text = buildSnippetMarkdown();
  closeSnippetsModal();
  const editor = document.getElementById("doc-editor");
  const before = editor.value.slice(0, _snippetSelStart);
  const after = editor.value.slice(_snippetSelEnd);
  editor.value = before + text + after;
  editor.selectionStart = editor.selectionEnd =
    _snippetSelStart + text.length;
  editor.focus();
}

async function insertDiagramSnippet() {
  const isNew = document.getElementById("snip-diag-mode-new").checked;
  const imgName =
    document.getElementById("snip-diag-img-name").value.trim() ||
    "diagram.png";
  let diagId, diagLabel;
  if (isNew) {
    diagId = "d" + Date.now();
    diagLabel =
      document.getElementById("snip-diag-new-name").value.trim() ||
      "Diagram";
    try {
      await fetch(`/api/diagrams/${diagId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: diagLabel, nodes: [], edges: [] }),
      });
    } catch (err) {
      alert(window.t('error.create_diagram') + err.message);
      return;
    }
  } else {
    const sel = document.getElementById("snip-diag-select");
    diagId = sel.value;
    diagLabel = sel.options[sel.selectedIndex]?.text || "Diagram";
  }

  // Insert at cursor
  const md = `[![${diagLabel}](./images/${imgName})](/diagram?id=${diagId})`;
  closeSnippetsModal();
  const editor = document.getElementById("doc-editor");
  const before = editor.value.slice(0, _snippetSelStart);
  const after = editor.value.slice(_snippetSelEnd);
  editor.value = before + md + after;

  // Auto-save then redirect to diagram editor
  try {
    const newContent = editor.value;
    const res = await fetch("/api/documents/" + currentDocId, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newContent }),
    });
    if (!res.ok) throw new Error(await res.text());
    currentDocContent = newContent;
  } catch (err) {
    alert("Erreur lors de la sauvegarde : " + err.message);
    return;
  }

  window.location.href = `/diagram?id=${diagId}&img=${encodeURIComponent(imgName)}`;
}

// ── Snippet parsing (detection lives in /snippet-detect.js) ────────────────
function parseAndFillSnippet(text, type) {
  const t = text.trim();
  switch (type) {
    case "collapsible": {
      const m = t.match(/<summary>([\s\S]*?)<\/summary>/i);
      if (m)
        document.getElementById("snip-collapsible-summary").value =
          m[1].trim();
      break;
    }
    case "link": {
      const m = t.match(/^\[([\s\S]*?)\]\(([\s\S]*?)\)$/);
      if (m) {
        document.getElementById("snip-link-text").value = m[1];
        document.getElementById("snip-link-url").value = m[2];
      }
      break;
    }
    case "doc-link": {
      const m = t.match(/^\[([\s\S]*?)\]\(\?doc=([\s\S]*?)\)$/);
      if (m) {
        const docId = decodeURIComponent(m[1] === "" ? m[2] : m[2]);
        const sel = document.getElementById("snip-doc-select");
        for (const opt of sel.options) {
          if (opt.value === decodeURIComponent(m[2])) {
            sel.value = opt.value;
            break;
          }
        }
        const autoTitle = sel.options[sel.selectedIndex]?.text ?? "";
        document.getElementById("snip-doc-link-text").value =
          m[1] === autoTitle ? "" : m[1];
      }
      break;
    }
    case "anchor-link": {
      const m = t.match(/^\[([\s\S]*?)\]\(#([\s\S]*?)\)$/);
      if (m) {
        document.getElementById("snip-anchor-text").value = m[1];
        document.getElementById("snip-anchor-id").value = m[2];
      }
      break;
    }
    case "anchor-doc-link": {
      const m = t.match(
        /^\[([\s\S]*?)\]\(\?doc=([\s\S]*?)#([\s\S]*?)\)$/,
      );
      if (m) {
        const sel = document.getElementById("snip-anchor-doc-select");
        for (const opt of sel.options) {
          if (opt.value === decodeURIComponent(m[2])) {
            sel.value = opt.value;
            break;
          }
        }
        document.getElementById("snip-anchor-doc-text").value = m[1];
        document.getElementById("snip-anchor-doc-id").value = m[3];
      }
      break;
    }
    case "code-block": {
      const m = t.match(/^```(\w*)\n/);
      document.getElementById("snip-code-lang").value = m ? m[1] : "";
      break;
    }
    case "image": {
      const m = t.match(/^!\[([\s\S]*?)\]\(([\s\S]*?)\)$/);
      if (m) {
        document.getElementById("snip-image-alt").value = m[1];
        document.getElementById("snip-image-url").value = m[2];
      }
      break;
    }
    case "table": {
      const allLines = t
        .split("\n")
        .filter((l) => /^\|.*\|$/.test(l.trim()));
      const dataLines = allLines.filter(
        (l) => !/^\| *[-: ][-| :]*\|/.test(l),
      );
      _tableData = dataLines.map((line) =>
        line
          .split("|")
          .slice(1, -1)
          .map((c) => c.trim()),
      );
      const maxCols = Math.max(..._tableData.map((r) => r.length));
      _tableData.forEach((row) => {
        while (row.length < maxCols) row.push("");
      });
      tableRenderGrid();
      break;
    }
    case "tree": {
      const inner = t.replace(/^```text\n/, "").replace(/\n```$/, "");
      _treeItems = inner.split("\n").map((line) => {
        const m = line.match(/^((?:│   |    )*)(?:├── |└── )([\s\S]+)$/);
        if (m) return { name: m[2], depth: m[1].length / 4 + 1 };
        return { name: line, depth: 0 };
      });
      treeRenderList();
      break;
    }
    case "colored-text": {
      const m = t.match(/^<span\s[^>]*color:([^;>"]+)[^>]*>([\s\S]*)<\/span>$/);
      if (m) {
        const col = m[1].trim();
        const found = Object.entries(_COLOR_SWATCHES).find(([, v]) => v.border === col);
        if (found) {
          _colorTextSwatch = found[0];
          document.querySelectorAll(".color-text-swatch-btn").forEach((b) => b.classList.remove("selected-text-swatch", "ring-offset-2"));
          const activeBtn = document.querySelector(`[data-color-text-swatch="${_colorTextSwatch}"]`);
          if (activeBtn) activeBtn.classList.add("selected-text-swatch", "ring-offset-2");
        }
        document.getElementById("snip-colored-text-content").value = m[2];
      }
      break;
    }
    case "colored-section": {
      // Extract border color from inline style to guess the swatch
      const borderM = t.match(/border-left:[^;]*solid\s+(#[0-9a-fA-F]{6})/);
      if (borderM) {
        const found = Object.entries(_COLOR_SWATCHES).find(([, v]) => v.border === borderM[1]);
        if (found) {
          _colorSectionSwatch = found[0];
          document.querySelectorAll(".color-swatch-btn").forEach((b) => {
            b.classList.remove("selected-swatch", "ring-offset-2");
          });
          const activeBtn = document.querySelector(`[data-color-swatch="${_colorSectionSwatch}"]`);
          if (activeBtn) activeBtn.classList.add("selected-swatch", "ring-offset-2");
        }
      }
      const contentM = t.match(/^<div[^>]*>\n\n([\s\S]*?)\n\n<\/div>$/);
      if (contentM) document.getElementById("snip-colored-content").value = contentM[1];
      break;
    }
  }
  snippetUpdatePreview();
}
