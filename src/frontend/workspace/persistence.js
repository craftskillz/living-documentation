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
//# sourceMappingURL=persistence.js.map