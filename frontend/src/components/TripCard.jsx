import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import RiskBadge from "./RiskBadge";

export default function TripCard({ trip,index,showMapBtn= true,showAiBtn    = true,onAiAnalysis = null}) 
{
  const navigate = useNavigate();
  const [expanded,   setExpanded]   = useState(false);
  const [details,    setDetails]    = useState(null);
  const [detLoading, setDetLoading] = useState(false);
  const [aiModal,    setAiModal]    = useState(false);
  const [aiText,     setAiText]     = useState(trip.aiRecommendation ?? "");
  const [aiLoading,  setAiLoading]  = useState(false);
  const score      = trip.driveScore ?? trip.score ?? 0;
  const riskLevel  = trip.riskLevel  ?? getRiskLevel(score);
  const riskColor  = RISK_COLORS[riskLevel] ?? "#e53e3e";

  const handleToggleDetails = async () => {
    if (!expanded && !details) {
      setDetLoading(true);
      try {
        const res = await api.get(`/trips/detail/${trip.tripId}`);
        setDetails(res.data);
      } catch {
        setDetails(trip);
      } finally {
        setDetLoading(false);
      }
    }
    setExpanded((v) => !v);
  };

  const handleViewAI = async () => {
    if (onAiAnalysis) { onAiAnalysis(trip); return; }
    setAiModal(true);
    if (!aiText) {
      setAiLoading(true);
      try {
        const res = await api.get(`/trips/${trip.tripId}/ai-analysis`);
        setAiText(res.data.analysis || "No analysis available yet.");
      } catch {
        setAiText("AI analysis could not be loaded. Please try again later.");
      } finally {
        setAiLoading(false);
      }
    }
  };

  const d = details ?? trip;

  return (
    <>
      <div style={cs.card}>
        <div style={cs.cardHeader}>
          <h3 style={cs.cardTitle}>Trip {index}</h3>
          <span style={{
            ...cs.timeBadge,
            background: trip.isDaytime ? "#f6ad55" : "#4a5568",
          }}>
            {trip.isDaytime ? "☀️ Day" : "🌙 Night"}
          </span>
        </div>

        <div style={cs.scoreWrap}>
          <div style={{ ...cs.scorePill, background: riskColor }}>
            Score: {score?.toFixed(2) ?? "—"}
          </div>
          <p style={cs.scoreLabel}>Drive Score</p>
        </div>

        <div style={cs.statsGrid}>
          <StatBox value={trip.maxSpeed?.toFixed(0) ?? "—"}   unit="Max Speed (km/h)" color="#e53e3e" />
          <StatBox value={trip.distanceKm?.toFixed(3) ?? "—"} unit="Distance (km)"    color="#3182ce" />
        </div>

        <Btn color="blue"   onClick={handleToggleDetails} disabled={detLoading}>
          {detLoading ? "Loading…" : expanded ? "📊 Hide Details ▲" : "📊 Show Details ▼"}
        </Btn>

        {showMapBtn && trip.mapUrl && (
          <Btn color="green" onClick={() => navigate(`/trips/${trip.tripId}/map`)}>
            🗺️ Show Detailed Map Analysis
          </Btn>
        )}

        {showAiBtn && (
          <Btn color="purple" onClick={handleViewAI}>
            🚗 View AI Analysis
          </Btn>
        )}

        {expanded && (
          <div style={cs.detailPanel}>
            {detLoading ? (
              <p style={cs.detailLoading}>Loading…</p>
            ) : (
              <>
                <DetailRow label="Avg Speed"        value={`${d.avgSpeed?.toFixed(1) ?? "—"} km/h`}  color="#3182ce" />
                <DetailRow label="Max Acceleration" value={`${d.maxAcceleration?.toFixed(2) ?? "—"} m/s²`} color="#38a169" />
                {d.hardBrakingCount !== undefined && (
                  <DetailRow label="Hard Braking" value={`${d.hardBrakingCount} events`} color="#e53e3e" />
                )}
                {d.sharpTurnCount !== undefined && (
                  <DetailRow label="Sharp Turns"  value={`${d.sharpTurnCount} events`}  color="#d69e2e" />
                )}

                <p style={cs.condLabel}>Trip Conditions:</p>
                <div style={cs.condRow}>
                  {d.weatherCondition && (
                    <CondPill label={`🌤️ ${d.weatherCondition}`} bg="#4a5568" />
                  )}
                  <CondPill
                    label={d.isDaytime ? "☀️ Daytime" : "🌙 Nighttime"}
                    bg={d.isDaytime ? "#f6ad55" : "#553c9a"}
                  />
                </div>

                <div style={cs.riskRow}>
                  <span style={cs.riskRowLabel}>Risk Level:</span>
                  <RiskBadge level={riskLevel} />
                </div>

                {d.createdAt && (
                  <p style={cs.createdAt}>
                    🕐 {new Date(d.createdAt).toLocaleString("en-IN", {
                      day: "numeric", month: "short", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>
      {aiModal && (
        <AiModal
          tripId={trip.tripId}
          index={index}
          text={aiText}
          loading={aiLoading}
          score={score}
          riskLevel={riskLevel}
          riskColor={riskColor}
          onClose={() => setAiModal(false)}
        />
      )}
    </>
  );
}

function AiModal({ tripId, index, text, loading, score, riskLevel, riskColor, onClose }) {
  const lines = text ? text.split("\n").map((l) => l.trim()).filter(Boolean) : [];

  return (
    <div style={cs.overlay} onClick={onClose}>
      <div style={cs.modal} onClick={(e) => e.stopPropagation()}>
        <div style={cs.modalHeader}>
          <div>
            <h3 style={cs.modalTitle}>🤖 AI Trip Analysis</h3>
            <p style={cs.modalSub}>Trip #{tripId} · Trip {index}</p>
          </div>
          <button style={cs.modalCloseX} onClick={onClose}>✕</button>
        </div>

        <div style={{ ...cs.scoreStrip, borderLeftColor: riskColor }}>
          <div style={cs.scoreStripLeft}>
            <span style={{ fontSize: 28, fontWeight: 800, color: riskColor }}>
              {score?.toFixed(2)}
            </span>
            <span style={{ fontSize: 14, color: "#a0aec0" }}>/100</span>
          </div>
          <RiskBadge level={riskLevel} />
        </div>

        <div style={cs.modalBody}>
          {loading ? (
            <div style={cs.modalLoading}>
              <div style={cs.spinner} />
              <p style={{ color: "#a0aec0", fontSize: 13, margin: 0 }}>
                Generating AI recommendations…
              </p>
            </div>
          ) : lines.length === 0 ? (
            <p style={{ color: "#a0aec0", textAlign: "center", padding: "24px 0" }}>
              No analysis available for this trip.
            </p>
          ) : (
            lines.map((line, i) => (
              <div key={i} style={cs.recCard}>
                <span style={cs.recNum}>{i + 1}</span>
                <p style={cs.recText}>{line}</p>
              </div>
            ))
          )}
        </div>

        <button style={cs.modalDoneBtn} onClick={onClose}>Got it</button>
      </div>
    </div>
  );
}

function StatBox({ value, unit, color }) {
  return (
    <div style={cs.statBox}>
      <span style={{ ...cs.statValue, color }}>{value}</span>
      <span style={cs.statUnit}>{unit}</span>
    </div>
  );
}

function Btn({ color, children, onClick, disabled = false }) {
  const [hovered, setHovered] = useState(false);
  const cfg = BTN_CFG[color] ?? BTN_CFG.blue;
  return (
    <button
      style={{
        ...cs.btn,
        background: hovered && !disabled ? cfg.hover : cfg.bg,
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => !disabled && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </button>
  );
}

function DetailRow({ label, value, color }) {
  return (
    <div style={cs.detailRow}>
      <span style={cs.detailLabel}>{label}:</span>
      <span style={{ ...cs.detailValue, color }}>{value}</span>
    </div>
  );
}

function CondPill({ label, bg }) {
  return (
    <span style={{ ...cs.condPill, background: bg }}>{label}</span>
  );
}

function getRiskLevel(score) {
  if (score <= 40) return "Safe";
  if (score <= 65) return "Moderate";
  return "High";
}

const RISK_COLORS = { Safe: "#38a169", Moderate: "#d69e2e", High: "#e53e3e" };

const BTN_CFG = {
  blue:   { bg: "linear-gradient(135deg,#3182ce,#2b6cb0)", hover: "linear-gradient(135deg,#2b6cb0,#2c5282)" },
  green:  { bg: "linear-gradient(135deg,#38a169,#276749)", hover: "linear-gradient(135deg,#276749,#22543d)" },
  purple: { bg: "linear-gradient(135deg,#553c9a,#b83280)", hover: "linear-gradient(135deg,#44337a,#97266d)" },
};

const cs = {
  card: {
    background: "#fff",
    borderRadius: 16,
    padding: "20px",
    boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  cardTitle:  { fontSize: 16, fontWeight: 700, color: "#1a202c", margin: 0 },
  timeBadge:  { borderRadius: 99, padding: "3px 10px", color: "#fff", fontSize: 12, fontWeight: 600 },

  scoreWrap:  { textAlign: "center" },
  scorePill:  { display: "inline-block", color: "#fff", borderRadius: 99, padding: "8px 24px", fontSize: 16, fontWeight: 800, marginBottom: 4 },
  scoreLabel: { fontSize: 12, color: "#718096", margin: 0 },

  statsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, background: "#f7fafc", borderRadius: 10, padding: "12px" },
  statBox:   { display: "flex", flexDirection: "column", alignItems: "center", gap: 3 },
  statValue: { fontSize: 22, fontWeight: 800 },
  statUnit:  { fontSize: 11, color: "#718096", textAlign: "center" },

  btn: { border: "none", borderRadius: 8, padding: "10px", color: "#fff", fontSize: 13, fontWeight: 600, width: "100%", transition: "background 0.15s", fontFamily: "'Segoe UI', system-ui, sans-serif" },

  detailPanel:  { background: "#f7fafc", borderRadius: 10, padding: "14px 16px", borderTop: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: 8 },
  detailLoading:{ fontSize: 13, color: "#a0aec0", margin: 0 },
  detailRow:    { display: "flex", justifyContent: "space-between", alignItems: "center" },
  detailLabel:  { fontSize: 13, color: "#718096" },
  detailValue:  { fontSize: 13, fontWeight: 700 },

  condLabel: { fontSize: 12, color: "#718096", margin: "4px 0 4px" },
  condRow:   { display: "flex", gap: 8, flexWrap: "wrap" },
  condPill:  { borderRadius: 99, padding: "4px 12px", color: "#fff", fontSize: 12, fontWeight: 500 },

  riskRow:      { display: "flex", alignItems: "center", gap: 10, marginTop: 4 },
  riskRowLabel: { fontSize: 13, color: "#718096" },
  createdAt:    { fontSize: 11, color: "#a0aec0", margin: "4px 0 0" },

  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 24 },
  modal:   { background: "#fff", borderRadius: 20, padding: "28px 32px", width: "100%", maxWidth: 500, boxShadow: "0 24px 60px rgba(0,0,0,0.35)", display: "flex", flexDirection: "column", gap: 16 },

  modalHeader:  { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  modalTitle:   { fontSize: 18, fontWeight: 800, color: "#1a202c", margin: "0 0 2px" },
  modalSub:     { fontSize: 13, color: "#a0aec0", margin: 0 },
  modalCloseX:  { background: "#f7fafc", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 15, color: "#4a5568", fontWeight: 700, flexShrink: 0 },

  scoreStrip:     { display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f7fafc", borderRadius: 10, padding: "12px 16px", borderLeft: "4px solid" },
  scoreStripLeft: { display: "flex", alignItems: "baseline", gap: 4 },

  modalBody:    { display: "flex", flexDirection: "column", gap: 10, maxHeight: 300, overflowY: "auto" },
  modalLoading: { display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "24px 0" },
  spinner:      { width: 32, height: 32, border: "3px solid #e2e8f0", borderTopColor: "#553c9a", borderRadius: "50%", animation: "spin 0.7s linear infinite" },

  recCard: { display: "flex", gap: 12, alignItems: "flex-start", background: "#f0fff4", borderRadius: 10, padding: "12px 14px", border: "1px solid #c6f6d5" },
  recNum:  { background: "#38a169", color: "#fff", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, flexShrink: 0, marginTop: 1 },
  recText: { fontSize: 13, color: "#276749", lineHeight: 1.6, margin: 0 },

  modalDoneBtn: { background: "linear-gradient(135deg,#553c9a,#b83280)", border: "none", color: "#fff", borderRadius: 10, padding: "12px", fontSize: 15, fontWeight: 700, cursor: "pointer", width: "100%" },
};
