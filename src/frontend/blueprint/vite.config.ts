import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
  plugins: [svelte()],
  root: "src/frontend/blueprint",
  build: {
    outDir: "../../../dist/frontend/blueprint",
    emptyOutDir: true,
  },
  server: {
    port: 5174,
    proxy: {
      "/api": "http://localhost:4321",
      "/images": "http://localhost:4321",
      "/workspace": "http://localhost:4321",
      "^/$": { target: "http://localhost:4321", changeOrigin: true },
    },
  },
});
