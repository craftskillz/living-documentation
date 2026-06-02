<script lang="ts">
  let { nodePalette = $bindable(), edgePalette = $bindable() }: {
    nodePalette: string[];
    edgePalette: string[];
  } = $props();

  const NODE_COLORS: Record<string, { bg: string; border: string; label: string }> = {
    "c-white":  { bg: "#ffffff", border: "#dbd5d1", label: "White" },
    "c-gray":   { bg: "#f5f5f4", border: "#a8a29e", label: "Gray" },
    "c-slate":  { bg: "#f1f5f9", border: "#64748b", label: "Slate" },
    "c-blue":   { bg: "#dbeafe", border: "#3b82f6", label: "Blue" },
    "c-sky":    { bg: "#e0f2fe", border: "#0ea5e9", label: "Sky" },
    "c-cyan":   { bg: "#cffafe", border: "#06b6d4", label: "Cyan" },
    "c-teal":   { bg: "#ccfbf1", border: "#14b8a6", label: "Teal" },
    "c-green":  { bg: "#dcfce7", border: "#22c55e", label: "Green" },
    "c-lime":   { bg: "#ecfccb", border: "#84cc16", label: "Lime" },
    "c-amber":  { bg: "#fef9c3", border: "#f59e0b", label: "Amber" },
    "c-orange": { bg: "#ffedd5", border: "#f97316", label: "Orange" },
    "c-red":    { bg: "#fee2e2", border: "#ef4444", label: "Red" },
    "c-rose":   { bg: "#ffe4e6", border: "#f43f5e", label: "Rose" },
    "c-pink":   { bg: "#fce7f3", border: "#ec4899", label: "Pink" },
    "c-purple": { bg: "#ede9fe", border: "#8b5cf6", label: "Purple" },
  };

  const NODE_L_RATIOS: Record<string, number> = {
    "c-gray": 0.667, "c-slate": 0.488, "c-blue": 0.645, "c-sky": 0.518,
    "c-cyan": 0.473, "c-teal": 0.448, "c-green": 0.489, "c-lime": 0.496,
    "c-amber": 0.57, "c-orange": 0.578, "c-red": 0.64, "c-rose": 0.636,
    "c-pink": 0.638, "c-purple": 0.694,
  };

  const NODE_KEYS = Object.keys(NODE_COLORS);
  const DEFAULT_EDGE_PALETTE = ["#ffffff","#a8a29e","#374151","#3b82f6","#14b8a6","#22c55e","#f97316","#ef4444","#a855f7"];

  let newEdgeColor = $state("#3b82f6");

  function deriveNodeColors(bgHex: string, lRatio = 0.6) {
    const r = parseInt(bgHex.slice(1,3),16)/255, g = parseInt(bgHex.slice(3,5),16)/255, b = parseInt(bgHex.slice(5,7),16)/255;
    const max = Math.max(r,g,b), min = Math.min(r,g,b);
    const l = (max+min)/2, d = max-min;
    let h=0, s=0;
    if (d>0) {
      s = l>0.5 ? d/(2-max-min) : d/(max+min);
      if (max===r) h=((g-b)/d+(g<b?6:0))/6;
      else if (max===g) h=((b-r)/d+2)/6;
      else h=((r-g)/d+4)/6;
    }
    function hslToHex(hh:number,ss:number,ll:number) {
      let rr,gg,bb;
      if (ss===0) { rr=gg=bb=ll; } else {
        const hue2rgb=(p:number,q:number,t:number)=>{if(t<0)t+=1;if(t>1)t-=1;if(t<1/6)return p+(q-p)*6*t;if(t<1/2)return q;if(t<2/3)return p+(q-p)*(2/3-t)*6;return p;};
        const q=ll<0.5?ll*(1+ss):ll+ss-ll*ss, p=2*ll-q;
        rr=hue2rgb(p,q,hh+1/3); gg=hue2rgb(p,q,hh); bb=hue2rgb(p,q,hh-1/3);
      }
      return "#"+[rr,gg,bb].map(v=>Math.max(0,Math.min(255,Math.round(v*255))).toString(16).padStart(2,"0")).join("");
    }
    return { bg: bgHex, border: hslToHex(h,s,l*lRatio) };
  }

  function swatchBorder(key: string, bg: string) {
    const def = NODE_COLORS[key];
    return bg === def.bg ? def.border : deriveNodeColors(bg, NODE_L_RATIOS[key] || 0.6).border;
  }

  function resetNodePalette() {
    nodePalette = NODE_KEYS.map(k => NODE_COLORS[k].bg);
  }

  function resetEdgePalette() {
    edgePalette = [...DEFAULT_EDGE_PALETTE];
  }

  function addEdgeColor() {
    const hex = newEdgeColor.toLowerCase();
    if (!edgePalette.includes(hex)) edgePalette = [...edgePalette, hex];
  }

  function removeEdgeColor(i: number) {
    if (edgePalette.length <= 1) return;
    edgePalette = edgePalette.filter((_, idx) => idx !== i);
  }
</script>

<div class="palette-group">
  <div class="palette-header">
    <span class="field-label">Shape colors</span>
    <button type="button" class="link-btn" onclick={resetNodePalette}>Reset</button>
  </div>
  <p class="field-hint">Click a color to change it.</p>
  <div class="swatches">
    {#each NODE_KEYS as key, i}
      {@const bg = nodePalette[i] || NODE_COLORS[key].bg}
      {@const border = swatchBorder(key, bg)}
      <div class="swatch-wrap" title={NODE_COLORS[key].label}>
        <div class="swatch" style="background:{bg};border-color:{border}"></div>
        <input
          type="color"
          value={bg}
          class="swatch-input"
          oninput={(e) => { nodePalette[i] = (e.target as HTMLInputElement).value.toLowerCase(); }}
        />
      </div>
    {/each}
  </div>
</div>

<div class="palette-group" style="margin-top:1.5rem">
  <div class="palette-header">
    <span class="field-label">Arrow colors</span>
    <button type="button" class="link-btn" onclick={resetEdgePalette}>Reset</button>
  </div>
  <p class="field-hint">Click ✕ to remove a color.</p>
  <div class="swatches" style="align-items:flex-end">
    {#each edgePalette as hex, i}
      <div class="edge-swatch-wrap">
        <div class="edge-swatch" style="background:{hex}"></div>
        <button type="button" class="remove-swatch-btn" onclick={() => removeEdgeColor(i)}>✕</button>
      </div>
    {/each}
  </div>
  <div class="add-color-row">
    <input type="color" bind:value={newEdgeColor} class="color-input" />
    <button type="button" class="btn-primary btn-sm" onclick={addEdgeColor}>Add color</button>
  </div>
</div>
