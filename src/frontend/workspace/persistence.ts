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
  expectedOutputMarker?: string;
}

export interface AgentRunResult {
  ok: boolean;
  content?: string;
  error?: string;
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
