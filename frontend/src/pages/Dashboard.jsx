import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [n,       setN]       = useState(1);

  useEffect(() => {
    if (!user?.userId) return;
    fetchDashboard(user.userId, n);
  }, [user, n]);

  const fetchDashboard = async (userId, nTrips) => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/dashboard/${userId}?n=${nTrips}`);
      setData(res.data);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <PageShell><LoadingSpinner /></PageShell>;
  if (error)   return <PageShell><ErrorBanner msg={error} /></PageShell>;
  if (!data)   return null;
  const riskColor = RISK_COLORS[data.riskLevel] ?? "#718096";

  return (
    <PageShell>
      <div style={s.pageHeader}>
        <div>
          <h1 style={s.pageTitle}>Risk Scoring Dashboard</h1>
          <p style={s.pageSubtitle}>Monitor and analyze driving risk metrics</p>
        </div>
        <div style={s.headerActions}>
          <button
            style={s.liveBtn}
            onClick={() => navigate("/trips")}
          >
            🚗 Show Live Trip
          </button>
          <div style={s.userBadge}>👤 {data.userName}</div>
        </div>
      </div>

      <div style={s.statsGrid}>
        <StatCard
          label="DRISC SCORE"
          icon="📊"
          iconBg="#ffe4e4"
        >
          <div style={{ ...s.statValue, color: "#e53e3e" }}>
            {data.driscScore?.toFixed(1) ?? "—"}
          </div>
          <div style={s.nSelector}>
            <span style={s.nLabel}>Number of trips:</span>
            <select
              value={n}
              onChange={(e) => setN(Number(e.target.value))}
              style={s.nSelect}
            >
              {[1, 3, 5, 10].map((v) => (
                <option key={v} value={v}>N = {v}</option>
              ))}
            </select>
          </div>
          <p style={s.statHint}>Based on last {data.tripsAnalyzed} trip{data.tripsAnalyzed !== 1 ? "s" : ""}</p>
          <p style={s.statMeta}>📝 Risk assessment</p>
        </StatCard>

        <StatCard label="RISK LEVEL" icon="⚠️" iconBg="#fff3cd">
          <div style={{ ...s.statValue, color: riskColor }}>
            {data.riskLevel}
          </div>
          <p style={s.statMeta}>🛡️ Current status</p>
        </StatCard>

        <StatCard label="TRIPS ANALYZED" icon="🚗" iconBg="#e8f4fd">
          <div style={{ ...s.statValue, color: "#2d3748" }}>
            {data.tripsAnalyzed}
          </div>
          <p style={s.statMeta}>🕐 Data points collected</p>
        </StatCard>
      </div>

      <div style={s.premiumRow}>
        <StatCard label="PREMIUM IMPACT" icon="💰" iconBg="#e6ffed" wide>
          <div style={{ ...s.statValue, color: "#38a169", fontSize: 28 }}>
            {data.premiumImpact?.toFixed(2) ?? "0.00"}% Saved
          </div>
          <p style={s.statMeta}>💸 Estimated savings</p>
        </StatCard>
      </div>

      <div style={s.bottomGrid}>
        {/* User Profile card */}
        <div style={s.profileCard}>
          <div style={s.avatarCircle}>
            {data.userName?.[0]?.toUpperCase() ?? "U"}
          </div>
          <h3 style={s.profileName}>{data.userName}</h3>
          <p style={s.profileEmail}>{data.userEmail}</p>
          <div style={s.profileDivider} />
          <ProfileRow icon="🚗" label="Vehicle"     value={data.vehicleNumber ?? "—"} />
          <ProfileRow icon="🔑" label="User ID"     value={`#${user?.userId ?? "—"}`} />
          <ProfileRow icon="🗺️" label="Total Trips"  value={`${data.tripsAnalyzed} trips`} />
        </div>

        <div style={s.riskCard}>
          <div style={s.riskCardHeader}>
            <h3 style={s.riskCardTitle}>Risk Analysis</h3>
            <div style={s.riskPills}>
              <RiskPill label="Safe"      color="#38a169" bg="#e6ffed" />
              <RiskPill label="Moderate"  color="#d69e2e" bg="#fffff0" />
              <RiskPill label="High Risk" color="#e53e3e" bg="#fff5f5" />
            </div>
          </div>

          {/* Overall score bar */}
          <p style={s.riskBarLabel}>Overall Risk Score</p>
          <div style={s.scoreBarRow}>
            <div style={s.scoreBarTrack}>
              <div
                style={{
                  ...s.scoreBarFill,
                  width: `${Math.min(data.driscScore ?? 0, 100)}%`,
                  background: riskColor,
                }}
              />
            </div>
            <span style={{ ...s.scoreBarValue, color: riskColor }}>
              {data.driscScore?.toFixed(1) ?? "—"}/100
            </span>
          </div>
          <p style={s.scoreBasedOn}>
            Based on {data.tripsAnalyzed} trip{data.tripsAnalyzed !== 1 ? "s" : ""}
            <span style={s.scoreHint}>&nbsp;&nbsp;More trips needed for accuracy</span>
          </p>

          <p style={s.factorsLabel}>Risk Factors</p>
          <div style={s.factorsGrid}>
            {data.riskFactors && Object.entries(data.riskFactors).map(([factor, level]) => (
              <RiskFactorRow key={factor} factor={factor} level={level} />
            ))}
          </div>
        </div>
      </div>

      {data.recommendations?.length > 0 && (
        <div style={s.recsSection}>
          <h3 style={s.recsTitle}>Recommendations</h3>
          <div style={s.recsGrid}>
            {data.recommendations.map((rec) => (
              <RecommendationCard key={rec.type} rec={rec} />
            ))}
          </div>
        </div>
      )}
    </PageShell>
  );
}

