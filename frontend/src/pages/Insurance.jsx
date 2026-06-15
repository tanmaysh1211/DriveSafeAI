import { useState, useEffect } from "react";
import { useNavigate }         from "react-router-dom";
import { useAuth }             from "../context/AuthContext";
import api                     from "../services/api";

// ─────────────────────────────────────────────────────────────────────────────
// Insurance.jsx — Insurance Policy Overview
//
// Matches screenshots exactly:
//   Top    : "Insurance Policy" heading + "Your comprehensive policy overview" sub
//   Banner : Green "Policy Status — X days remaining" full-width bar
//   Row 1  : Policy Information card (left) + Financial Details card (right)
//   Row 2  : Policy Period card (left)      + Risk Assessment gauge (right)
//   Bottom : Renew policy button
// ─────────────────────────────────────────────────────────────────────────────

export default function Insurance() {
  const { user }  = useAuth();
  const navigate  = useNavigate();

  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [renewing, setRenewing] = useState(false);
  const [renewMsg, setRenewMsg] = useState("");

  useEffect(() => {
    if (user?.userId) fetchInsurance();
  }, [user]);

  const fetchInsurance = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/insurance/${user.userId}`);
      setData(res.data);
    } catch (e) {
      if (e?.response?.status === 404) {
        setError("No insurance policy found. Contact your insurer to create one.");
      } else {
        setError(e?.response?.data?.message || "Failed to load insurance details");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRenew = async () => {
    if (!data?.policyId) return;
    setRenewing(true);
    setRenewMsg("");
    try {
      await api.put(`/insurance/${data.policyId}/renew`);
      setRenewMsg("✓ Policy renewed successfully!");
      fetchInsurance();
    } catch (e) {
      setRenewMsg("✗ " + (e?.response?.data?.message || "Renewal failed"));
    } finally {
      setRenewing(false);
    }
  };

  if (loading) return <PageShell><Spinner /></PageShell>;
  if (error)   return <PageShell><ErrorState msg={error} /></PageShell>;
  if (!data)   return null;

  const statusCfg  = STATUS_CFG[data.policyStatus] ?? STATUS_CFG.ACTIVE;
  const riskLabel  = data.riskLabel ?? "Needs Attention";
  const riskLabelColor = RISK_LABEL_COLORS[riskLabel] ?? "#d69e2e";

  return (
    <PageShell>
      {/* ── Page heading ─────────────────────────────────────────── */}
      <div style={s.pageTop}>
        <div>
          <h1 style={s.pageTitle}>Insurance Policy</h1>
          <p style={s.pageSub}>Your comprehensive policy overview</p>
        </div>
        <button style={s.backBtn} onClick={() => navigate("/dashboard")}>
          ← Dashboard
        </button>
      </div>

      {/* ── Status banner — green / yellow / red ─────────────────── */}
      <div style={{ ...s.statusBanner, background: statusCfg.bg }}>
        <span style={s.statusIcon}>{statusCfg.icon}</span>
        <div>
          <p style={s.statusTitle}>Policy Status</p>
          <p style={s.statusSub}>
            {data.daysRemaining > 0
              ? `${data.daysRemaining} days remaining`
              : "Policy has expired"}
          </p>
        </div>
      </div>

      {/* ── Row 1: Policy Info + Financial Details ───────────────── */}
      <div style={s.row}>
        {/* Policy Information */}
        <div style={s.card}>
          <CardHeader icon="📄" iconBg="#ede9fe" title="Policy Information" />
          <InfoRow label="Policy Number" value={data.policyNumber} bold />
          <InfoRow label="Policy ID"     value={`#${data.policyId}`} />
          <InfoRow label="Coverage Type" value={data.coverageType} bold />
        </div>

        {/* Financial Details */}
        <div style={s.card}>
          <CardHeader icon="💵" iconBg="#d1fae5" title="Financial Details" color="#059669" />
          <InfoRow label="Coverage Amount" value={formatINR(data.coverageAmount)} valueColor="#059669" bold />
          <InfoRow label="Base Premium"    value={formatINR(data.basePremium)} />
          <div style={s.finalPremiumRow}>
            <span style={s.finalPremiumLabel}>Final Premium</span>
            <span style={s.finalPremiumValue}>{formatINR(data.finalPremium)}</span>
          </div>
          {data.discountPercent > 0 && (
            <div style={s.savingsBadge}>
              🎉 You save {data.discountPercent?.toFixed(2)}% thanks to your DRISC score
            </div>
          )}
        </div>
      </div>

      {/* ── Row 2: Policy Period + Risk Assessment ───────────────── */}
      <div style={s.row}>
        {/* Policy Period */}
        <div style={s.card}>
          <CardHeader icon="📅" iconBg="#ede9fe" title="Policy Period" />
          <InfoRow label="Start Date" value={formatDate(data.startDate)} />
          <InfoRow label="End Date"   value={formatDate(data.endDate)}   />
          <div style={{ marginTop: 16 }}>
            <div style={s.periodBar}>
              <div
                style={{
                  ...s.periodFill,
                  width: `${Math.max(0, Math.min(100, 100 - (data.daysRemaining / 365) * 100))}%`,
                  background: statusCfg.barColor,
                }}
              />
            </div>
            <p style={s.periodHint}>
              {data.daysRemaining > 0
                ? `${data.daysRemaining} days remaining`
                : "Expired"}
            </p>
          </div>
        </div>

        {/* Risk Assessment — circular gauge */}
        <div style={{ ...s.card, alignItems: "center" }}>
          <CardHeader icon="📈" iconBg="#d1fae5" title="Risk Assessment" color="#059669" />
          <ScoreGauge score={data.driscScore ?? 50} />
          <p style={s.driscLabel}>DRISC Score</p>
          <span style={{ ...s.riskLabelBadge, color: riskLabelColor, background: riskLabelColor + "18" }}>
            {riskLabel}
          </span>
          <p style={s.driscHint}>
            Score determines your premium discount.<br />
            Lower score = safer driver = more savings.
          </p>
        </div>
      </div>

      {/* ── Discount breakdown ────────────────────────────────────── */}
      <div style={s.breakdownCard}>
        <h3 style={s.breakdownTitle}>💰 Premium Breakdown</h3>
        <div style={s.breakdownGrid}>
          <BreakdownItem label="Base Premium"     value={formatINR(data.basePremium)}   color="#4a5568" />
          <BreakdownItem label="DRISC Discount"   value={`${data.discountPercent?.toFixed(2) ?? 0}%`} color="#38a169" />
          <BreakdownItem label="Amount Saved"     value={formatINR((data.basePremium ?? 0) - (data.finalPremium ?? 0))} color="#38a169" />
          <BreakdownItem label="Final Premium"    value={formatINR(data.finalPremium)}  color="#e53e3e" highlight />
        </div>
      </div>

      {/* ── Renew button ──────────────────────────────────────────── */}
      <div style={s.renewSection}>
        {renewMsg && (
          <p style={{
            ...s.renewMsg,
            color: renewMsg.startsWith("✓") ? "#38a169" : "#e53e3e",
          }}>
            {renewMsg}
          </p>
        )}
        <button
          style={renewing ? s.renewBtnDisabled : s.renewBtn}
          onClick={handleRenew}
          disabled={renewing}
        >
          {renewing ? "Renewing…" : "🔄 Renew Policy"}
        </button>
      </div>
    </PageShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCORE GAUGE — circular SVG progress ring
// Matches the "57.68 / 100" donut chart in the screenshots
// ─────────────────────────────────────────────────────────────────────────────
function ScoreGauge({ score }) {
  const radius      = 54;
  const circ        = 2 * Math.PI * radius;
  const pct         = Math.min(Math.max(score, 0), 100) / 100;
  const strokeColor = score <= 40 ? "#38a169" : score <= 65 ? "#d69e2e" : "#e53e3e";
  const dashOffset  = circ * (1 - pct);

  return (
    <div style={s.gaugeWrap}>
      <svg width={130} height={130} viewBox="0 0 130 130">
        {/* Track */}
        <circle
          cx={65} cy={65} r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={10}
        />
        {/* Fill */}
        <circle
          cx={65} cy={65} r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 65 65)"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
        {/* Score text */}
        <text x={65} y={60} textAnchor="middle"
          fontSize={22} fontWeight={800} fill="#1a202c">
          {score?.toFixed(2) ?? "—"}
        </text>
        <text x={65} y={78} textAnchor="middle"
          fontSize={11} fill="#a0aec0">
          / 100
        </text>
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SMALL COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function PageShell({ children }) {
  return (
    <div style={s.root}>
      <div style={s.content}>{children}</div>
    </div>
  );
}

function CardHeader({ icon, iconBg, title, color = "#1a202c" }) {
  return (
    <div style={s.cardHeader}>
      <div style={{ ...s.cardIcon, background: iconBg }}>{icon}</div>
      <h3 style={{ ...s.cardTitle, color }}>{title}</h3>
    </div>
  );
}

function InfoRow({ label, value, bold = false, valueColor = "#1a202c" }) {
  return (
    <div style={s.infoRow}>
      <span style={s.infoLabel}>{label}</span>
      <span style={{ ...s.infoValue, fontWeight: bold ? 700 : 500, color: valueColor }}>
        {value ?? "—"}
      </span>
    </div>
  );
}

function BreakdownItem({ label, value, color, highlight = false }) {
  return (
    <div style={{ ...s.breakdownItem, ...(highlight ? s.breakdownHighlight : {}) }}>
      <span style={s.breakdownLabel}>{label}</span>
      <span style={{ ...s.breakdownValue, color }}>{value}</span>
    </div>
  );
}

function Spinner() {
  return (
    <div style={s.center}>
      <div style={s.spinner} />
      <p style={{ color: "#718096", marginTop: 16 }}>Loading policy…</p>
    </div>
  );
}

function ErrorState({ msg }) {
  return (
    <div style={s.errorBox}>
      <p style={s.errorIcon}>🛡️</p>
      <p style={s.errorMsg}>{msg}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function formatINR(amount) {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    year: "numeric", month: "long", day: "numeric",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CFG = {
  ACTIVE:        { icon: "📅", bg: "linear-gradient(135deg,#38a169,#276749)", barColor: "#38a169" },
  EXPIRING_SOON: { icon: "⚠️", bg: "linear-gradient(135deg,#d69e2e,#b7791f)", barColor: "#d69e2e" },
  EXPIRED:       { icon: "❌", bg: "linear-gradient(135deg,#e53e3e,#c53030)", barColor: "#e53e3e" },
};

const RISK_LABEL_COLORS = {
  "Excellent":       "#38a169",
  "Needs Attention": "#d69e2e",
  "High Risk":       "#e53e3e",
};

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const s = {
  root: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #4a5568 0%, #553c9a 40%, #b83280 100%)",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    padding: "32px 24px",
  },
  content: {
    maxWidth: 900,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },

  pageTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  pageTitle: { fontSize: 26, fontWeight: 800, color: "#fff", margin: 0 },
  pageSub:   { fontSize: 14, color: "rgba(255,255,255,0.7)", margin: "4px 0 0" },
  backBtn: {
    background: "rgba(255,255,255,0.15)",
    border: "1px solid rgba(255,255,255,0.3)",
    color: "#fff", borderRadius: 8,
    padding: "8px 16px", fontSize: 14,
    cursor: "pointer", fontWeight: 500,
  },

  // Status banner
  statusBanner: {
    borderRadius: 14,
    padding: "22px 28px",
    display: "flex",
    alignItems: "center",
    gap: 16,
    color: "#fff",
  },
  statusIcon:  { fontSize: 28 },
  statusTitle: { fontSize: 18, fontWeight: 800, margin: 0 },
  statusSub:   { fontSize: 14, opacity: 0.85, margin: "2px 0 0" },

  // Cards
  row: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
  },
  card: {
    background: "#fff",
    borderRadius: 16,
    padding: "24px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
    display: "flex",
    flexDirection: "column",
    gap: 0,
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  cardIcon: {
    width: 44, height: 44,
    borderRadius: 12,
    display: "flex", alignItems: "center",
    justifyContent: "center", fontSize: 20,
    flexShrink: 0,
  },
  cardTitle: { fontSize: 17, fontWeight: 700, margin: 0 },

  // Info rows
  infoRow: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    marginBottom: 16,
  },
  infoLabel: { fontSize: 12, color: "#a0aec0", textTransform: "uppercase", letterSpacing: "0.4px" },
  infoValue: { fontSize: 16, color: "#1a202c" },

  // Financial
  finalPremiumRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderTop: "1px dashed #e2e8f0",
    paddingTop: 14,
    marginTop: 4,
  },
  finalPremiumLabel: { fontSize: 13, color: "#718096", fontWeight: 600 },
  finalPremiumValue: { fontSize: 22, fontWeight: 800, color: "#e53e3e" },
  savingsBadge: {
    background: "#f0fff4",
    border: "1px solid #9ae6b4",
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 13,
    color: "#276749",
    marginTop: 12,
    textAlign: "center",
    fontWeight: 500,
  },

  // Period bar
  periodBar: {
    height: 8,
    background: "#e2e8f0",
    borderRadius: 99,
    overflow: "hidden",
    marginBottom: 8,
  },
  periodFill: {
    height: "100%",
    borderRadius: 99,
    transition: "width 0.6s ease",
  },
  periodHint: { fontSize: 12, color: "#718096", margin: 0 },

  // Score gauge
  gaugeWrap: { margin: "12px 0 4px" },
  driscLabel: { fontSize: 13, color: "#718096", margin: "2px 0 8px", textAlign: "center" },
  riskLabelBadge: {
    borderRadius: 99, padding: "5px 16px",
    fontSize: 13, fontWeight: 700,
    marginBottom: 12,
  },
  driscHint: {
    fontSize: 12, color: "#a0aec0",
    textAlign: "center", lineHeight: 1.5, margin: 0,
  },

  // Breakdown
  breakdownCard: {
    background: "#fff",
    borderRadius: 16,
    padding: "24px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
  },
  breakdownTitle: { fontSize: 16, fontWeight: 700, color: "#1a202c", margin: "0 0 18px" },
  breakdownGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 16,
  },
  breakdownItem: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    padding: "14px",
    background: "#f7fafc",
    borderRadius: 10,
  },
  breakdownHighlight: {
    background: "#fff5f5",
    border: "1px solid #fed7d7",
  },
  breakdownLabel: { fontSize: 12, color: "#718096", fontWeight: 500 },
  breakdownValue: { fontSize: 20, fontWeight: 800 },

  // Renew
  renewSection: { textAlign: "center", paddingBottom: 8 },
  renewMsg:     { fontSize: 14, fontWeight: 500, marginBottom: 12 },
  renewBtn: {
    background: "linear-gradient(135deg, #553c9a, #b83280)",
    border: "none", color: "#fff",
    borderRadius: 12, padding: "14px 40px",
    fontSize: 16, fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 4px 16px rgba(85,60,154,0.35)",
  },
  renewBtnDisabled: {
    background: "#a0aec0",
    border: "none", color: "#fff",
    borderRadius: 12, padding: "14px 40px",
    fontSize: 16, fontWeight: 700,
    cursor: "not-allowed",
  },

  // Loading / error
  center: {
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    minHeight: 300,
  },
  spinner: {
    width: 40, height: 40,
    border: "4px solid rgba(255,255,255,0.2)",
    borderTopColor: "#fff",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  errorBox: {
    background: "#fff",
    borderRadius: 16, padding: "40px",
    textAlign: "center",
    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
  },
  errorIcon: { fontSize: 48, margin: "0 0 16px" },
  errorMsg:  { fontSize: 15, color: "#4a5568", lineHeight: 1.6, margin: 0 },
};