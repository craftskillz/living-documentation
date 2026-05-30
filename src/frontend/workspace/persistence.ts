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
