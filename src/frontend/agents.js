// ── Workspace AI agents launcher ────────────────────────────────────────────
// Depends on i18n.js, documents.js, and the workspace API.
(function () {
  let workspaceAgents = [];
  let selectedAgentId = null;
  let createdDocumentId = null;

  function tr(key) {
    return typeof window.t === "function" ? window.t(key) : key;
  }

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function agentElements() {
    return {
      button: document.getElementById("ai-agents-btn"),
      modal: document.getElementById("ai-agents-modal"),
      grid: document.getElementById("ai-agents-grid"),
      inputModal: document.getElementById("ai-agent-input-modal"),
      inputTitle: document.getElementById("ai-agent-input-title"),
      inputHint: document.getElementById("ai-agent-input-hint"),
      input: document.getElementById("ai-agent-user-input"),
      runInputButton: document.getElementById("ai-agent-input-run"),
      toast: document.getElementById("ai-agent-toast"),
      toastIcon: document.getElementById("ai-agent-toast-icon"),
      toastTitle: document.getElementById("ai-agent-toast-title"),
      toastMessage: document.getElementById("ai-agent-toast-message"),
      toastOpen: document.getElementById("ai-agent-toast-open"),
      toastClose: document.getElementById("ai-agent-toast-close"),
    };
  }

  async function loadWorkspaceAgents() {
    const response = await fetch("/api/workspace", {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      throw new Error(`Workspace load failed (${response.status})`);
    }

    const workspace = await response.json();
    const entities = Array.isArray(workspace.entities) ? workspace.entities : [];
    const byId = new Map(entities.map((entity) => [entity.id, entity]));
    workspaceAgents = entities
      .filter((entity) => entity.kind === "agent")
      .map((agent) => ({
        ...agent,
        provider: byId.get(agent.parentId),
      }));
    return workspaceAgents;
  }

  function renderAgents() {
    const { grid } = agentElements();
    if (!grid) return;

    if (!workspaceAgents.length) {
      grid.className = "p-5";
      grid.innerHTML = `<p class="text-sm text-gray-500 dark:text-gray-400">${esc(tr("agents.empty"))}</p>`;
      return;
    }

    grid.className =
      "p-5 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3";
    grid.innerHTML = workspaceAgents.map(agentCardHtml).join("");
    grid.querySelectorAll("[data-agent-id]").forEach((button) => {
      button.addEventListener("click", () => selectAgent(button.dataset.agentId));
    });
  }

  function agentCardHtml(agent) {
    const provider = agent.provider;
    const disabled =
      !provider ||
      provider.kind !== "llm" ||
      !provider.config?.model ||
      !agent.config?.systemPrompt ||
      (agent.config?.requiresUserInput &&
        !agent.config?.userInputDescription?.trim());
    const status = disabled
      ? tr("agents.not_ready")
      : agent.config?.requiresUserInput
        ? tr("agents.requires_input")
        : tr("agents.ready");

    return `
      <button
        type="button"
        data-agent-id="${esc(agent.id)}"
        ${disabled ? "disabled" : ""}
        class="text-left rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 transition-colors ${disabled ? "opacity-55 cursor-not-allowed" : "hover:border-blue-500 hover:shadow-sm"}"
      >
        <span class="block text-sm font-bold text-gray-900 dark:text-gray-100">${esc(agent.label)}</span>
        <span class="block text-xs text-gray-500 dark:text-gray-400 mt-1">${esc(provider?.label ?? tr("agents.no_provider"))}</span>
        <span class="inline-flex mt-3 text-[11px] font-semibold rounded-full px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">${esc(status)}</span>
      </button>
    `;
  }

  async function openAiAgentsModal() {
    const { modal, grid } = agentElements();
    if (!modal || !grid) return;

    modal.classList.remove("hidden");
    grid.className = "p-5";
    grid.innerHTML = `<p class="text-sm text-gray-400">${esc(tr("common.loading"))}</p>`;

    try {
      await loadWorkspaceAgents();
      renderAgents();
    } catch (error) {
      grid.innerHTML = `<p class="text-sm text-red-500">${esc(error instanceof Error ? error.message : tr("agents.load_failed"))}</p>`;
    }
  }

  function closeAiAgentsModal() {
    const { modal } = agentElements();
    modal?.classList.add("hidden");
  }

  function selectAgent(agentId) {
    const agent = workspaceAgents.find((item) => item.id === agentId);
    if (!agent) return;

    closeAiAgentsModal();
    if (agent.config?.requiresUserInput) {
      openAiAgentInputModal(agent);
      return;
    }

    void executeAgent(agent.id, "");
  }

  function openAiAgentInputModal(agent) {
    const { inputModal, inputTitle, inputHint, input, runInputButton } =
      agentElements();
    selectedAgentId = agent.id;
    if (inputTitle) inputTitle.textContent = agent.label;
    if (inputHint) {
      inputHint.textContent =
        agent.config?.userInputDescription?.trim() || tr("agents.input_hint");
    }
    if (input) {
      input.value = "";
      window.setTimeout(() => input.focus(), 0);
    }
    runInputButton?.removeAttribute("disabled");
    inputModal?.classList.remove("hidden");
  }

  function closeAiAgentInputModal() {
    const { inputModal } = agentElements();
    inputModal?.classList.add("hidden");
    selectedAgentId = null;
  }

  async function executeAgent(agentId, userInput) {
    const agent = workspaceAgents.find((item) => item.id === agentId);
    createdDocumentId = null;
    showAgentToast("loading", tr("agents.loading"), agent?.label ?? "");

    try {
      const response = await fetch("/api/workspace/run-agent-document", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ agentId, userInput }),
      });
      const result = await response.json();
      if (result.document?.id) {
        createdDocumentId = result.document.id;
      }

      if (response.ok && result.ok) {
        showAgentToast(
          "success",
          tr("agents.success"),
          result.document?.filename ?? "",
          createdDocumentId,
        );
      } else {
        showAgentToast(
          "error",
          tr("agents.failure"),
          result.error ?? tr("agents.run_failed"),
          createdDocumentId,
        );
      }

      if (createdDocumentId && typeof loadDocuments === "function") {
        await loadDocuments();
      }
    } catch (error) {
      showAgentToast(
        "error",
        tr("agents.failure"),
        error instanceof Error ? error.message : tr("agents.run_failed"),
      );
    }
  }

  function showAgentToast(state, title, message, documentId) {
    const { toast, toastIcon, toastTitle, toastMessage, toastOpen } =
      agentElements();
    if (!toast || !toastIcon || !toastTitle || !toastMessage || !toastOpen) {
      return;
    }

    toast.classList.remove("hidden");
    toastTitle.textContent = title;
    toastMessage.textContent = message;
    toastOpen.classList.toggle("hidden", !documentId);

    toastIcon.className = "mt-0.5 h-5 w-5 rounded-full shrink-0";
    if (state === "loading") {
      toastIcon.className +=
        " border-2 border-blue-500 border-t-transparent animate-spin";
      toastIcon.textContent = "";
    } else if (state === "success") {
      toastIcon.className +=
        " bg-green-500 text-white text-xs flex items-center justify-center";
      toastIcon.textContent = "✓";
    } else {
      toastIcon.className +=
        " bg-red-500 text-white text-xs flex items-center justify-center";
      toastIcon.textContent = "!";
    }
  }

  function closeAgentToast() {
    const { toast } = agentElements();
    toast?.classList.add("hidden");
  }

  async function openCreatedAgentDocument() {
    if (!createdDocumentId) return;
    if (typeof loadDocuments === "function") {
      await loadDocuments();
    }
    if (typeof openDocument === "function") {
      await openDocument(createdDocumentId, false);
      closeAgentToast();
    } else {
      closeAgentToast();
      location.href = `/?doc=${encodeURIComponent(createdDocumentId)}`;
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const {
      button,
      runInputButton,
      input,
      toastOpen,
      toastClose,
    } = agentElements();

    button?.addEventListener("click", () => {
      void openAiAgentsModal();
    });
    runInputButton?.addEventListener("click", () => {
      if (!selectedAgentId) return;
      const agentId = selectedAgentId;
      const value = input?.value ?? "";
      closeAiAgentInputModal();
      void executeAgent(agentId, value);
    });
    toastOpen?.addEventListener("click", () => {
      void openCreatedAgentDocument();
    });
    toastClose?.addEventListener("click", () => {
      closeAgentToast();
    });
  });

  window.openAiAgentsModal = openAiAgentsModal;
  window.closeAiAgentsModal = closeAiAgentsModal;
  window.closeAiAgentInputModal = closeAiAgentInputModal;
})();
