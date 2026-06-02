<script lang="ts">
  import { onMount } from "svelte";
  import Topbar from "../lib/Topbar.svelte";
  import { t, loadI18n } from "../lib/i18n.svelte";

  interface AgentConfig {
    systemPrompt?: string;
    requiresUserInput?: boolean;
    userInputDescription?: string;
    model?: string;
  }

  interface Entity {
    id: string;
    label: string;
    kind: string;
    parentId: string | null;
    config?: AgentConfig;
  }

  interface Agent extends Entity {
    provider?: Entity;
  }

  type RunState = "idle" | "loading" | "success" | "error";

  let agents = $state<Agent[]>([]);
  let loading = $state(true);
  let loadError = $state("");

  let selectedAgent = $state<Agent | null>(null);
  let userInput = $state("");
  let runState = $state<RunState>("idle");
  let runTitle = $state("");
  let runMessage = $state("");
  let createdDocumentId = $state<string | null>(null);

  function agentStatus(agent: Agent): "ready" | "requires_input" | "not_ready" {
    const p = agent.provider;
    if (!p || p.kind !== "llm" || !p.config?.model || !agent.config?.systemPrompt) return "not_ready";
    if (agent.config?.requiresUserInput && !agent.config?.userInputDescription?.trim()) return "not_ready";
    return agent.config?.requiresUserInput ? "requires_input" : "ready";
  }

  function isDisabled(agent: Agent): boolean {
    return agentStatus(agent) === "not_ready";
  }

  async function load() {
    loading = true;
    loadError = "";
    try {
      const res = await fetch("/api/workspace", { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const workspace = await res.json();
      const entities: Entity[] = Array.isArray(workspace.entities) ? workspace.entities : [];
      const byId = new Map(entities.map(e => [e.id, e]));
      agents = entities
        .filter(e => e.kind === "agent")
        .map(agent => ({ ...agent, provider: byId.get(agent.parentId ?? "") }));
    } catch (err: unknown) {
      loadError = err instanceof Error ? err.message : t("agents.load_failed");
    } finally {
      loading = false;
    }
  }

  function selectAgent(agent: Agent) {
    if (isDisabled(agent)) return;
    if (agent.config?.requiresUserInput) {
      selectedAgent = agent;
      userInput = "";
    } else {
      void run(agent.id, "");
    }
  }

  function cancelInput() {
    selectedAgent = null;
    userInput = "";
  }

  async function submitInput() {
    if (!selectedAgent) return;
    const agentId = selectedAgent.id;
    selectedAgent = null;
    await run(agentId, userInput);
  }

  async function run(agentId: string, input: string) {
    const agent = agents.find(a => a.id === agentId);
    createdDocumentId = null;
    runState = "loading";
    runTitle = t("agents.loading");
    runMessage = agent?.label ?? "";

    try {
      const res = await fetch("/api/workspace/run-agent-document", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, userInput: input }),
      });
      const result = await res.json();
      if (result.document?.id) createdDocumentId = result.document.id;

      if (res.ok && result.ok) {
        runState = "success";
        runTitle = t("agents.success");
        runMessage = result.document?.filename ?? "";
      } else {
        runState = "error";
        runTitle = t("agents.failure");
        runMessage = result.error ?? t("agents.run_failed");
      }
    } catch (err: unknown) {
      runState = "error";
      runTitle = t("agents.failure");
      runMessage = err instanceof Error ? err.message : t("agents.run_failed");
    }
  }

  onMount(async () => {
    try {
      const cfg = await fetch("/api/config").then(r => r.json());
      await loadI18n(cfg.language || "en");
    } catch { /* fallback */ }
    await load();
  });
</script>

