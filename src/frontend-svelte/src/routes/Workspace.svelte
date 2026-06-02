<script lang="ts">
  import { onMount } from "svelte";
  import Topbar from "../lib/Topbar.svelte";
  import { t, loadI18n } from "../lib/i18n.svelte";
  import { initWorkspace } from "../../../frontend/workspace/app";

  let apiStatusText = $state("Detecting canvas API");
  let apiStatusClass = $state("");

  onMount(async () => {
    try {
      const cfg = await fetch("/api/config").then(r => r.json());
      await loadI18n(cfg.language || "en");
    } catch { /* fallback */ }

    const cleanup = initWorkspace();
    return cleanup;
  });
</script>

<div class="app-shell">
  <Topbar title="Living AI Documentation" subtitle="Graph-native configuration workspace">
    <div class="status-row">
      <span id="apiStatus" class="status-pill {apiStatusClass}">{apiStatusText}</span>
    </div>
  </Topbar>

  <section class="workspace-shell" aria-label="Configuration graph workspace">
    <nav class="rail" aria-label="Workspace tools">
      <button id="addButton" class="tool-button primary" type="button" title="Add node">+</button>
      <button id="fitButton" class="tool-button" type="button" title="Fit view">⌖</button>
    </nav>

    <canvas id="workspaceCanvas" class="workspace-canvas" layoutsubtree>
      <form id="configSurface" class="config-surface" autocomplete="off">
        <div class="panel-kicker">
          <span id="nodeTypeBadge">Provider</span>
          <button id="closePanelButton" class="icon-button close" type="button" title="Close panel">×</button>
        </div>

        <div class="panel-title-row">
          <label class="eyebrow" for="nodeName">Node name</label>
          <input id="nodeName" name="nodeName" class="title-input" type="text" />
        </div>

        <div class="form-grid">
          <label class="field">
            <span>Kind</span>
            <select id="nodeKind" name="nodeKind">
              <option value="system">System</option>
              <option value="llm">LLM provider</option>
              <option value="agent">Agent</option>
              <option value="mcp">MCP</option>
            </select>
          </label>

          <div id="llmFields" class="contents">
            <label class="field wide">
              <span>Endpoint</span>
              <input id="nodeEndpoint" name="nodeEndpoint" type="url" placeholder="http://localhost:11434" />
            </label>
            <label class="field wide">
              <span>API token</span>
              <input id="nodeToken" name="nodeToken" type="password" placeholder="Optional bearer token" />
            </label>
            <div class="field wide model-field-row">
              <span>Model</span>
              <div class="model-select-wrap">
                <select id="nodeModel" name="nodeModel">
                  <option value="" disabled selected>— click ↻ to load models —</option>
                </select>
                <button id="loadModelsButton" class="icon-button" type="button" title="Load models from endpoint">↻</button>
              </div>
            </div>
            <label class="field">
              <span>Timeout</span>
              <input id="nodeTimeout" name="nodeTimeout" type="number" min="1" max="600" step="1" />
            </label>
          </div>

          <label class="field wide">
            <span>Description</span>
            <textarea id="nodeDescription" name="nodeDescription" rows="3"></textarea>
          </label>
        </div>

        <section id="agentSection" class="agent-section" hidden>
          <label id="agentWorkspaceField" class="field wide">
            <span>Workspace folder</span>
            <input id="nodeWorkspaceFolder" name="nodeWorkspaceFolder" type="text" readonly />
          </label>
          <label class="field wide">
            <span>System prompt</span>
            <textarea id="nodeSystemPrompt" name="nodeSystemPrompt" rows="5" placeholder="You are a helpful assistant…"></textarea>
          </label>
          <label class="field wide checkbox-field">
            <input id="nodeRequiresUserInput" name="nodeRequiresUserInput" type="checkbox" />
            <span>Require a user input</span>
          </label>
          <label id="agentUserInputDescriptionField" class="field wide" hidden>
            <span>Describe User input</span>
            <textarea id="nodeUserInputDescription" name="nodeUserInputDescription" rows="3" placeholder="Describe exactly what the user must provide before running this agent."></textarea>
          </label>
          <label class="field wide">
            <span>Required output marker</span>
            <input id="nodeExpectedOutputMarker" name="nodeExpectedOutputMarker" type="text" placeholder="Optional, e.g. ```mermaid" />
          </label>
        </section>

        <section id="mcpInventory" class="mcp-inventory" hidden>
          <div class="inventory-header">
            <span>MCP consultation surface</span>
            <strong>Streamable HTTP</strong>
          </div>
          <div class="inventory-grid">
            <article>
              <h2>Tools</h2>
              <ul>
                <li>list_documents</li><li>read_document</li><li>create_document</li>
                <li>update_document</li><li>list_diagrams</li><li>read_diagram</li>
                <li>create_diagram</li><li>list_source_files</li><li>read_source_file</li>
                <li>search_source</li><li>add_metadata</li><li>refresh_metadata</li>
                <li>get_accuracy</li><li>review_adr_relevance</li><li>retrodocument_adrs_from_git</li>
              </ul>
            </article>
            <article>
              <h2>Prompts</h2>
              <ul>
                <li>audit-adrs-drift</li><li>review-adr-relevance</li>
                <li>retrodocument-adrs-from-git</li><li>erd</li>
                <li>feature-workflow</li><li>create-context-diagram</li>
                <li>create-container-diagram</li><li>document-source-decision</li>
              </ul>
            </article>
          </div>
        </section>

        <footer class="panel-actions">
          <div class="panel-actions-left">
            <button id="testNodeButton" class="secondary-button" type="button">Test</button>
          </div>
          <div class="panel-actions-right">
            <button id="deleteNodeButton" class="danger-button" type="button">Delete</button>
          </div>
        </footer>
      </form>
    </canvas>

    <div id="fallbackPanelHost" class="fallback-panel-host" hidden></div>
  </section>

  <!-- Delete confirmation -->
  <div id="deleteConfirmOverlay" class="confirm-overlay" hidden>
    <section class="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="deleteConfirmTitle">
      <div>
        <p class="confirm-kicker">Destructive change</p>
        <h2 id="deleteConfirmTitle">Delete node?</h2>
        <p id="deleteConfirmMessage" class="confirm-message"></p>
      </div>
      <footer class="confirm-actions">
        <button id="cancelDeleteButton" class="secondary-button" type="button">Cancel</button>
        <button id="confirmDeleteButton" class="danger-button" type="button">Delete</button>
      </footer>
    </section>
  </div>

  <!-- Rename confirmation -->
  <div id="renameConfirmOverlay" class="confirm-overlay" hidden>
    <section class="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="renameConfirmTitle">
      <div>
        <p class="confirm-kicker">Renommage de dossier</p>
        <h2 id="renameConfirmTitle">Renommer le dossier ?</h2>
        <p id="renameConfirmMessage" class="confirm-message"></p>
      </div>
      <footer class="confirm-actions">
        <button id="cancelRenameButton" class="secondary-button" type="button">Annuler</button>
        <button id="confirmRenameButton" class="primary-button" type="button">Renommer</button>
      </footer>
    </section>
  </div>

  <!-- Agent run dialog -->
  <div id="agentRunOverlay" class="confirm-overlay" hidden>
    <section class="agent-run-dialog" role="dialog" aria-modal="true" aria-labelledby="agentRunTitle">
      <div>
        <p class="confirm-kicker">Agent test</p>
        <h2 id="agentRunTitle">Run agent</h2>
        <p id="agentRunHint" class="confirm-message"></p>
      </div>
      <label id="agentRunInputField" class="field wide agent-run-input-field">
        <span>User input</span>
        <textarea id="agentRunInput" name="agentRunInput" rows="6" placeholder="Document ID, question, or any input for the agent…"></textarea>
      </label>
      <div id="agentRunResult" class="agent-run-result" hidden></div>
      <footer class="confirm-actions">
        <button id="cancelAgentRunButton" class="secondary-button" type="button">Close</button>
        <button id="executeAgentRunButton" class="primary-button" type="button">Run</button>
      </footer>
    </section>
  </div>
</div>

<!-- Toast -->
<div id="workspaceToast" class="workspace-toast" role="status" aria-live="polite" hidden>
  <span id="workspaceToastIcon" class="toast-icon" aria-hidden="true">✓</span>
  <span id="workspaceToastMessage">Workspace saved</span>
</div>
