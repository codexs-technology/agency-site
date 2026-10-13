import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: { "react-dom/server": "react-dom/server.browser" },
  },
  ssr: { target: "webworker", noExternal: true },
  build: {
    ssr: "src/worker/pages.ts",
    outDir: "dist/_worker.js",
    emptyOutDir: true,
    rollupOptions: { output: { entryFileNames: "index.js" } },
  },
});
