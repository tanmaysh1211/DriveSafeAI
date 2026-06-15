import { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  saveAuthToStorage,
  loadAuthFromStorage,
  logout as clearStorage,
  getCurrentUser,
} from "../services/authService";

// ─────────────────────────────────────────────────────────────────────────────
// AuthContext.jsx — Global authentication state for DriveSafe AI
//
// Provides to all components:
//   user            — { userId, name, email, vehicleNumber, totalPoints }
//   isAuthenticated — boolean
//   login(data)     — called after POST /api/auth/login or /register succeeds
//   logout()        — clears state + storage + navigates to /login
//   updatePoints(n) — called by Rewards.jsx after redemption to update pill
//   updateUser(obj) — merge new fields into user (e.g. after profile edit)
//   loading         — true while checking localStorage on initial load
//
// Auth flow:
//   1. App boots → AuthContext reads localStorage → sets user if token found
//   2. Login.jsx calls login(AuthResponse) → AuthContext saves to state+storage
//   3. Every api.js request attaches the token from localStorage automatically
//   4. 401 from backend → api.js interceptor → logout() → /login
//   5. Rewards.jsx redeems → calls updatePoints(remainingPoints) → navbar updates
// ─────────────────────────────────────────────────────────────────────────────

// ── Create context ────────────────────────────────────────────────────────────
const AuthContext = createContext(null);


// ─────────────────────────────────────────────────────────────────────────────
// PROVIDER
// ─────────────────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {

  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true); // true during initial hydration

  // ── On mount: rehydrate from localStorage ────────────────────────
  // This runs once when the app first loads and ensures the user stays
  // logged in across page refreshes without hitting the backend.
  useEffect(() => {
    const hydrate = async () => {
      const stored = loadAuthFromStorage();

      if (!stored) {
        setLoading(false);
        return;
      }

      // Restore user from localStorage immediately (fast — no network wait)
      const { token, ...userProfile } = stored;
      setUser(userProfile);

      // Optionally refresh user profile from backend in background
      // This keeps name/points fresh if they changed in another tab
      try {
        const fresh = await getCurrentUser();
        setUser((prev) => ({
          ...prev,
          ...fresh,
          // Preserve token in the user object shape used elsewhere
        }));
      } catch {
        // Backend unreachable or token expired — keep localStorage version
        // The api.js interceptor will handle the 401 if the user tries an action
      } finally {
        setLoading(false);
      }
    };

    hydrate();
  }, []);


  // ── login(data) ───────────────────────────────────────────────────
  // Called by Login.jsx and Register.jsx after a successful API response.
  //
  // data = AuthResponse from Spring Boot:
  //   { token, userId, name, email, vehicleNumber, message }
  const login = useCallback((data) => {
    if (!data?.token) {
      console.error("[AuthContext] login() called without a token");
      return;
    }

    // Persist to localStorage (token + user profile separately)
    saveAuthToStorage(data);

    // Set user state — spread everything except the token
    const { token, message, ...userProfile } = data;
    setUser({
      ...userProfile,
      totalPoints: userProfile.totalPoints ?? 0,
    });
  }, []);


  // ── logout() ──────────────────────────────────────────────────────
  // Clears state and localStorage. Navigation to /login is done by
  // the caller (Navbar.jsx) so AuthContext has no router dependency.
  const logout = useCallback(() => {
    clearStorage();   // removes drivesafe_token + drivesafe_user
    setUser(null);
  }, []);


  // ── updatePoints(newPoints) ───────────────────────────────────────
  // Called by Rewards.jsx after a successful redemption so the navbar
  // points pill updates in real time without a full page reload.
  //
  // Also persists the updated total to localStorage so it survives refresh.
  const updatePoints = useCallback((newPoints) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, totalPoints: newPoints };
      // Keep localStorage in sync
      localStorage.setItem(
        "drivesafe_user",
        JSON.stringify(updated)
      );
      return updated;
    });
  }, []);


  // ── updateUser(partialUpdate) ─────────────────────────────────────
  // Merge any fields into the user object.
  // Used for profile edits, points increments after trip upload, etc.
  //
  // Example:
  //   updateUser({ totalPoints: user.totalPoints + 50 });
  //   updateUser({ vehicleNumber: "MH12AB3456" });
  const updateUser = useCallback((partial) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...partial };
      localStorage.setItem("drivesafe_user", JSON.stringify(updated));
      return updated;
    });
  }, []);


  // ── isAuthenticated ───────────────────────────────────────────────
  // Derived from user state — true when user is set AND has a userId.
  // ProtectedRoute uses this for synchronous access guard.
  const isAuthenticated = !!user?.userId;


  // ── Context value ─────────────────────────────────────────────────
  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
    updatePoints,
    updateUser,
  };

  // Show nothing (or a spinner) while checking localStorage on first load.
  // This prevents a flash where ProtectedRoute redirects before hydration
  // finishes and the user appears logged out.
  if (loading) {
    return <AppLoadingScreen />;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// HOOK — useAuth()
//
// Use this in every component that needs auth state:
//   const { user, isAuthenticated, login, logout, updatePoints } = useAuth();
//
// Throws if called outside <AuthProvider> so bugs surface immediately.
// ─────────────────────────────────────────────────────────────────────────────
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error(
      "useAuth() must be used inside <AuthProvider>. " +
      "Wrap your app in <AuthProvider> in main.jsx."
    );
  }
  return context;
}


// ─────────────────────────────────────────────────────────────────────────────
// APP LOADING SCREEN
// Shown for ~100ms while localStorage is being read on first paint.
// Keeps the gradient background consistent so there's no flash of white.
// ─────────────────────────────────────────────────────────────────────────────
function AppLoadingScreen() {
  return (
    <div style={loadStyles.root}>
      <div style={loadStyles.inner}>
        <span style={loadStyles.logo}>🚗</span>
        <p style={loadStyles.text}>DriveSafe AI</p>
        <div style={loadStyles.spinner} />
      </div>
    </div>
  );
}

const loadStyles = {
  root: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #4a5568 0%, #553c9a 40%, #b83280 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  inner: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
  },
  logo: {
    fontSize: 52,
    animation: "pulse 1.5s ease-in-out infinite",
  },
  text: {
    color: "#fff",
    fontSize: 22,
    fontWeight: 800,
    margin: 0,
    letterSpacing: "-0.5px",
  },
  spinner: {
    width: 32,
    height: 32,
    border: "3px solid rgba(255,255,255,0.2)",
    borderTopColor: "#fff",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
    marginTop: 8,
  },
};