<div class="app-shell">
  <Topbar title={t("agents.title")} subtitle={t("agents.subtitle")} />

  <div class="agents-page">

    {#if loading}
      <p class="agents-msg">{t("common.loading")}</p>
    {:else if loadError}
      <p class="agents-msg agents-msg--error">{loadError}</p>
    {:else if agents.length === 0}
      <p class="agents-msg agents-msg--empty">{t("agents.empty")}</p>
    {:else}
      <div class="agents-grid">
        {#each agents as agent}
          {@const status = agentStatus(agent)}
          {@const disabled = isDisabled(agent)}
          <button
            type="button"
            class="agent-card"
            class:agent-card--disabled={disabled}
            onclick={() => selectAgent(agent)}
            {disabled}
          >
            <span class="agent-name">{agent.label}</span>
            <span class="agent-provider">{agent.provider?.label ?? t("agents.no_provider")}</span>
            <span class="agent-badge agent-badge--{status}">{t(`agents.${status}`)}</span>
          </button>
        {/each}
      </div>
    {/if}

    <!-- Input modal -->
    {#if selectedAgent}
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <div class="confirm-overlay" onclick={(e) => { if (e.target === e.currentTarget) cancelInput(); }}>
        <section class="confirm-dialog agent-input-dialog" role="dialog" aria-modal="true">
          <h2>{selectedAgent.label}</h2>
          <p class="confirm-message">
            {selectedAgent.config?.userInputDescription?.trim() || t("agents.input_hint")}
          </p>
          <div class="field-group" style="margin-top:1rem">
            <label class="field-label" for="agent-input">{t("agents.input_title")}</label>
            <textarea
              id="agent-input"
              class="field-input"
              rows={4}
              bind:value={userInput}
              placeholder={t("agents.input_hint")}
            ></textarea>
          </div>
          <footer class="confirm-actions">
            <button class="secondary-button" type="button" onclick={cancelInput}>{t("common.cancel")}</button>
            <button class="btn-primary" type="button" onclick={submitInput} disabled={!userInput.trim()}>
              {t("agents.run")}
            </button>
          </footer>
        </section>
      </div>
    {/if}

    <!-- Run toast -->
    {#if runState !== "idle"}
      <div class="agent-toast agent-toast--{runState}">
        <span class="agent-toast-icon">
          {#if runState === "loading"}⟳{:else if runState === "success"}✓{:else}!{/if}
        </span>
        <div class="agent-toast-body">
          <p class="agent-toast-title">{runTitle}</p>
          <p class="agent-toast-message">{runMessage}</p>
          {#if createdDocumentId}
            <a
              href="/?doc={encodeURIComponent(createdDocumentId)}"
              class="agent-toast-link"
            >{t("agents.open_document")}</a>
          {/if}
        </div>
        <button class="agent-toast-close" type="button" onclick={() => runState = "idle"}>×</button>
      </div>
    {/if}
  </div>
</div>

<style>
  .agents-page {
    max-width: 960px;
    margin: 0 auto;
    padding: 32px 24px;
    position: relative;
  }

  .agents-msg {
    font-size: 14px;
    color: var(--muted);
    text-align: center;
    padding: 48px 0;
    font-style: italic;
  }
  .agents-msg--error { color: var(--red); font-style: normal; }
  .agents-msg--empty { font-style: italic; }

  .agents-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 16px;
  }

  .agent-card {
    text-align: left;
    padding: 16px;
    border: 1px solid var(--line);
    border-radius: 12px;
    background: var(--panel);
    cursor: pointer;
    transition: border-color 0.15s, box-shadow 0.15s;
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-family: inherit;
  }

  .agent-card:hover:not(:disabled) {
    border-color: var(--accent);
    box-shadow: 0 2px 12px var(--accent-soft);
  }

  .agent-card--disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .agent-name {
    font-size: 14px;
    font-weight: 700;
    color: var(--ink);
  }

  .agent-provider {
    font-size: 12px;
    color: var(--muted);
    margin-bottom: 8px;
  }

  .agent-badge {
    display: inline-flex;
    align-self: flex-start;
    font-size: 11px;
    font-weight: 600;
    padding: 3px 8px;
    border-radius: 20px;
  }

  .agent-badge--ready { background: var(--green-soft); color: var(--green); }
  .agent-badge--requires_input { background: var(--accent-soft); color: var(--accent); }
  .agent-badge--not_ready { background: var(--panel-soft); color: var(--muted); }

  .agent-input-dialog {
    border-color: var(--line-strong);
  }

  .agent-toast {
    position: fixed;
    bottom: 24px;
    right: 24px;
    display: flex;
    align-items: flex-start;
    gap: 12px;
    max-width: min(420px, calc(100vw - 48px));
    padding: 14px 16px;
    border-radius: 14px;
    border: 1px solid var(--line);
    background: var(--panel);
    box-shadow: 0 8px 32px rgb(16 24 40 / 14%);
    z-index: 50;
  }

  .agent-toast-icon {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-size: 12px;
    font-weight: 700;
    flex-shrink: 0;
  }

  .agent-toast--loading .agent-toast-icon {
    border: 2px solid var(--accent);
    border-top-color: transparent;
    animation: spin 0.8s linear infinite;
  }

  .agent-toast--success .agent-toast-icon { background: var(--green); color: #fff; }
  .agent-toast--error .agent-toast-icon { background: var(--red); color: #fff; }

  .agent-toast-body { flex: 1; min-width: 0; }
  .agent-toast-title { font-size: 13px; font-weight: 700; color: var(--ink); margin: 0; }
  .agent-toast-message { font-size: 12px; color: var(--muted); margin: 2px 0 0; word-break: break-word; }
  .agent-toast-link { font-size: 12px; color: var(--accent); text-decoration: underline; display: inline-block; margin-top: 4px; }
  .agent-toast-close { background: none; border: none; color: var(--muted); cursor: pointer; font-size: 18px; padding: 0; line-height: 1; flex-shrink: 0; }

  @keyframes spin { to { transform: rotate(360deg); } }
</style>
