// ── Kanban board widget (whole-document takeover) ───────────────────────────
// When a document contains the `<div data-ld-kanban data-columns="A|B|C">`
// marker, its entire rendered view becomes an interactive kanban board:
//   - each column maps to a subfolder of the kanban doc's folder (created
//     lazily and idempotently via POST /api/browse/mkdir);
//   - the documents inside a column folder are the cards
//     (title + description + date);
//   - dragging a card to another column moves the .md file on disk through
//     POST /api/documents/:id/move (the doc id changes — it encodes the path);
//   - each column has a "+" affordance that creates a new document in its
//     folder through POST /api/documents.
// Imperative DOM construction, stateless and rebuilt on every wire — same
// pattern as localSearch.ts. Tailwind classes in strings, with layout-critical
// properties duplicated inline (Tailwind CDN JIT caveat, see inlineSnippetEdit).

import { normalizeFolderSegment } from "../../../../lib/folderName";
import { ldParseKanbanColumnConfigs } from "./snippets/parsers";
import type { DocSummary } from "./types";

export interface KanbanRange {
  start: number;
  end: number;
  type: string;
}

export interface KanbanOptions {
  docId: string; // encoded id of the kanban document
  content: string; // markdown source (to locate the marker range for editing)
  docs?: DocSummary[];
  docsFolder?: string;
  folderPaths?: string[];
  t: (key: string) => string;
  onDocLink: (id: string, anchor: string | null) => void;
  onDocsChange?: (docs: DocSummary[]) => void;
  onFolderPathsChange?: (folderPaths: string[]) => void;
}

const KANBAN_MARKER_RE = /^<div\s+data-ld-kanban\b[^\n]*<\/div>[ \t]*$/im;
const KANBAN_ITEM_DEFAULT_DESCRIPTION = "Here is the description";
const KANBAN_ITEM_DEFAULT_CONTENT = "Here is the Full Content";
const KANBAN_CARD_DESCRIPTION_MAX_LENGTH = 140;
const KANBAN_DRAG_HIGHLIGHT_WIDTH = 2;
const KANBAN_DRAG_HIGHLIGHT_COLOR = "#60a5fa";
const KANBAN_CARD_DRAG_OPACITY = "0.65";
const KANBAN_VIEWPORT_BOTTOM_GAP = 24;
const KANBAN_MIN_COLUMN_HEIGHT = 360;

interface KanbanColumn {
  label: string;
  color: string;
  folderSegment: string;
  folderPath: string; // relative to docsPath, posix
}

let cachedDocsFolder: string | null = null;

const KANBAN_COLUMN_THEMES: Record<
  string,
  {
    bg: string;
    border: string;
    title: string;
    countBg: string;
    countText: string;
    action: string;
    actionHover: string;
  }
> = {
  sky: {
    bg: "#f0f9ff",
    border: "#bae6fd",
    title: "#075985",
    countBg: "#e0f2fe",
    countText: "#0369a1",
    action: "#0284c7",
    actionHover: "#e0f2fe",
  },
  amber: {
    bg: "#fffbeb",
    border: "#fde68a",
    title: "#92400e",
    countBg: "#fef3c7",
    countText: "#b45309",
    action: "#d97706",
    actionHover: "#fef3c7",
  },
  emerald: {
    bg: "#ecfdf5",
    border: "#a7f3d0",
    title: "#065f46",
    countBg: "#d1fae5",
    countText: "#047857",
    action: "#059669",
    actionHover: "#d1fae5",
  },
  rose: {
    bg: "#fff1f2",
    border: "#fecdd3",
    title: "#9f1239",
    countBg: "#ffe4e6",
    countText: "#be123c",
    action: "#e11d48",
    actionHover: "#ffe4e6",
  },
  violet: {
    bg: "#f5f3ff",
    border: "#ddd6fe",
    title: "#5b21b6",
    countBg: "#ede9fe",
    countText: "#6d28d9",
    action: "#7c3aed",
    actionHover: "#ede9fe",
  },
  slate: {
    bg: "#f8fafc",
    border: "#cbd5e1",
    title: "#334155",
    countBg: "#e2e8f0",
    countText: "#475569",
    action: "#475569",
    actionHover: "#e2e8f0",
  },
};

function kanbanColumnTheme(color: string): typeof KANBAN_COLUMN_THEMES.sky {
  return KANBAN_COLUMN_THEMES[color] || KANBAN_COLUMN_THEMES.sky;
}

