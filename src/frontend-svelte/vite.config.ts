import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
  plugins: [
    svelte({
      // Silence accessibility advisories — many are intentional patterns
      // (modal backdrops clickable to close, decorative labels…).
      onwarn(warning, handler) {
        if (warning.code?.startsWith("a11y")) return;
        handler?.(warning);
      },
    }),
  ],
  root: "src/frontend-svelte",
  build: {
    outDir: "../../dist/frontend-svelte",
    emptyOutDir: true,
  },
  server: {
    port: 5174,
    proxy: {
      // Keeps the browser Host: /api/other-files compares it with the Origin header.
      "/api": { target: "http://localhost:4321", changeOrigin: false },
      "/mcp": "http://localhost:4321",
      "/images": "http://localhost:4321",
      "^/files/.+": { target: "http://localhost:4321", changeOrigin: true },
    },
  },
});
