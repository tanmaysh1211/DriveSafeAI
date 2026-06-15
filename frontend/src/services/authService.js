import api from "./api";

// ─────────────────────────────────────────────────────────────────────────────
// authService.js — Authentication API calls
//
// Wraps POST /api/auth/login and POST /api/auth/register.
// Called by Login.jsx, Register.jsx, and AuthContext.jsx.
//
// Each function returns the raw response data (AuthResponse DTO from Java)
// so the caller can pass it directly to AuthContext.login(data).
//
// AuthResponse shape (from AuthController.java):
// {
//   token:         "eyJhbGci…",
//   userId:        5,
//   name:          "Nishant",
//   email:         "nishant12@example.com",
//   vehicleNumber: "KA01AB12345",
//   message:       "Login successful"
// }
// ─────────────────────────────────────────────────────────────────────────────


// ── Login ─────────────────────────────────────────────────────────────────────
/**
 * POST /api/auth/login
 *
 * @param {{ email: string, password: string }} credentials
 * @returns {Promise<AuthResponse>}
 * @throws  Axios error — caller handles and displays error.response.data.message
 */
export async function login({ email, password }) {
  const response = await api.post("/auth/login", { email, password });
  return response.data;
}


// ── Register ──────────────────────────────────────────────────────────────────
/**
 * POST /api/auth/register
 *
 * @param {{ name: string, email: string, password: string, vehicleNumber?: string }} payload
 * @returns {Promise<AuthResponse>}
 * @throws  Axios error with response.data.message on 409 (email taken) or 400 (validation)
 */
export async function register({ name, email, password, vehicleNumber }) {
  const response = await api.post("/auth/register", {
    name,
    email,
    password,
    vehicleNumber: vehicleNumber || undefined, // omit if empty string
  });
  return response.data;
}


// ── Get current user ──────────────────────────────────────────────────────────
/**
 * GET /api/auth/me
 * Fetches the currently authenticated user's profile from their JWT.
 * Used by AuthContext on page refresh to re-hydrate user state.
 *
 * @returns {Promise<AuthResponse>} (without token field)
 */
export async function getCurrentUser() {
  const response = await api.get("/auth/me");
  return response.data;
}


// ── Logout ────────────────────────────────────────────────────────────────────
/**
 * Client-side logout — removes JWT and user data from localStorage.
 *
 * DriveSafe AI uses stateless JWTs so there is no server-side session
 * to invalidate. Removing the token from the client is sufficient.
 *
 * If you later add a server-side token blocklist (for security),
 * add a POST /api/auth/logout call here before clearing localStorage.
 */
export function logout() {
  localStorage.removeItem("drivesafe_token");
  localStorage.removeItem("drivesafe_user");
}


// ── Storage helpers ───────────────────────────────────────────────────────────
// These are used by AuthContext to persist auth state across page refreshes.

/**
 * Save token and user data to localStorage after successful login/register.
 * @param {AuthResponse} data
 */
export function saveAuthToStorage(data) {
  if (data.token) {
    localStorage.setItem("drivesafe_token", data.token);
  }
  // Store everything except the raw token in the user object
  const { token, ...user } = data;
  localStorage.setItem("drivesafe_user", JSON.stringify(user));
}

/**
 * Load persisted user from localStorage (called on app init).
 * Returns null if nothing is stored or storage is corrupted.
 *
 * @returns {{ userId, name, email, vehicleNumber, totalPoints } | null}
 */
export function loadAuthFromStorage() {
  try {
    const token    = localStorage.getItem("drivesafe_token");
    const userJson = localStorage.getItem("drivesafe_user");
    if (!token || !userJson) return null;
    const user = JSON.parse(userJson);
    return { token, ...user };
  } catch {
    // Corrupted JSON in localStorage — clear and return null
    logout();
    return null;
  }
}

/**
 * Quick check whether a token is present in localStorage.
 * Does NOT validate the token signature — the backend does that.
 * Used by ProtectedRoute for a fast synchronous auth check.
 *
 * @returns {boolean}
 */
export function hasToken() {
  return !!localStorage.getItem("drivesafe_token");
}