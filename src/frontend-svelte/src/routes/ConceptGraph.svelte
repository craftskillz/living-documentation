<script lang="ts">
  import { onMount } from "svelte";
  import Topbar from "../lib/Topbar.svelte";
  import { t, loadI18n } from "../lib/i18n.svelte";

  interface GNode { id: string; title: string; type: string; folder: string | null; }
  interface GEdge { from: string; to: string; }

  // Type → colour. Falls back to a neutral for unrecognised (e.g. imported) types.
  const TYPE_COLORS: Record<string, string> = {
    ADR: "#3b82f6",
    Worklog: "#22c55e",
    Rule: "#f97316",
    "Technical Doc": "#a855f7",
    Document: "#64748b",
    Concept: "#14b8a6",
  };
  const FALLBACK_COLOR = "#94a3b8";

  let container: HTMLDivElement;
  let loading = $state(true);
  let error = $state("");
  let counts = $state({ nodes: 0, edges: 0 });
  let legend = $state<{ type: string; color: string }[]>([]);

  function colorFor(type: string): string {
    return TYPE_COLORS[type] ?? FALLBACK_COLOR;
  }

  onMount(() => {
    // biome-ignore lint/suspicious/noExplicitAny: vis-network is a UMD global
    let network: any;
    (async () => {
      let lang = "en";
      try {
        const cfg = await fetch("/api/config").then((r) => r.json());
        lang = cfg.language || "en";
      } catch { /* fall back to English */ }
      await loadI18n(lang);

      try {
        const res = await fetch("/api/graph");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const g: { nodes: GNode[]; edges: GEdge[] } = await res.json();
        counts = { nodes: g.nodes.length, edges: g.edges.length };

        const usedTypes = [...new Set(g.nodes.map((n) => n.type))].sort();
        legend = usedTypes.map((type) => ({ type, color: colorFor(type) }));

        // biome-ignore lint/suspicious/noExplicitAny: vis-network is a UMD global
        const vis = (window as any).vis;
        if (!vis) throw new Error(t("graph.renderer_error"));

        const nodes = new vis.DataSet(
          g.nodes.map((n) => ({
            id: n.id,
            label: n.title,
            title: n.folder ? `${n.folder} · ${n.type}` : n.type,
            color: { background: colorFor(n.type), border: "rgba(100,116,139,0.9)" },
            shape: "dot",
            size: 12,
          })),
        );
        const edges = new vis.DataSet(
          g.edges.map((e, i) => ({ id: i, from: e.from, to: e.to })),
        );

        const textColor = getComputedStyle(document.body).color || "#334155";
        network = new vis.Network(
          container,
          { nodes, edges },
          {
            nodes: { font: { color: textColor, size: 13, face: "inherit" }, borderWidth: 1.5 },
            edges: {
              arrows: { to: { enabled: true, scaleFactor: 0.5 } },
              color: { color: "rgba(148,163,184,0.55)", highlight: "#3b82f6" },
              smooth: { enabled: true, type: "continuous", roundness: 0.4 },
              width: 1,
            },
            physics: {
              solver: "forceAtlas2Based",
              forceAtlas2Based: { gravitationalConstant: -45, springLength: 120, avoidOverlap: 0.6 },
              stabilization: { iterations: 250 },
            },
            interaction: { hover: true, tooltipDelay: 150, navigationButtons: false },
          },
        );

        // Clicking a node opens the concept in the Home viewer.
        network.on("click", (params: { nodes: string[] }) => {
          if (params.nodes && params.nodes.length > 0) {
            window.location.href = "/?doc=" + encodeURIComponent(params.nodes[0]);
          }
        });
      } catch (e) {
        error = (e as Error).message;
      } finally {
        loading = false;
      }
    })();

    return () => network?.destroy?.();
  });
</script>

<div class="graph-page">
  <Topbar title={t("graph.title") || "Concept graph"} subtitle="" />

  <div class="graph-toolbar">
    <span class="graph-counts">{counts.nodes} · {counts.edges}</span>
    <div class="graph-legend">
      {#each legend as item (item.type)}
        <span class="legend-item">
          <span class="legend-dot" style="background:{item.color}"></span>{item.type}
        </span>
      {/each}
    </div>
  </div>

  <div class="graph-canvas-wrap">
    {#if loading}
      <p class="graph-msg">{t("graph.loading") || "Loading graph…"}</p>
    {:else if error}
      <p class="graph-msg graph-error">{error}</p>
    {:else if counts.nodes === 0}
      <p class="graph-msg">{t("graph.empty") || "No concepts to graph yet."}</p>
    {/if}
    <div class="graph-canvas" bind:this={container}></div>
  </div>
</div>

<style>
  .graph-page {
    display: flex;
    flex-direction: column;
    height: 100vh;
    min-height: 0;
  }
  .graph-toolbar {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.5rem 1rem;
    border-bottom: 1px solid rgba(148, 163, 184, 0.25);
    flex-wrap: wrap;
  }
  .graph-counts {
    font-size: 0.8rem;
    opacity: 0.7;
    font-variant-numeric: tabular-nums;
  }
  .graph-legend {
    display: flex;
    gap: 0.85rem;
    flex-wrap: wrap;
  }
  .legend-item {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.78rem;
    opacity: 0.85;
  }
  .legend-dot {
    width: 0.7rem;
    height: 0.7rem;
    border-radius: 50%;
    display: inline-block;
  }
  .graph-canvas-wrap {
    position: relative;
    flex: 1;
    min-height: 0;
  }
  .graph-canvas {
    position: absolute;
    inset: 0;
  }
  .graph-msg {
    position: absolute;
    top: 1rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 2;
    font-size: 0.9rem;
    opacity: 0.75;
  }
  .graph-error {
    color: #ef4444;
  }
</style>
