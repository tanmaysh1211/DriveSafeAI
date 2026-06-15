import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider }   from "./context/AuthContext";
import ProtectedRoute     from "./components/ProtectedRoute";
import Navbar             from "./components/Navbar";

// Pages
import Home         from "./pages/Home";
import Login        from "./pages/Login";
import Register     from "./pages/Register";
import Dashboard    from "./pages/Dashboard";
import TripHistory  from "./pages/TripHistory";
import TripMap      from "./pages/TripMap";
import Insurance    from "./pages/Insurance";
import Rewards      from "./pages/Rewards";

// ─────────────────────────────────────────────────────────────────────────────
// App.jsx — Root component
//
// Layout:
//   <AuthProvider>         — global auth state (user, login, logout, points)
//     <BrowserRouter>      — client-side routing
//       <Navbar />         — sticky top nav (hides itself on /login, /register)
//       <Routes>           — route definitions
//
// Route protection:
//   Public  : /, /login, /register
//   Private : /dashboard, /trips, /trips/:tripId/map, /insurance, /rewards
//             all wrapped in <ProtectedRoute> → redirect to /login if no JWT
//
// Scroll reset:
//   Each page handles its own scroll — no global scroll-to-top needed since
//   all pages start at their own top position.
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        {/* Global CSS reset + keyframes */}
        <GlobalStyles />

        {/* Sticky navbar — renders on all pages except /login and /register */}
        <Navbar />

        <Routes>
          {/* ── Public routes ──────────────────────────────────── */}
          <Route path="/"         element={<Home />}     />
          <Route path="/login"    element={<Login />}    />
          <Route path="/register" element={<Register />} />

          {/* ── Protected routes ───────────────────────────────── */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/trips"
            element={
              <ProtectedRoute>
                <TripHistory />
              </ProtectedRoute>
            }
          />

          <Route
            path="/trips/:tripId/map"
            element={
              <ProtectedRoute>
                <TripMap />
              </ProtectedRoute>
            }
          />

          <Route
            path="/insurance"
            element={
              <ProtectedRoute>
                <Insurance />
              </ProtectedRoute>
            }
          />

          <Route
            path="/rewards"
            element={
              <ProtectedRoute>
                <Rewards />
              </ProtectedRoute>
            }
          />

          {/* ── Catch-all — redirect unknown URLs to home ───────── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GLOBAL STYLES — injected once at root
// Sets box-sizing, removes default margins, defines spin + pulse keyframes
// used by spinners and the loading screen.
// ─────────────────────────────────────────────────────────────────────────────
function GlobalStyles() {
  const css = `
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html, body, #root {
      height: 100%;
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    /* Spinner used by every loading state */
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Pulse used by the DriveSafe AI loading screen car emoji */
    @keyframes pulse {
      0%, 100% { transform: scale(1);    opacity: 1; }
      50%       { transform: scale(1.1); opacity: 0.8; }
    }

    /* Smooth page transitions */
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* Custom scrollbar — matches dark theme */
    ::-webkit-scrollbar       { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.35); }

    /* Remove default button focus outline — we add our own */
    button:focus-visible {
      outline: 2px solid #63b3ed;
      outline-offset: 2px;
    }

    /* Remove default input focus ring */
    input:focus, select:focus, textarea:focus {
      outline: none;
    }

    /* Prevent horizontal overflow on mobile */
    body { overflow-x: hidden; }

    /* Make iframes border-less by default */
    iframe { border: none; }
  `;

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}