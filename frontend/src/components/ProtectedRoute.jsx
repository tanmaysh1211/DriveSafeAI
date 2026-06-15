import { Navigate, useLocation } from "react-router-dom";
import { useAuth }                from "../context/AuthContext";

// ─────────────────────────────────────────────────────────────────────────────
// ProtectedRoute.jsx — wraps any route that requires authentication
//
// Usage in App.jsx:
//   <Route path="/dashboard" element={
//     <ProtectedRoute><Dashboard /></ProtectedRoute>
//   } />
//
// Behaviour:
//   - If authenticated → render children
//   - If not          → redirect to /login, preserving intended destination
//                       (so after login, the user lands where they wanted)
// ─────────────────────────────────────────────────────────────────────────────

export default function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  const location             = useLocation();

  if (!isAuthenticated) {
    // Pass `from` state so Login.jsx can redirect back after sign-in
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  return children;
}