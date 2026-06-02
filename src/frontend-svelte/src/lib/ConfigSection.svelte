<script lang="ts">
  let { icon, title, description, children }: {
    icon: string;
    title: string;
    description: string;
    children: import("svelte").Snippet;
  } = $props();
</script>

<section class="config-section">
  <header class="config-section-header">
    <h3 class="config-section-title">
      <span aria-hidden="true">{icon}</span>
      {title}
    </h3>
    <p class="config-section-desc">{description}</p>
  </header>
  <div class="config-section-body">
    {@render children()}
  </div>
</section>
