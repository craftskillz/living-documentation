import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
  plugins: [svelte()],
  root: "src/frontend-svelte",
  build: {
    outDir: "../../dist/frontend-svelte",
    emptyOutDir: true,
  },
  server: {
    port: 5174,
    proxy: {
      "/api": "http://localhost:4321",
      "/i18n": "http://localhost:4321",
      "/images": "http://localhost:4321",
      "^/$": { target: "http://localhost:4321", changeOrigin: true },
    },
  },
});
