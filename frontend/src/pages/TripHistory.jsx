import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

// ─────────────────────────────────────────────────────────────────────────────
// TripHistory.jsx — Trip listing page
//
// Matches screenshots:
//   - Purple gradient background
//   - Trip cards in 3-column grid
//   - Each card: score pill (red), max speed + distance, 3 action buttons
//   - "Show Details" expands: avg speed, max accel, trip conditions
//   - "Show Detailed Map Analysis" → TripMap page
//   - "View AI Analysis" → modal overlay
//   - "Load Trips" button with number input
// ─────────────────────────────────────────────────────────────────────────────

export default function TripHistory() {
  const { user }  = useAuth();
  const navigate  = useNavigate();

  const [trips,     setTrips]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [limit,     setLimit]     = useState(10);
  const [inputLimit, setInputLimit] = useState("10");
  const [aiModal,   setAiModal]   = useState(null); // { tripId, text }
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const fileRef = useRef();

  useEffect(() => {
    if (user?.userId) fetchTrips(limit);
  }, [user]);

  const fetchTrips = async (n) => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/trips/${user.userId}?limit=${n}`);
      setTrips(res.data);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load trips");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadTrips = () => {
    const n = Math.max(1, Math.min(100, parseInt(inputLimit) || 10));
    setLimit(n);
    fetchTrips(n);
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadMsg("");

    const form = new FormData();
    form.append("file", file);
    try {
      const res = await api.post("/trips/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUploadMsg(
        `✓ Trip uploaded! Score: ${res.data.driveScore?.toFixed(1)} · ${res.data.riskLevel} · +${res.data.pointsEarned} pts`
      );
      fetchTrips(limit);
    } catch (e) {
      setUploadMsg("✗ " + (e?.response?.data?.message || "Upload failed"));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const openAiModal = async (trip) => {
    if (trip.aiRecommendation) {
      setAiModal({ tripId: trip.tripId, text: trip.aiRecommendation });
      return;
    }
    try {
      const res = await api.get(`/trips/${trip.tripId}/ai-analysis`);
      setAiModal({ tripId: trip.tripId, text: res.data.analysis || "No analysis available." });
    } catch {
      setAiModal({ tripId: trip.tripId, text: "AI analysis not available for this trip." });
    }
  };

  return (
    <div style={s.root}>
      {/* ── Upload bar ──────────────────────────────────────────── */}
      <div style={s.uploadBar}>
        <button
          style={s.uploadBtn}
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? "Uploading…" : "📂 Upload CSV Trip"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          style={{ display: "none" }}
          onChange={handleUpload}
        />
        {uploadMsg && (
          <span style={{
            ...s.uploadMsg,
            color: uploadMsg.startsWith("✓") ? "#38a169" : "#e53e3e",
          }}>
            {uploadMsg}
          </span>
        )}
      </div>

      {/* ── Load controls ────────────────────────────────────────── */}
      <div style={s.controls}>
        <input
          type="number"
          min={1} max={100}
          value={inputLimit}
          onChange={(e) => setInputLimit(e.target.value)}
          style={s.limitInput}
          onKeyDown={(e) => e.key === "Enter" && handleLoadTrips()}
        />
        <button style={s.loadBtn} onClick={handleLoadTrips}>
          🗺️ Load Trips
        </button>
      </div>

      {/* ── States ───────────────────────────────────────────────── */}
      {loading && <LoadingSpinner />}
      {error   && <ErrorBanner msg={error} />}

      {/* ── Trip cards grid ──────────────────────────────────────── */}
      {!loading && !error && trips.length === 0 && (
        <EmptyState onUpload={() => fileRef.current?.click()} />
      )}

      {!loading && trips.length > 0 && (
        <div style={s.grid}>
          {trips.map((trip, idx) => (
            <TripCard
              key={trip.tripId}
              trip={trip}
              index={idx + 1}
              onViewMap={() => navigate(`/trips/${trip.tripId}/map`)}
              onViewAI={() => openAiModal(trip)}
            />
          ))}
        </div>
      )}

      {/* ── AI Analysis modal ────────────────────────────────────── */}
      {aiModal && (
        <AiModal
          tripId={aiModal.tripId}
          text={aiModal.text}
          onClose={() => setAiModal(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TRIP CARD
// ─────────────────────────────────────────────────────────────────────────────
function TripCard({ trip, index, onViewMap, onViewAI }) {
  const [expanded, setExpanded] = useState(false);
  const [details,  setDetails]  = useState(null);
  const [detLoading, setDetLoading] = useState(false);

  const riskColor = RISK_COLORS[trip.riskLevel] ?? "#e53e3e";

  const handleToggleDetails = async () => {
    if (!expanded && !details) {
      setDetLoading(true);
      try {
        const res = await api.get(`/trips/detail/${trip.tripId}`);
        setDetails(res.data);
      } catch {
        setDetails(trip); // fall back to summary data
      } finally {
        setDetLoading(false);
      }
    }
    setExpanded((v) => !v);
  };

  const d = details || trip;

  return (
    <div style={s.card}>
      {/* Card header */}
      <div style={s.cardHeader}>
        <span style={s.cardTitle}>Trip {index}</span>
        <span style={{
          ...s.dayBadge,
          background: trip.isDaytime ? "#f6ad55" : "#4a5568",
        }}>
          {trip.isDaytime ? "☀️ Day" : "🌙 Night"}
        </span>
      </div>

      {/* Score pill */}
      <div style={s.scorePill}>
        <div style={{ ...s.scoreCircle, background: riskColor }}>
          Score: {trip.driveScore?.toFixed(2) ?? "—"}
        </div>
        <p style={s.scoreLabel}>Drive Score</p>
      </div>

      {/* Stats row */}
      <div style={s.statsRow}>
        <div style={s.statBox}>
          <span style={{ ...s.statNum, color: "#e53e3e" }}>
            {trip.maxSpeed?.toFixed(0) ?? "—"}
          </span>
          <span style={s.statUnit}>Max Speed (km/h)</span>
        </div>
        <div style={s.statBox}>
          <span style={{ ...s.statNum, color: "#3182ce" }}>
            {trip.distanceKm?.toFixed(3) ?? "—"}
          </span>
          <span style={s.statUnit}>Distance (km)</span>
        </div>
      </div>

      {/* Action buttons */}
      <button
        style={s.detailsBtn}
        onClick={handleToggleDetails}
      >
        📊 {expanded ? "Hide Details ▲" : "Show Details ▼"}
      </button>

      {trip.mapUrl && (
        <button style={s.mapBtn} onClick={onViewMap}>
          🗺️ Show Detailed Map Analysis
        </button>
      )}

      <button style={s.aiBtn} onClick={onViewAI}>
        🚗 View AI Analysis
      </button>

      {/* Expanded details */}
      {expanded && (
        <div style={s.details}>
          {detLoading ? (
            <p style={{ color: "#718096", fontSize: 13 }}>Loading details…</p>
          ) : (
            <>
              <DetailRow label="Avg Speed"      value={`${d.avgSpeed?.toFixed(1) ?? "—"} km/h`}    color="#3182ce" />
              <DetailRow label="Max Acceleration" value={`${d.maxAcceleration?.toFixed(2) ?? "—"} m/s²`} color="#38a169" />
              {d.hardBrakingCount !== undefined && (
                <DetailRow label="Hard Braking" value={`${d.hardBrakingCount} events`} color="#e53e3e" />
              )}
              {d.sharpTurnCount !== undefined && (
                <DetailRow label="Sharp Turns"  value={`${d.sharpTurnCount} events`}  color="#d69e2e" />
              )}
              {/* Trip Conditions */}
              <p style={s.condLabel}>Trip Conditions:</p>
              <div style={s.condRow}>
                {d.weatherCondition && (
                  <span style={{ ...s.condPill, background: "#4a5568" }}>
                    ☀️ {d.weatherCondition}
                  </span>
                )}
                <span style={{
                  ...s.condPill,
                  background: d.isDaytime ? "#f6ad55" : "#553c9a",
                }}>
                  {d.isDaytime ? "☀️ Daytime" : "🌙 Nighttime"}
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value, color }) {
  return (
    <div style={s.detailRow}>
      <span style={s.detailLabel}>{label}:</span>
      <span style={{ ...s.detailValue, color }}>{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AI MODAL
// ─────────────────────────────────────────────────────────────────────────────
function AiModal({ tripId, text, onClose }) {
  return (
    <div style={s.modalOverlay} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        <div style={s.modalHeader}>
          <h3 style={s.modalTitle}>🚗 AI Trip Analysis</h3>
          <button style={s.modalClose} onClick={onClose}>✕</button>
        </div>
        <p style={s.modalMeta}>Trip #{tripId}</p>
        <div style={s.modalBody}>
          {text.split("\n").filter(Boolean).map((line, i) => (
            <p key={i} style={s.modalLine}>
              <span style={s.modalBullet}>💡</span> {line}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onUpload }) {
  return (
    <div style={s.empty}>
      <div style={s.emptyIcon}>🚗</div>
      <h3 style={s.emptyTitle}>No trips yet</h3>
      <p style={s.emptyDesc}>
        Upload a CSV from your OBD device or simulator to see your trip history.
      </p>
      <button style={s.emptyBtn} onClick={onUpload}>
        📂 Upload Your First Trip
      </button>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div style={s.center}>
      <div style={s.spinner} />
      <p style={{ color: "rgba(255,255,255,0.7)", marginTop: 16 }}>
        Loading trips…
      </p>
    </div>
  );
}

function ErrorBanner({ msg }) {
  return (
    <div style={s.errorBanner}>⚠️ {msg}</div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────────────────────

const RISK_COLORS = {
  Safe:     "#38a169",
  Moderate: "#d69e2e",
  High:     "#e53e3e",
};

// ─────────────────────────────────────────────────────────────────────────────
// STYLES — purple gradient background matching screenshots
// ─────────────────────────────────────────────────────────────────────────────
const s = {
  root: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #4a5568 0%, #553c9a 40%, #b83280 100%)",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    padding: "24px",
  },

  // Upload bar
  uploadBar: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    marginBottom: 16,
    maxWidth: 1100,
    margin: "0 auto 16px",
  },
  uploadBtn: {
    background: "rgba(255,255,255,0.15)",
    border: "1.5px solid rgba(255,255,255,0.3)",
    color: "#fff",
    borderRadius: 10,
    padding: "10px 20px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  uploadMsg: {
    fontSize: 14,
    fontWeight: 500,
  },

  // Load controls
  controls: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
    maxWidth: 1100,
    margin: "0 auto 24px",
  },
  limitInput: {
    width: 80,
    border: "1.5px solid rgba(255,255,255,0.3)",
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 15,
    color: "#2d3748",
    background: "#fff",
    outline: "none",
    textAlign: "center",
  },
  loadBtn: {
    background: "#3182ce",
    border: "none",
    color: "#fff",
    borderRadius: 8,
    padding: "9px 20px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },

  // Grid
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 20,
    maxWidth: 1100,
    margin: "0 auto",
  },

  // Trip card — white card matching screenshots
  card: {
    background: "#fff",
    borderRadius: 16,
    padding: "20px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: { fontSize: 16, fontWeight: 700, color: "#1a202c" },
  dayBadge: {
    borderRadius: 99,
    padding: "3px 10px",
    color: "#fff",
    fontSize: 12,
    fontWeight: 600,
  },

  // Score
  scorePill: { textAlign: "center" },
  scoreCircle: {
    display: "inline-block",
    color: "#fff",
    borderRadius: 99,
    padding: "8px 24px",
    fontSize: 16,
    fontWeight: 800,
    marginBottom: 4,
  },
  scoreLabel: { fontSize: 12, color: "#718096", margin: 0 },

  // Stats
  statsRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    background: "#f7fafc",
    borderRadius: 10,
    padding: "12px",
  },
  statBox:  { display: "flex", flexDirection: "column", alignItems: "center", gap: 2 },
  statNum:  { fontSize: 22, fontWeight: 800 },
  statUnit: { fontSize: 11, color: "#718096", textAlign: "center" },

  // Action buttons
  detailsBtn: {
    background: "linear-gradient(135deg, #3182ce, #2b6cb0)",
    border: "none", color: "#fff",
    borderRadius: 8, padding: "10px",
    fontSize: 13, fontWeight: 600,
    cursor: "pointer", width: "100%",
  },
  mapBtn: {
    background: "linear-gradient(135deg, #38a169, #276749)",
    border: "none", color: "#fff",
    borderRadius: 8, padding: "10px",
    fontSize: 13, fontWeight: 600,
    cursor: "pointer", width: "100%",
  },
  aiBtn: {
    background: "linear-gradient(135deg, #553c9a, #b83280)",
    border: "none", color: "#fff",
    borderRadius: 8, padding: "10px",
    fontSize: 13, fontWeight: 600,
    cursor: "pointer", width: "100%",
  },

  // Expanded details
  details: {
    background: "#f7fafc",
    borderRadius: 10,
    padding: "14px",
    borderTop: "1px solid #e2e8f0",
  },
  detailRow: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  detailLabel: { fontSize: 13, color: "#718096" },
  detailValue: { fontSize: 13, fontWeight: 600 },
  condLabel:   { fontSize: 12, color: "#718096", margin: "8px 0 6px" },
  condRow:     { display: "flex", gap: 8, flexWrap: "wrap" },
  condPill: {
    borderRadius: 99, padding: "4px 12px",
    color: "#fff", fontSize: 12, fontWeight: 500,
  },

  // AI Modal
  modalOverlay: {
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,0.6)",
    display: "flex", alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: 24,
  },
  modal: {
    background: "#fff",
    borderRadius: 18,
    padding: "28px 32px",
    width: "100%",
    maxWidth: 520,
    boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  modalTitle: { fontSize: 18, fontWeight: 800, color: "#1a202c", margin: 0 },
  modalClose: {
    background: "#f7fafc", border: "none",
    borderRadius: 8, width: 32, height: 32,
    cursor: "pointer", fontSize: 16,
    color: "#4a5568", fontWeight: 700,
  },
  modalMeta:  { fontSize: 13, color: "#a0aec0", margin: "0 0 20px" },
  modalBody:  { display: "flex", flexDirection: "column", gap: 12 },
  modalLine: {
    display: "flex", gap: 10, alignItems: "flex-start",
    background: "#f0fff4", borderRadius: 8, padding: "10px 14px",
    fontSize: 14, color: "#2d3748", lineHeight: 1.6, margin: 0,
  },
  modalBullet: { flexShrink: 0, fontSize: 16 },

  // Empty state
  empty: {
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    minHeight: 400, textAlign: "center",
    maxWidth: 400, margin: "0 auto",
  },
  emptyIcon:  { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: 700, color: "#fff", margin: "0 0 10px" },
  emptyDesc:  { fontSize: 14, color: "rgba(255,255,255,0.7)", lineHeight: 1.6, margin: "0 0 24px" },
  emptyBtn: {
    background: "#fff", border: "none",
    color: "#553c9a", borderRadius: 10,
    padding: "12px 28px", fontSize: 15,
    fontWeight: 700, cursor: "pointer",
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
  errorBanner: {
    background: "#fff5f5",
    border: "1px solid #fed7d7",
    borderRadius: 10,
    padding: "14px 20px",
    color: "#c53030",
    fontSize: 14,
    maxWidth: 600,
    margin: "0 auto",
  },
};