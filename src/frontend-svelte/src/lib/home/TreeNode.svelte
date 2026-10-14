<script lang="ts">
  import Self from "./TreeNode.svelte";
  import { home } from "./state.svelte";
  import { t } from "../i18n.svelte";
  import type { DocSummary, ExplorerNode } from "./types";
  import { countExplorerDocs, folderLabel } from "./tree";
  import { dropPositionAt, type DropPosition } from "./treeDrop";

  let { nodes, folderPath, onopen, onentrymenu, onmove }: {
    nodes: ExplorerNode[];
    folderPath: string[];
    onopen: (id: string) => void;
    onentrymenu: (e: MouseEvent, node: ExplorerNode) => void;
    onmove: (source: string, targetPath: string, position: DropPosition) => void;
  } = $props();

  function childPathKey(key: string) { return [...folderPath, key].join("|"); }

  // ── Drag and drop (disabled while searching) ─────────────────────────────────
  const canDrag = $derived(!home.searchQuery);

  function dropState(node: ExplorerNode): DropPosition | undefined {
    return home.dropTarget?.path === node.path ? home.dropTarget.position : undefined;
  }

  function onDragStart(e: DragEvent, node: ExplorerNode) {
    home.dragSourcePath = node.path;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", node.path);
    }
  }

  function onDragOver(e: DragEvent, node: ExplorerNode) {
    if (!home.dragSourcePath || !canDrag) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const position = dropPositionAt(node.kind, e.clientY - rect.top, rect.height);
    home.setDropTarget(node.path, position, node.kind === "folder" ? childPathKey(node.name) : null);
  }

  function onDrop(e: DragEvent, node: ExplorerNode) {
    e.preventDefault();
    e.stopPropagation();
    const source = home.dragSourcePath;
    const position = dropState(node);
    home.endDrag();
    if (source && position) onmove(source, node.path, position);
  }

  function badgeTitle(count: number, key: string): string {
    return `${count} ${t(key)}${count > 1 ? "s" : ""}`;
  }

  function summaryOf(node: ExplorerNode): DocSummary {
    const id = node.id ?? "";
    return home.docsById.get(id) ?? { id, title: node.name.replace(/\.md$/i, "") };
  }

  function statusPill(doc: DocSummary): "V" | "S" | null {
    if (!home.highlightStatusState) return null;
    const status = String(home.docStatuses[doc.id] || "").trim().toLowerCase();
    if (status === "to be validated") return "V";
    if (home.highlightStatusState === 2 && status === "superseeded") return "S";
    return null;
  }
</script>

