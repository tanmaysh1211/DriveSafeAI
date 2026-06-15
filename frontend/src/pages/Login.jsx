import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { login as loginApi } from "../services/authService";

// ─────────────────────────────────────────────────────────────────────────────
// Login.jsx — POST /api/auth/login
//
// Matches the screenshot exactly:
//   - Purple/blue gradient background
//   - White rounded card centre-screen
//   - "DriveSafe Login" title in purple
//   - Email + Password fields
//   - Green "Sign In to DriveSafe" button
//   - "Don't have an account? Create one here →" link
// ─────────────────────────────────────────────────────────────────────────────

export default function Login() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const { login } = useAuth();
  const navigate  = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Basic client-side validation
    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    if (!password) {
      setError("Password is required");
      return;
    }

    setLoading(true);
    try {
      const data = await loginApi({ email: email.trim(), password });
      // Store token + user in AuthContext
      login(data);
      navigate("/dashboard");
    } catch (err) {
      setError(
        err?.response?.data?.message
          || err?.message
          || "Invalid email or password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.root}>
      {/* Minimal top-left navbar matching screenshot */}
      <nav style={styles.navbar}>
        <div style={styles.navLogo} onClick={() => navigate("/")}>
          <span style={styles.navLogoIcon}>🚗</span>
          <span style={styles.navLogoText}>DriveSafeAI</span>
        </div>
        <div style={styles.navRight}>
          <button style={styles.navLink} onClick={() => navigate("/")}>🏠 Home</button>
          <button style={styles.loginNavBtn} onClick={() => navigate("/login")}>Login</button>
          <button style={styles.registerNavBtn} onClick={() => navigate("/register")}>Register</button>
        </div>
      </nav>

      {/* Centred card */}
      <div style={styles.cardWrapper}>
        <div style={styles.card}>
          {/* Title */}
          <h1 style={styles.title}>DriveSafe Login</h1>

          {/* Error banner */}
          {error && (
            <div style={styles.errorBanner}>
              ⚠️ {error}
            </div>
          )}

          {/* Form */}
          <div style={styles.form}>
            {/* Email */}
            <div style={styles.field}>
              <label style={styles.label}>Email Address</label>
              <input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
                onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
                onBlur={(e)  => Object.assign(e.target.style, styles.input)}
                autoComplete="email"
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div style={styles.field}>
              <label style={styles.label}>Password</label>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
                onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
                onBlur={(e)  => Object.assign(e.target.style, styles.input)}
                autoComplete="current-password"
                disabled={loading}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit(e)}
              />
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              style={loading ? styles.submitBtnDisabled : styles.submitBtn}
              disabled={loading}
            >
              {loading ? "Signing in…" : "🚗 Sign In to DriveSafe"}
            </button>
          </div>

          {/* Register link */}
          <p style={styles.registerLink}>
            Don't have an account?{" "}
            <Link to="/register" style={styles.link}>
              Create one here →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES — white card on purple-to-pink gradient (screenshot match)
// ─────────────────────────────────────────────────────────────────────────────
const styles = {
  root: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #4a5568 0%, #553c9a 40%, #b83280 100%)",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    display: "flex",
    flexDirection: "column",
  },

  // Navbar
  navbar: {
    display: "flex",
    alignItems: "center",
    padding: "0 32px",
    height: 56,
    background: "rgba(20,20,40,0.8)",
    backdropFilter: "blur(12px)",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  },
  navLogo: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    cursor: "pointer",
  },
  navLogoIcon: { fontSize: 20 },
  navLogoText: {
    fontWeight: 700,
    fontSize: 17,
    color: "#63b3ed",
  },
  navRight: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginLeft: "auto",
  },
  navLink: {
    background: "none",
    border: "none",
    color: "#e2e8f0",
    fontSize: 14,
    cursor: "pointer",
    padding: "5px 12px",
    borderRadius: 6,
  },
  loginNavBtn: {
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.25)",
    color: "#fff",
    borderRadius: 8,
    padding: "5px 16px",
    fontSize: 14,
    cursor: "pointer",
    fontWeight: 500,
  },
  registerNavBtn: {
    background: "#38a169",
    border: "none",
    color: "#fff",
    borderRadius: 8,
    padding: "5px 16px",
    fontSize: 14,
    cursor: "pointer",
    fontWeight: 600,
  },

  // Card wrapper
  cardWrapper: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 16px",
  },

  // White card — matches screenshot
  card: {
    background: "#fff",
    borderRadius: 20,
    padding: "44px 48px",
    width: "100%",
    maxWidth: 460,
    boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
  },

  title: {
    color: "#553c9a",
    fontSize: 28,
    fontWeight: 800,
    textAlign: "center",
    margin: "0 0 28px",
    letterSpacing: "-0.5px",
  },

  errorBanner: {
    background: "#fff5f5",
    border: "1px solid #fed7d7",
    borderRadius: 8,
    padding: "10px 14px",
    color: "#c53030",
    fontSize: 14,
    marginBottom: 20,
  },

  form: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },

  field: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },

  label: {
    color: "#2d3748",
    fontSize: 14,
    fontWeight: 600,
  },

  input: {
    border: "1.5px solid #e2e8f0",
    borderRadius: 10,
    padding: "12px 16px",
    fontSize: 15,
    color: "#2d3748",
    outline: "none",
    transition: "border-color 0.15s, box-shadow 0.15s",
    background: "#fff",
    width: "100%",
    boxSizing: "border-box",
  },

  inputFocus: {
    border: "1.5px solid #48bb78",
    boxShadow: "0 0 0 3px rgba(72,187,120,0.15)",
    borderRadius: 10,
    padding: "12px 16px",
    fontSize: 15,
    color: "#2d3748",
    outline: "none",
    background: "#f0fff4",
    width: "100%",
    boxSizing: "border-box",
  },

  submitBtn: {
    background: "linear-gradient(135deg, #553c9a, #b83280)",
    border: "none",
    color: "#fff",
    borderRadius: 10,
    padding: "14px",
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
    width: "100%",
    marginTop: 4,
    boxShadow: "0 4px 15px rgba(85,60,154,0.35)",
    transition: "opacity 0.15s, transform 0.15s",
  },

  submitBtnDisabled: {
    background: "#a0aec0",
    border: "none",
    color: "#fff",
    borderRadius: 10,
    padding: "14px",
    fontSize: 16,
    fontWeight: 700,
    cursor: "not-allowed",
    width: "100%",
    marginTop: 4,
  },

  registerLink: {
    textAlign: "center",
    color: "#718096",
    fontSize: 14,
    marginTop: 24,
    marginBottom: 0,
  },

  link: {
    color: "#553c9a",
    textDecoration: "none",
    fontWeight: 600,
  },
};