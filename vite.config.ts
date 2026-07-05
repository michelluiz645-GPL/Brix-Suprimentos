import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: ".",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          icons: ["lucide-react"],
        },
      },
    },
  },
  server: {
    port: 5173,
    // Bind mount Windows (via WSL2) → container: eventos de inotify não
    // chegam de forma confiável, então o Vite precisa checar por polling
    // para detectar edições de arquivo (sem isso, ele serve versões
    // desatualizadas do bundle até o container ser reiniciado).
    watch: {
      usePolling: true,
      interval: 300,
    },
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
