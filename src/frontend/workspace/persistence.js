const WORKSPACE_API_URL = "/api/workspace";
export async function loadWorkspaceState() {
    try {
        const response = await fetch(WORKSPACE_API_URL, {
            headers: { Accept: "application/json" },
        });
        if (!response.ok) {
            throw new Error(`Workspace load failed with ${response.status}`);
        }
        return (await response.json());
    }
    catch (error) {
        console.warn("[workspace] load failed", error);
        return null;
    }
}
export async function saveWorkspaceState(document) {
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
        return (await response.json());
    }
    catch (error) {
        console.warn("[workspace] save failed", error);
        return null;
    }
}
export async function listLlmModels(input) {
    try {
        const response = await fetch(`${WORKSPACE_API_URL}/list-models`, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(input),
        });
        return (await response.json());
    }
    catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? error.message : "Failed to list models",
        };
    }
}
export async function runAgentPrompt(input) {
    try {
        const response = await fetch(`${WORKSPACE_API_URL}/run-agent`, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(input),
        });
        return (await response.json());
    }
    catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? error.message : "Agent run failed",
        };
    }
}
export async function testLlmConnection(input) {
    try {
        const response = await fetch(`${WORKSPACE_API_URL}/test-llm`, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(input),
        });
        const result = (await response.json());
        return {
            ...result,
            ok: response.ok && result.ok === true,
        };
    }
    catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? error.message : "Connection test failed",
        };
    }
}
//# sourceMappingURL=persistence.js.map