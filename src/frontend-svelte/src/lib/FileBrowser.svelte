<script lang="ts">
  let { docsFolder, extraFiles, onchange }: {
    docsFolder: string;
    extraFiles: string[];
    onchange: (files: string[]) => void;
  } = $props();

  interface BrowseData {
    current: string;
    parent: string | null;
    dirs: { name: string; path: string }[];
    files: { name: string; path: string }[];
  }

  let browseCurrent = $state("");
  let browseParent = $state<string | null>(null);
  let dirs = $state<{ name: string; path: string }[]>([]);
  let files = $state<{ name: string; path: string }[]>([]);
  let loading = $state(false);
  let error = $state(false);

  function pathRelative(from: string, to: string): string {
    if (!from) return to;
    const norm = (s: string) => s.replace(/\\/g, "/");
    const fromParts = norm(from).split("/").filter(Boolean);
    const toParts = norm(to).split("/").filter(Boolean);
    let common = 0;
    while (common < fromParts.length && common < toParts.length && fromParts[common] === toParts[common]) common++;
    const ups = fromParts.length - common;
    const downs = toParts.slice(common).join("/");
    let rel = "../".repeat(ups) + downs;
    if (rel.endsWith("/")) rel = rel.slice(0, -1);
    return rel === "" ? "." : rel;
  }

  function relativeDisplay(filePath: string): string {
    if (!docsFolder) return filePath;
    return "$DOCS_FOLDER/" + pathRelative(docsFolder, filePath);
  }

  export async function loadBrowse(dirPath: string) {
    loading = true;
    error = false;
    try {
      const data = (await fetch("/api/browse?path=" + encodeURIComponent(dirPath)).then((r) => r.json())) as BrowseData;
      browseCurrent = data.current;
      browseParent = data.parent;
      dirs = data.dirs;
      files = data.files;
    } catch {
      error = true;
    } finally {
      loading = false;
    }
  }

  function browseUp() {
    if (browseParent) loadBrowse(browseParent);
  }

  async function addFile(filePath: string) {
    if (extraFiles.includes(filePath)) return;
    const next = [...extraFiles, filePath];
    await saveExtraFiles(next);
    onchange(next);
    loadBrowse(browseCurrent);
  }

  async function removeFile(filePath: string) {
    const next = extraFiles.filter((f) => f !== filePath);
    await saveExtraFiles(next);
    onchange(next);
    loadBrowse(browseCurrent);
  }

  async function moveFile(index: number, direction: number) {
    const target = index + direction;
    if (target < 0 || target >= extraFiles.length) return;
    const next = [...extraFiles];
    [next[index], next[target]] = [next[target], next[index]];
    await saveExtraFiles(next);
    onchange(next);
  }

  async function saveExtraFiles(list: string[]) {
    const relativeEntries = list.map((abs) => pathRelative(docsFolder, abs));
    await fetch("/api/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ extraFiles: relativeEntries }),
    });
  }
</script>

<div class="field-group">
  <p class="field-label">General — Extra Files</p>
  <p class="field-hint">Add Markdown files from outside the docs folder to the General section.</p>

  <div class="file-browser">
    <div class="file-browser-toolbar">
      <button type="button" class="link-btn" disabled={!browseParent} onclick={browseUp}>↑ Up</button>
      <span class="file-browser-path">{relativeDisplay(browseCurrent)}</span>
    </div>
    <div class="file-browser-list">
      {#if loading}
        <p class="browser-msg">Loading…</p>
      {:else if error}
        <p class="browser-msg browser-msg--error">Cannot read directory</p>
      {:else if dirs.length === 0 && files.length === 0}
        <p class="browser-msg">Empty directory</p>
      {:else}
        {#each dirs as dir}
          <button type="button" class="browser-row browser-row--dir" onclick={() => loadBrowse(dir.path)}>
            <span>📁</span><span>{dir.name}</span>
          </button>
        {/each}
        {#each files as file}
          <div class="browser-row browser-row--file">
            <span class="browser-row-name"><span>📄</span><span>{file.name}</span></span>
            {#if extraFiles.includes(file.path)}
              <span class="badge-added">Added</span>
            {:else}
              <button type="button" class="link-btn" onclick={() => addFile(file.path)}>+ Add</button>
            {/if}
          </div>
        {/each}
      {/if}
    </div>
  </div>

  <p class="field-label" style="margin-top:1rem">Added files</p>
  {#if extraFiles.length === 0}
    <p class="field-hint" style="font-style:italic">No extra files added yet.</p>
  {:else}
    <div class="extra-files-list">
      {#each extraFiles as f, i}
        <div class="extra-file-row">
          <div class="extra-file-arrows">
            <button type="button" disabled={i === 0} onclick={() => moveFile(i, -1)}>↑</button>
            <button type="button" disabled={i === extraFiles.length - 1} onclick={() => moveFile(i, 1)}>↓</button>
          </div>
          <span class="extra-file-path" title={f}>{relativeDisplay(f)}</span>
          <button type="button" class="remove-btn" onclick={() => removeFile(f)}>Remove</button>
        </div>
      {/each}
    </div>
  {/if}
</div>