export function findKanbanRange(content: string): KanbanRange | null {
  const match = KANBAN_MARKER_RE.exec(content);
  if (!match) return null;
  return {
    start: match.index,
    end: match.index + match[0].length,
    type: "kanban",
  };
}

function setLaneDropHighlight(lane: HTMLElement, active: boolean): void {
  lane.style.boxShadow = active
    ? `inset 0 0 0 ${KANBAN_DRAG_HIGHLIGHT_WIDTH}px ${KANBAN_DRAG_HIGHLIGHT_COLOR}`
    : "";
}

function setCardDragHighlight(card: HTMLElement, active: boolean): void {
  card.style.boxShadow = active
    ? `inset 0 0 0 ${KANBAN_DRAG_HIGHLIGHT_WIDTH}px ${KANBAN_DRAG_HIGHLIGHT_COLOR}, 0 1px 2px rgba(15, 23, 42, 0.08)`
    : "";
  card.style.opacity = active ? KANBAN_CARD_DRAG_OPACITY : "";
}

function syncKanbanViewportHeight(root: HTMLElement, lanes: HTMLElement): void {
  const columns = Array.from(
    lanes.querySelectorAll<HTMLElement>("[data-testid='kanban-column']"),
  );
  const top = columns[0]?.getBoundingClientRect().top ?? lanes.getBoundingClientRect().top;
  const visibleHeight = window.innerHeight - top - KANBAN_VIEWPORT_BOTTOM_GAP;
  const contentHeight = columns.reduce(
    (max, column) => Math.max(max, column.scrollHeight),
    0,
  );
  const height = Math.max(
    KANBAN_MIN_COLUMN_HEIGHT,
    Math.round(visibleHeight),
    Math.ceil(contentHeight),
  );
  lanes.style.minHeight = `${height}px`;
  for (const column of columns) {
    column.style.minHeight = `${height}px`;
  }
}

