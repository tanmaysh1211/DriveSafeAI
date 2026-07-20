import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";

export default function TripMap() {
  const { tripId }  = useParams();
  const navigate    = useNavigate();
  const [trip,     setTrip]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [mapType,  setMapType]  = useState("route");  
  const [iframeKey, setIframeKey] = useState(0);        

  useEffect(() => {
    loadTrip();
  }, [tripId]);

  const loadTrip = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/trips/detail/${tripId}`);
      setTrip(res.data);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load trip details");
    } finally {
      setLoading(false);
    }
  };

  const mapUrl = mapType === "route" ? trip?.mapUrl : trip?.heatmapUrl ?? trip?.mapUrl;
  const riskColor = RISK_COLORS[trip?.riskLevel] ?? "#e53e3e";

  if (loading) return <Shell><Spinner /></Shell>;
  if (error)   return <Shell><ErrorBanner msg={error} onBack={() => navigate("/trips")} /></Shell>;
  if (!trip)   return null;

  return (
    <Shell>
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => navigate("/trips")}>
          ← Back to Trips
        </button>

        <div style={s.headerMid}>
          <h2 style={s.headerTitle}>🗺️ Trip #{tripId} — Map Analysis</h2>
          <RiskBadge level={trip.riskLevel} color={riskColor} />
        </div>

        <div style={s.toggle}>
          <button
            style={mapType === "route" ? s.toggleActive : s.toggleBtn}
            onClick={() => { setMapType("route"); setIframeKey((k) => k + 1); }}
          >
            🗺️ Route Map
          </button>
          <button
            style={mapType === "heatmap" ? s.toggleActive : s.toggleBtn}
            onClick={() => { setMapType("heatmap"); setIframeKey((k) => k + 1); }}
          >
            🔥 Heatmap
          </button>
        </div>
      </div>

      <div style={s.body}>
        <div style={s.mapContainer}>
          {mapUrl ? (
            <iframe
              key={iframeKey}
              src={mapUrl}
              title={`Trip ${tripId} Map`}
              style={s.iframe}
              frameBorder={0}
            />
          ) : (
            <NoMapPlaceholder />
          )}
        </div>

        <div style={s.sidebar}>
          <div style={s.sideCard}>
            <h3 style={s.sideCardTitle}>📊 Trip Statistics</h3>
            <StatRow
              icon="●"
              iconColor="#e53e3e"
              label="Drive Score"
              value={`${trip.driveScore?.toFixed(2) ?? "—"} / 100`}
            />
            <StatRow
              icon="⊞"
              iconColor="#3182ce"
              label="Max Speed"
              value={`${trip.maxSpeed?.toFixed(1) ?? "—"} km/h`}
            />
            <StatRow
              icon="●"
              iconColor="#e53e3e"
              label="Avg Speed"
              value={`${trip.avgSpeed?.toFixed(1) ?? "—"} km/h`}
            />
            <StatRow
              icon="▲"
              iconColor="#f6ad55"
              label="Hard Braking"
              value={`${trip.hardBrakingCount ?? "—"} events`}
            />
            <StatRow
              icon="↺"
              iconColor="#9f7aea"
              label="Sharp Turns"
              value={`${trip.sharpTurnCount ?? "—"} events`}
            />
            <StatRow
              icon="📍"
              iconColor="#38a169"
              label="Distance"
              value={`${trip.distanceKm?.toFixed(2) ?? "—"} km`}
            />
          </div>

          <div style={s.sideCard}>
            <h3 style={s.sideCardTitle}>🌤️ Conditions</h3>
            <div style={s.condPills}>
              <CondPill
                label={trip.isDaytime ? "☀️ Daytime" : "🌙 Night"}
                bg={trip.isDaytime ? "#f6ad55" : "#4a5568"}
              />
              {trip.weatherCondition && (
                <CondPill label={`🌤️ ${trip.weatherCondition}`} bg="#3182ce" />
              )}
            </div>
          </div>

          <div style={s.sideCard}>
            <h3 style={s.sideCardTitle}>🚗 DriveSafe AI Risk Levels</h3>
            <LegendRow color="#e74c3c" label="High Risk (6–10)" />
            <LegendRow color="#f39c12" label="Medium Risk (3–6)" />
            <LegendRow color="#27ae60" label="Low Risk (0–3)" />
            <div style={s.legendDivider} />
            <LegendRow color="#27ae60" label="▶ Trip Start" shape="triangle" />
            <LegendRow color="#2c3e50" label="■ Trip End"   shape="square"   />
          </div>

          {trip.aiRecommendation && (
            <div style={{ ...s.sideCard, background: "#f0fff4", borderColor: "#9ae6b4" }}>
              <h3 style={{ ...s.sideCardTitle, color: "#276749" }}>
                🤖 AI Recommendation
              </h3>
              {trip.aiRecommendation.split("\n").filter(Boolean).map((line, i) => (
                <p key={i} style={s.aiLine}>💡 {line}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div style={s.root}>
      {children}
    </div>
  );
}

function RiskBadge({ level, color }) {
  return (
    <span style={{ ...s.riskBadge, color, background: color + "18", border: `1px solid ${color}44` }}>
      {level}
    </span>
  );
}

function StatRow({ icon, iconColor, label, value }) {
  return (
    <div style={s.statRow}>
      <span style={{ ...s.statIcon, color: iconColor }}>{icon}</span>
      <span style={s.statLabel}>{label}</span>
      <span style={s.statValue}>{value}</span>
    </div>
  );
}

function LegendRow({ color, label }) {
  return (
    <div style={s.legendRow}>
      <span style={{ ...s.legendDot, color }}>●</span>
      <span style={s.legendLabel}>{label}</span>
    </div>
  );
}

function CondPill({ label, bg }) {
  return (
    <span style={{ ...s.condPill, background: bg }}>{label}</span>
  );
}

function NoMapPlaceholder() {
  return (
    <div style={s.noMap}>
      <p style={s.noMapIcon}>🗺️</p>
      <p style={s.noMapTitle}>Map not available</p>
      <p style={s.noMapDesc}>
        The Folium map for this trip hasn't been generated yet.
        Re-upload the trip CSV to generate the map.
      </p>
    </div>
  );
}

function Spinner() {
  return (
    <div style={s.center}>
      <div style={s.spinner} />
      <p style={{ color: "#718096", marginTop: 16 }}>Loading map…</p>
    </div>
  );
}

function ErrorBanner({ msg, onBack }) {
  return (
    <div style={s.center}>
      <div style={s.errorBox}>
        <p style={{ color: "#c53030", margin: "0 0 12px" }}>⚠️ {msg}</p>
        <button style={s.backBtn} onClick={onBack}>← Back to Trips</button>
      </div>
    </div>
  );
}

const RISK_COLORS = {
  Safe:     "#38a169",
  Moderate: "#d69e2e",
  High:     "#e53e3e",
};

const s = {
  root: {
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    background: "#f0f2f5",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    overflow: "hidden",
  },

  header: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "12px 24px",
    background: "#fff",
    borderBottom: "1px solid #e2e8f0",
    flexShrink: 0,
  },
  backBtn: {
    background: "#f7fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    padding: "8px 16px",
    fontSize: 14,
    color: "#4a5568",
    cursor: "pointer",
    fontWeight: 500,
    flexShrink: 0,
  },
  headerMid: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 800,
    color: "#1a202c",
    margin: 0,
  },
  riskBadge: {
    borderRadius: 99,
    padding: "4px 14px",
    fontSize: 13,
    fontWeight: 700,
  },

  toggle: {
    display: "flex",
    background: "#f7fafc",
    borderRadius: 10,
    padding: 4,
    gap: 4,
    border: "1px solid #e2e8f0",
  },
  toggleBtn: {
    background: "none",
    border: "none",
    borderRadius: 7,
    padding: "7px 16px",
    fontSize: 13,
    color: "#718096",
    cursor: "pointer",
    fontWeight: 500,
  },
  toggleActive: {
    background: "#fff",
    border: "none",
    borderRadius: 7,
    padding: "7px 16px",
    fontSize: 13,
    color: "#553c9a",
    cursor: "pointer",
    fontWeight: 700,
    boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
  },

  body: {
    flex: 1,
    display: "flex",
    overflow: "hidden",
  },

  mapContainer: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
  },
  iframe: {
    width: "100%",
    height: "100%",
    border: "none",
    display: "block",
  },

  sidebar: {
    width: 300,
    flexShrink: 0,
    overflowY: "auto",
    padding: "16px",
    background: "#f0f2f5",
    display: "flex",
    flexDirection: "column",
    gap: 14,
    borderLeft: "1px solid #e2e8f0",
  },

  sideCard: {
    background: "#fff",
    borderRadius: 12,
    padding: "16px",
    boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
    border: "1px solid #e2e8f0",
  },
  sideCardTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: "#1a202c",
    margin: "0 0 14px",
  },

  statRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "5px 0",
    borderBottom: "1px solid #f7fafc",
  },
  statIcon:  { fontSize: 12, width: 18, flexShrink: 0 },
  statLabel: { flex: 1, fontSize: 13, color: "#718096" },
  statValue: { fontSize: 13, fontWeight: 600, color: "#2d3748" },

  condPills: { display: "flex", flexWrap: "wrap", gap: 8 },
  condPill: {
    borderRadius: 99,
    padding: "5px 12px",
    color: "#fff",
    fontSize: 12,
    fontWeight: 500,
  },

  legendRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  legendDot:     { fontSize: 14, lineHeight: 1 },
  legendLabel:   { fontSize: 13, color: "#4a5568" },
  legendDivider: { height: 1, background: "#e2e8f0", margin: "8px 0" },

  aiLine: {
    fontSize: 13,
    color: "#276749",
    lineHeight: 1.6,
    margin: "0 0 8px",
  },

  noMap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    padding: 40,
    textAlign: "center",
  },
  noMapIcon:  { fontSize: 64, margin: "0 0 16px" },
  noMapTitle: { fontSize: 20, fontWeight: 700, color: "#4a5568", margin: "0 0 10px" },
  noMapDesc:  { fontSize: 14, color: "#a0aec0", lineHeight: 1.6 },

  center: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  spinner: {
    width: 40,
    height: 40,
    border: "4px solid #e2e8f0",
    borderTopColor: "#553c9a",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  errorBox: {
    background: "#fff",
    borderRadius: 12,
    padding: "24px 32px",
    textAlign: "center",
    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
  },
};
