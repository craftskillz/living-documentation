<script lang="ts">
  import Self from "./TreeNode.svelte";
  import { home } from "./state.svelte";
  import { t } from "../i18n.svelte";
  import type { DocSummary, TreeNode } from "./types";
  import {
    countTreeDocs, countTreeAnnotatedDocs, countTreeFileAttachedDocs,
    folderLabel, sortedChildKeys, otherCategoryKeys, flatSortedDocs,
  } from "./tree";

  let { node, folderPath, onopen }: {
    node: TreeNode;
    folderPath: string[];
    onopen: (id: string) => void;
  } = $props();

  function catPathKey(cat: string) { return [...folderPath, cat].join("|"); }
  function childPathKey(key: string) { return [...folderPath, key].join("|"); }

  function badgeTitle(count: number, key: string): string {
    return `${count} ${t(key)}${count > 1 ? "s" : ""}`;
  }

  function statusPill(doc: DocSummary): "V" | "S" | null {
    if (!home.highlightStatusState) return null;
    const status = String(home.docStatuses[doc.id] || "").trim().toLowerCase();
    if (status === "to be validated") return "V";
    if (home.highlightStatusState === 2 && status === "superseeded") return "S";
    return null;
  }
</script>

{#if home.hideCategories}
  {#each flatSortedDocs(node) as doc (doc.id)}
    {@render docItem(doc)}
  {/each}
  {#each sortedChildKeys(node) as key (key)}
    {@render folderGroup(key)}
  {/each}
{:else}
  {#if node.categories["General"]}
    {@render categoryGroup("General")}
  {/if}
  {#each sortedChildKeys(node) as key (key)}
    {@render folderGroup(key)}
  {/each}
  {#each otherCategoryKeys(node) as cat (cat)}
    {@render categoryGroup(cat)}
  {/each}
{/if}

{#snippet docItem(doc: DocSummary)}
  {@const annCount = home.annotationCounts[doc.id] || 0}
  {@const fileCount = home.fileAttachmentCounts[doc.id] || 0}
  {@const pill = statusPill(doc)}
  <button
    id="item-{doc.id}"
    onclick={() => onopen(doc.id)}
    class="doc-item w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60 {doc.id === home.currentDocId ? 'active' : ''}"
  >
    <div class="leading-snug flex items-center justify-between gap-2">
      <span class="truncate">{doc.title}</span>
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
{/snippet}

{#snippet categoryGroup(cat: string)}
  {@const key = catPathKey(cat)}
  {@const isExpanded = home.expandedCategories.has(key)}
  {@const docs = node.categories[cat]}
  {@const annDocs = docs.reduce((s, d) => s + (home.annotationCounts[d.id] > 0 ? 1 : 0), 0)}
  {@const fileDocs = docs.reduce((s, d) => s + (home.fileAttachmentCounts[d.id] > 0 ? 1 : 0), 0)}
  <div class="mb-0.5">
    <button
      onclick={() => home.toggleCategory(key)}
      class="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:bg-gray-50 dark:hover:bg-gray-800/60 rounded-md transition-colors"
    >
      <span class="flex items-center gap-2">
        <span>{cat}</span>
        {#if annDocs > 0 && !home.markerHidden}<span title={badgeTitle(annDocs, "sidebar.annotated_docs_badge")} class="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-orange-400 dark:bg-orange-500 text-[10px] font-bold text-white border border-orange-600 shadow-sm">{annDocs}</span>{/if}
        {#if fileDocs > 0 && !home.hideAttachments}<span title={badgeTitle(fileDocs, "sidebar.file_attached_docs_badge")} class="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-slate-400 dark:bg-slate-500 text-[10px] font-bold text-white border border-slate-600 shadow-sm">{fileDocs}</span>{/if}
      </span>
      <span class="flex items-center gap-1.5">
        <span class="font-normal normal-case text-gray-400">{docs.length}</span>
        <span class="transition-transform duration-200 {isExpanded ? 'rotate-90' : ''}">▸</span>
      </span>
    </button>
    {#if isExpanded}
      <div class="pl-2">
        {#each docs as doc (doc.id)}
          {@render docItem(doc)}
        {/each}
      </div>
    {/if}
  </div>
{/snippet}

{#snippet folderGroup(key: string)}
  {@const pathKey = childPathKey(key)}
  {@const isExpanded = home.expandedFolders.has(pathKey)}
  {@const child = node.children[key]}
  {@const docCount = countTreeDocs(child)}
  {@const annDocs = countTreeAnnotatedDocs(child, home.annotationCounts)}
  {@const fileDocs = countTreeFileAttachedDocs(child, home.fileAttachmentCounts)}
  <div class="mb-1">
    <button
      onclick={() => home.toggleFolder(pathKey)}
      class="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider hover:bg-gray-50 dark:hover:bg-gray-800/60 rounded-md transition-colors"
    >
      <span class="flex items-center gap-2 min-w-0">
        <span title={key} class="truncate">📁 {folderLabel(key)}</span>
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
        <Self node={child} folderPath={[...folderPath, key]} {onopen} />
      </div>
    {/if}
  </div>
{/snippet}
