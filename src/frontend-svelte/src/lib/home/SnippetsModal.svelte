<script lang="ts">
  import { t } from "../i18n.svelte";
  import { home } from "./state.svelte";
  import {
    SNIPPET_PANELS,
    snippetPanelForType,
    SNIPPET_PICKER_ICONS,
    SNIPPET_PICKER_CATEGORIES,
    SNIPPET_PICKER_PALETTE,
    SNIPPET_PICKER_TYPE_PALETTE,
    SNIPPET_TYPE_I18N_KEY,
    COLOR_SWATCHES,
    EMOJI_CATEGORIES,
    type EmojiItem,
  } from "./snippets/pickerData";
  import { ldBuildSnippetMarkdown } from "./snippets/builders";
  import { ldParseSnippetMarkdown } from "./snippets/parsers";
  import { detectSnippetType } from "./snippets/detect";
  import ConfirmDialog from "../ConfirmDialog.svelte";
  import {
    orderedListDefaultMarkdown,
    unorderedListDefaultMarkdown,
  } from "./snippets/listMarkdown";
  import {
    createTableController,
    tableInit,
    tableRenderGrid,
    tableChangeRows,
    tableChangeCols,
    buildTableMarkdown,
  } from "./snippets/table";
  import {
    createTreeController,
    treeInit,
    treeRenderList,
    treeAddItem,
    buildTreeMarkdown,
  } from "./snippets/tree";

  let {
    open,
    editor,
    onclose,
    mode = "insert",
    content = "",
    range = null,
    insertPos = 0,
    onsave = undefined,
  }: {
    open: boolean;
    editor: HTMLTextAreaElement | null;
    onclose: () => void;
    mode?: "insert" | "inline-edit" | "inline-insert";
    content?: string;
    range?: { start: number; end: number; type: string; indent?: string } | null;
    insertPos?: number;
    onsave?: ((newContent: string) => Promise<void>) | undefined;
  } = $props();

  let selStart = 0;
  let selEnd = 0;
  let inlineIndent = "";
  let confirmDialog = $state<ConfirmDialog>(null!);
  let colorSectionSwatch = "info";
  let colorTextSwatch = "info";

  const tableCtrl = createTableController(() => snippetUpdatePreview());
  const treeCtrl = createTreeController(() => snippetUpdatePreview());

  function esc(str: string): string {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function byId<T extends HTMLElement = HTMLElement>(id: string): T | null {
    return document.getElementById(id) as T | null;
  }

  // ── Picker rendering ───────────────────────────────────────────────────
  function snippetPickerCleanLabel(raw: string): string {
    if (!raw) return "";
    const parts = raw.split(/\s+/);
    if (parts.length > 1 && !/^[\p{L}\p{N}]/u.test(parts[0])) {
      return parts.slice(1).join(" ");
    }
    return raw;
  }

  function snippetPickerLabel(type: string): string {
    const key = SNIPPET_TYPE_I18N_KEY[type];
    const raw = key ? t(key) : type;
    return snippetPickerCleanLabel(raw);
  }

  function renderSnippetPicker(): void {
    const container = byId("snippet-picker-categories");
    if (!container) return;
    container.innerHTML = "";
    for (const cat of SNIPPET_PICKER_CATEGORIES) {
      const section = document.createElement("section");
      section.dataset.snippetCategory = cat.key;
      section.className = "space-y-2";

      const h3 = document.createElement("h3");
      h3.className =
        "text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400";
      h3.textContent = t(cat.labelKey);
      section.appendChild(h3);

      const grid = document.createElement("div");
      grid.className =
        "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8 gap-2";

      for (const type of cat.types) {
        const paletteName = SNIPPET_PICKER_TYPE_PALETTE[type] || "indigo";
        const colorClasses =
          SNIPPET_PICKER_PALETTE[paletteName] || SNIPPET_PICKER_PALETTE.indigo;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.dataset.snippetType = type;
        btn.className =
          "snippet-card min-h-[76px] flex flex-col items-center justify-center gap-2 p-2 rounded-lg border text-gray-800 dark:text-gray-100 transition-colors " +
          colorClasses.card;
        btn.onclick = () => snippetPickerSelect(type);

        const i = document.createElement("i");
        i.className =
          (SNIPPET_PICKER_ICONS[type] || "fa-solid fa-puzzle-piece") +
          " text-xl " +
          colorClasses.icon;
        i.setAttribute("aria-hidden", "true");
        btn.appendChild(i);

        const label = document.createElement("span");
        label.className = "text-xs font-medium text-center leading-tight";
        label.textContent = snippetPickerLabel(type);
        btn.appendChild(label);

        grid.appendChild(btn);
      }
      section.appendChild(grid);
      container.appendChild(section);
    }
  }

  function showSnippetPicker(): void {
    renderSnippetPicker();
    byId("snippet-picker")?.classList.remove("hidden");
    byId("snippet-picker-back")?.classList.add("hidden");
    byId("snippet-submit-btn")?.classList.add("hidden");
    SNIPPET_PANELS.forEach((p) => byId("snip-panel-" + p)?.classList.add("hidden"));
    byId("snippet-preview-wrap")?.classList.add("hidden");
    const search = byId<HTMLInputElement>("snippet-picker-search");
    if (search) {
      search.value = "";
      snippetPickerFilter("");
      setTimeout(() => search.focus(), 50);
    }
  }

  function showSnippetPanelOnly(): void {
    byId("snippet-picker")?.classList.add("hidden");
    byId("snippet-submit-btn")?.classList.remove("hidden");
    byId("snippet-picker-back")?.classList.remove("hidden");
  }

  function snippetPickerFilter(query: string): void {
    const container = byId("snippet-picker-categories");
    if (!container) return;
    const q = (query || "").toLowerCase().trim();
    let totalVisible = 0;
    container.querySelectorAll<HTMLElement>("[data-snippet-category]").forEach((section) => {
      let visibleCount = 0;
      section.querySelectorAll<HTMLElement>("[data-snippet-type]").forEach((card) => {
        const label = (card.querySelector("span")?.textContent || "").toLowerCase();
        const match = !q || label.includes(q);
        card.classList.toggle("hidden", !match);
        if (match) visibleCount += 1;
      });
      section.classList.toggle("hidden", visibleCount === 0);
      totalVisible += visibleCount;
    });
    byId("snippet-picker-no-results")?.classList.toggle("hidden", totalVisible > 0);
  }

  function snippetPickerSearchChanged(): void {
    const input = byId<HTMLInputElement>("snippet-picker-search");
    snippetPickerFilter(input ? input.value : "");
  }

  function snippetPickerSearchKeydown(event: KeyboardEvent): void {
    if (event.key === "Enter") {
      event.preventDefault();
      const firstVisible = document.querySelector<HTMLElement>(
        "#snippet-picker-categories [data-snippet-type]:not(.hidden)",
      );
      if (firstVisible) snippetPickerSelect(firstVisible.dataset.snippetType!);
    }
  }

  function snippetPickerSelect(type: string): void {
    const sel = byId<HTMLSelectElement>("snippet-type");
    if (sel) sel.value = type;
    snippetTypeChanged();
    showSnippetPanelOnly();
  }

  function snippetPickerBack(): void {
    showSnippetPicker();
  }

  // ── Emoji panel ────────────────────────────────────────────────────────
  let emojiGridWired = false;

  function emojiBtnHtml(item: EmojiItem): string {
    return `<button type="button" data-emoji="${item.e}" title="${item.t.split(" ").slice(0, 3).join(", ")}" class="emoji-btn w-7 h-7 text-lg rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center">${item.e}</button>`;
  }

  function renderEmojiCategories(): string {
    return EMOJI_CATEGORIES.map(
      (cat) => `
    <div>
      <div class="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 px-1">${t(cat.label)}</div>
      <div class="flex flex-wrap gap-1">
        ${cat.emojis.map(emojiBtnHtml).join("")}
      </div>
    </div>
  `,
    ).join("");
  }

  function renderEmojiSearch(query: string): string {
    const q = query.toLowerCase().trim();
    const matches: EmojiItem[] = [];
    for (const cat of EMOJI_CATEGORIES) {
      for (const item of cat.emojis) {
        if (item.t.includes(q) || item.e === query) matches.push(item);
      }
    }
    if (matches.length === 0) {
      return `<div class="text-xs text-gray-400 dark:text-gray-600 px-1 py-2">${t("snippet.emoji_no_results")}</div>`;
    }
    return `<div class="flex flex-wrap gap-1">${matches.map(emojiBtnHtml).join("")}</div>`;
  }

  function emojiInit(): void {
    const grid = byId("snip-emoji-grid");
    if (!grid) return;
    grid.innerHTML = renderEmojiCategories();

    if (!emojiGridWired) {
      grid.addEventListener("click", (e) => {
        const btn = (e.target as HTMLElement).closest<HTMLElement>(".emoji-btn");
        if (btn && btn.dataset.emoji) emojiAppend(btn.dataset.emoji);
      });
      const searchInput = byId<HTMLInputElement>("snip-emoji-search");
      searchInput?.addEventListener("input", (e) =>
        emojiFilter((e.target as HTMLInputElement).value),
      );
      emojiGridWired = true;
    }

    const searchInput = byId<HTMLInputElement>("snip-emoji-search");
    if (searchInput) searchInput.value = "";
    snippetUpdatePreview();
  }

  function emojiFilter(query: string): void {
    const grid = byId("snip-emoji-grid");
    if (!grid) return;
    const q = (query || "").trim();
    grid.innerHTML = q.length < 2 ? renderEmojiCategories() : renderEmojiSearch(q);
  }

  function emojiAppend(emoji: string): void {
    const input = byId<HTMLInputElement>("snip-emoji-string");
    if (!input) return;
    input.value += emoji;
    snippetUpdatePreview();
  }

  function emojiClear(): void {
    const input = byId<HTMLInputElement>("snip-emoji-string");
    if (!input) return;
    input.value = "";
    snippetUpdatePreview();
  }

  // ── Color swatches ─────────────────────────────────────────────────────
  const RING_MAP: Record<string, string> = {
    info: "ring-blue-400",
    success: "ring-green-400",
    warning: "ring-amber-400",
    danger: "ring-red-400",
    note: "ring-purple-400",
    neutral: "ring-gray-400",
  };

  function colorSectionPickSwatch(btn: HTMLElement): void {
    document.querySelectorAll(".color-swatch-btn").forEach((b) => {
      b.classList.remove("selected-swatch", "ring-offset-2");
    });
    btn.classList.add("selected-swatch", "ring-offset-2");
    const color = btn.getAttribute("data-color-swatch") || "info";
    btn.classList.add(RING_MAP[color] || "ring-blue-400");
    colorSectionSwatch = color;
    snippetUpdatePreview();
  }

  function colorTextPickSwatch(btn: HTMLElement): void {
    document.querySelectorAll(".color-text-swatch-btn").forEach((b) => {
      b.classList.remove("selected-text-swatch", "ring-offset-2");
    });
    btn.classList.add("selected-text-swatch", "ring-offset-2");
    const color = btn.getAttribute("data-color-text-swatch") || "info";
    btn.classList.add(RING_MAP[color] || "ring-blue-400");
    colorTextSwatch = color;
    snippetUpdatePreview();
  }

  function snippetSwatch(name: string) {
    return COLOR_SWATCHES[name] || COLOR_SWATCHES.info;
  }

  // ── Anchors (headings) ─────────────────────────────────────────────────
  function stripMdInline(s: string): string {
    return s
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/__([^_]+)__/g, "$1")
      .replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, "$1$2")
      .replace(/(^|[^_])_([^_]+)_(?!_)/g, "$1$2")
      .trim();
  }

  function slugifyHeading(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
  }

  function extractHeadingsFromMarkdown(content: string): { level: number; text: string; slug: string }[] {
    const out: { level: number; text: string; slug: string }[] = [];
    const lines = (content || "").split("\n");
    let inFence = false;
    for (const line of lines) {
      if (/^```/.test(line)) {
        inFence = !inFence;
        continue;
      }
      if (inFence) continue;
      const m = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
      if (!m) continue;
      const text = stripMdInline(m[2]);
      const slug = slugifyHeading(text);
      if (slug) out.push({ level: m[1].length, text, slug });
    }
    return out;
  }

  function collectEditorHeadings() {
    return extractHeadingsFromMarkdown(editor ? editor.value : "");
  }

  function renderAnchorOptions(
    sel: HTMLSelectElement | null,
    headings: { level: number; text: string; slug: string }[],
    emptyKey: string,
  ): void {
    if (!sel) return;
    if (headings.length === 0) {
      sel.innerHTML = `<option value="" disabled selected>${t(emptyKey)}</option>`;
      return;
    }
    sel.innerHTML = headings
      .map((h) => {
        const indent = "· ".repeat(Math.max(0, h.level - 1));
        return `<option value="${esc(h.slug)}">${esc(indent + h.text)}</option>`;
      })
      .join("");
  }

  function populateAnchorSelect(): void {
    renderAnchorOptions(
      byId<HTMLSelectElement>("snip-anchor-id"),
      collectEditorHeadings(),
      "snippet.link_anchor_no_headings",
    );
  }

  async function snippetAnchorDocChanged(): Promise<void> {
    const docSel = byId<HTMLSelectElement>("snip-anchor-doc-select");
    const anchorSel = byId<HTMLSelectElement>("snip-anchor-doc-id");
    if (!docSel || !anchorSel) return;
    const docId = docSel.value;
    if (!docId) {
      renderAnchorOptions(anchorSel, [], "snippet.link_anchor_no_headings");
      snippetUpdatePreview();
      return;
    }
    anchorSel.innerHTML = `<option value="" disabled selected>${t("common.loading")}</option>`;
    try {
      const doc = await fetch("/api/documents/" + encodeURIComponent(docId)).then((r) => {
        if (!r.ok) throw new Error(r.statusText);
        return r.json();
      });
      const headings = extractHeadingsFromMarkdown(doc.content || "");
      renderAnchorOptions(anchorSel, headings, "snippet.link_anchor_no_headings");
    } catch {
      renderAnchorOptions(anchorSel, [], "snippet.link_anchor_no_headings");
    }
    snippetUpdatePreview();
  }

  // ── Type switching ─────────────────────────────────────────────────────
  function snippetFillTextareaDefault(id: string, value: string): void {
    const textarea = byId<HTMLTextAreaElement>(id);
    if (textarea && textarea.value.trim() === "") textarea.value = value;
  }

  function snippetTypeChanged(): void {
    const type = byId<HTMLSelectElement>("snippet-type")!.value;
    const activePanel = snippetPanelForType(type);
    SNIPPET_PANELS.forEach((p) =>
      byId("snip-panel-" + p)?.classList.toggle("hidden", p !== activePanel),
    );
    byId("snippet-preview-wrap")?.classList.toggle(
      "hidden",
      type === "attachment" ||
        type === "table" ||
        type === "code-block" ||
        type === "blockquote" ||
        type === "ordered-list" ||
        type === "unordered-list" ||
        type === "colored-section" ||
        type === "colored-text" ||
        type === "tree" ||
        type === "collapsible" ||
        type.startsWith("heading-"),
    );

    if (type === "table") tableInit(tableCtrl);
    else if (type === "tree") treeInit(treeCtrl);
    else if (type === "diagram") snippetDiagInit();
    else if (type === "emojis") emojiInit();
    else if (type === "attachment") {
      /* no preview — file picker opens on Insert */
    } else {
      if (type === "ordered-list") {
        snippetFillTextareaDefault("snip-ordered-list-content", orderedListDefaultMarkdown());
      } else if (type === "unordered-list") {
        snippetFillTextareaDefault("snip-unordered-list-content", unorderedListDefaultMarkdown());
      }
      snippetUpdatePreview();
    }
  }

  // ── Diagram panel ──────────────────────────────────────────────────────
  async function snippetDiagInit(): Promise<void> {
    let diagrams: { id: string; title: string }[] = [];
    try {
      diagrams = await fetch("/api/diagrams").then((r) => r.json());
    } catch {
      diagrams = [];
    }
    const sel = byId<HTMLSelectElement>("snip-diag-select");
    if (sel) {
      sel.innerHTML = diagrams.length
        ? diagrams.map((d) => `<option value="${esc(d.id)}">${esc(d.title)}</option>`).join("")
        : `<option value="" disabled>${t("snippet.diagram_no_diagrams")}</option>`;
    }

    const currentDoc =
      home.currentDocId && home.allDocs.find((d) => d.id === home.currentDocId);
    const docTitle = (currentDoc && currentDoc.title) || "";
    const slug = docTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
    const imgNameEl = byId<HTMLInputElement>("snip-diag-img-name");
    if (imgNameEl) imgNameEl.value = slug ? slug + ".png" : "diagram.png";
    const newNameEl = byId<HTMLInputElement>("snip-diag-new-name");
    if (newNameEl) newNameEl.value = docTitle ? docTitle + " Diagram" : "";

    const existingRadio = byId<HTMLInputElement>("snip-diag-mode-existing");
    if (existingRadio) existingRadio.checked = true;
    snippetDiagModeChanged();
  }

  function snippetDiagModeChanged(): void {
    const isNew = byId<HTMLInputElement>("snip-diag-mode-new")?.checked ?? false;
    byId("snip-diag-existing-section")?.classList.toggle("hidden", isNew);
    byId("snip-diag-new-section")?.classList.toggle("hidden", !isNew);
    snippetDiagSyncImgName();
    snippetUpdatePreview();
  }

  function snippetDiagSyncImgName(): void {
    const isNew = byId<HTMLInputElement>("snip-diag-mode-new")?.checked ?? false;
    let label = "";
    if (isNew) {
      label = byId<HTMLInputElement>("snip-diag-new-name")?.value.trim() || "";
    } else {
      const sel = byId<HTMLSelectElement>("snip-diag-select");
      label = sel?.options[sel.selectedIndex]?.text ?? "";
    }
    const slug = label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
    const imgNameEl = byId<HTMLInputElement>("snip-diag-img-name");
    if (imgNameEl) imgNameEl.value = slug ? slug + ".png" : "diagram.png";
  }

  // ── Build data / preview ───────────────────────────────────────────────
  function snippetSelectedText(selectEl: HTMLSelectElement, fallback: string): string {
    return selectEl.options[selectEl.selectedIndex]?.text || fallback;
  }

  function val(id: string): string {
    return (byId<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(id)?.value) ?? "";
  }

  function snippetMarkdownBuildData(type: string): any {
    switch (type) {
      case "collapsible":
        return {
          summary: val("snip-collapsible-summary"),
          summaryFallback: t("snippet.collapsible_summary_value"),
          body: val("snip-collapsible-body"),
          bodyFallback: "## Titre\n\nTexte",
        };
      case "link":
        return {
          text: val("snip-link-text"),
          textFallback: t("snippet.link_text_placeholder"),
          url: val("snip-link-url"),
        };
      case "doc-link": {
        const sel = byId<HTMLSelectElement>("snip-doc-select")!;
        return {
          docId: sel.value,
          title: snippetSelectedText(sel, sel.value),
          text: val("snip-doc-link-text"),
        };
      }
      case "anchor-link":
        return {
          text: val("snip-anchor-text"),
          textFallback: t("snippet.link_section_placeholder"),
          anchor: val("snip-anchor-id"),
          anchorFallback: t("snippet.link_anchor_placeholder"),
        };
      case "anchor-doc-link": {
        const sel = byId<HTMLSelectElement>("snip-anchor-doc-select")!;
        return {
          docId: sel.value,
          text: val("snip-anchor-doc-text"),
          textFallback: t("snippet.link_section_placeholder"),
          anchor: val("snip-anchor-doc-id"),
          anchorFallback: t("snippet.link_anchor_placeholder"),
        };
      }
      case "ordered-list":
        return { content: val("snip-ordered-list-content") };
      case "unordered-list":
        return { content: val("snip-unordered-list-content") };
      case "code-block":
        return { lang: val("snip-code-lang"), code: val("snip-code-content"), inlineIndent };
      case "blockquote":
        return { content: val("snip-blockquote-content") };
      case "heading-1":
      case "heading-2":
      case "heading-3":
      case "heading-4":
        return { text: val("snip-heading-content"), fallback: t("snippet.heading_text_placeholder") || "Titre" };
      case "image":
        return { alt: val("snip-image-alt"), url: val("snip-image-url") };
      case "table": {
        const borderedEl = byId<HTMLInputElement>("snip-table-bordered");
        return {
          markdown: buildTableMarkdown(tableCtrl),
          style: val("snip-table-style"),
          bordered: Boolean(borderedEl && borderedEl.checked),
          color: val("snip-table-color"),
        };
      }
      case "tree":
        return { markdown: buildTreeMarkdown(treeCtrl) };
      case "diagram": {
        const isNew = byId<HTMLInputElement>("snip-diag-mode-new")?.checked ?? false;
        const imgName = val("snip-diag-img-name").trim() || "diagram.png";
        if (isNew) {
          return {
            id: "d" + Date.now(),
            label: val("snip-diag-new-name").trim() || "Diagram",
            imageName: imgName,
          };
        }
        const sel = byId<HTMLSelectElement>("snip-diag-select")!;
        return { id: sel.value, label: snippetSelectedText(sel, "Diagram"), imageName: imgName };
      }
      case "colored-text":
        return {
          color: snippetSwatch(colorTextSwatch),
          content: val("snip-colored-text-content") || t("snippet.colored_text_content_placeholder"),
        };
      case "colored-section":
        return {
          color: snippetSwatch(colorSectionSwatch),
          content: val("snip-colored-content") || t("snippet.colored_section_content_placeholder"),
        };
      case "emojis":
        return { value: val("snip-emoji-string") };
      default:
        return {};
    }
  }

  function buildSnippetMarkdown(): string {
    const type = byId<HTMLSelectElement>("snippet-type")!.value;
    return ldBuildSnippetMarkdown(type, snippetMarkdownBuildData(type));
  }

  function snippetUpdatePreview(): void {
    const preview = byId("snippet-preview");
    if (preview) preview.textContent = buildSnippetMarkdown();
  }

  // ── Insert ─────────────────────────────────────────────────────────────
  function insertTextAtCursor(text: string): void {
    if (!editor) return;
    // Use the selection captured when the modal opened, so that opening on a
    // selected snippet replaces it with the rebuilt markdown.
    const start = selStart;
    const end = selEnd;
    const before = editor.value.slice(0, start);
    const after = editor.value.slice(end);
    editor.value = before + text + after;
    editor.selectionStart = editor.selectionEnd = start + text.length;
    editor.dispatchEvent(new Event("input", { bubbles: true }));
    editor.focus();
  }

  async function insertSnippet(): Promise<void> {
    const type = byId<HTMLSelectElement>("snippet-type")!.value;

    // Attachment needs the editor; the diagram snippet is allowed in inline-insert
    // (right-click empty area) but not in inline-edit (editing an existing snippet).
    if (mode === "inline-edit" && (type === "diagram" || type === "attachment")) return;
    if (mode === "inline-insert" && type === "attachment") return;

    if (type === "diagram") {
      await insertDiagramSnippet();
      return;
    }
    if (type === "attachment") {
      await uploadAttachment();
      return;
    }

    const text = buildSnippetMarkdown();

    if (mode === "inline-edit") {
      const newContent = content.slice(0, selStart) + text + content.slice(selEnd);
      try {
        if (onsave) await onsave(newContent);
      } catch (err) {
        alert(t("snippet.inline_save_failed") + (err instanceof Error ? err.message : String(err)));
      }
      onclose();
      return;
    }

    if (mode === "inline-insert") {
      const before = content.slice(0, selStart);
      const after = content.slice(selStart);
      const leadingBlank =
        before.length === 0 || /\n\n$/.test(before)
          ? ""
          : before.endsWith("\n")
            ? "\n"
            : "\n\n";
      const trailingBlank =
        after.length === 0 || /^\n\n/.test(after)
          ? ""
          : after.startsWith("\n")
            ? "\n"
            : "\n\n";
      const payload = leadingBlank + text + trailingBlank;
      try {
        if (onsave) await onsave(before + payload + after);
      } catch (err) {
        alert(t("snippet.inline_insert_failed") + (err instanceof Error ? err.message : String(err)));
      }
      onclose();
      return;
    }

    insertTextAtCursor(text);
    onclose();
  }

  async function deleteInlineSnippet(): Promise<void> {
    if (mode !== "inline-edit") return;
    const ok = await confirmDialog.show({
      title: t("snippet.inline_delete_title"),
      message: t("snippet.inline_delete_message"),
      confirmLabel: t("snippet.inline_delete_confirm_btn"),
      cancelLabel: t("common.cancel"),
      danger: true,
    });
    if (!ok) return;
    const start = selStart;
    const end = selEnd;
    try {
      if (onsave) await onsave(content.slice(0, start) + content.slice(end));
    } catch (err) {
      alert(t("snippet.inline_delete_failed") + (err instanceof Error ? err.message : String(err)));
    }
    onclose();
  }

  async function uploadAttachment(): Promise<void> {
    if (!editor) return;
    const input = document.createElement("input");
    input.type = "file";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      try {
        const res = await fetch("/api/files/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: dataUrl, name: file.name }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || res.statusText);
        }
        const uploaded = await res.json();
        const url = uploaded.url || "";
        const name = uploaded.originalName || uploaded.filename || file.name;
        insertTextAtCursor(`[📎 ${name}](${url})`);
      } catch (err) {
        alert(t("common.error_prefix") + (err instanceof Error ? err.message : String(err)));
      }
      onclose();
    };
    input.click();
  }

  async function insertDiagramSnippet(): Promise<void> {
    const isNew = byId<HTMLInputElement>("snip-diag-mode-new")?.checked ?? false;
    const imgName = val("snip-diag-img-name").trim() || "diagram.png";
    let diagId: string;
    let diagLabel: string;
    if (isNew) {
      diagId = "d" + Date.now();
      diagLabel = val("snip-diag-new-name").trim() || "Diagram";
      try {
        await fetch(`/api/diagrams/${diagId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: diagLabel, nodes: [], edges: [] }),
        });
      } catch (err) {
        alert(t("error.create_diagram") + (err instanceof Error ? err.message : String(err)));
        return;
      }
    } else {
      const sel = byId<HTMLSelectElement>("snip-diag-select")!;
      diagId = sel.value;
      diagLabel = sel.options[sel.selectedIndex]?.text || "Diagram";
    }

    const md = `[![${diagLabel}](/images/${imgName})](/diagram?id=${diagId})`;

    if (mode === "inline-insert") {
      // Splice into the document source with blank-line padding, then persist
      // via onsave (no editor textarea in read mode).
      const before = content.slice(0, selStart);
      const after = content.slice(selStart);
      const leadingBlank =
        before.length === 0 || /\n\n$/.test(before) ? "" : before.endsWith("\n") ? "\n" : "\n\n";
      const trailingBlank =
        after.length === 0 || /^\n\n/.test(after) ? "" : after.startsWith("\n") ? "\n" : "\n\n";
      const newContent = before + leadingBlank + md + trailingBlank + after;
      try {
        if (onsave) await onsave(newContent);
      } catch (err) {
        alert(t("common.error_prefix") + (err instanceof Error ? err.message : String(err)));
        return;
      }
    } else {
      // Editor mode: insert at caret and persist the editor content.
      insertTextAtCursor(md);
      if (home.currentDocId && editor) {
        try {
          await fetch("/api/documents/" + home.currentDocId, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: editor.value }),
          });
        } catch (err) {
          alert(t("common.error_prefix") + (err instanceof Error ? err.message : String(err)));
          return;
        }
      }
    }
    onclose();
    window.location.href = `/diagram?id=${diagId}&img=${encodeURIComponent(imgName)}`;
  }

  // ── Parse + fill (used when a heading/anchor pre-selection exists) ──────
  function snippetEnsureSelectOption(selectEl: HTMLSelectElement, value: string): void {
    if (Array.from(selectEl.options).some((opt) => opt.value === value)) return;
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = value;
    selectEl.insertBefore(opt, selectEl.firstChild);
  }

  function snippetSelectValueIfPresent(selectEl: HTMLSelectElement, value: string): void {
    for (const opt of Array.from(selectEl.options)) {
      if (opt.value === value) {
        selectEl.value = opt.value;
        return;
      }
    }
  }

  function snippetColorSwatchNameByBorder(color: string): string | null {
    const found = Object.entries(COLOR_SWATCHES).find(([, swatch]) => swatch.border === color);
    return found ? found[0] : null;
  }

  function applyColorTextSwatch(name: string | null): void {
    if (!name) return;
    colorTextSwatch = name;
    document.querySelectorAll(".color-text-swatch-btn").forEach((btn) => {
      btn.classList.remove("selected-text-swatch", "ring-offset-2");
    });
    document
      .querySelector(`[data-color-text-swatch="${colorTextSwatch}"]`)
      ?.classList.add("selected-text-swatch", "ring-offset-2");
  }

  function applyColorSectionSwatch(name: string | null): void {
    if (!name) return;
    colorSectionSwatch = name;
    document.querySelectorAll(".color-swatch-btn").forEach((btn) => {
      btn.classList.remove("selected-swatch", "ring-offset-2");
    });
    document
      .querySelector(`[data-color-swatch="${colorSectionSwatch}"]`)
      ?.classList.add("selected-swatch", "ring-offset-2");
  }

  function parseAndFillSnippet(text: string, type: string): void {
    const parsed = ldParseSnippetMarkdown(type, text, { inlineIndent: "" });
    switch (type) {
      case "collapsible": {
        if (parsed.summary !== undefined) val2("snip-collapsible-summary", parsed.summary);
        val2("snip-collapsible-body", parsed.body || "");
        break;
      }
      case "link": {
        if (parsed.text !== undefined) {
          val2("snip-link-text", parsed.text);
          val2("snip-link-url", parsed.url);
        }
        break;
      }
      case "doc-link": {
        if (parsed.docId !== undefined) {
          const sel = byId<HTMLSelectElement>("snip-doc-select")!;
          snippetSelectValueIfPresent(sel, parsed.docId);
          const autoTitle = sel.options[sel.selectedIndex]?.text ?? "";
          val2("snip-doc-link-text", parsed.text === autoTitle ? "" : parsed.text);
        }
        break;
      }
      case "anchor-link": {
        if (parsed.anchor !== undefined) {
          val2("snip-anchor-text", parsed.text);
          const sel = byId<HTMLSelectElement>("snip-anchor-id")!;
          snippetEnsureSelectOption(sel, parsed.anchor);
          sel.value = parsed.anchor;
        }
        break;
      }
      case "anchor-doc-link": {
        if (parsed.docId !== undefined) {
          const sel = byId<HTMLSelectElement>("snip-anchor-doc-select")!;
          snippetSelectValueIfPresent(sel, parsed.docId);
          val2("snip-anchor-doc-text", parsed.text);
          snippetAnchorDocChanged().then(() => {
            const anchorSel = byId<HTMLSelectElement>("snip-anchor-doc-id");
            if (!anchorSel) return;
            snippetEnsureSelectOption(anchorSel, parsed.anchor);
            anchorSel.value = parsed.anchor;
            snippetUpdatePreview();
          });
        }
        break;
      }
      case "ordered-list":
        val2("snip-ordered-list-content", parsed.content);
        break;
      case "unordered-list":
        val2("snip-unordered-list-content", parsed.content);
        break;
      case "code-block":
        val2("snip-code-lang", parsed.lang);
        val2("snip-code-content", parsed.code);
        break;
      case "blockquote":
        val2("snip-blockquote-content", parsed.content);
        break;
      case "image":
        if (parsed.alt !== undefined) {
          val2("snip-image-alt", parsed.alt);
          val2("snip-image-url", parsed.url);
        }
        break;
      case "heading-1":
      case "heading-2":
      case "heading-3":
      case "heading-4":
        val2("snip-heading-content", parsed.text);
        break;
      case "table": {
        val2("snip-table-style", parsed.attrs.style || "");
        const borderedEl = byId<HTMLInputElement>("snip-table-bordered");
        if (borderedEl) borderedEl.checked = parsed.attrs.border === "bordered";
        val2("snip-table-color", parsed.attrs.color || "");
        tableCtrl.data = parsed.rows;
        tableRenderGrid(tableCtrl);
        break;
      }
      case "tree": {
        treeCtrl.items = parsed.items;
        treeRenderList(treeCtrl);
        break;
      }
      case "colored-text": {
        if (parsed.color !== undefined) {
          applyColorTextSwatch(snippetColorSwatchNameByBorder(parsed.color));
          val2("snip-colored-text-content", parsed.content);
        }
        break;
      }
      case "colored-section": {
        if (parsed.borderColor) {
          applyColorSectionSwatch(snippetColorSwatchNameByBorder(parsed.borderColor));
        }
        if (parsed.content !== undefined) val2("snip-colored-content", parsed.content);
        break;
      }
    }
    snippetUpdatePreview();
  }

  function val2(id: string, value: string): void {
    const el = byId<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(id);
    if (el) el.value = value ?? "";
  }

  // ── Open lifecycle ─────────────────────────────────────────────────────
  function populateDocSelects(): void {
    const docOpts = home.allDocs
      .map((d) => `<option value="${esc(d.id)}">${esc(d.title)}</option>`)
      .join("");
    const docSel = byId("snip-doc-select");
    if (docSel) docSel.innerHTML = docOpts;
    const anchorDocSel = byId("snip-anchor-doc-select");
    if (anchorDocSel) anchorDocSel.innerHTML = docOpts;
    populateAnchorSelect();
    snippetAnchorDocChanged();
  }

  function applyModalMode(): void {
    const isInlineEdit = mode === "inline-edit";

    const title = byId("snippet-modal-title");
    if (title) {
      let key = "snippet.modal_title";
      if (isInlineEdit) key = "snippet.inline_modal_title";
      else if (mode === "inline-insert") key = "snippet.inline_insert_modal_title";
      title.textContent = t(key);
    }
    const submit = byId("snippet-submit-btn");
    if (submit) {
      submit.textContent = t(isInlineEdit ? "snippet.inline_save_btn" : "snippet.insert_btn");
    }
    const typeSelect = byId<HTMLSelectElement>("snippet-type");
    if (typeSelect) {
      typeSelect.disabled = isInlineEdit;
      typeSelect.classList.toggle("cursor-not-allowed", isInlineEdit);
      typeSelect.classList.toggle("opacity-70", isInlineEdit);
    }
    const deleteBtn = byId("snippet-delete-btn");
    if (deleteBtn) deleteBtn.classList.toggle("hidden", !isInlineEdit);
    const card = byId("snippet-modal-card");
    if (card) {
      card.classList.toggle("max-w-6xl", !isInlineEdit);
      card.classList.toggle("max-w-5xl", isInlineEdit);
    }
  }

  let wasOpen = false;
  $effect(() => {
    if (open && !wasOpen) {
      wasOpen = true;
      inlineIndent = "";
      if (mode === "inline-edit" && range) {
        selStart = range.start;
        selEnd = range.end;
        inlineIndent = range.indent || "";
      } else if (mode === "inline-insert") {
        const pos = Math.max(0, Math.min(content.length, Number(insertPos) || 0));
        selStart = selEnd = pos;
      } else if (editor) {
        selStart = editor.selectionStart;
        selEnd = editor.selectionEnd;
      }
      colorSectionSwatch = "info";
      colorTextSwatch = "info";
      // Defer until the modal markup is in the DOM.
      queueMicrotask(() => {
        applyModalMode();
        populateDocSelects();
        if (mode === "inline-edit" && range) {
          const selectedText = content.slice(selStart, selEnd);
          const sel = byId<HTMLSelectElement>("snippet-type");
          if (sel) sel.value = range.type;
          snippetTypeChanged();
          parseAndFillSnippet(selectedText, range.type);
          showSnippetPanelOnly();
        } else if (mode === "inline-insert") {
          showSnippetPicker();
        } else {
          const selectedText = editor ? editor.value.slice(selStart, selEnd) : "";
          const detected = selectedText ? detectSnippetType(selectedText) : null;
          if (detected) {
            // Selected text matches a snippet → open its panel pre-filled for editing.
            const sel = byId<HTMLSelectElement>("snippet-type");
            if (sel) sel.value = detected;
            snippetTypeChanged();
            parseAndFillSnippet(selectedText, detected);
            showSnippetPanelOnly();
          } else {
            showSnippetPicker();
          }
        }
      });
    } else if (!open) {
      wasOpen = false;
    }
  });
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    id="snippets-modal"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    onclick={(e) => { if (e.target === e.currentTarget) onclose(); }}
  >
    <div
      id="snippet-modal-card"
      class="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-6xl mx-4 p-6 space-y-5 max-h-[90vh] overflow-y-auto"
    >
      <h3 class="text-base font-semibold text-gray-900 dark:text-gray-50">
        <span id="snippet-modal-title">{t("snippet.modal_title")}</span>
      </h3>

      <div id="snippet-detect-msg" class="hidden rounded-lg px-3 py-2 text-xs"></div>

      <!-- Snippet picker -->
      <div id="snippet-picker" class="hidden space-y-4">
        <input
          id="snippet-picker-search"
          type="text"
          placeholder={t("snippet.picker_search_placeholder")}
          oninput={snippetPickerSearchChanged}
          onkeydown={snippetPickerSearchKeydown}
          class="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div id="snippet-picker-categories" class="space-y-4 max-h-[60vh] overflow-y-auto pr-1"></div>
        <div id="snippet-picker-no-results" class="hidden text-center text-sm text-gray-500 dark:text-gray-400 py-4">
          {t("snippet.picker_no_results")}
        </div>
      </div>

      <!-- Back to picker -->
      <button
        type="button"
        id="snippet-picker-back"
        onclick={snippetPickerBack}
        class="hidden inline-flex items-center gap-2 text-xs font-medium text-blue-700 dark:text-blue-300 hover:underline"
      >
        <i class="fa-solid fa-arrow-left" aria-hidden="true"></i>
        <span>{t("snippet.picker_back")}</span>
      </button>

      <!-- Snippet type selector (hidden, used for state binding) -->
      <div id="snippet-type-wrapper" class="hidden space-y-1.5">
        <label for="snippet-type" class="block text-xs font-medium text-gray-500 dark:text-gray-400">{t("snippet.type_label")}</label>
        <select
          id="snippet-type"
          onchange={snippetTypeChanged}
          class="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="diagram" selected>{t("snippet.diagram")}</option>
          <option value="heading-1">{t("snippet.heading_1")}</option>
          <option value="heading-2">{t("snippet.heading_2")}</option>
          <option value="heading-3">{t("snippet.heading_3")}</option>
          <option value="heading-4">{t("snippet.heading_4")}</option>
          <option value="collapsible">{t("snippet.collapsible")}</option>
          <option value="link">{t("snippet.link")}</option>
          <option value="doc-link">{t("snippet.link_doc")}</option>
          <option value="anchor-link">{t("snippet.link_anchor")}</option>
          <option value="anchor-doc-link">{t("snippet.link_doc_anchor")}</option>
          <option value="ordered-list">{t("snippet.numbered_list")}</option>
          <option value="unordered-list">{t("snippet.bullet_list")}</option>
          <option value="code-block">{t("snippet.code_block")}</option>
          <option value="blockquote">{t("snippet.blockquote")}</option>
          <option value="separator">{t("snippet.separator")}</option>
          <option value="image">{t("snippet.image")}</option>
          <option value="table">{t("snippet.table")}</option>
          <option value="tree">{t("snippet.tree")}</option>
          <option value="colored-section">{t("snippet.colored_section")}</option>
          <option value="colored-text">{t("snippet.colored_text")}</option>
          <option value="emojis">{t("snippet.emojis")}</option>
          <option value="attachment">{t("snippet.attachment")}</option>
          <option value="local-search">{t("snippet.local_search")}</option>
        </select>
      </div>

      <!-- Panel: heading -->
      <div id="snip-panel-heading" class="hidden space-y-3">
        <div class="space-y-1.5">
          <label for="snip-heading-content" class="block text-xs font-medium text-gray-500 dark:text-gray-400">{t("snippet.heading_text_label")}</label>
          <input id="snip-heading-content" type="text" oninput={snippetUpdatePreview} placeholder={t("snippet.heading_text_placeholder")} class="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <!-- Panel: collapsible -->
      <div id="snip-panel-collapsible" class="space-y-3">
        <div class="space-y-1.5">
          <label for="snip-collapsible-summary" class="block text-xs font-medium text-gray-500 dark:text-gray-400">{t("snippet.collapsible_summary_label")}</label>
          <input id="snip-collapsible-summary" type="text" value="Details" oninput={snippetUpdatePreview} class="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div class="space-y-1.5">
          <label for="snip-collapsible-body" class="block text-xs font-medium text-gray-500 dark:text-gray-400">{t("snippet.collapsible_body_label")}</label>
          <textarea id="snip-collapsible-body" rows="6" oninput={snippetUpdatePreview} placeholder={t("snippet.collapsible_body_placeholder")} class="w-full px-3 py-2 text-sm font-mono rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
        </div>
      </div>

      <!-- Panel: link -->
      <div id="snip-panel-link" class="hidden space-y-3">
        <div class="space-y-1.5">
          <label for="snip-link-text" class="block text-xs font-medium text-gray-500 dark:text-gray-400">{t("snippet.link_text_label")}</label>
          <input id="snip-link-text" type="text" placeholder={t("snippet.link_text_placeholder")} oninput={snippetUpdatePreview} class="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div class="space-y-1.5">
          <label for="snip-link-url" class="block text-xs font-medium text-gray-500 dark:text-gray-400">{t("snippet.link_url_label")}</label>
          <input id="snip-link-url" type="text" placeholder={t("snippet.link_url_placeholder")} oninput={snippetUpdatePreview} class="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <!-- Panel: doc-link -->
      <div id="snip-panel-doc-link" class="hidden space-y-3">
        <div class="space-y-1.5">
          <label for="snip-doc-select" class="block text-xs font-medium text-gray-500 dark:text-gray-400">{t("snippet.link_doc_label")}</label>
          <select id="snip-doc-select" onchange={snippetUpdatePreview} class="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"></select>
        </div>
        <div class="space-y-1.5">
          <label class="block text-xs font-medium text-gray-500 dark:text-gray-400">
            <span>{t("snippet.link_text_label")}</span>
            <span class="font-normal text-gray-400">{t("snippet.link_doc_text_hint")}</span>
          </label>
          <input id="snip-doc-link-text" type="text" oninput={snippetUpdatePreview} class="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <!-- Panel: anchor-link -->
      <div id="snip-panel-anchor-link" class="hidden space-y-3">
        <div class="space-y-1.5">
          <label for="snip-anchor-text" class="block text-xs font-medium text-gray-500 dark:text-gray-400">{t("snippet.link_text_label")}</label>
          <input id="snip-anchor-text" type="text" placeholder={t("snippet.link_section_placeholder")} oninput={snippetUpdatePreview} class="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div class="space-y-1.5">
          <label class="block text-xs font-medium text-gray-500 dark:text-gray-400">
            <span>{t("snippet.link_anchor_label")}</span>
            <span class="font-normal text-gray-400">{t("snippet.link_anchor_select_hint")}</span>
          </label>
          <select id="snip-anchor-id" onchange={snippetUpdatePreview} class="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"></select>
        </div>
      </div>

      <!-- Panel: anchor-doc-link -->
      <div id="snip-panel-anchor-doc-link" class="hidden space-y-3">
        <div class="space-y-1.5">
          <label for="snip-anchor-doc-select" class="block text-xs font-medium text-gray-500 dark:text-gray-400">{t("snippet.link_target_doc_label")}</label>
          <select id="snip-anchor-doc-select" onchange={snippetAnchorDocChanged} class="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"></select>
        </div>
        <div class="space-y-1.5">
          <label for="snip-anchor-doc-text" class="block text-xs font-medium text-gray-500 dark:text-gray-400">{t("snippet.link_text_label")}</label>
          <input id="snip-anchor-doc-text" type="text" placeholder={t("snippet.link_section_placeholder")} oninput={snippetUpdatePreview} class="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div class="space-y-1.5">
          <label class="block text-xs font-medium text-gray-500 dark:text-gray-400">
            <span>{t("snippet.link_anchor_label")}</span>
            <span class="font-normal text-gray-400">{t("snippet.link_anchor_select_hint")}</span>
          </label>
          <select id="snip-anchor-doc-id" onchange={snippetUpdatePreview} class="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"></select>
        </div>
      </div>

      <!-- Panel: ordered-list -->
      <div id="snip-panel-ordered-list" class="hidden space-y-3">
        <div class="space-y-1.5">
          <label for="snip-ordered-list-content" class="block text-xs font-medium text-gray-500 dark:text-gray-400">{t("snippet.ordered_list_content_label")}</label>
          <textarea id="snip-ordered-list-content" rows="10" placeholder={t("snippet.ordered_list_content_placeholder")} oninput={snippetUpdatePreview} class="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y leading-relaxed"></textarea>
        </div>
      </div>

      <!-- Panel: unordered-list -->
      <div id="snip-panel-unordered-list" class="hidden space-y-3">
        <div class="space-y-1.5">
          <label for="snip-unordered-list-content" class="block text-xs font-medium text-gray-500 dark:text-gray-400">{t("snippet.unordered_list_content_label")}</label>
          <textarea id="snip-unordered-list-content" rows="10" placeholder={t("snippet.unordered_list_content_placeholder")} oninput={snippetUpdatePreview} class="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y leading-relaxed"></textarea>
        </div>
      </div>

      <!-- Panel: code-block -->
      <div id="snip-panel-code-block" class="hidden space-y-3">
        <div class="space-y-1.5">
          <label class="block text-xs font-medium text-gray-500 dark:text-gray-400">
            <span>{t("snippet.code_lang_label")}</span>
            <span class="font-normal text-gray-400">{t("snippet.code_lang_hint")}</span>
          </label>
          <input id="snip-code-lang" type="text" placeholder="javascript" oninput={snippetUpdatePreview} class="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div class="space-y-1.5">
          <label for="snip-code-content" class="block text-xs font-medium text-gray-500 dark:text-gray-400">{t("snippet.code_content_label")}</label>
          <textarea id="snip-code-content" rows="12" placeholder={t("snippet.code_content_placeholder")} oninput={snippetUpdatePreview} class="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y font-mono leading-relaxed"></textarea>
        </div>
      </div>

      <!-- Panel: blockquote -->
      <div id="snip-panel-blockquote" class="hidden space-y-3">
        <div class="space-y-1.5">
          <label for="snip-blockquote-content" class="block text-xs font-medium text-gray-500 dark:text-gray-400">{t("snippet.blockquote_content_label")}</label>
          <textarea id="snip-blockquote-content" rows="8" placeholder={t("snippet.blockquote_content_placeholder")} oninput={snippetUpdatePreview} class="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y leading-relaxed"></textarea>
        </div>
      </div>

      <!-- Panel: image -->
      <div id="snip-panel-image" class="hidden space-y-3">
        <div class="space-y-1.5">
          <label for="snip-image-alt" class="block text-xs font-medium text-gray-500 dark:text-gray-400">{t("snippet.image_alt_label")}</label>
          <input id="snip-image-alt" type="text" placeholder={t("snippet.image_alt_placeholder")} oninput={snippetUpdatePreview} class="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div class="space-y-1.5">
          <label for="snip-image-url" class="block text-xs font-medium text-gray-500 dark:text-gray-400">{t("snippet.image_url_label")}</label>
          <input id="snip-image-url" type="text" placeholder={t("snippet.image_src_placeholder")} oninput={snippetUpdatePreview} class="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <!-- Panel: table -->
      <div id="snip-panel-table" class="hidden space-y-3">
        <div class="flex items-center gap-5 flex-wrap">
          <div class="flex items-center gap-2">
            <label for="snip-table-style" class="text-xs text-gray-500 dark:text-gray-400">{t("snippet.table_style_label")}</label>
            <select id="snip-table-style" onchange={snippetUpdatePreview} class="text-xs rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-1">
              <option value="">{t("snippet.table_style_default")}</option>
              <option value="compact">{t("snippet.table_style_compact")}</option>
              <option value="striped">{t("snippet.table_style_striped")}</option>
            </select>
          </div>
          <label class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <input id="snip-table-bordered" type="checkbox" onchange={snippetUpdatePreview} class="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500" />
            <span>{t("snippet.table_border_label")}</span>
          </label>
          <div class="flex items-center gap-2">
            <label for="snip-table-color" class="text-xs text-gray-500 dark:text-gray-400">{t("snippet.table_color_label")}</label>
            <select id="snip-table-color" onchange={snippetUpdatePreview} class="text-xs rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-1">
              <option value="">{t("snippet.table_color_default")}</option>
              <option value="info">{t("snippet.table_color_info")}</option>
              <option value="success">{t("snippet.table_color_success")}</option>
              <option value="warning">{t("snippet.table_color_warning")}</option>
              <option value="danger">{t("snippet.table_color_danger")}</option>
              <option value="note">{t("snippet.table_color_note")}</option>
            </select>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-500 dark:text-gray-400">{t("snippet.table_rows_label")}</span>
            <button onclick={() => tableChangeRows(tableCtrl, -1)} class="text-xs px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">−</button>
            <span id="snip-table-rows" class="text-xs font-mono w-4 text-center">3</span>
            <button onclick={() => tableChangeRows(tableCtrl, 1)} class="text-xs px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">+</button>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-500 dark:text-gray-400">{t("snippet.table_cols_label")}</span>
            <button onclick={() => tableChangeCols(tableCtrl, -1)} class="text-xs px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">−</button>
            <span id="snip-table-cols" class="text-xs font-mono w-4 text-center">3</span>
            <button onclick={() => tableChangeCols(tableCtrl, 1)} class="text-xs px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">+</button>
          </div>
        </div>
        <div id="snip-table-grid" class="overflow-x-auto"></div>
      </div>

      <!-- Panel: tree -->
      <div id="snip-panel-tree" class="hidden space-y-2">
        <p class="text-xs text-gray-400 dark:text-gray-500">{t("snippet.tree_hint")}</p>
        <div id="snip-tree-list" class="space-y-1"></div>
        <button onclick={() => treeAddItem(treeCtrl)} class="text-xs px-3 py-1.5 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors w-full">{t("snippet.tree_add_btn")}</button>
      </div>

      <!-- Panel: diagram -->
      <div id="snip-panel-diagram" class="hidden space-y-3">
        <div class="flex gap-4 text-sm">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="snip-diag-mode" id="snip-diag-mode-existing" value="existing" checked onchange={snippetDiagModeChanged} />
            <span class="text-gray-700 dark:text-gray-300">{t("snippet.diagram_existing")}</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="snip-diag-mode" id="snip-diag-mode-new" value="new" onchange={snippetDiagModeChanged} />
            <span class="text-gray-700 dark:text-gray-300">{t("snippet.diagram_new")}</span>
          </label>
        </div>
        <div id="snip-diag-existing-section" class="space-y-1.5">
          <label for="snip-diag-select" class="block text-xs font-medium text-gray-500 dark:text-gray-400">{t("snippet.diagram_select_label")}</label>
          <select id="snip-diag-select" onchange={() => { snippetDiagSyncImgName(); snippetUpdatePreview(); }} class="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"></select>
        </div>
        <div id="snip-diag-new-section" class="hidden space-y-1.5">
          <label for="snip-diag-new-name" class="block text-xs font-medium text-gray-500 dark:text-gray-400">{t("snippet.diagram_name_label")}</label>
          <input id="snip-diag-new-name" type="text" placeholder={t("snippet.diagram_name_placeholder")} oninput={() => { snippetDiagSyncImgName(); snippetUpdatePreview(); }} class="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div class="space-y-1.5">
          <label for="snip-diag-img-name" class="block text-xs font-medium text-gray-500 dark:text-gray-400">
            <span>{t("snippet.diag_img_label")}</span>
            <span class="font-normal text-gray-400">{t("snippet.diag_img_saved_hint")}</span>
          </label>
          <input id="snip-diag-img-name" type="text" placeholder="diagram.png" oninput={snippetUpdatePreview} class="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <!-- Panel: colored-section -->
      <div id="snip-panel-colored-section" class="hidden space-y-3">
        <div class="space-y-1.5">
          <label class="block text-xs font-medium text-gray-500 dark:text-gray-400">{t("snippet.colored_section_color_label")}</label>
          <div class="flex flex-wrap gap-2">
            <button type="button" data-color-swatch="info" onclick={(e) => colorSectionPickSwatch(e.currentTarget)} title={t("snippet.colored_section_swatch_info")} class="w-7 h-7 rounded-full border-2 border-blue-400 bg-blue-100 ring-2 ring-transparent hover:ring-blue-400 transition-all color-swatch-btn selected-swatch" aria-label={t("snippet.colored_section_swatch_info")}></button>
            <button type="button" data-color-swatch="success" onclick={(e) => colorSectionPickSwatch(e.currentTarget)} title={t("snippet.colored_section_swatch_success")} class="w-7 h-7 rounded-full border-2 border-green-400 bg-green-100 ring-2 ring-transparent hover:ring-green-400 transition-all color-swatch-btn" aria-label={t("snippet.colored_section_swatch_success")}></button>
            <button type="button" data-color-swatch="warning" onclick={(e) => colorSectionPickSwatch(e.currentTarget)} title={t("snippet.colored_section_swatch_warning")} class="w-7 h-7 rounded-full border-2 border-amber-400 bg-amber-100 ring-2 ring-transparent hover:ring-amber-400 transition-all color-swatch-btn" aria-label={t("snippet.colored_section_swatch_warning")}></button>
            <button type="button" data-color-swatch="danger" onclick={(e) => colorSectionPickSwatch(e.currentTarget)} title={t("snippet.colored_section_swatch_danger")} class="w-7 h-7 rounded-full border-2 border-red-400 bg-red-100 ring-2 ring-transparent hover:ring-red-400 transition-all color-swatch-btn" aria-label={t("snippet.colored_section_swatch_danger")}></button>
            <button type="button" data-color-swatch="note" onclick={(e) => colorSectionPickSwatch(e.currentTarget)} title={t("snippet.colored_section_swatch_note")} class="w-7 h-7 rounded-full border-2 border-purple-400 bg-purple-100 ring-2 ring-transparent hover:ring-purple-400 transition-all color-swatch-btn" aria-label={t("snippet.colored_section_swatch_note")}></button>
            <button type="button" data-color-swatch="neutral" onclick={(e) => colorSectionPickSwatch(e.currentTarget)} title={t("snippet.colored_section_swatch_neutral")} class="w-7 h-7 rounded-full border-2 border-gray-400 bg-gray-100 ring-2 ring-transparent hover:ring-gray-400 transition-all color-swatch-btn" aria-label={t("snippet.colored_section_swatch_neutral")}></button>
          </div>
        </div>
        <div class="space-y-1.5">
          <label for="snip-colored-content" class="block text-xs font-medium text-gray-500 dark:text-gray-400">{t("snippet.colored_section_content_label")}</label>
          <textarea id="snip-colored-content" rows="4" placeholder={t("snippet.colored_section_content_placeholder")} oninput={snippetUpdatePreview} class="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y font-mono"></textarea>
        </div>
      </div>

      <!-- Panel: colored-text -->
      <div id="snip-panel-colored-text" class="hidden space-y-3">
        <div class="space-y-1.5">
          <label class="block text-xs font-medium text-gray-500 dark:text-gray-400">{t("snippet.colored_text_color_label")}</label>
          <div class="flex flex-wrap gap-2">
            <button type="button" data-color-text-swatch="info" onclick={(e) => colorTextPickSwatch(e.currentTarget)} title={t("snippet.colored_section_swatch_info")} class="w-7 h-7 rounded-full border-2 border-blue-500 bg-blue-500 ring-2 ring-transparent hover:ring-blue-400 transition-all color-text-swatch-btn selected-text-swatch" aria-label={t("snippet.colored_section_swatch_info")}></button>
            <button type="button" data-color-text-swatch="success" onclick={(e) => colorTextPickSwatch(e.currentTarget)} title={t("snippet.colored_section_swatch_success")} class="w-7 h-7 rounded-full border-2 border-green-500 bg-green-500 ring-2 ring-transparent hover:ring-green-400 transition-all color-text-swatch-btn" aria-label={t("snippet.colored_section_swatch_success")}></button>
            <button type="button" data-color-text-swatch="warning" onclick={(e) => colorTextPickSwatch(e.currentTarget)} title={t("snippet.colored_section_swatch_warning")} class="w-7 h-7 rounded-full border-2 border-amber-500 bg-amber-500 ring-2 ring-transparent hover:ring-amber-400 transition-all color-text-swatch-btn" aria-label={t("snippet.colored_section_swatch_warning")}></button>
            <button type="button" data-color-text-swatch="danger" onclick={(e) => colorTextPickSwatch(e.currentTarget)} title={t("snippet.colored_section_swatch_danger")} class="w-7 h-7 rounded-full border-2 border-red-500 bg-red-500 ring-2 ring-transparent hover:ring-red-400 transition-all color-text-swatch-btn" aria-label={t("snippet.colored_section_swatch_danger")}></button>
            <button type="button" data-color-text-swatch="note" onclick={(e) => colorTextPickSwatch(e.currentTarget)} title={t("snippet.colored_section_swatch_note")} class="w-7 h-7 rounded-full border-2 border-purple-500 bg-purple-500 ring-2 ring-transparent hover:ring-purple-400 transition-all color-text-swatch-btn" aria-label={t("snippet.colored_section_swatch_note")}></button>
            <button type="button" data-color-text-swatch="neutral" onclick={(e) => colorTextPickSwatch(e.currentTarget)} title={t("snippet.colored_section_swatch_neutral")} class="w-7 h-7 rounded-full border-2 border-gray-500 bg-gray-500 ring-2 ring-transparent hover:ring-gray-400 transition-all color-text-swatch-btn" aria-label={t("snippet.colored_section_swatch_neutral")}></button>
          </div>
        </div>
        <div class="space-y-1.5">
          <label for="snip-colored-text-content" class="block text-xs font-medium text-gray-500 dark:text-gray-400">{t("snippet.colored_text_content_label")}</label>
          <input id="snip-colored-text-content" type="text" placeholder={t("snippet.colored_text_content_placeholder")} oninput={snippetUpdatePreview} class="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <!-- Panel: emojis -->
      <div id="snip-panel-emojis" class="hidden space-y-3">
        <div class="space-y-1.5">
          <label for="snip-emoji-string" class="block text-xs font-medium text-gray-500 dark:text-gray-400">{t("snippet.emoji_selected_label")}</label>
          <div class="flex gap-1">
            <input id="snip-emoji-string" type="text" oninput={snippetUpdatePreview} class="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button type="button" id="snip-emoji-clear" onclick={emojiClear} class="px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700">{t("snippet.emoji_clear_btn")}</button>
          </div>
        </div>
        <div class="space-y-1.5">
          <input id="snip-emoji-search" type="text" placeholder={t("snippet.emoji_search_placeholder")} class="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div id="snip-emoji-grid" class="space-y-2 max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2 bg-white dark:bg-gray-900"></div>
      </div>

      <!-- Panel: file attachment -->
      <div id="snip-panel-attachment" class="hidden space-y-3">
        <div class="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-3 py-3 text-sm text-blue-900 dark:text-blue-100 space-y-2">
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          <p>{@html t("snippet.attachment_help")}</p>
          <p class="text-xs text-blue-700 dark:text-blue-300">{@html t("snippet.attachment_alt")}</p>
        </div>
      </div>

      <!-- Markdown preview -->
      <div id="snippet-preview-wrap" class="space-y-1.5">
        <label class="block text-xs font-medium text-gray-500 dark:text-gray-400">{t("snippet.markdown_preview_label")}</label>
        <pre id="snippet-preview" class="text-xs bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2 overflow-x-auto text-gray-700 dark:text-gray-300 whitespace-pre-wrap"></pre>
      </div>

      <!-- Actions -->
      <div class="flex justify-end gap-3 pt-1">
        <button onclick={deleteInlineSnippet} id="snippet-delete-btn" class="hidden text-sm px-4 py-2 mr-auto rounded-lg border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">{t("snippet.inline_delete_btn")}</button>
        <button onclick={onclose} class="text-sm px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">{t("common.cancel")}</button>
        <button onclick={insertSnippet} id="snippet-submit-btn" class="text-sm px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors">{t("snippet.insert_btn")}</button>
      </div>
    </div>
  </div>
{/if}

<ConfirmDialog bind:this={confirmDialog} />
