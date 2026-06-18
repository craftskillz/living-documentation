<script lang="ts">
  let { title, subtitle, nav = [], children, actions }: {
    title: string;
    subtitle: string;
    nav?: { label: string; href: string }[];
    children?: import("svelte").Snippet;
    actions?: import("svelte").Snippet;
  } = $props();

  const currentPath = window.location.pathname;

  const allNav = $derived(
    [
      ...nav,
      { label: "Workspace", href: "/workspace" },
      { label: "Agents", href: "/agents" },
      { label: "Blueprint", href: "/blueprint" },
      { label: "Diagram", href: "/diagram" },
      { label: "Files", href: "/files" },
      { label: "Survival Kit", href: "/survival-kit" },
      { label: "AI Context", href: "/context" },
      { label: "Admin", href: "/admin" },
      { label: "Home", href: "/" },
    ].filter((link) => link.href !== currentPath)
  );
</script>

<header class="topbar">
  <div class="brand-lockup">
    <span class="brand-mark">LD</span>
    <div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  </div>

  {#if children}
    {@render children()}
  {/if}

  <div class="topbar-right">
    {#each allNav as link}
      <a href={link.href} class="ghost-button">{link.label}</a>
    {/each}
    {#if actions}{@render actions()}{/if}
  </div>
</header>
