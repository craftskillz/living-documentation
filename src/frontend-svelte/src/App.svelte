<script lang="ts">
  import "../src/styles/app.css";
  import Admin from "./routes/Admin.svelte";
  import Blueprint from "./routes/Blueprint.svelte";
  import Workspace from "./routes/Workspace.svelte";
  import Files from "./routes/Files.svelte";

  let path = $state(window.location.pathname);

  window.addEventListener("popstate", () => {
    path = window.location.pathname;
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
    path = to;
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
{:else}
  <p style="padding:2rem">Route "{path}" — not yet migrated.</p>
{/if}
