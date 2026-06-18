<script lang="ts">
  import "../src/styles/app.css";
  import Admin from "./routes/Admin.svelte";
  import Blueprint from "./routes/Blueprint.svelte";
  import Workspace from "./routes/Workspace.svelte";
  import Files from "./routes/Files.svelte";
  import AiContext from "./routes/AiContext.svelte";
  import Agents from "./routes/Agents.svelte";
  import Home from "./routes/Home.svelte";
  import Diagram from "./routes/Diagram.svelte";
  import ShapeEditor from "./routes/ShapeEditor.svelte";
  import SurvivalKit from "./routes/SurvivalKit.svelte";

  // Normalize the pathname so trailing slashes (e.g. "/diagram/") still match the
  // exact route keys below. Express tolerates the trailing slash and serves
  // index.html, but our string router would otherwise fall through.
  function normalizePath(p: string): string {
    return p.length > 1 ? p.replace(/\/+$/, "") : p;
  }

  let path = $state(normalizePath(window.location.pathname));

  window.addEventListener("popstate", () => {
    path = normalizePath(window.location.pathname);
  });

  $effect(() => {
    if (path === "/blueprint") {
      document.documentElement.setAttribute("data-blueprint", "");
    } else {
      document.documentElement.removeAttribute("data-blueprint");
    }
  });

  function navigate(to: string) {
    history.pushState(null, "", to);
    path = normalizePath(to);
  }
</script>

{#if path === "/admin"}
  <Admin {navigate} />
{:else if path === "/blueprint"}
  <Blueprint />
{:else if path === "/workspace"}
  <Workspace />
{:else if path === "/files"}
  <Files />
{:else if path === "/context"}
  <AiContext {navigate} />
{:else if path === "/agents"}
  <Agents />
{:else if path === "/diagram"}
  <Diagram />
{:else if path === "/shape-editor"}
  <ShapeEditor />
{:else if path === "/survival-kit"}
  <SurvivalKit />
{:else if path === "/"}
  <Home />
{:else}
  <p style="padding:2rem">Route "{path}" — not yet migrated.</p>
{/if}
