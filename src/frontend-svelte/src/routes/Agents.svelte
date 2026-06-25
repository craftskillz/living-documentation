<script lang="ts">
  import { onMount } from "svelte";
  import Topbar from "../lib/Topbar.svelte";
  import { t, loadI18n } from "../lib/i18n.svelte";
  import {
    showPersistentLoadingToast,
    showPersistentToast,
  } from "../lib/persistentToast";
  import {
    runAgentDocumentStream,
    type AgentRunStreamEvent,
  } from "../lib/workspace/persistence";

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
  const AGENT_COMPLETION_TOAST_MS = 10 * 60 * 1000;

  let agents = $state<Agent[]>([]);
  let loading = $state(true);
  let loadError = $state("");

  let selectedAgent = $state<Agent | null>(null);
  let userInput = $state("");
  let runState = $state<RunState>("idle");
  let runTitle = $state("");
  let runMessage = $state("");
  let createdDocumentId = $state<string | null>(null);
  let timelineEvents = $state<AgentRunStreamEvent[]>([]);

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

  function errorDetails(error: unknown): {
    name: string;
    message: string;
    stack: string;
  } {
    if (error instanceof Error) {
      return {
        name: error.name || "Error",
        message: error.message || String(error),
        stack: error.stack || "",
      };
    }
    return {
      name: typeof error,
      message: String(error),
      stack: "",
    };
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
    timelineEvents = [];
    runState = "loading";
    runTitle = t("agents.loading");
    runMessage = agent?.label ?? "";
    const runToastId = showPersistentLoadingToast(
      `${t("agents.loading")} ${agent?.label ?? ""}`.trim(),
    );

    try {
      const result = await runAgentDocumentStream(agentId, input, (event) => {
        if (event.type !== "document") {
          timelineEvents = [...timelineEvents, event];
        }
        if (event.type !== "final" && event.type !== "error" && event.type !== "document") {
          showPersistentLoadingToast(
            event.toolName
              ? `Agent: ${event.message} (${event.toolName})`
              : `Agent: ${event.message}`,
            runToastId,
          );
        }
      });

      if (result.document?.id) createdDocumentId = result.document.id;

      if (result.ok && result.document) {
        runState = "success";
        runTitle = t("agents.success");
        runMessage = result.document.filename;
        showPersistentToast(
          `${t("agents.success")} ${result.document.filename}`.trim(),
          "success",
          AGENT_COMPLETION_TOAST_MS,
          {
            id: runToastId,
            href: `/?doc=${encodeURIComponent(result.document.id)}`,
            linkLabel: t("agents.open_document"),
          },
        );
      } else {
        runState = "error";
        runTitle = t("agents.failure");
        runMessage = result.error ?? t("agents.run_failed");
        showPersistentToast(
          result.error ?? t("agents.run_failed"),
          "error",
          AGENT_COMPLETION_TOAST_MS,
          result.document?.id
            ? {
                id: runToastId,
                href: `/?doc=${encodeURIComponent(result.document.id)}`,
                linkLabel: t("agents.open_document"),
              }
            : runToastId,
        );
      }
    } catch (err: unknown) {
      runState = "error";
      runTitle = t("agents.failure");
      const details = errorDetails(err);
      runMessage = `${details.name}: ${details.message}`;
      showPersistentToast(runMessage, "error", AGENT_COMPLETION_TOAST_MS, runToastId);
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

    <!-- Agent run timeline -->
    {#if runState !== "idle"}
      <div class="run-timeline" class:run-timeline--success={runState === "success"} class:run-timeline--error={runState === "error"}>
        <div class="run-timeline-header">
          <span class="run-timeline-title">{runTitle}</span>
          {#if createdDocumentId}
            <a class="run-timeline-link" href="/?doc={encodeURIComponent(createdDocumentId)}">
              {t("agents.open_document")}
            </a>
          {/if}
        </div>
        <div class="run-timeline-events">
          {#each timelineEvents as event}
            <div class="run-event run-event--{event.type.replace('_', '-')}">
              <span class="run-event-dot" aria-hidden="true"></span>
              <div class="run-event-body">
                <p class="run-event-title">{event.message}</p>
                {#if event.turn || event.toolName || event.detail}
                  <p class="run-event-meta">
                    {[event.turn ? `Turn ${event.turn}` : null, event.toolName, event.detail].filter(Boolean).join(" · ")}
                  </p>
                {/if}
              </div>
            </div>
          {/each}
          {#if runState === "loading"}
            <div class="run-event run-event--status run-event--pulse">
              <span class="run-event-dot" aria-hidden="true"></span>
              <div class="run-event-body">
                <p class="run-event-title">{runMessage}</p>
              </div>
            </div>
          {/if}
        </div>
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

  @keyframes spin { to { transform: rotate(360deg); } }

  /* Agent run timeline */
  .run-timeline {
    margin-top: 32px;
    border: 1px solid var(--line);
    border-radius: 12px;
    background: var(--panel);
    overflow: hidden;
  }

  .run-timeline--success { border-color: var(--green); }
  .run-timeline--error { border-color: var(--red); }

  .run-timeline-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    border-bottom: 1px solid var(--line);
    background: var(--panel-soft);
  }

  .run-timeline-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .run-timeline-link {
    font-size: 12px;
    color: var(--accent);
    text-decoration: none;
  }
  .run-timeline-link:hover { text-decoration: underline; }

  .run-timeline-events {
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 320px;
    overflow-y: auto;
  }

  .run-event {
    display: flex;
    align-items: flex-start;
    gap: 10px;
  }

  .run-event-dot {
    flex-shrink: 0;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--muted);
    margin-top: 5px;
  }

  .run-event--model-call .run-event-dot { background: var(--accent); }
  .run-event--tool-call .run-event-dot,
  .run-event--tool-result .run-event-dot { background: var(--green); }
  .run-event--final .run-event-dot { background: var(--green); }
  .run-event--error .run-event-dot { background: var(--red); }
  .run-event--fallback .run-event-dot { background: #f59e0b; }

  .run-event--pulse .run-event-dot {
    animation: pulse 1.2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  .run-event-body { flex: 1; min-width: 0; }

  .run-event-title {
    font-size: 13px;
    color: var(--ink);
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .run-event--error .run-event-title { color: var(--red); }

  .run-event-meta {
    font-size: 11px;
    color: var(--muted);
    margin: 1px 0 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
