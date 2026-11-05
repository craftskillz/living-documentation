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
      // Keeps the browser Host: the server compares it with the Origin header.
      "/api": { target: "http://localhost:4321", changeOrigin: false },
      "/mcp": { target: "http://localhost:4321", changeOrigin: false },
      "/images": { target: "http://localhost:4321", changeOrigin: false },
      "^/files/.+": { target: "http://localhost:4321", changeOrigin: false },
    },
  },
});
