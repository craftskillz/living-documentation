<script lang="ts">
  import { t } from "./i18n.svelte";

  interface McpTool {
    name: string;
    description?: string;
    inputSchema?: object;
  }

  interface McpPrompt {
    name: string;
    description?: string;
    arguments?: { name: string; description?: string; required?: boolean }[];
  }

  type McpItem = McpTool | McpPrompt;

  interface McpItemState {
    argsJson: string;
    running: boolean;
    error: string;
    resultHtml: string;
  }

  let { onStatus }: { onStatus: (msg: string) => void } = $props();

  let mcpStatus = $state("-");
  let mcpStatusOk = $state(false);
  let mcpTransport = $state("-");
  let mcpEndpoint = $state("-");
  let tools = $state<McpTool[]>([]);
  let prompts = $state<McpPrompt[]>([]);
  let runningAll = $state(false);

  let toolStates = $state(new Map<string, McpItemState>());
  let promptStates = $state(new Map<string, McpItemState>());

  function getState(kind: "tool" | "prompt", name: string): McpItemState {
    const map = kind === "tool" ? toolStates : promptStates;
    if (!map.has(name)) {
      map.set(name, { argsJson: "{}", running: false, error: "", resultHtml: "" });
    }
    return map.get(name)!;
  }

  function patchState(kind: "tool" | "prompt", name: string, patch: Partial<McpItemState>) {
    const map = kind === "tool" ? toolStates : promptStates;
    const current = map.get(name) ?? { argsJson: "{}", running: false, error: "", resultHtml: "" };
    if (kind === "tool") {
      toolStates = new Map(toolStates).set(name, { ...current, ...patch });
    } else {
      promptStates = new Map(promptStates).set(name, { ...current, ...patch });
    }
  }

  function exampleValueForSchema(schema: any): any {
    if (!schema || typeof schema !== "object") return null;
    if (schema.type === "string") return "";
    if (schema.type === "number" || schema.type === "integer") return 0;
    if (schema.type === "boolean") return false;
    if (schema.type === "array") return [];
    if (schema.type === "object" || schema.properties) {
      const result: any = {};
      const props = schema.properties || {};
      const required: string[] = Array.isArray(schema.required) ? schema.required : [];
      required.forEach(key => { result[key] = exampleValueForSchema(props[key]) ?? ""; });
      return result;
    }
    return null;
  }

  function initToolState(tool: McpTool) {
    const ex = exampleValueForSchema(tool.inputSchema) ?? {};
    const argsJson = JSON.stringify(ex, null, 2);
    toolStates = new Map(toolStates).set(tool.name, { argsJson, running: false, error: "", resultHtml: "" });
  }

  function initPromptState(prompt: McpPrompt) {
    const ex: any = {};
    (prompt.arguments || []).forEach(a => { if (a.required) ex[a.name] = ""; });
    const argsJson = JSON.stringify(ex, null, 2);
    promptStates = new Map(promptStates).set(prompt.name, { argsJson, running: false, error: "", resultHtml: "" });
  }

  function parseSseJson(text: string) {
    const match = text.match(/^data:\s*(\{.*\})\s*$/m);
    if (!match) throw new Error(text.slice(0, 300) || "No MCP response body");
    return JSON.parse(match[1]);
  }

  async function mcpRpc(id: number, method: string, params: object) {
    const res = await fetch("/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
      body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
    return parseSseJson(text);
  }

  async function initializeMcp() {
    await mcpRpc(1, "initialize", {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: "living-ai-documentation-context", version: "1.0.0" },
    });
  }

  function wrapJsonBlock(value: any) {
    const text = JSON.stringify(value, null, 2).replaceAll("```", "`\\`\\`");
    return "```json\n" + text + "\n```";
  }

  function formatMaybeJsonText(value: any) {
    if (typeof value !== "string") return wrapJsonBlock(value);
    try { return wrapJsonBlock(JSON.parse(value)); } catch { return value; }
  }

  function formatMcpDisplayValue(value: any): string {
    if (typeof value === "string") return value;
    if (!value || typeof value !== "object") return String(value ?? "");
    if (value.error) return wrapJsonBlock(value.error);
    const result = value.result;
    if (!result || typeof result !== "object") return wrapJsonBlock(value);
    if (Array.isArray(result.messages)) {
      return result.messages.map((m: any) => {
        const role = m.role ? `[${m.role}]` : "";
        const content = m.content?.text ?? m.content ?? m;
        return `${role}\n${formatMaybeJsonText(content)}`.trim();
      }).join("\n\n");
    }
    if (Array.isArray(result.content)) {
      return result.content.map((part: any) => {
        if (part && part.type === "text" && typeof part.text === "string") return formatMaybeJsonText(part.text);
        return wrapJsonBlock(part);
      }).join("\n\n");
    }
    return wrapJsonBlock(result);
  }

  function parseJsonIfPossible(value: any) {
    if (typeof value !== "string") return value;
    try { return JSON.parse(value); } catch { return value; }
  }

  function extractToolResult(envelope: any) {
    const result = envelope?.result;
    if (!result || typeof result !== "object") return envelope;
    if (!Array.isArray(result.content)) return result;
    const parts = result.content.map((part: any) => {
      if (part && part.type === "text" && typeof part.text === "string") return parseJsonIfPossible(part.text);
      return part;
    });
    return parts.length === 1 ? parts[0] : parts;
  }

  function buildToolMarkdown(tool: McpTool, args: object, envelope: any) {
    const description = tool.description || t("context.empty");
    const inputSchema = tool.inputSchema || {};
    const request = { jsonrpc: "2.0", method: "tools/call", params: { name: tool.name, arguments: args } };
    const result = extractToolResult(envelope);
    const resultIsJson = typeof result !== "string";
    return [
      `# MCP tool: \`${tool.name}\``, "",
      "## Description", "", description, "",
      "## Schéma d'entrée", "", wrapJsonBlock(inputSchema), "",
      "## Requête effectuée", "", wrapJsonBlock(request), "",
      "## Résultat", "", resultIsJson ? wrapJsonBlock(result) : String(result), "",
    ].join("\n");
  }

  function stringifyMcpErrorDetail(value: any): string {
    if (typeof value === "string") return value;
    if (!value || typeof value !== "object") return String(value ?? "");
    if (value.error) return JSON.stringify(value.error, null, 2);
    const result = value.result;
    if (result?.isError) {
      const parts = Array.isArray(result.content)
        ? result.content.map((p: any) => (p && p.type === "text" && typeof p.text === "string") ? p.text : JSON.stringify(p, null, 2)).filter(Boolean)
        : [];
      return parts.join("\n\n") || JSON.stringify(result, null, 2);
    }
    return JSON.stringify(value, null, 2);
  }

  async function saveMcpResult(name: string, content: string, kind: string) {
    const res = await fetch("/api/context/mcp-result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, content, kind }),
    });
    if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
    return res.json();
  }

  function documentHref(docPath: string) {
    const docId = encodeURIComponent(String(docPath || "").replace(/\.md$/i, ""));
    return "/?doc=" + encodeURIComponent(docId);
  }

  async function runItem(kind: "tool" | "prompt", name: string) {
    const state = getState(kind, name);
    let args: object = {};
    try {
      args = state.argsJson.trim() ? JSON.parse(state.argsJson) : {};
    } catch {
      patchState(kind, name, { error: t("context.mcp_invalid_json") });
      return;
    }
    patchState(kind, name, { running: true, error: "", resultHtml: `<span class="mcp-running">${t("context.mcp_running")}</span>` });
    try {
      await initializeMcp();
      const envelope = kind === "tool"
        ? await mcpRpc(2, "tools/call", { name, arguments: args })
        : await mcpRpc(2, "prompts/get", { name, arguments: args });

      if (envelope.error || envelope.result?.isError) {
        const detail = stringifyMcpErrorDetail(envelope);
        patchState(kind, name, {
          running: false,
          error: t("context.mcp_error"),
          resultHtml: detail ? `<pre class="mcp-error-pre">${escHtml(detail)}</pre>` : "",
        });
        return;
      }

      const tool = kind === "tool" ? tools.find(t => t.name === name) : null;
      const markdown = kind === "tool" && tool
        ? buildToolMarkdown(tool, args, envelope)
        : formatMcpDisplayValue(envelope);
      const { path: docPath } = await saveMcpResult(name, markdown, kind);
      const href = documentHref(docPath);
      patchState(kind, name, {
        running: false,
        error: "",
        resultHtml: `<div class="mcp-saved-label">${escHtml(t("context.mcp_saved_to"))}</div>
          <a href="${escHtml(href)}" target="_blank" rel="noopener" class="mcp-saved-link">📄 ${escHtml(docPath)}</a>`,
      });
    } catch (err: any) {
      patchState(kind, name, { running: false, error: err.message || String(err), resultHtml: "" });
    }
  }

  async function runAll(kind: "tool" | "prompt") {
    const items = kind === "tool" ? tools : prompts;
    if (!items.length) return;
    runningAll = true;
    const total = items.length;
    try {
      for (let i = 0; i < items.length; i++) {
        onStatus(t("context.mcp_running_all").replace("{current}", String(i + 1)).replace("{total}", String(total)));
        await runItem(kind, items[i].name);
      }
      onStatus(t("context.mcp_done_all").replace("{total}", String(total)));
    } finally {
      runningAll = false;
    }
  }

  function escHtml(value: string) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
  }

  export async function load() {
    try {
      const res = await fetch("/mcp");
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const newTools: McpTool[] = Array.isArray(data.tools) ? data.tools : [];
      const newPrompts: McpPrompt[] = Array.isArray(data.prompts) ? data.prompts : [];
      mcpStatus = t("context.mcp_available");
      mcpStatusOk = true;
      mcpTransport = data.transport || "-";
      mcpEndpoint = data.endpoint || "POST /mcp";
      tools = newTools;
      prompts = newPrompts;
      newTools.forEach(initToolState);
      newPrompts.forEach(initPromptState);
    } catch {
      mcpStatus = t("context.mcp_unavailable");
      mcpStatusOk = false;
      mcpTransport = "-";
      mcpEndpoint = "/mcp";
      tools = [];
      prompts = [];
    }
  }