function PageShell({ children }) {
  return (
    <div style={s.root}>
      <div style={s.content}>{children}</div>
    </div>
  );
}

function StatCard({ label, icon, iconBg, children, wide = false }) {
  return (
    <div style={{ ...s.statCard, ...(wide ? s.statCardWide : {}) }}>
      <div style={s.statCardHeader}>
        <span style={s.statLabel}>{label}</span>
        <div style={{ ...s.statIcon, background: iconBg }}>{icon}</div>
      </div>
      {children}
    </div>
  );
}

function ProfileRow({ icon, label, value }) {
  return (
    <div style={s.profileRow}>
      <span style={s.profileRowIcon}>{icon}</span>
      <span style={s.profileRowLabel}>{label}</span>
      <span style={s.profileRowValue}>{value}</span>
    </div>
  );
}

function RiskPill({ label, color, bg }) {
  return (
    <span style={{ ...s.riskPill, color, background: bg }}>{label}</span>
  );
}

function RiskFactorRow({ factor, level }) {
  const cfg = FACTOR_COLORS[level] ?? { color: "#718096", bg: "#f7fafc" };
  return (
    <div style={s.factorRow}>
      <span style={s.factorDot}>●</span>
      <span style={s.factorName}>{factor}</span>
      <span style={{ ...s.factorBadge, color: cfg.color, background: cfg.bg }}>
        {level}
      </span>
    </div>
  );
}

function RecommendationCard({ rec }) {
  const cfg = REC_STYLES[rec.type] ?? REC_STYLES["Getting Started"];
  return (
    <div style={{ ...s.recCard, background: cfg.bg, borderColor: cfg.border }}>
      <div style={s.recHeader}>
        <span style={s.recIcon}>{cfg.icon}</span>
        <span style={{ ...s.recType, color: cfg.color }}>{rec.title || rec.type}</span>
      </div>
      <p style={s.recBody}>{rec.body}</p>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div style={s.loading}>
      <div style={s.spinner} />
      <p style={{ color: "#718096", marginTop: 16 }}>Loading dashboard…</p>
    </div>
  );
}

function ErrorBanner({ msg }) {
  return (
    <div style={s.errorBanner}>⚠️ {msg}</div>
  );
}

const RISK_COLORS = {
  Safe: "#38a169",
  Moderate: "#d69e2e",
  High: "#e53e3e",
};

const FACTOR_COLORS = {
  Low: { color: "#38a169", bg: "#e6ffed" },
  Normal: { color: "#3182ce", bg: "#ebf8ff" },
  Moderate: { color: "#d69e2e", bg: "#fffff0" },
  High: { color: "#e53e3e", bg: "#fff5f5" },
};

const REC_STYLES = {
  "Getting Started": {
    icon: "ℹ️", color: "#3182ce",
    bg: "#ebf8ff", border: "#bee3f8",
  },
  "Data Analysis": {
    icon: "⚠️", color: "#d69e2e",
    bg: "#fffff0", border: "#faf089",
  },
  "Premium Benefits": {
    icon: "💰", color: "#38a169",
    bg: "#e6ffed", border: "#9ae6b4",
  },
};

