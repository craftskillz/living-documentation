// ── Snippets — Tree builder ──────────────────────────────────────────────────
// Loaded as a classic script; exposes the tree-builder helpers and `_treeItems`
// state as globals. Depends on `esc` (utils.js) and `snippetUpdatePreview`
// (defined inline in index.html).

let _treeItems = [];

function treeInit() {
  _treeItems = [
    { name: "dossier/", depth: 0 },
    { name: "fichier.md", depth: 1 },
  ];
  treeRenderList();
}

function treeRenderList() {
  const btnCls =
    "text-xs px-1.5 py-1 rounded border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors";
  document.getElementById("snip-tree-list").innerHTML = _treeItems
    .map(
      (item, i) => `
      <div class="flex items-center gap-1">
        <button onclick="treeIndent(${i},-1)" ${item.depth === 0 ? "disabled" : ""} class="${btnCls}" title="Désindenter">←</button>
        <button onclick="treeIndent(${i},1)" class="${btnCls}" title="Indenter">→</button>
        <span class="text-xs text-gray-300 dark:text-gray-600 font-mono w-4 shrink-0 text-center">${item.depth > 0 ? item.depth : ""}</span>
        <input type="text" value="${esc(item.name)}" oninput="treeUpdate(${i}, this.value)"
          class="flex-1 px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono" />
        <button onclick="treeRemoveItem(${i})" class="${btnCls}" title="Supprimer">×</button>
      </div>`,
    )
    .join("");
  snippetUpdatePreview();
}

function treeUpdate(i, val) {
  _treeItems[i].name = val;
  snippetUpdatePreview();
}

function treeIndent(i, delta) {
  _treeItems[i].depth = Math.max(0, _treeItems[i].depth + delta);
  treeRenderList();
}

function treeAddItem() {
  const lastDepth = _treeItems.length
    ? _treeItems[_treeItems.length - 1].depth
    : 0;
  _treeItems.push({ name: "", depth: lastDepth });
  treeRenderList();
}

function treeRemoveItem(i) {
  _treeItems.splice(i, 1);
  treeRenderList();
}

function buildTreeMarkdown() {
  if (!_treeItems.length) return "```text\n(vide)\n```";
  const lines = [];
  for (let i = 0; i < _treeItems.length; i++) {
    const { name, depth } = _treeItems[i];
    if (depth === 0) {
      lines.push(name);
      continue;
    }

    // Prefix: for each ancestor level a (0..depth-2),
    // show │ if there's a sibling at depth a+1 after this item
    let prefix = "";
    for (let a = 0; a < depth - 1; a++) {
      let continues = false;
      for (let j = i + 1; j < _treeItems.length; j++) {
        if (_treeItems[j].depth <= a + 1) {
          continues = _treeItems[j].depth === a + 1;
          break;
        }
      }
      prefix += continues ? "│   " : "    ";
    }

    // Connector: └── if last sibling at this depth, ├── otherwise
    let isLast = true;
    for (let j = i + 1; j < _treeItems.length; j++) {
      if (_treeItems[j].depth < depth) break;
      if (_treeItems[j].depth === depth) {
        isLast = false;
        break;
      }
    }
    lines.push(prefix + (isLast ? "└── " : "├── ") + name);
  }
  return "```text\n" + lines.join("\n") + "\n```";
}
