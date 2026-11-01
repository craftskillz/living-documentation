<script lang="ts" module>
  export interface FileImportStatus { text: string; error: boolean }
</script>

<script lang="ts">
  import { t } from "../i18n.svelte";
  import { MAX_UPLOAD_BYTES, MAX_UPLOAD_MB } from "../../../../lib/limits";

  // Image paste + file paste/drop for a Markdown textarea. Writing through an
  // input event keeps the owner's bind:value and its autosave in step.
  let { editor, docId, onstatus, promptOpen = $bindable(false) }: {
    editor: HTMLTextAreaElement | null;
    docId: string;
    onstatus: (status: FileImportStatus | null) => void;
    promptOpen?: boolean;
  } = $props();

  let imgName = $state("");
  let imgExt = $state("png");
  let imgBlob: File | null = null;
  let imgCursorStart = 0;
  let imgCursorEnd = 0;

  const DIACRITICS = /[\u0300-\u036f]/g;
  function sanitizeImageName(s: string): string {
    return (s || "").normalize("NFD").replace(DIACRITICS, "").toLowerCase().replace(/[^a-z0-9]/g, "_");
  }

  $effect(() => {
    const target = editor;
    if (!target) return;
    const listeners = { paste: onPaste, drop: onDrop, dragover: onDragOver } as Record<string, EventListener>;
    for (const [name, listener] of Object.entries(listeners)) target.addEventListener(name, listener);
    return () => { for (const [name, listener] of Object.entries(listeners)) target.removeEventListener(name, listener); };
  });

  function onPaste(event: Event) {
    const e = event as ClipboardEvent;
    const target = e.currentTarget as HTMLTextAreaElement;
    const items = Array.from(e.clipboardData?.items ?? []);
    const imageItem = items.find(it => it.type.startsWith("image/"));
    if (imageItem) {
      e.preventDefault();
      imgCursorStart = target.selectionStart;
      imgCursorEnd = target.selectionEnd;
      imgExt = imageItem.type.split("/")[1].replace("jpeg", "jpg") || "png";
      const blob = imageItem.getAsFile();
      if (!blob) return;
      imgBlob = blob;
      imgName = sanitizeImageName(Date.now().toString());
      promptOpen = true;
      return;
    }
    const files = Array.from(e.clipboardData?.files ?? []).filter(f => !f.type.startsWith("image/"));
    if (files.length) {
      e.preventDefault();
      void uploadFiles(files, target);
    }
  }

  function onDrop(event: Event) {
    const e = event as DragEvent;
    const files = Array.from(e.dataTransfer?.files ?? []).filter(f => !f.type.startsWith("image/"));
    if (!files.length) return;
    e.preventDefault();
    e.stopPropagation();
    void uploadFiles(files, e.currentTarget as HTMLTextAreaElement);
  }

  function onDragOver(event: Event) {
    const e = event as DragEvent;
    if (e.dataTransfer?.types?.includes("Files")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  }

  function readAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function insertAtCursor(target: HTMLTextAreaElement, markdown: string, start: number, end: number) {
    // The editor may have closed during the upload.
    if (!target.isConnected) return;
    target.value = target.value.slice(0, start) + markdown + target.value.slice(end);
    target.dispatchEvent(new Event("input", { bubbles: true }));
    target.selectionStart = target.selectionEnd = start + markdown.length;
    target.focus();
  }

  async function uploadFiles(files: File[], target: HTMLTextAreaElement) {
    const start = target.selectionStart, end = target.selectionEnd;
    for (const file of files) await uploadFile(file, target, start, end);
  }

  async function uploadFile(file: File, target: HTMLTextAreaElement, start: number, end: number) {
    if (file.size > MAX_UPLOAD_BYTES) {
      onstatus({ text: t("doc.file_too_large") + ` (${(file.size / 1024 / 1024).toFixed(1)} MB, max ${MAX_UPLOAD_MB} MB)`, error: true });
      return;
    }
    onstatus({ text: t("doc.uploading_file"), error: false });
    try {
      const base64 = await readAsBase64(file);
      const res = await fetch("/api/files/upload", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: base64, name: file.name, documentId: docId }),
      });
      if (!res.ok) {
        let msg = ""; try { msg = (await res.json()).error || ""; } catch { msg = await res.text(); }
        throw new Error(msg || `HTTP ${res.status}`);
      }
      const { url, originalName } = await res.json();
      insertAtCursor(target, `[📎 ${originalName || file.name}](${url})`, start, end);
      onstatus(null);
    } catch (err: unknown) {
      onstatus({ text: t("doc.file_upload_failed") + (err instanceof Error ? err.message : String(err)), error: true });
    }
  }

  function cancelImgPaste() {
    promptOpen = false;
    imgBlob = null;
  }

  async function confirmImgPaste() {
    const name = sanitizeImageName(imgName) || Date.now().toString();
    promptOpen = false;
    const target = editor;
    if (!imgBlob || !target) return;
    onstatus({ text: t("doc.uploading_image"), error: false });
    try {
      const base64 = await readAsBase64(imgBlob);
      const res = await fetch("/api/images/upload", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: base64, ext: imgExt, name }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { filename } = await res.json();
      insertAtCursor(target, `![image](/images/${filename})`, imgCursorStart, imgCursorEnd);
      onstatus(null);
    } catch (err: unknown) {
      onstatus({ text: t("doc.image_upload_failed") + (err instanceof Error ? err.message : String(err)), error: true });
    } finally {
      imgBlob = null;
    }
  }
</script>

{#if promptOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div class="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-sm mx-4 p-6 space-y-5">
      <h3 class="text-base font-semibold text-gray-900 dark:text-gray-50">🖼️ {t("modal.img_paste.title")}</h3>
      <div class="space-y-1.5">
        <label for="img-paste-name" class="block text-xs font-medium text-gray-500 dark:text-gray-400">
          {t("modal.img_paste.filename_label")} <span class="font-normal text-gray-400">{t("modal.img_paste.saved_hint")}</span>
        </label>
        <div class="flex items-center gap-2">
          <input id="img-paste-name" type="text" value={imgName} oninput={(e) => (imgName = sanitizeImageName((e.target as HTMLInputElement).value))} class="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <span class="text-xs text-gray-400 shrink-0">.{imgExt}</span>
        </div>
      </div>
      <div class="flex justify-end gap-3 pt-1">
        <button onclick={cancelImgPaste} class="text-sm px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">{t("common.cancel")}</button>
        <button onclick={confirmImgPaste} class="text-sm px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors">{t("modal.img_paste.paste_btn")}</button>
      </div>
    </div>
  </div>
{/if}
