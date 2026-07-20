import { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  saveAuthToStorage,
  loadAuthFromStorage,
  logout as clearStorage,
  getCurrentUser,
} from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true); 

  useEffect(() => {
    const hydrate = async () => {
      const stored = loadAuthFromStorage();

      if (!stored) {
        setLoading(false);
        return;
      }

      const { token, ...userProfile } = stored;
      setUser(userProfile);
      
      try {
        const fresh = await getCurrentUser();
        setUser((prev) => ({
          ...prev,
          ...fresh,
        }));
      } catch {
      } finally {
        setLoading(false);
      }
    };
    hydrate();
  }, []);

  const login = useCallback((data) => {
    if (!data?.token) {
      console.error("[AuthContext] login() called without a token");
      return;
    }
    saveAuthToStorage(data);
    const { token, message, ...userProfile } = data;
    setUser({
      ...userProfile,
      totalPoints: userProfile.totalPoints ?? 0,
    });
  }, []);

  const logout = useCallback(() => {
    clearStorage();   
    setUser(null);
  }, []);

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

  const updateUser = useCallback((partial) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...partial };
      localStorage.setItem("drivesafe_user", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const isAuthenticated = !!user?.userId;

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
    updatePoints,
    updateUser,
  };

  if (loading) {
    return <AppLoadingScreen />;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

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
