import { StrictMode } from "react";
import { createRoot }  from "react-dom/client";
import App             from "./App";

// ─────────────────────────────────────────────────────────────────────────────
// main.jsx — Vite entry point
//
// Mounts the React app into <div id="root"> in index.html.
// StrictMode enables extra React warnings in development only —
// it causes effects to fire twice in dev, which is intentional behaviour.
// ─────────────────────────────────────────────────────────────────────────────

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);