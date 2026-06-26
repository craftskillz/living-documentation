<script lang="ts">
  import { t } from "./i18n.svelte";
  import { showPersistentLoadingToast, showPersistentToast } from "./persistentToast";
  import { runAgentDocumentStream, type AgentRunStreamEvent } from "./workspace/persistence";

  const AGENT_COMPLETION_TOAST_MS = 10 * 60 * 1000;

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

  interface AgentWithProvider extends Entity {
    provider?: Entity;
  }

  interface LlmGroup {
    llm: Entity;
    agents: AgentWithProvider[];
  }

  let open = $state(false);
  let llmGroups = $state<LlmGroup[]>([]);
  let loaded = $state(false);
  let loading = $state(false);
  let expandedGroups = $state<Set<string>>(new Set());

  let selectedAgent = $state<AgentWithProvider | null>(null);
  let userInput = $state("");

  // Position for the fixed dropdown, computed from the button's bounding rect.
  let dropdownTop = $state(0);
  let dropdownRight = $state(0);
  let buttonEl: HTMLButtonElement | null = null;

  // Portal action: moves the node to document.body to escape any ancestor
  // stacking context (e.g. backdrop-filter on .topbar).
  function portal(node: HTMLElement) {
    document.body.appendChild(node);
    return {
      destroy() {
        if (node.parentNode) node.parentNode.removeChild(node);
      },
    };
  }

  function computePos() {
    if (!buttonEl) return;
    const r = buttonEl.getBoundingClientRect();
    dropdownTop = r.bottom + 6;
    dropdownRight = window.innerWidth - r.right;
  }

  function isReady(agent: AgentWithProvider): boolean {
    const p = agent.provider;
    if (!p || !p.config?.model || !agent.config?.systemPrompt) return false;
    if (agent.config?.requiresUserInput && !agent.config?.userInputDescription?.trim()) return false;
    return true;
  }

  async function loadWorkspace() {
    if (loaded || loading) return;
    loading = true;
    try {
      const res = await fetch("/api/workspace", { headers: { Accept: "application/json" } });
      if (!res.ok) return;
      const workspace = await res.json();
      const entities: Entity[] = Array.isArray(workspace.entities) ? workspace.entities : [];
      const byId = new Map(entities.map((e) => [e.id, e]));
      const llms = entities.filter((e) => e.kind === "llm");
      const agents = entities
        .filter((e) => e.kind === "agent")
        .map((a) => ({ ...a, provider: byId.get(a.parentId ?? "") }));
      llmGroups = llms
        .map((llm) => ({ llm, agents: agents.filter((a) => a.parentId === llm.id) }))
        .filter((g) => g.agents.length > 0);
      loaded = true;
    } catch { /* silent */ } finally {
      loading = false;
    }
  }

  function toggle() {
    if (!open) computePos();
    open = !open;
    if (open) void loadWorkspace();
  }

  function toggleGroup(llmId: string) {
    const next = new Set(expandedGroups);
    if (next.has(llmId)) next.delete(llmId);
    else next.add(llmId);
    expandedGroups = next;
  }

  function close() { open = false; }

  function selectAgent(agent: AgentWithProvider) {
    if (!isReady(agent)) return;
    close();
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
    if (!selectedAgent || !userInput.trim()) return;
    const agentId = selectedAgent.id;
    const input = userInput;
    selectedAgent = null;
    userInput = "";
    await run(agentId, input);
  }

  // Minimum time each streamed status stays visible in the toast. Bursts of
  // events (tool_call → tool_result → next model_call) arrive within a few
  // milliseconds; without a dwell time they overwrite each other in under one
  // frame and the user only ever sees the first message. The queue below paces
  // updates so every meaningful step is actually readable.
  const STATUS_DWELL_MS = 750;

  // Turn a stream event into a short, agent-specific status line (or null when
  // the event carries nothing worth showing). Uses i18n so EN/FR both work.
  function formatStatus(
    event: AgentRunStreamEvent,
    agentLabel: string,
    modelName: string,
  ): string | null {
    const turn = event.turn != null ? String(event.turn) : "";
    switch (event.type) {
      case "model_call":
        return t("agents.status.model", { agent: agentLabel, turn, model: modelName });
      case "tool_call":
        return t("agents.status.tool", { agent: agentLabel, turn, tool: event.toolName ?? "" });
      case "tool_result":
        return t("agents.status.tool_done", {
          agent: agentLabel,
          turn,
          tool: event.toolName ?? "",
          detail: event.detail ?? "",
        });
      case "fallback":
        return t("agents.status.fallback", { agent: agentLabel, turn });
      default:
        return null;
    }
  }

  async function run(agentId: string, input: string) {
    const agent = llmGroups.flatMap((g) => g.agents).find((a) => a.id === agentId);
    const agentLabel = agent?.label ?? "";
    const modelRaw = agent?.config?.model || agent?.provider?.config?.model || "";
    const modelName = modelRaw.includes("/") ? modelRaw.split("/").pop() ?? modelRaw : modelRaw;

    const runToastId = showPersistentLoadingToast(
      `${t("agents.loading")} ${agentLabel}`.trim(),
    );

    // Paced status queue: pushes from the stream, drains at STATUS_DWELL_MS.
    const statusQueue: string[] = [];
    let lastShown = `${t("agents.loading")} ${agentLabel}`.trim();
    let draining = false;

    const drain = async () => {
      if (draining) return;
      draining = true;
      while (statusQueue.length > 0) {
        const message = statusQueue.shift() as string;
        showPersistentLoadingToast(message, runToastId);
        lastShown = message;
        await new Promise((r) => setTimeout(r, STATUS_DWELL_MS));
      }
      draining = false;
    };

    const pushStatus = (message: string) => {
      // Skip consecutive duplicates (e.g. two identical "Calling model X" turns)
      const tail = statusQueue.length > 0 ? statusQueue[statusQueue.length - 1] : lastShown;
      if (message === tail) return;
      statusQueue.push(message);
      void drain();
    };

    try {
      const result = await runAgentDocumentStream(agentId, input, (event) => {
        const status = formatStatus(event, agentLabel, modelName);
        if (status) {
          pushStatus(status);
        } else if (event.type === "final" && event.content) {
          const preview = event.content.replace(/[\n\r]+/g, " ").trim();
          pushStatus(preview.length > 120 ? `${preview.slice(0, 120)}…` : preview);
        }
      });

      // Let any queued statuses finish displaying before the final toast.
      while (draining || statusQueue.length > 0) {
        await new Promise((r) => setTimeout(r, STATUS_DWELL_MS / 2));
      }
      if (result.ok && result.document) {
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
        // The run created a new document. Tell any mounted page (e.g. Home) to
        // refresh its document list/tree in place — no full page reload.
        window.dispatchEvent(new CustomEvent("ld:documents-changed"));
      } else {
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
      const message = err instanceof Error ? err.message : t("agents.run_failed");
      showPersistentToast(message, "error", AGENT_COMPLETION_TOAST_MS, runToastId);
    }
  }
</script>

<!-- The trigger button stays inside the topbar flow -->
<button
  bind:this={buttonEl}
  type="button"
  class="ghost-button"
  onclick={toggle}
  aria-haspopup="true"
  aria-expanded={open}
>
  Agents
</button>

<!-- Dropdown and modal are portaled to document.body to escape the
     topbar's backdrop-filter stacking context. -->

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div use:portal class="agents-backdrop" onclick={close}></div>

  <div
    use:portal
    class="agents-dropdown"
    role="menu"
    style="top:{dropdownTop}px;right:{dropdownRight}px"
  >
    {#if loading}
      <p class="agents-dropdown-empty">{t("common.loading")}</p>
    {:else if llmGroups.length === 0}
      <p class="agents-dropdown-empty">{t("agents.empty")}</p>
    {:else}
      {#each llmGroups as group}
        {@const expanded = expandedGroups.has(group.llm.id)}
        <div class="agents-group">
          <button
            type="button"
            class="agents-group-toggle"
            onclick={() => toggleGroup(group.llm.id)}
            aria-expanded={expanded}
          >
            <span class="agents-group-label">{group.llm.label}</span>
            <span class="agents-group-chevron" class:agents-group-chevron--open={expanded}>›</span>
          </button>
          {#if expanded}
            {#each group.agents as agent}
              {@const ready = isReady(agent)}
              <button
                type="button"
                class="agents-item"
                class:agents-item--disabled={!ready}
                disabled={!ready}
                role="menuitem"
                onclick={() => selectAgent(agent)}
              >
                <span class="agents-item-name">{agent.label}</span>
                {#if !ready}
                  <span class="agents-item-badge">{t("agents.not_ready")}</span>
                {:else if agent.config?.requiresUserInput}
                  <span class="agents-item-badge agents-item-badge--input">{t("agents.requires_input")}</span>
                {/if}
              </button>
            {/each}
          {/if}
        </div>
      {/each}
    {/if}
  </div>
{/if}

{#if selectedAgent}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div use:portal class="confirm-overlay agents-modal-overlay" onclick={(e) => { if (e.target === e.currentTarget) cancelInput(); }}>
    <section class="confirm-dialog" role="dialog" aria-modal="true">
      <h2>{selectedAgent.label}</h2>
      <p class="confirm-message">
        {selectedAgent.config?.userInputDescription?.trim() || t("agents.input_hint")}
      </p>
      <div class="field-group" style="margin-top:1rem">
        <label class="field-label" for="agents-menu-input">{t("agents.input_title")}</label>
        <textarea
          id="agents-menu-input"
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

<style>
  /* Transparent backdrop — closes dropdown on outside click */
  .agents-backdrop {
    position: fixed;
    inset: 0;
    z-index: 9998;
  }

  /* Dropdown panel — portaled to body, positioned via inline style */
  .agents-dropdown {
    position: fixed;
    z-index: 9999;
    min-width: 220px;
    max-width: 320px;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 10px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.12);
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .agents-dropdown-empty {
    font-size: 13px;
    color: var(--muted);
    padding: 10px 12px;
    font-style: italic;
    margin: 0;
  }

  .agents-group {
    display: flex;
    flex-direction: column;
  }

  .agents-group + .agents-group {
    margin-top: 4px;
    padding-top: 4px;
    border-top: 1px solid var(--line);
  }

  .agents-group-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    border: none;
    background: transparent;
    cursor: pointer;
    padding: 6px 10px 4px;
    border-radius: 6px;
    font-family: inherit;
  }
  .agents-group-toggle:hover { background: var(--panel-soft); }

  .agents-group-label {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
  }

  .agents-group-chevron {
    font-size: 14px;
    color: var(--muted);
    transform: rotate(0deg);
    transition: transform 0.15s;
    line-height: 1;
  }
  .agents-group-chevron--open {
    transform: rotate(90deg);
  }

  .agents-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    width: 100%;
    text-align: left;
    padding: 7px 10px;
    border-radius: 6px;
    border: none;
    background: transparent;
    cursor: pointer;
    font-family: inherit;
    font-size: 13px;
    color: var(--ink);
    transition: background 0.1s;
  }

  .agents-item:hover:not(:disabled) { background: var(--accent-soft); }

  .agents-item--disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .agents-item-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .agents-item-badge {
    flex-shrink: 0;
    font-size: 10px;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 20px;
    background: var(--panel-soft);
    color: var(--muted);
  }

  .agents-item-badge--input {
    background: var(--accent-soft);
    color: var(--accent);
  }

  /* Override confirm-overlay z-index for the modal portaled to body */
  .agents-modal-overlay {
    z-index: 9999;
  }
</style>
