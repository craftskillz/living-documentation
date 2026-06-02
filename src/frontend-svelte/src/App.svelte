<script lang="ts">
  import "../src/styles/app.css";
  import Admin from "./routes/Admin.svelte";
  import Blueprint from "./routes/Blueprint.svelte";

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
{:else}
  <p style="padding:2rem">Route "{path}" — not yet migrated.</p>
{/if}