{#each nodes as node (node.path)}
  {#if node.kind === "folder"}
    {@render folderGroup(node)}
  {:else}
    {@render docItem(summaryOf(node), node)}
  {/if}
{/each}

{#snippet docItem(doc: DocSummary, node: ExplorerNode)}
  {@const annCount = home.annotationCounts[doc.id] || 0}
  {@const fileCount = home.fileAttachmentCounts[doc.id] || 0}
  {@const pill = statusPill(doc)}
  {#if node.reserved}
    <button
      id="item-{doc.id}"
      onclick={() => onopen(doc.id)}
      oncontextmenu={(e) => e.preventDefault()}
      data-reserved="true"
      class="opacity-50 italic doc-item w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60 {doc.id === home.currentDocId ? 'active' : ''}"
    >
      <span class="truncate"><i class="fa-solid fa-lock text-[10px] mr-1.5"></i>{node.name}</span>
    </button>
  {:else}
  <button
    id="item-{doc.id}"
    onclick={() => onopen(doc.id)}
    oncontextmenu={(e) => (node.linked || node.extra ? e.preventDefault() : onentrymenu(e, node))}
    draggable={canDrag && !node.linked && !node.extra}
    ondragstart={(e) => onDragStart(e, node)}
    ondragover={(e) => !node.extra && onDragOver(e, node)}
    ondrop={(e) => !node.extra && onDrop(e, node)}
    ondragend={() => home.endDrag()}
    data-drop={dropState(node)}
    data-hidden={node.hidden ? "true" : undefined}
    data-linked={node.linked ? "true" : undefined}
    class="{node.hidden ? 'opacity-50 italic' : ''} doc-item w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60 {doc.id === home.currentDocId ? 'active' : ''}"
  >
    <div class="leading-snug flex items-center justify-between gap-2">
      <span class="truncate">{#if node.linked}<i class="fa-solid fa-link text-[10px] mr-1.5" title={t("sidebar.linked_file")}></i>{/if}{doc.title}</span>
      <span class="flex items-center gap-1 shrink-0">
        {#if pill === "V"}
          <span title={t("sidebar.status_to_validate")} class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-500 text-[10px] font-bold text-white border border-green-600 shadow-sm">V</span>
        {:else if pill === "S"}
          <span title={t("sidebar.status_superseeded")} class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-500 text-[10px] font-bold text-white border border-orange-600 shadow-sm">S</span>
        {/if}
        {#if annCount > 0 && !home.markerHidden}
          <span title={badgeTitle(annCount, "sidebar.annotation_badge")} class="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-yellow-300 dark:bg-yellow-400 text-[10px] font-bold text-yellow-900 border border-yellow-500 shadow-sm">{annCount}</span>
        {/if}
        {#if fileCount > 0 && !home.hideAttachments}
          <span title={badgeTitle(fileCount, "sidebar.file_attachment_badge")} class="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-sky-200 dark:bg-sky-300 text-[10px] font-bold text-sky-900 border border-sky-500 shadow-sm">{fileCount}</span>
        {/if}
      </span>
    </div>
    {#if doc.formattedDate}
      <div class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{doc.formattedDate}</div>
    {/if}
  </button>
  {/if}
{/snippet}

{#snippet folderGroup(folder: ExplorerNode)}
  {@const pathKey = folder.extra ? folder.path : childPathKey(folder.name)}
  {@const isExpanded = home.expandedFolders.has(pathKey)}
  {@const docCount = countExplorerDocs(folder)}
  {@const annDocs = countExplorerDocs(folder, (id) => home.annotationCounts[id] > 0)}
  {@const fileDocs = countExplorerDocs(folder, (id) => home.fileAttachmentCounts[id] > 0)}
  <div class="mb-1">
    <button
      onclick={() => home.toggleFolder(pathKey)}
      oncontextmenu={(e) => (folder.extra ? e.preventDefault() : onentrymenu(e, folder))}
      draggable={canDrag && !folder.extra}
      ondragstart={(e) => onDragStart(e, folder)}
      ondragover={(e) => !folder.extra && onDragOver(e, folder)}
      ondrop={(e) => !folder.extra && onDrop(e, folder)}
      data-extra={folder.extra ? "true" : undefined}
      ondragend={() => home.endDrag()}
      data-drop={dropState(folder)}
      data-hidden={folder.hidden ? "true" : undefined}
      class="{folder.hidden ? 'opacity-50 italic' : ''} w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider hover:bg-gray-50 dark:hover:bg-gray-800/60 rounded-md transition-colors"
    >
      <span class="flex items-center gap-2 min-w-0">
        <span title={folder.name} class="truncate">📁 {folderLabel(folder.name)}</span>
        {#if annDocs > 0 && !home.markerHidden}<span title={badgeTitle(annDocs, "sidebar.annotated_docs_badge")} class="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-orange-400 dark:bg-orange-500 text-[10px] font-bold text-white border border-orange-600 shadow-sm">{annDocs}</span>{/if}
        {#if fileDocs > 0 && !home.hideAttachments}<span title={badgeTitle(fileDocs, "sidebar.file_attached_docs_badge")} class="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-slate-400 dark:bg-slate-500 text-[10px] font-bold text-white border border-slate-600 shadow-sm">{fileDocs}</span>{/if}
      </span>
      <span class="flex items-center gap-1.5">
        <span class="font-normal normal-case text-gray-400">{docCount}</span>
        <span class="transition-transform duration-200 {isExpanded ? 'rotate-90' : ''}">▸</span>
      </span>
    </button>
    {#if isExpanded}
      <div class="pl-3">
        <Self nodes={folder.children ?? []} folderPath={[...folderPath, folder.name]} {onopen} {onentrymenu} {onmove} />
      </div>
    {/if}
  </div>
{/snippet}