const s = {
  root: {
    minHeight: "100vh",
    background: "#f0f2f5",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  content: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "32px 24px",
  },

  pageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 28,
  },
  pageTitle:    { fontSize: 26, fontWeight: 800, color: "#1a202c", margin: 0 },
  pageSubtitle: { fontSize: 14, color: "#718096", margin: "4px 0 0" },
  headerActions: { display: "flex", gap: 12, alignItems: "center" },
  liveBtn: {
    background: "linear-gradient(135deg, #553c9a, #b83280)",
    border: "none", color: "#fff",
    borderRadius: 10, padding: "10px 20px",
    fontSize: 14, fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(85,60,154,0.3)",
  },
  userBadge: {
    background: "#fff", border: "1px solid #e2e8f0",
    borderRadius: 10, padding: "10px 16px",
    fontSize: 14, fontWeight: 500, color: "#4a5568",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 18,
    marginBottom: 18,
  },
  premiumRow: { marginBottom: 18 },
  statCard: {
    background: "#fff",
    borderRadius: 14,
    padding: "22px 24px",
    boxShadow: "0 1px 8px rgba(0,0,0,0.06)",
    border: "1px solid #e2e8f0",
  },
  statCardWide: { width: "33.33%", boxSizing: "border-box" },
  statCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: "#a0aec0",
    letterSpacing: "0.8px",
    textTransform: "uppercase",
  },
  statIcon: {
    width: 40, height: 40,
    borderRadius: 10,
    display: "flex", alignItems: "center",
    justifyContent: "center", fontSize: 18,
  },
  statValue: {
    fontSize: 36,
    fontWeight: 800,
    letterSpacing: "-1px",
    lineHeight: 1,
    marginBottom: 10,
  },
  statHint: { fontSize: 12, color: "#718096", margin: "4px 0" },
  statMeta: { fontSize: 12, color: "#a0aec0", margin: 0 },
  nSelector: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  nLabel: { fontSize: 12, color: "#718096" },
  nSelect: {
    border: "1px solid #e2e8f0",
    borderRadius: 6,
    padding: "3px 8px",
    fontSize: 12,
    color: "#2d3748",
    background: "#fff",
    cursor: "pointer",
  },

  bottomGrid: {
    display: "grid",
    gridTemplateColumns: "280px 1fr",
    gap: 18,
    marginBottom: 18,
  },

  profileCard: {
    background: "#fff",
    borderRadius: 14,
    padding: "24px",
    boxShadow: "0 1px 8px rgba(0,0,0,0.06)",
    border: "1px solid #e2e8f0",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  avatarCircle: {
    width: 64, height: 64,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #553c9a, #b83280)",
    color: "#fff",
    fontSize: 26,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  profileName:  { fontSize: 18, fontWeight: 700, color: "#1a202c", margin: "0 0 4px" },
  profileEmail: { fontSize: 13, color: "#718096", margin: "0 0 16px" },
  profileDivider: {
    width: "100%", height: 1,
    background: "#e2e8f0", marginBottom: 16,
  },
  profileRow: {
    display: "flex", alignItems: "center",
    width: "100%", marginBottom: 12, gap: 8,
  },
  profileRowIcon:  { fontSize: 16, width: 20 },
  profileRowLabel: { fontSize: 13, color: "#718096", flex: 1 },
  profileRowValue: { fontSize: 13, fontWeight: 600, color: "#2d3748" },

  riskCard: {
    background: "#fff",
    borderRadius: 14,
    padding: "24px",
    boxShadow: "0 1px 8px rgba(0,0,0,0.06)",
    border: "1px solid #e2e8f0",
  },
  riskCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  riskCardTitle: { fontSize: 17, fontWeight: 700, color: "#1a202c", margin: 0 },
  riskPills:     { display: "flex", gap: 8 },
  riskPill: {
    borderRadius: 99, padding: "4px 12px",
    fontSize: 12, fontWeight: 600,
  },
  riskBarLabel:  { fontSize: 13, fontWeight: 600, color: "#4a5568", margin: "0 0 8px" },
  scoreBarRow:   { display: "flex", alignItems: "center", gap: 14, marginBottom: 6 },
  scoreBarTrack: {
    flex: 1, height: 10,
    background: "#e2e8f0",
    borderRadius: 99, overflow: "hidden",
  },
  scoreBarFill: {
    height: "100%",
    borderRadius: 99,
    transition: "width 0.6s ease",
  },
  scoreBarValue: { fontSize: 16, fontWeight: 700, minWidth: 70, textAlign: "right" },
  scoreBasedOn:  { fontSize: 12, color: "#718096", margin: "0 0 20px" },
  scoreHint:     { color: "#a0aec0" },
  factorsLabel:  { fontSize: 13, fontWeight: 600, color: "#4a5568", margin: "0 0 12px" },
  factorsGrid:   { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  factorRow: {
    display: "flex", alignItems: "center",
    gap: 8, padding: "6px 0",
  },
  factorDot:  { color: "#a0aec0", fontSize: 10 },
  factorName: { flex: 1, fontSize: 14, color: "#4a5568" },
  factorBadge: {
    borderRadius: 99, padding: "3px 12px",
    fontSize: 12, fontWeight: 600,
  },

  recsSection: { marginTop: 4 },
  recsTitle: { fontSize: 17, fontWeight: 700, color: "#1a202c", marginBottom: 16 },
  recsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 16,
  },
  recCard: {
    borderRadius: 12,
    padding: "18px 20px",
    border: "1px solid",
  },
  recHeader: { display: "flex", alignItems: "center", gap: 10, marginBottom: 10 },
  recIcon:   { fontSize: 18 },
  recType:   { fontWeight: 700, fontSize: 14 },
  recBody:   { fontSize: 13, color: "#4a5568", lineHeight: 1.6, margin: 0 },

  loading: {
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    minHeight: 300,
  },
  spinner: {
    width: 40, height: 40,
    border: "4px solid #e2e8f0",
    borderTopColor: "#553c9a",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  errorBanner: {
    background: "#fff5f5",
    border: "1px solid #fed7d7",
    borderRadius: 10,
    padding: "16px 20px",
    color: "#c53030",
    fontSize: 14,
  },
};