</script>

<div class="section-card">
  <div class="section-header">
    <span class="section-title" data-testid="mcp-title">{t("context.mcp_title")}</span>
    <button class="secondary-button btn-sm" onclick={load}>{t("context.mcp_refresh")}</button>
  </div>

  <p class="section-desc">{t("context.mcp_intro")}</p>

  <div class="mcp-info-grid">
    <div class="mcp-info-cell">
      <div class="mcp-info-label">{t("context.mcp_status")}</div>
      <div class={mcpStatusOk ? "mcp-info-value ok" : "mcp-info-value err"}>{mcpStatus}</div>
    </div>
    <div class="mcp-info-cell">
      <div class="mcp-info-label">{t("context.mcp_transport")}</div>
      <div class="mcp-info-value mono">{mcpTransport}</div>
    </div>
    <div class="mcp-info-cell wide">
      <div class="mcp-info-label">{t("context.mcp_endpoint")}</div>
      <div class="mcp-info-value mono break" data-testid="mcp-endpoint">{mcpEndpoint}</div>
    </div>
  </div>

  <!-- Tools -->
  <div>
    <div class="subsection-header">
      <span class="subsection-title">{t("context.mcp_tools")}</span>
      <div class="subsection-actions">
        <span class="count-label">{tools.length}</span>
        <button
          class="secondary-button btn-sm"
          disabled={runningAll || !tools.length}
          onclick={() => runAll("tool")}
        >{t("context.mcp_run_all_tools")}</button>
      </div>
    </div>
    <div class="mcp-items" data-testid="mcp-tool-list">
      {#if !tools.length}
        <p class="empty-msg">{t("context.mcp_no_tools")}</p>
      {:else}
        {#each tools as tool}
          {@const state = toolStates.get(tool.name) ?? { argsJson: "{}", running: false, error: "", resultHtml: "" }}
          <details class="mcp-detail">
            <summary class="mcp-summary">{tool.name}</summary>
            {#if tool.description}
              <p class="mcp-desc">{tool.description}</p>
            {/if}
            {#if tool.inputSchema}
              <div class="mcp-schema-wrap">
                <h4 class="mcp-schema-title">{t("context.mcp_input_schema")}</h4>
                <pre class="mcp-schema-pre">{JSON.stringify(tool.inputSchema, null, 2)}</pre>
              </div>
            {/if}
            <div class="mcp-run-area">
              <!-- svelte-ignore a11y_label_has_associated_control -->
              <label class="mcp-run-label">{t("context.mcp_request_json")}</label>
              <textarea
                rows="4"
                spellcheck="false"
                class="field-input mcp-textarea"
                data-testid="mcp-args"
                value={state.argsJson}
                oninput={(e) => patchState("tool", tool.name, { argsJson: (e.target as HTMLTextAreaElement).value })}
              ></textarea>
              <div class="mcp-run-footer">
                <span class="mcp-error-text" data-testid="mcp-error">{state.error}</span>
                <button
                  class="btn-primary btn-sm"
                  disabled={state.running}
                  onclick={() => runItem("tool", tool.name)}
                >{t("context.mcp_run_tool")}</button>
              </div>
              {#if state.resultHtml}
                <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                <div class="mcp-result" data-testid="mcp-result">{@html state.resultHtml}</div>
              {/if}
            </div>
          </details>
        {/each}
      {/if}
    </div>
  </div>

  <!-- Prompts -->
  <div>
    <div class="subsection-header">
      <span class="subsection-title">{t("context.mcp_prompts")}</span>
      <div class="subsection-actions">
        <span class="count-label">{prompts.length}</span>
        <button
          class="secondary-button btn-sm"
          disabled={runningAll || !prompts.length}
          onclick={() => runAll("prompt")}
        >{t("context.mcp_get_all_prompts")}</button>
      </div>
    </div>
    <div class="mcp-items" data-testid="mcp-prompt-list">
      {#if !prompts.length}
        <p class="empty-msg">{t("context.mcp_no_prompts")}</p>
      {:else}
        {#each prompts as prompt}
          {@const state = promptStates.get(prompt.name) ?? { argsJson: "{}", running: false, error: "", resultHtml: "" }}
          <details class="mcp-detail">
            <summary class="mcp-summary">{prompt.name}</summary>
            {#if prompt.description}
              <p class="mcp-desc">{prompt.description}</p>
            {/if}
            {#if prompt.arguments?.length}
              <div class="mcp-schema-wrap">
                <h4 class="mcp-schema-title">{t("context.mcp_arguments")}</h4>
                <ul class="mcp-args-list">
                  {#each prompt.arguments as arg}
                    <li class="mcp-arg-item">
                      <div class="mcp-arg-name-row">
                        <span class="mcp-arg-name">{arg.name}</span>
                        <span class="mcp-arg-req">{arg.required ? t("context.mcp_required") : t("context.mcp_optional")}</span>
                      </div>
                      {#if arg.description}
                        <p class="mcp-arg-desc">{arg.description}</p>
                      {/if}
                    </li>
                  {/each}
                </ul>
              </div>
            {/if}
            <div class="mcp-run-area">
              <!-- svelte-ignore a11y_label_has_associated_control -->
              <label class="mcp-run-label">{t("context.mcp_request_json")}</label>
              <textarea
                rows="4"
                spellcheck="false"
                class="field-input mcp-textarea"
                data-testid="mcp-args"
                value={state.argsJson}
                oninput={(e) => patchState("prompt", prompt.name, { argsJson: (e.target as HTMLTextAreaElement).value })}
              ></textarea>
              <div class="mcp-run-footer">
                <span class="mcp-error-text" data-testid="mcp-error">{state.error}</span>
                <button
                  class="btn-primary btn-sm"
                  disabled={state.running}
                  onclick={() => runItem("prompt", prompt.name)}
                >{t("context.mcp_get_prompt")}</button>
              </div>
              {#if state.resultHtml}
                <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                <div class="mcp-result" data-testid="mcp-result">{@html state.resultHtml}</div>
              {/if}
            </div>
          </details>
        {/each}
      {/if}
    </div>
  </div>
</div>

<style>
  .section-card {
    border: 1px solid var(--line);
    border-radius: 12px;
    background: var(--panel);
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .section-title { font-size: 13px; font-weight: 600; color: var(--ink); }
  .section-desc { font-size: 12px; color: var(--muted); margin: 0; }
  .mcp-info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .mcp-info-cell {
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 8px 10px;
  }
  .mcp-info-cell.wide { grid-column: 1 / -1; }
  .mcp-info-label { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }
  .mcp-info-value { font-size: 12px; font-weight: 600; color: var(--ink); margin-top: 3px; }
  .mcp-info-value.ok { color: var(--green); }
  .mcp-info-value.err { color: var(--red); }
  .mcp-info-value.mono { font-family: monospace; font-weight: 400; }
  .mcp-info-value.break { word-break: break-all; }
  .subsection-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 8px;
  }
  .subsection-title { font-size: 12px; font-weight: 600; color: var(--muted); }
  .subsection-actions { display: flex; align-items: center; gap: 8px; }
  .count-label { font-size: 11px; color: var(--muted); }
  .mcp-items { display: flex; flex-direction: column; gap: 6px; }
  .mcp-detail {
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--panel-soft);
    padding: 8px 12px;
  }
  .mcp-summary {
    cursor: pointer;
    font-family: monospace;
    font-size: 12px;
    font-weight: 600;
    color: var(--accent);
    user-select: none;
    list-style: none;
  }
  .mcp-summary::-webkit-details-marker { display: none; }
  .mcp-desc {
    font-size: 12px;
    color: var(--muted);
    margin: 8px 0 0;
    white-space: pre-wrap;
    line-height: 1.5;
  }
  .mcp-schema-wrap { margin-top: 10px; }
  .mcp-schema-title { font-size: 11px; font-weight: 600; color: var(--muted); margin: 0 0 4px; }
  .mcp-schema-pre {
    max-height: 200px;
    overflow: auto;
    border-radius: 6px;
    background: var(--panel);
    border: 1px solid var(--line);
    padding: 8px;
    font-size: 11px;
    color: var(--ink);
    white-space: pre;
  }
  .mcp-args-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
  .mcp-arg-item {
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 6px 8px;
  }
  .mcp-arg-name-row { display: flex; align-items: center; gap: 8px; }
  .mcp-arg-name { font-family: monospace; font-size: 12px; font-weight: 600; color: var(--ink); }
  .mcp-arg-req { font-size: 11px; text-transform: uppercase; color: var(--muted); letter-spacing: 0.05em; }
  .mcp-arg-desc { font-size: 11px; color: var(--muted); margin: 4px 0 0; }
  .mcp-run-area { margin-top: 10px; border-top: 1px solid var(--line); padding-top: 10px; display: flex; flex-direction: column; gap: 6px; }
  .mcp-run-label { font-size: 11px; font-weight: 600; color: var(--muted); }
  .mcp-textarea { font-family: monospace; font-size: 11px; resize: vertical; }
  .mcp-run-footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .mcp-error-text { font-size: 11px; color: var(--red); }
  .mcp-result { font-size: 11px; }
  .empty-msg { font-size: 12px; color: var(--muted); margin: 0; }
  :global(.mcp-running) { color: var(--muted); font-style: italic; }
  :global(.mcp-saved-label) { color: var(--muted); font-size: 11px; margin-bottom: 4px; }
  :global(.mcp-saved-link) {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    border-radius: 6px;
    background: var(--green-soft);
    padding: 4px 10px;
    font-family: monospace;
    font-size: 11px;
    font-weight: 600;
    color: var(--green);
    text-decoration: none;
  }
  :global(.mcp-saved-link:hover) { opacity: 0.8; }
  :global(.mcp-error-pre) {
    max-height: 200px;
    overflow: auto;
    white-space: pre-wrap;
    word-break: break-word;
    border-radius: 6px;
    border: 1px solid var(--red-soft);
    background: var(--red-soft);
    padding: 8px;
    font-size: 11px;
    line-height: 1.5;
    color: var(--red);
  }
</style>
