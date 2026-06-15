import { defineConfig } from "vite";
import react            from "@vitejs/plugin-react";

// ─────────────────────────────────────────────────────────────────────────────
// vite.config.js — Vite build + dev server configuration
//
// Location: frontend/vite.config.js  (same level as package.json)
//
// Dev proxy explained:
//   In development the browser runs at :5173 and Spring Boot at :8080.
//   Without a proxy, every api.get("/dashboard/5") would be a cross-origin
//   request and hit the CORS policy.
//
//   The proxy rewrites requests transparently:
//     Browser → GET http://localhost:5173/api/dashboard/5
//     Vite    → GET http://localhost:8080/api/dashboard/5   (forwarded)
//
//   This means VITE_API_BASE_URL can just be "/api" in development
//   and the full "https://your-backend.com/api" in production.
//
//   Flask proxy works the same way for Folium map iframes:
//     <iframe src="/view-map/5_1234"> → forwarded to :5000/view-map/5_1234
// ─────────────────────────────────────────────────────────────────────────────

export default defineConfig({
  plugins: [react()],

  // ── Dev server ────────────────────────────────────────────────────
  server: {
    port: 5173,
    open: true,          // auto-open http://localhost:5173 on npm run dev
    strictPort: false,   // try next port if 5173 is taken

    proxy: {
      // ── Spring Boot API  :8080 ──────────────────────────────────
      "/api": {
        target:       "http://localhost:8080",
        changeOrigin: true,
        secure:       false,
        // Uncomment to debug proxy requests:
        // configure: (proxy) => {
        //   proxy.on("proxyReq", (_, req) => console.log("→", req.url));
        // },
      },

      // ── Flask ML service  :5000 — Folium map HTML iframes ───────
      "/view-map": {
        target:       "http://localhost:5000",
        changeOrigin: true,
        secure:       false,
      },
      "/view-heatmap": {
        target:       "http://localhost:5000",
        changeOrigin: true,
        secure:       false,
      },

      // ── Flask health + recommend endpoints (optional direct calls)
      "/health": {
        target:       "http://localhost:5000",
        changeOrigin: true,
        secure:       false,
      },
    },
  },

  // ── Production build ──────────────────────────────────────────────
  build: {
    outDir:    "dist",
    sourcemap: true,           // keep sourcemaps for debugging prod builds
    emptyOutDir: true,

    // Warn when any single chunk exceeds 600 KB
    chunkSizeWarningLimit: 600,

    rollupOptions: {
      output: {
        // Split vendor code into separate cacheable chunks.
        // Browsers cache these across deploys — only app code re-downloads.
        manualChunks: {
          "vendor-react":   ["react", "react-dom", "react-router-dom"],
          "vendor-axios":   ["axios"],
          "vendor-leaflet": ["leaflet", "react-leaflet"],
          "vendor-charts":  ["recharts"],
        },
      },
    },
  },

  // ── Path resolution ───────────────────────────────────────────────
  // Allows importing from project root with "@/components/Navbar"
  // instead of relative paths like "../../components/Navbar".
  // Uncomment if you prefer this style.
  //
  // resolve: {
  //   alias: {
  //     "@": path.resolve(__dirname, "./src"),
  //   },
  // },
});