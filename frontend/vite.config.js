import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
    open: true,          
    strictPort: false,   

    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      },

      "/view-map": {
        target:  "http://localhost:5000",
        changeOrigin: true,
        secure:       false,
      },
      "/view-heatmap": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
      },

      "/health": {
        target:       "http://localhost:5000",
        changeOrigin: true,
        secure:       false,
      },
    },
  },

  build: {
    outDir:    "dist",
    sourcemap: true,           
    emptyOutDir: true,
    chunkSizeWarningLimit: 600,

    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react":   ["react", "react-dom", "react-router-dom"],
          "vendor-axios":   ["axios"],
          "vendor-leaflet": ["leaflet", "react-leaflet"],
          "vendor-charts":  ["recharts"],
        },
      },
    },
  },
});
