import axios from "axios";

// ─────────────────────────────────────────────────────────────────────────────
// api.js — Central Axios instance for DriveSafe AI
//
// All API calls in the app go through this one instance so that:
//   1. The base URL is configured in one place (.env VITE_API_BASE_URL)
//   2. Every request automatically carries the JWT Authorization header
//   3. 401 responses automatically redirect to /login (token expired)
//   4. Network errors surface with a clean message
//
// Usage anywhere in the app:
//   import api from "../services/api";
//   const res = await api.get("/dashboard/5");
//   const res = await api.post("/trips/upload", formData);
//
// The Spring Boot backend runs on :8080 in development.
// React Vite dev server runs on :5173 — CORS in SecurityConfig allows this.
// ─────────────────────────────────────────────────────────────────────────────

// ── Base URL ──────────────────────────────────────────────────────────────────
// Set VITE_API_BASE_URL=http://localhost:8080/api in frontend/.env
// Falls back to localhost:8080 if env var is missing (dev convenience)
const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api";

console.log("VITE_API_BASE_URL =", import.meta.env.VITE_API_BASE_URL);
console.log("BASE_URL =", BASE_URL);

// ── Create Axios instance ─────────────────────────────────────────────────────
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,             // 30s — covers OpenAI cold start on first /upload
  headers: {
    "Content-Type": "application/json",
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// REQUEST INTERCEPTOR
// Attaches the JWT Bearer token to every outgoing request.
//
// Token is stored in localStorage by AuthContext after login/register.
// Key: "drivesafe_token"
//
// Why localStorage and not a cookie?
//   - Simpler for a hackathon / portfolio project
//   - No CSRF concerns since we use Authorization header not cookie auth
//   - For production, httpOnly cookies are more secure — swap here if needed
// ─────────────────────────────────────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("drivesafe_token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }

    // For multipart/form-data (CSV upload), let Axios set Content-Type
    // automatically so the boundary is included correctly.
    // The caller sets { "Content-Type": "multipart/form-data" } explicitly,
    // which Axios respects — so we don't override it here.

    return config;
  },
  (error) => Promise.reject(error)
);

// ─────────────────────────────────────────────────────────────────────────────
// RESPONSE INTERCEPTOR
// Handles common error cases centrally so individual components
// only need to handle business-level errors.
//
//   401 Unauthorized  → token expired or invalid → clear storage → /login
//   403 Forbidden     → user tried to access another user's data → log warning
//   500+ Server error → surface message from Spring Boot error body
//   Network error     → "No response from server" message
// ─────────────────────────────────────────────────────────────────────────────
api.interceptors.response.use(
  // Success — pass through unchanged
  (response) => response,

  // Error
  (error) => {
    const status  = error.response?.status;
    const message = error.response?.data?.message;

    if (status === 401) {
      // Token expired or invalid — clean up and redirect to login
      // Don't redirect if already on /login or /register to avoid a loop
      const path = window.location.pathname;
      if (path !== "/login" && path !== "/register") {
        localStorage.removeItem("drivesafe_token");
        localStorage.removeItem("drivesafe_user");
        window.location.href = "/login";
      }
    }

    if (status === 403) {
      console.warn("[api] 403 Forbidden:", error.config?.url);
    }

    if (status >= 500) {
      console.error("[api] Server error:", status, message ?? error.message);
    }

    if (!error.response) {
      // Network error — Spring Boot not running or CORS issue
      console.error("[api] No response from server. Is Spring Boot running on :8080?");
      // Attach a helpful message so components can display it
      error.message = "Cannot reach the server. Please check your connection.";
    }

    return Promise.reject(error);
  }
);

export default api;