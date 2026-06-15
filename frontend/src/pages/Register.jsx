import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { register as registerApi } from "../services/authService";

// ─────────────────────────────────────────────────────────────────────────────
// Register.jsx — POST /api/auth/register
//
// Fields:
//   - Full Name
//   - Email Address
//   - Password  (min 6 chars, with strength indicator)
//   - Vehicle Number  (Indian format KA01AB1234 — optional)
//
// Same visual style as Login.jsx: white card on purple gradient.
// ─────────────────────────────────────────────────────────────────────────────

export default function Register() {
  const [form,    setForm]    = useState({
    name: "", email: "", password: "", vehicleNumber: "",
  });
  const [errors,  setErrors]  = useState({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate  = useNavigate();

  // ── Field update ────────────────────────────────────────────────────
  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    // Clear field error on change
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  // ── Client validation ───────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.name.trim() || form.name.trim().length < 2)
      e.name = "Name must be at least 2 characters";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Enter a valid email address";
    if (!form.password || form.password.length < 6)
      e.password = "Password must be at least 6 characters";
    if (form.vehicleNumber && !/^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$/.test(form.vehicleNumber.toUpperCase()))
      e.vehicleNumber = "Format: KA01AB1234 (2 letters + 2 digits + 1-2 letters + 4 digits)";
    return e;
  };

  // ── Submit ──────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError("");

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name:          form.name.trim(),
        email:         form.email.trim().toLowerCase(),
        password:      form.password,
        vehicleNumber: form.vehicleNumber.toUpperCase() || undefined,
      };
      const data = await registerApi(payload);
      login(data);
      navigate("/dashboard");
    } catch (err) {
      setApiError(
        err?.response?.data?.message
          || err?.message
          || "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Password strength ───────────────────────────────────────────────
  const strength = passwordStrength(form.password);

  return (
    <div style={styles.root}>
      {/* Navbar */}
      <nav style={styles.navbar}>
        <div style={styles.navLogo} onClick={() => navigate("/")}>
          <span>🚗</span>
          <span style={styles.navLogoText}>DriveSafeAI</span>
        </div>
        <div style={styles.navRight}>
          <button style={styles.navLink} onClick={() => navigate("/")}>🏠 Home</button>
          <button style={styles.loginBtn} onClick={() => navigate("/login")}>Login</button>
          <button style={styles.registerBtn}>Register</button>
        </div>
      </nav>

      {/* Card */}
      <div style={styles.cardWrapper}>
        <div style={styles.card}>
          <h1 style={styles.title}>Create your account</h1>
          <p style={styles.subtitle}>
            Join DriveSafe AI and start earning rewards for safe driving.
          </p>

          {/* API error */}
          {apiError && (
            <div style={styles.errorBanner}>⚠️ {apiError}</div>
          )}

          <div style={styles.form}>
            {/* Name */}
            <Field
              label="Full Name"
              placeholder="Nishant Dahiya"
              value={form.name}
              onChange={handleChange("name")}
              error={errors.name}
              disabled={loading}
              autoComplete="name"
            />

            {/* Email */}
            <Field
              label="Email Address"
              type="email"
              placeholder="nishant@example.com"
              value={form.email}
              onChange={handleChange("email")}
              error={errors.email}
              disabled={loading}
              autoComplete="email"
            />

            {/* Password */}
            <div style={styles.fieldWrap}>
              <Field
                label="Password"
                type="password"
                placeholder="At least 6 characters"
                value={form.password}
                onChange={handleChange("password")}
                error={errors.password}
                disabled={loading}
                autoComplete="new-password"
              />
              {/* Strength indicator */}
              {form.password.length > 0 && (
                <div style={styles.strengthWrap}>
                  <div style={styles.strengthBar}>
                    <div
                      style={{
                        ...styles.strengthFill,
                        width: `${strength.pct}%`,
                        background: strength.color,
                      }}
                    />
                  </div>
                  <span style={{ ...styles.strengthLabel, color: strength.color }}>
                    {strength.label}
                  </span>
                </div>
              )}
            </div>

            {/* Vehicle Number */}
            <div style={styles.fieldWrap}>
              <Field
                label="Vehicle Number (optional)"
                placeholder="KA01AB1234"
                value={form.vehicleNumber}
                onChange={(e) => {
                  // Auto-uppercase as user types
                  handleChange("vehicleNumber")({
                    target: { value: e.target.value.toUpperCase() },
                  });
                }}
                error={errors.vehicleNumber}
                disabled={loading}
              />
              <p style={styles.hint}>
                🇮🇳 Indian registration format — e.g. KA01AB1234, DL3CAF0001
              </p>
            </div>

            {/* Terms note */}
            <p style={styles.terms}>
              By creating an account you agree to our{" "}
              <span style={styles.termsLink}>Terms of Service</span> and{" "}
              <span style={styles.termsLink}>Privacy Policy</span>.
            </p>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              style={loading ? styles.submitBtnDisabled : styles.submitBtn}
              disabled={loading}
            >
              {loading ? "Creating account…" : "🚗 Create DriveSafe Account"}
            </button>
          </div>

          <p style={styles.loginLink}>
            Already have an account?{" "}
            <Link to="/login" style={styles.link}>Sign in →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REUSABLE FIELD
// ─────────────────────────────────────────────────────────────────────────────
function Field({ label, type = "text", placeholder, value, onChange,
                 error, disabled, autoComplete }) {
  const [focused, setFocused] = useState(false);

  return (
    <div style={fieldStyles.wrap}>
      <label style={fieldStyles.label}>{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        autoComplete={autoComplete}
        style={{
          ...fieldStyles.input,
          ...(focused ? fieldStyles.focused : {}),
          ...(error  ? fieldStyles.error  : {}),
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {error && <span style={fieldStyles.errorMsg}>⚠ {error}</span>}
    </div>
  );
}

const fieldStyles = {
  wrap:  { display: "flex", flexDirection: "column", gap: 6 },
  label: { color: "#2d3748", fontSize: 14, fontWeight: 600 },
  input: {
    border: "1.5px solid #e2e8f0",
    borderRadius: 10,
    padding: "12px 16px",
    fontSize: 15,
    color: "#2d3748",
    outline: "none",
    background: "#fff",
    width: "100%",
    boxSizing: "border-box",
    transition: "border-color 0.15s, box-shadow 0.15s",
  },
  focused: {
    border: "1.5px solid #48bb78",
    boxShadow: "0 0 0 3px rgba(72,187,120,0.15)",
    background: "#f0fff4",
  },
  error: {
    border: "1.5px solid #fc8181",
    background: "#fff5f5",
  },
  errorMsg: { color: "#e53e3e", fontSize: 12 },
};

// ─────────────────────────────────────────────────────────────────────────────
// PASSWORD STRENGTH
// ─────────────────────────────────────────────────────────────────────────────
function passwordStrength(pwd) {
  if (!pwd)          return { pct: 0,   label: "",        color: "#e2e8f0" };
  if (pwd.length < 6) return { pct: 25,  label: "Weak",    color: "#fc8181" };

  let score = 0;
  if (pwd.length >= 8)         score++;
  if (/[A-Z]/.test(pwd))       score++;
  if (/[0-9]/.test(pwd))       score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;

  if (score <= 1) return { pct: 40,  label: "Fair",      color: "#f6ad55" };
  if (score === 2) return { pct: 65,  label: "Good",      color: "#68d391" };
  if (score === 3) return { pct: 85,  label: "Strong",    color: "#48bb78" };
  return              { pct: 100, label: "Very strong", color: "#38a169" };
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = {
  root: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #4a5568 0%, #553c9a 40%, #b83280 100%)",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    display: "flex",
    flexDirection: "column",
  },
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
    fontSize: 20,
  },
  navLogoText: { fontWeight: 700, fontSize: 17, color: "#63b3ed" },
  navRight: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginLeft: "auto",
  },
  navLink: {
    background: "none", border: "none",
    color: "#e2e8f0", fontSize: 14,
    cursor: "pointer", padding: "5px 12px", borderRadius: 6,
  },
  loginBtn: {
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.25)",
    color: "#fff", borderRadius: 8,
    padding: "5px 16px", fontSize: 14,
    cursor: "pointer", fontWeight: 500,
  },
  registerBtn: {
    background: "#38a169", border: "none",
    color: "#fff", borderRadius: 8,
    padding: "5px 16px", fontSize: 14,
    cursor: "pointer", fontWeight: 600,
  },
  cardWrapper: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "32px 16px",
  },
  card: {
    background: "#fff",
    borderRadius: 20,
    padding: "40px 48px",
    width: "100%",
    maxWidth: 500,
    boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
  },
  title: {
    color: "#553c9a",
    fontSize: 26,
    fontWeight: 800,
    textAlign: "center",
    margin: "0 0 8px",
    letterSpacing: "-0.5px",
  },
  subtitle: {
    color: "#718096",
    fontSize: 14,
    textAlign: "center",
    margin: "0 0 28px",
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
    gap: 18,
  },
  fieldWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 0,
  },
  strengthWrap: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    background: "#e2e8f0",
    borderRadius: 99,
    overflow: "hidden",
  },
  strengthFill: {
    height: "100%",
    borderRadius: 99,
    transition: "width 0.3s, background 0.3s",
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: 600,
    minWidth: 70,
  },
  hint: {
    fontSize: 12,
    color: "#a0aec0",
    margin: "6px 0 0",
  },
  terms: {
    fontSize: 13,
    color: "#a0aec0",
    textAlign: "center",
    margin: 0,
    lineHeight: 1.5,
  },
  termsLink: {
    color: "#553c9a",
    cursor: "pointer",
    fontWeight: 500,
    textDecoration: "underline",
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
  loginLink: {
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