function installKanbanViewportHeightSync(
  root: HTMLElement,
  lanes: HTMLElement,
): () => void {
  const apply = () => {
    if (!document.body.contains(root)) return;
    syncKanbanViewportHeight(root, lanes);
  };
  apply();
  requestAnimationFrame(apply);

  const controller = new AbortController();
  window.addEventListener("resize", apply, { signal: controller.signal });

  const observer = new MutationObserver(() => {
    if (document.body.contains(root)) return;
    controller.abort();
    observer.disconnect();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  return apply;
}

async function fetchDocsFolder(preferred?: string): Promise<string> {
  if (preferred) return preferred;
  if (cachedDocsFolder !== null) return cachedDocsFolder;
  try {
    const cfg = await fetch("/api/config").then((r) => r.json());
    cachedDocsFolder = typeof cfg.docsFolder === "string" ? cfg.docsFolder : "";
  } catch {
    cachedDocsFolder = "";
  }
  return cachedDocsFolder;
}

/**
 * Detects the kanban marker in the rendered document and, when present,
 * replaces the whole content with the interactive board.
 * Returns true when the board took over `contentEl`.
 */
export function initKanbanBoard(
  contentEl: HTMLElement,
  opts: KanbanOptions,
): boolean {
  const marker = contentEl.querySelector("[data-ld-kanban]");
  if (!marker) return false;

  const decodedId = decodeURIComponent(opts.docId || "");
  const root = document.createElement("div");
  root.setAttribute("data-ld-kanban-root", "");
  root.dataset.testid = "kanban-board";
  root.className = "ld-kanban-board";
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.gap = "12px";

  const columnConfigs = ldParseKanbanColumnConfigs(marker.outerHTML);
  contentEl.replaceChildren(root);

  // Extra files (absolute ids) live outside the docs tree — no folders there.
  if (!decodedId || decodedId.startsWith("/")) {
    root.appendChild(banner(opts.t("kanban.unsupported_doc"), "info"));
    return true;
  }

  const boardFolder = decodedId.includes("/")
    ? decodedId.slice(0, decodedId.lastIndexOf("/"))
    : "";

  // Dedupe columns that normalize to the same folder ("To do" / "To-do").
  const seen = new Set<string>();
  const columns: KanbanColumn[] = [];
  for (const column of columnConfigs) {
    const segment = normalizeFolderSegment(column.label);
    if (!segment || seen.has(segment)) continue;
    seen.add(segment);
    columns.push({
      label: column.label,
      color: column.color || "sky",
      folderSegment: segment,
      folderPath: boardFolder ? `${boardFolder}/${segment}` : segment,
    });
  }

  renderBoard(root, columns, opts);
  return true;
}

function banner(message: string, kind: "info" | "error"): HTMLElement {
  const el = document.createElement("p");
  el.className =
    kind === "error"
      ? "ld-kanban-banner rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-sm px-3 py-2"
      : "ld-kanban-banner rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-sm px-3 py-2";
  el.textContent = message;
  return el;
}

function renderBoard(
  root: HTMLElement,
  columns: KanbanColumn[],
  opts: KanbanOptions,
): void {
  const { t } = opts;

  const errorHost = document.createElement("div");
  root.appendChild(errorHost);

  const lanes = document.createElement("div");
  lanes.className = "ld-kanban-lanes";
  lanes.dataset.testid = "kanban-lanes";
  lanes.style.display = "flex";
  lanes.style.width = "100%";
  lanes.style.gap = "12px";
  lanes.style.alignItems = "stretch";
  lanes.style.overflowX = "auto";
  lanes.style.paddingBottom = "8px";
  root.appendChild(lanes);
  const syncHeight = installKanbanViewportHeightSync(root, lanes);

  const showError = (message: string) => {
    errorHost.replaceChildren(banner(message, "error"));
  };
  const clearError = () => errorHost.replaceChildren();

  let currentDocs = Array.isArray(opts.docs) ? opts.docs : [];
  let descriptionById = new Map<string, string>();
  let descriptionLoadToken = 0;

  const renderCurrent = () => {
    renderLanes(lanes, columns, currentDocs, {
      opts,
      showError,
      clearError,
      setDocs,
      descriptionById,
      setDescription,
    });
    syncHeight();
    requestAnimationFrame(syncHeight);
  };

  const setDescription = (docId: string, description: string) => {
    descriptionById = new Map(descriptionById);
    if (description) descriptionById.set(docId, description);
    else descriptionById.delete(docId);
  };

  const setDocs = (docs: DocSummary[]) => {
    currentDocs = sortDocs(docs);
    opts.onDocsChange?.(currentDocs);
    renderCurrent();
    void loadCardDescriptions();
  };

  const loadCardDescriptions = async () => {
    const token = ++descriptionLoadToken;
    const cardDocs = currentDocs.filter((doc) =>
      columns.some((col) => (doc.folder || []).join("/") === col.folderPath),
    );
    const missing = cardDocs.filter((doc) => !descriptionById.has(doc.id));
    if (!missing.length) return;

    const entries = await Promise.all(
      missing.map(async (doc) => {
        try {
          const detail = await fetch(`/api/documents/${doc.id}`).then((r) => {
            if (!r.ok) throw new Error(String(r.status));
            return r.json() as Promise<{ content?: string }>;
          });
          return [doc.id, parseKanbanItemDescription(detail.content || "")] as const;
        } catch {
          return [doc.id, ""] as const;
        }
      }),
    );
    if (token !== descriptionLoadToken) return;
    descriptionById = new Map(descriptionById);
    for (const [docId, description] of entries) {
      if (description) descriptionById.set(docId, description);
    }
    renderCurrent();
  };

  const refresh = async () => {
    try {
      const docs = (await fetch("/api/documents").then((r) => r.json())) as DocSummary[];
      setDocs(docs);
    } catch {
      showError(t("kanban.load_failed"));
    }
  };

  if (opts.docs) {
    renderCurrent();
    void loadCardDescriptions();
  } else {
    void refresh();
  }

  // Lazily ensure the column folders exist (idempotent). The board renders from
  // Home's already-loaded document list, so folder creation must not trigger a
  // global sidebar reload on the initial paint.
  void (async () => {
    const created = await ensureColumnFolders(columns, opts);
    if (created.length && opts.onFolderPathsChange) {
      opts.onFolderPathsChange(sortFolderPaths([...(opts.folderPaths || []), ...created]));
    }
  })();
}

function sortDocs(docs: DocSummary[]): DocSummary[] {
  return docs.slice().sort((a, b) => (a.filename || "").localeCompare(b.filename || ""));
}

function sortFolderPaths(paths: string[]): string[] {
  return Array.from(new Set(paths.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function buildKanbanItemContent(title: string): string {
  return `# ${title.trim()}\n\n${KANBAN_ITEM_DEFAULT_DESCRIPTION}\n\n## Content\n\n${KANBAN_ITEM_DEFAULT_CONTENT}\n`;
}

function parseKanbanItemDescription(content: string): string {
  const withoutFrontmatter = content.startsWith("---")
    ? content.replace(/^---[\s\S]*?\n---\s*/, "")
    : content;
  const withoutTitle = withoutFrontmatter.replace(/^#\s+.*(?:\r?\n|$)/, "").trimStart();
  const contentSection = withoutTitle.search(/^##\s+Content\s*$/im);
  const description = contentSection >= 0
    ? withoutTitle.slice(0, contentSection)
    : withoutTitle;
  return description.replace(/\s+/g, " ").trim();
}

function truncateDescription(description: string): string {
  if (description.length <= KANBAN_CARD_DESCRIPTION_MAX_LENGTH) return description;
  return `${description.slice(0, KANBAN_CARD_DESCRIPTION_MAX_LENGTH - 1).trimEnd()}…`;
}

async function ensureColumnFolders(
  columns: KanbanColumn[],
  opts: KanbanOptions,
): Promise<string[]> {
  const docsFolder = await fetchDocsFolder(opts.docsFolder);
  if (!docsFolder) return [];

  const known = new Set(opts.folderPaths || []);
  const missing = columns.filter((col) => !known.has(col.folderPath));
  if (!missing.length) return [];

  const created: string[] = [];
  await Promise.allSettled(
    missing.map(async (col) => {
      const res = await fetch("/api/browse/mkdir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: `${docsFolder}/${col.folderPath}` }),
      });
      if (res.ok) created.push(col.folderPath);
    }),
  );
  return created;
}

interface LaneContext {
  opts: KanbanOptions;
  showError: (message: string) => void;
  clearError: () => void;
  setDocs: (docs: DocSummary[]) => void;
  descriptionById: Map<string, string>;
  setDescription: (docId: string, description: string) => void;
}

function renderLanes(
  lanes: HTMLElement,
  columns: KanbanColumn[],
  docs: DocSummary[],
  ctx: LaneContext,
): void {
  const { opts, showError, clearError, setDocs, descriptionById, setDescription } = ctx;
  const { t } = opts;
  lanes.replaceChildren();

  for (const col of columns) {
    // Cards = documents that live DIRECTLY in the column folder.
    const cards = docs.filter(
      (doc) => (doc.folder || []).join("/") === col.folderPath,
    );
    const theme = kanbanColumnTheme(col.color);

    const lane = document.createElement("section");
    lane.dataset.testid = "kanban-column";
    lane.dataset.kanbanFolder = col.folderSegment;
    lane.dataset.kanbanColor = col.color;
    lane.className =
      "ld-kanban-column rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 p-3";
    lane.style.backgroundColor = theme.bg;
    lane.style.borderColor = theme.border;
    lane.style.flex = "1 1 280px";
    lane.style.minWidth = "240px";
    lane.style.alignSelf = "stretch";
    lane.style.display = "flex";
    lane.style.flexDirection = "column";
    lane.style.gap = "8px";

    // DnD target — highlight while a card hovers, move on drop.
    lane.addEventListener("dragover", (event) => {
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
      setLaneDropHighlight(lane, true);
    });
    lane.addEventListener("dragleave", () => {
      setLaneDropHighlight(lane, false);
    });
    lane.addEventListener("drop", (event) => {
      event.preventDefault();
      setLaneDropHighlight(lane, false);
      // The payload is the doc's already-encoded id (same convention as
      // Home.svelte's saveDoc: `/api/documents/${id}`).
      const docId = event.dataTransfer?.getData("text/plain");
      if (!docId) return;
      void (async () => {
        clearError();
        try {
          const res = await fetch(
            `/api/documents/${docId}/move`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ folder: col.folderPath }),
            },
          );
          if (!res.ok) {
            const body = await res.json().catch(() => ({}) as { error?: string });
            showError(t("kanban.move_failed") + (body.error || res.status));
            return;
          }
          const moved = (await res.json()) as DocSummary;
          setDocs(docs.map((doc) => (doc.id === docId ? moved : doc)));
        } catch (err) {
          showError(t("kanban.move_failed") + String(err));
        }
      })();
    });

    // Column header: label + count + add button.
    const head = document.createElement("header");
    head.style.display = "flex";
    head.style.alignItems = "center";
    head.style.justifyContent = "space-between";
    head.style.gap = "8px";
    head.style.margin = "0";
    const title = document.createElement("h2");
    title.className =
      "text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide";
    title.textContent = col.label;
    title.style.color = theme.title;
    title.style.margin = "0";
    title.style.lineHeight = "1.1";
    const meta = document.createElement("div");
    meta.style.display = "flex";
    meta.style.alignItems = "center";
    meta.style.gap = "6px";
    meta.style.margin = "0";
    const count = document.createElement("span");
    count.className =
      "text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 rounded-full px-2 py-0.5";
    count.textContent = String(cards.length);
    count.style.backgroundColor = theme.countBg;
    count.style.color = theme.countText;
    count.style.margin = "0";
    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.dataset.testid = "kanban-add-card";
    addBtn.title = t("kanban.add_card");
    addBtn.className =
      "inline-flex items-center justify-center w-6 h-6 rounded-md text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-sm font-bold";
    addBtn.textContent = "+";
    addBtn.style.color = theme.action;
    addBtn.style.margin = "0";
    addBtn.addEventListener("mouseenter", () => {
      addBtn.style.backgroundColor = theme.actionHover;
    });
    addBtn.addEventListener("mouseleave", () => {
      addBtn.style.backgroundColor = "";
    });
    meta.append(count, addBtn);
    head.append(title, meta);
    lane.appendChild(head);

    // Inline "new card" form (hidden until + is clicked).
    const form = document.createElement("form");
    form.hidden = true;
    form.style.display = "none";
    form.style.gap = "6px";
    form.style.margin = "0";
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = t("kanban.card_title_placeholder");
    input.className =
      "flex-1 min-w-0 px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500";
    const create = document.createElement("button");
    create.type = "submit";
    create.dataset.testid = "kanban-create-card";
    create.className =
      "px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white";
    create.textContent = t("kanban.create_btn");
    form.append(input, create);
    lane.appendChild(form);

    addBtn.addEventListener("click", () => {
      const show = form.hidden;
      form.hidden = !show;
      form.style.display = show ? "flex" : "none";
      if (show) input.focus();
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const titleValue = input.value.trim();
      if (!titleValue) return;
      void (async () => {
        clearError();
        try {
          const res = await fetch("/api/documents", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: titleValue,
              category: "General",
              folder: col.folderPath,
              content: buildKanbanItemContent(titleValue),
            }),
          });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}) as { error?: string });
            showError(t("kanban.create_failed") + (body.error || res.status));
            return;
          }
          const created = (await res.json()) as DocSummary;
          input.value = "";
          form.hidden = true;
          form.style.display = "none";
          setDescription(created.id, KANBAN_ITEM_DEFAULT_DESCRIPTION);
          setDocs([...docs, created]);
        } catch (err) {
          showError(t("kanban.create_failed") + String(err));
        }
      })();
    });

    // Cards.
    const list = document.createElement("div");
    list.style.display = "flex";
    list.style.flexDirection = "column";
    list.style.gap = "6px";
    list.style.flex = "1 1 auto";
    list.style.margin = "0";
    if (!cards.length) {
      const empty = document.createElement("p");
      empty.className = "text-xs text-gray-400 dark:text-gray-500 italic";
      empty.textContent = t("kanban.empty_column");
      empty.style.margin = "0";
      list.appendChild(empty);
    }
    for (const doc of cards) {
      const card = document.createElement("article");
      card.dataset.testid = "kanban-card";
      card.dataset.docId = doc.id;
      card.draggable = true;
      card.className =
        "ld-kanban-card rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 shadow-sm cursor-pointer hover:border-blue-300 dark:hover:border-blue-700";
      const cardTitle = document.createElement("p");
      cardTitle.className =
        "text-sm font-semibold text-gray-800 dark:text-gray-100";
      cardTitle.textContent = doc.title;
      cardTitle.style.margin = "0";
      card.appendChild(cardTitle);
      const description = descriptionById.get(doc.id);
      if (description) {
        const cardDescription = document.createElement("p");
        cardDescription.className =
          "text-xs text-gray-500 dark:text-gray-400 leading-snug";
        cardDescription.textContent = truncateDescription(description);
        cardDescription.style.margin = "0";
        card.appendChild(cardDescription);
      }
      if (doc.formattedDate) {
        const date = document.createElement("p");
        date.className = "text-xs text-gray-400 dark:text-gray-500";
        date.textContent = doc.formattedDate;
        date.style.margin = "0";
        card.appendChild(date);
      }
      card.addEventListener("dragstart", (event) => {
        event.dataTransfer?.setData("text/plain", doc.id);
        if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
        setCardDragHighlight(card, true);
      });
      card.addEventListener("dragend", () => {
        setCardDragHighlight(card, false);
      });
      card.addEventListener("click", () => {
        opts.onDocLink(doc.id, null);
      });
      list.appendChild(card);
    }
    lane.appendChild(list);
    lanes.appendChild(lane);
  }
}
