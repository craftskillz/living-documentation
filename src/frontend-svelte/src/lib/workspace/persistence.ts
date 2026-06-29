const WORKSPACE_API_URL = "/api/workspace";

export interface PersistedWorkspaceDocument {
  version: 1;
  updatedAt: string;
  entities: unknown[];
  camera: {
    x: number;
    y: number;
    zoom: number;
  };
}

export async function loadWorkspaceState(): Promise<PersistedWorkspaceDocument | null> {
  try {
    const response = await fetch(WORKSPACE_API_URL, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      throw new Error(`Workspace load failed with ${response.status}`);
    }
    return (await response.json()) as PersistedWorkspaceDocument;
  } catch (error) {
    console.warn("[workspace] load failed", error);
    return null;
  }
}

export async function saveWorkspaceState(
  document: PersistedWorkspaceDocument,
): Promise<PersistedWorkspaceDocument | null> {
  try {
    const response = await fetch(WORKSPACE_API_URL, {
      method: "PUT",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(document),
    });
    if (!response.ok) {
      throw new Error(`Workspace save failed with ${response.status}`);
    }
    return (await response.json()) as PersistedWorkspaceDocument;
  } catch (error) {
    console.warn("[workspace] save failed", error);
    return null;
  }
}

export interface LlmConnectionTestInput {
  endpoint: string;
  token: string;
  model: string;
  timeout: number;
}

export interface LlmConnectionTestResult {
  ok: boolean;
  status?: number;
  statusText?: string;
  url?: string;
  detail?: string;
  error?: string;
}

export interface LlmListModelsInput {
  endpoint: string;
  token: string;
  providerType?: "chat" | "image";
}

export interface LlmListModelsResult {
  ok: boolean;
  models?: string[];
  error?: string;
}

export async function listLlmModels(
  input: LlmListModelsInput,
): Promise<LlmListModelsResult> {
  try {
    const response = await fetch(`${WORKSPACE_API_URL}/list-models`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });
    return (await response.json()) as LlmListModelsResult;
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to list models",
    };
  }
}

export interface AgentRunInput {
  endpoint: string;
  token: string;
  model: string;
  systemPrompt: string;
  userInput?: string;
  timeout: number;
  mcpEndpoint?: string;
  toolMode?: "tools" | "chat";
  expectedOutputMarker?: string;
}

export interface AgentRunStreamInput {
  providerId: string;
  endpoint: string;
  model: string;
  systemPrompt: string;
  userInput?: string;
  timeout: number;
  mcpEndpoint?: string;
  toolMode?: "tools" | "chat";
  expectedOutputMarker?: string;
}

export interface AgentRunResult {
  ok: boolean;
  content?: string;
  error?: string;
}

export interface AgentRunDocumentInfo {
  id: string;
  filename: string;
  title: string;
  ok: boolean;
}

export interface AgentRunStreamEvent {
  type:
    | "status"
    | "mcp_tools"
    | "model_call"
    | "tool_call"
    | "tool_result"
    | "fallback"
    | "final"
    | "document"
    | "error";
  message: string;
  turn?: number;
  toolName?: string;
  detail?: string;
  content?: string;
  document?: AgentRunDocumentInfo;
}

export async function runAgentPrompt(
  input: AgentRunInput,
): Promise<AgentRunResult> {
  try {
    const response = await fetch(`${WORKSPACE_API_URL}/run-agent`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });
    return (await response.json()) as AgentRunResult;
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Agent run failed",
    };
  }
}

export async function runAgentPromptStream(
  input: AgentRunStreamInput,
  onEvent: (event: AgentRunStreamEvent) => void,
): Promise<AgentRunResult> {
  try {
    const response = await fetch(`${WORKSPACE_API_URL}/run-agent-stream`, {
      method: "POST",
      headers: {
        Accept: "application/x-ndjson, application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .then((body) =>
          typeof body?.error === "string" ? body.error : "Agent run failed",
        )
        .catch(() => "Agent run failed");
      return { ok: false, error };
    }

    if (!response.body) {
      return { ok: false, error: "Agent stream is unavailable" };
    }

    const decoder = new TextDecoder();
    const reader = response.body.getReader();
    let buffer = "";
    let finalContent = "";
    let finalError = "";

    const consumeLine = (line: string) => {
      if (!line.trim()) return;
      const event = JSON.parse(line) as AgentRunStreamEvent;
      onEvent(event);
      if (event.type === "final" && typeof event.content === "string") {
        finalContent = event.content;
      }
      if (event.type === "error") {
        finalError = event.message || "Agent run failed";
      }
    };

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        consumeLine(line);
        // Yield to the browser between events so each toast update gets painted,
        // even when multiple lines arrive in the same TCP chunk.
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    buffer += decoder.decode();
    consumeLine(buffer);

    if (finalError) {
      return { ok: false, error: finalError };
    }
    if (finalContent) {
      return { ok: true, content: finalContent };
    }
    return { ok: false, error: "Agent did not produce a response" };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Agent run failed",
    };
  }
}

export async function runAgentDocumentStream(
  agentId: string,
  userInput: string,
  onEvent: (event: AgentRunStreamEvent) => void,
): Promise<{ ok: boolean; error?: string; document?: AgentRunDocumentInfo }> {
  try {
    const response = await fetch(`${WORKSPACE_API_URL}/run-agent-document-stream`, {
      method: "POST",
      headers: {
        Accept: "application/x-ndjson, application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ agentId, userInput }),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .then((body) =>
          typeof body?.error === "string" ? body.error : "Agent run failed",
        )
        .catch(() => "Agent run failed");
      return { ok: false, error };
    }

    if (!response.body) {
      return { ok: false, error: "Agent stream is unavailable" };
    }

    const decoder = new TextDecoder();
    const reader = response.body.getReader();
    let buffer = "";
    let finalDocument: AgentRunDocumentInfo | undefined;
    let finalError = "";
    let hasError = false;

    const consumeLine = (line: string) => {
      if (!line.trim()) return;
      const event = JSON.parse(line) as AgentRunStreamEvent;
      onEvent(event);
      if (event.type === "document" && event.document) {
        finalDocument = event.document;
      }
      if (event.type === "error") {
        finalError = event.message || "Agent run failed";
        hasError = true;
      }
    };

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        consumeLine(line);
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    buffer += decoder.decode();
    consumeLine(buffer);

    if (finalDocument) {
      return { ok: finalDocument.ok, document: finalDocument, error: hasError ? finalError : undefined };
    }
    if (finalError) {
      return { ok: false, error: finalError };
    }
    return { ok: false, error: "Agent did not produce a response" };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Agent run failed",
    };
  }
}

export async function testLlmConnection(
  input: LlmConnectionTestInput,
): Promise<LlmConnectionTestResult> {
  try {
    const response = await fetch(`${WORKSPACE_API_URL}/test-llm`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });
    const result = (await response.json()) as LlmConnectionTestResult;
    return {
      ...result,
      ok: response.ok && result.ok === true,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Connection test failed",
    };
  }
}
