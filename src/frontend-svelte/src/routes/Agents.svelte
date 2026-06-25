<script lang="ts">
  import { onMount } from "svelte";
  import Topbar from "../lib/Topbar.svelte";
  import { t, loadI18n } from "../lib/i18n.svelte";
  import {
    showPersistentLoadingToast,
    showPersistentToast,
  } from "../lib/persistentToast";

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

  async function responseJsonOrDetail(response: Response): Promise<any> {
    const text = await response.text();
    if (!text.trim()) {
      return {
        ok: false,
        error: `HTTP ${response.status} ${response.statusText}`.trim(),
      };
    }

    try {
      return JSON.parse(text);
    } catch {
      return {
        ok: false,
        error: `HTTP ${response.status} ${response.statusText}`.trim(),
        detail: text.slice(0, 4000),
      };
    }
  }

  async function createFailureDocument(
    agentId: string,
    input: string,
    error: unknown,
  ): Promise<any | null> {
    const details = errorDetails(error);
    try {
      const response = await fetch("/api/workspace/run-agent-document-failure", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          userInput: input,
          errorName: details.name,
          errorMessage: details.message,
          errorStack: details.stack,
          phase: "client-fetch",
        }),
      });
      return await responseJsonOrDetail(response);
    } catch {
      return null;
    }
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
    const runToastId = showPersistentLoadingToast(
      `${t("agents.loading")} ${agent?.label ?? ""}`.trim(),
    );

    try {
      const res = await fetch("/api/workspace/run-agent-document", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, userInput: input }),
      });
      const result = await responseJsonOrDetail(res);
      if (result.document?.id) createdDocumentId = result.document.id;

      if (res.ok && result.ok) {
        runState = "success";
        runTitle = t("agents.success");
        runMessage = result.document?.filename ?? "";
        showPersistentToast(
          `${t("agents.success")} ${result.document?.filename ?? ""}`.trim(),
          "success",
          AGENT_COMPLETION_TOAST_MS,
          {
            id: runToastId,
            href: result.document?.id
              ? `/?doc=${encodeURIComponent(result.document.id)}`
              : undefined,
            linkLabel: t("agents.open_document"),
          },
        );
      } else {
        runState = "error";
        runTitle = t("agents.failure");
        runMessage = result.detail
          ? `${result.error ?? t("agents.run_failed")}\n\n${result.detail}`
          : result.error ?? t("agents.run_failed");
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
      const failure = await createFailureDocument(agentId, input, err);
      if (failure?.document?.id) createdDocumentId = failure.document.id;

      runState = "error";
      runTitle = t("agents.failure");
      const details = errorDetails(err);
      runMessage = `${details.name}: ${details.message}`;
      showPersistentToast(
        runMessage,
        "error",
        AGENT_COMPLETION_TOAST_MS,
        failure?.document?.id
          ? {
              id: runToastId,
              href: `/?doc=${encodeURIComponent(failure.document.id)}`,
              linkLabel: t("agents.open_document"),
            }
          : runToastId,
      );
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
</style>
