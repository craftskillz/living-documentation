<script lang="ts">
  import { onMount } from "svelte";
  import Topbar from "../lib/Topbar.svelte";
  import ConfirmDialog from "../lib/ConfirmDialog.svelte";
  import InstructionFiles from "../lib/InstructionFiles.svelte";
  import AiRules from "../lib/AiRules.svelte";
  import McpExplorer from "../lib/McpExplorer.svelte";
  import { t, loadI18n } from "../lib/i18n.svelte";

  interface InstructionItem {
    path: string;
    root: string;
    type: string;
    size: number | null;
    exists: boolean;
  }

  interface Rule {
    path: string;
    title: string;
    severity: string;
    description: string;
    tags?: string[];
    appliesTo?: string[];
  }

  let { navigate }: { navigate: (to: string) => void } = $props();

  let status = $state("");
  let instructions = $state<InstructionItem[]>([]);
  let rules = $state<Rule[]>([]);
  let rulesFolder = $state("");
  let orientation = $state<any>(null);

  let confirmDialog = $state<ConfirmDialog>(null!);
  let mcpExplorer = $state<McpExplorer>(null!);

  function setStatus(msg: string) { status = msg; }

  async function loadOrientation() {
    setStatus(t("context.loading"));
    const res = await fetch("/api/context/orientation");
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    orientation = data;
    instructions = data.instructions || [];
    rules = data.rules || [];
    rulesFolder = data.rulesFolder || "";
    setStatus("");
  }

  async function addInstructionFile(filePath: string) {
    setStatus(t("context.adding_instruction_file"));
    const res = await fetch("/api/context/instructions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: filePath }),
    });
    if (!res.ok) throw new Error(await res.text());
    await loadOrientation();
  }

  async function removeInstructionFile(filename: string) {
    const ok = await confirmDialog.show({
      kicker: t("context.remove_instruction_title"),
      title: t("context.remove_instruction_title"),
      message: t("context.remove_instruction_message").replace("{name}", filename),
      confirmLabel: t("common.remove"),
      cancelLabel: t("common.cancel") || "Cancel",
      danger: true,
    });
    if (!ok) return;
    setStatus(t("context.removing_instruction_file"));
    const res = await fetch("/api/context/instructions/" + encodeURIComponent(filename), { method: "DELETE" });
    if (!res.ok) throw new Error(await res.text());
    await loadOrientation();
  }

  async function addRule(rule: object) {
    setStatus(t("context.saving_rule"));
    const res = await fetch("/api/context/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rule),
    });
    if (!res.ok) throw new Error(await res.text());
    await loadOrientation();
  }

  onMount(async () => {
    try {
      const cfgRes = await fetch("/api/config");
      const cfg = cfgRes.ok ? await cfgRes.json() : {};
      await loadI18n(cfg.language || "en");
    } catch {
      await loadI18n("en");
    }
    document.title = t("context.title");
    await loadOrientation().catch(err => setStatus(err.message));
    await mcpExplorer.load().catch(() => {});
  });
</script>

<div class="app-shell">
  <Topbar {navigate} />

  <main class="context-scroll">
    <div class="context-inner">

      <section class="page-intro">
        <h2 class="page-title">{t("context.orientation_title")}</h2>
        <p class="page-desc">{t("context.orientation_intro")}</p>
        {#if status}
          <p class="status-text">{status}</p>
        {/if}
      </section>

      <InstructionFiles
        bind:items={instructions}
        onAdd={addInstructionFile}
        onRemove={removeInstructionFile}
      />

      <AiRules
        {rules}
        {rulesFolder}
        onAdd={addRule}
      />

      <McpExplorer bind:this={mcpExplorer} onStatus={setStatus} />

    </div>
  </main>
</div>

<ConfirmDialog bind:this={confirmDialog} />

<style>
  .context-scroll {
    overflow-y: auto;
    height: 100%;
  }
  .context-inner {
    max-width: 1100px;
    margin: 0 auto;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding-bottom: 48px;
  }
  .page-intro { display: flex; flex-direction: column; gap: 4px; }
  .page-title { font-size: 18px; font-weight: 700; color: var(--ink); margin: 0; }
  .page-desc { font-size: 13px; color: var(--muted); margin: 0; }
  .status-text { font-size: 12px; color: var(--muted); margin: 0; font-style: italic; }
</style>
