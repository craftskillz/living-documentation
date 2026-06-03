<script lang="ts">
  import { onMount } from "svelte";
  import { t, loadI18n } from "../lib/i18n.svelte";
  import { initShapeEditor } from "../lib/diagram/shapeEditor";
  import "../lib/diagram/shape-editor.css";

  onMount(async () => {
    try {
      const cfg = await fetch("/api/config").then((r) => r.json());
      await loadI18n(cfg.language || "en");
    } catch {
      await loadI18n("en");
    }
    const cleanup = initShapeEditor();
    return cleanup;
  });
</script>

<div class="ld-shape-editor h-screen overflow-hidden bg-gray-50 text-gray-900">
  <header
    class="h-12 border-b border-gray-200 bg-white flex items-center gap-2 px-3"
  >
    <button class="btn" onclick={() => history.back()}>← Back</button>
    <h1 class="text-sm font-semibold">Shape editor</h1>
    <span id="saveState" class="ml-auto text-xs text-gray-500"></span>
  </header>

  <main
    class="h-[calc(100vh-3rem)] grid grid-cols-[17rem_1fr] overflow-hidden"
  >
    <aside class="border-r border-gray-200 bg-white flex flex-col min-h-0">
      <div class="p-3 border-b border-gray-200 space-y-2">
        <label class="block text-xs font-semibold text-gray-500">Library</label>
        <div class="flex gap-2">
          <select id="librarySelect" class="field flex-1"></select>
          <button id="btnAddLibrary" class="btn">+</button>
        </div>
        <input
          id="libraryName"
          class="field w-full"
          placeholder="Library name"
        />
      </div>
      <div class="p-3 border-b border-gray-200 flex gap-2">
        <button id="btnNewShape" class="btn btn-primary flex-1">
          New shape
        </button>
        <button id="btnDeleteShape" class="btn btn-danger">Delete</button>
      </div>
      <div id="shapeList" class="flex-1 overflow-y-auto p-2 space-y-1"></div>
    </aside>

    <section class="min-w-0 min-h-0 overflow-y-auto p-5">
      <div
        class="grid grid-cols-[minmax(20rem,34rem)_minmax(20rem,1fr)] gap-5 items-start"
      >
        <div class="space-y-3">
          <div id="previewStage">
            <img id="previewImage" alt="" />
          </div>
          <p class="text-xs text-gray-500">
            Click on the image to add an anchor. Drag anchors to refine their
            position.
          </p>
        </div>

        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-3">
            <label class="space-y-1">
              <span class="block text-xs font-semibold text-gray-500"
                >Shape name</span
              >
              <input
                id="shapeName"
                class="field w-full"
                placeholder="Shape name"
              />
            </label>
            <label class="space-y-1">
              <span class="block text-xs font-semibold text-gray-500"
                >Image / SVG</span
              >
              <input
                id="imageFile"
                type="file"
                accept="image/*,.svg"
                class="block w-full text-sm"
              />
            </label>
            <label class="space-y-1">
              <span class="block text-xs font-semibold text-gray-500">Width</span
              >
              <input
                id="shapeWidth"
                type="number"
                min="16"
                max="1200"
                class="field w-full"
              />
            </label>
            <label class="space-y-1">
              <span class="block text-xs font-semibold text-gray-500"
                >Height</span
              >
              <input
                id="shapeHeight"
                type="number"
                min="16"
                max="1200"
                class="field w-full"
              />
            </label>
            <label class="space-y-1 col-span-2">
              <span class="block text-xs font-semibold text-gray-500"
                >Text placement</span
              >
              <select id="labelPlacement" class="field w-full">
                <option value="below">{t("shape_editor.label_placement.below")}</option>
                <option value="above">{t("shape_editor.label_placement.above")}</option>
                <option value="right">{t("shape_editor.label_placement.right")}</option>
                <option value="left">{t("shape_editor.label_placement.left")}</option>
                <option value="center">{t("shape_editor.label_placement.center")}</option>
              </select>
            </label>
            <label
              class="col-span-2 flex items-start gap-2 rounded-md border border-gray-200 bg-white px-2 py-2 text-sm"
            >
              <input
                id="shapeShowInDiagram"
                type="checkbox"
                class="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              <span class="space-y-0.5">
                <span class="block font-semibold text-gray-700"
                  >{t("shape_editor.show_in_diagram_label")}</span
                >
                <span class="block text-xs text-gray-500"
                  >{t("shape_editor.show_in_diagram_hint")}</span
                >
              </span>
            </label>
          </div>

          <div class="flex flex-wrap gap-2">
            <button id="btnDefaultAnchors" class="btn">
              Use 8 default anchors
            </button>
            <button id="btnClearAnchors" class="btn">Clear anchors</button>
            <button id="btnSaveShape" class="btn btn-primary">
              Save shape
            </button>
          </div>

          <div>
            <div class="flex items-center justify-between mb-2">
              <h2
                class="text-xs font-semibold uppercase tracking-wide text-gray-500"
              >
                Anchors
              </h2>
              <span id="anchorCount" class="text-xs text-gray-500"></span>
            </div>
            <div id="anchorList" class="space-y-1"></div>
          </div>
        </div>
      </div>
    </section>
  </main>
</div>
