// Snippets — Tree builder (ported from snippet-tree.js).
// Keeps the imperative list rendering used by the snippets modal.

function esc(str: string): string {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface TreeItem {
  name: string;
  depth: number;
}

export interface TreeController {
  items: TreeItem[];
  onPreview: () => void;
}

export function createTreeController(onPreview: () => void): TreeController {
  return { items: [], onPreview };
}

export function treeInit(ctrl: TreeController): void {
  ctrl.items = [
    { name: "dossier/", depth: 0 },
    { name: "fichier.md", depth: 1 },
  ];
  treeRenderList(ctrl);
}

export function treeRenderList(ctrl: TreeController): void {
  const btnCls =
    "text-xs px-1.5 py-1 rounded border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors";
  const list = document.getElementById("snip-tree-list");
  if (!list) return;
  list.innerHTML = ctrl.items
    .map(
      (item, i) => `
      <div class="flex items-center gap-1">
        <button data-tree-indent="${i}" data-tree-delta="-1" ${item.depth === 0 ? "disabled" : ""} class="${btnCls}" title="Désindenter">←</button>
        <button data-tree-indent="${i}" data-tree-delta="1" class="${btnCls}" title="Indenter">→</button>
        <span class="text-xs text-gray-300 dark:text-gray-600 font-mono w-4 shrink-0 text-center">${item.depth > 0 ? item.depth : ""}</span>
        <input type="text" value="${esc(item.name)}" data-tree-name="${i}"
          class="flex-1 px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono" />
        <button data-tree-remove="${i}" class="${btnCls}" title="Supprimer">×</button>
      </div>`,
    )
    .join("");

  list.querySelectorAll<HTMLButtonElement>("button[data-tree-indent]").forEach((btn) => {
    btn.addEventListener("click", () =>
      treeIndent(ctrl, Number(btn.dataset.treeIndent), Number(btn.dataset.treeDelta)),
    );
  });
  list.querySelectorAll<HTMLInputElement>("input[data-tree-name]").forEach((input) => {
    input.addEventListener("input", () => {
      ctrl.items[Number(input.dataset.treeName)].name = input.value;
      ctrl.onPreview();
    });
  });
  list.querySelectorAll<HTMLButtonElement>("button[data-tree-remove]").forEach((btn) => {
    btn.addEventListener("click", () => treeRemoveItem(ctrl, Number(btn.dataset.treeRemove)));
  });
  ctrl.onPreview();
}

export function treeIndent(ctrl: TreeController, i: number, delta: number): void {
  ctrl.items[i].depth = Math.max(0, ctrl.items[i].depth + delta);
  treeRenderList(ctrl);
}

export function treeAddItem(ctrl: TreeController): void {
  const lastDepth = ctrl.items.length ? ctrl.items[ctrl.items.length - 1].depth : 0;
  ctrl.items.push({ name: "", depth: lastDepth });
  treeRenderList(ctrl);
}

export function treeRemoveItem(ctrl: TreeController, i: number): void {
  ctrl.items.splice(i, 1);
  treeRenderList(ctrl);
}

export function buildTreeMarkdown(ctrl: TreeController): string {
  const items = ctrl.items;
  if (!items.length) return "```text\n(vide)\n```";
  const lines: string[] = [];
  for (let i = 0; i < items.length; i++) {
    const { name, depth } = items[i];
    if (depth === 0) {
      lines.push(name);
      continue;
    }
    let prefix = "";
    for (let a = 0; a < depth - 1; a++) {
      let continues = false;
      for (let j = i + 1; j < items.length; j++) {
        if (items[j].depth <= a + 1) {
          continues = items[j].depth === a + 1;
          break;
        }
      }
      prefix += continues ? "│   " : "    ";
    }
    let isLast = true;
    for (let j = i + 1; j < items.length; j++) {
      if (items[j].depth < depth) break;
      if (items[j].depth === depth) {
        isLast = false;
        break;
      }
    }
    lines.push(prefix + (isLast ? "└── " : "├── ") + name);
  }
  return `\`\`\`text\n${lines.join("\n")}\n\`\`\``;
}

export function parseTreeSnippetMarkdown(markdown: string): { items: TreeItem[] } {
  const inner = markdown.replace(/^```text\n/, "").replace(/\n```$/, "");
  return {
    items: inner.split("\n").map((line) => {
      const match = line.match(/^((?:│ {3}| {4})*)(?:├── |└── )([\s\S]+)$/);
      if (match) return { name: match[2], depth: match[1].length / 4 + 1 };
      return { name: line, depth: 0 };
    }),
  };
}
