import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider }   from "./context/AuthContext";
import ProtectedRoute     from "./components/ProtectedRoute";
import Navbar             from "./components/Navbar";
import Home         from "./pages/Home";
import Login        from "./pages/Login";
import Register     from "./pages/Register";
import Dashboard    from "./pages/Dashboard";
import TripHistory  from "./pages/TripHistory";
import TripMap      from "./pages/TripMap";
import Insurance    from "./pages/Insurance";
import Rewards      from "./pages/Rewards";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <GlobalStyles />
        <Navbar />

        <Routes>
          <Route path="/"         element={<Home />}     />
          <Route path="/login"    element={<Login />}    />
          <Route path="/register" element={<Register />} />

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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

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

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1);    opacity: 1; }
      50%       { transform: scale(1.1); opacity: 0.8; }
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    ::-webkit-scrollbar       { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.35); }

    button:focus-visible {
      outline: 2px solid #63b3ed;
      outline-offset: 2px;
    }

    input:focus, select:focus, textarea:focus {
      outline: none;
    }

    body { overflow-x: hidden; }

    iframe { border: none; }
  `;

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
