// ─────────────────────────────────────────────────────────────────────────────
// RiskBadge.jsx — coloured pill for Safe / Moderate / High Risk
//
// Used by: TripCard, Dashboard, TripMap
//
// Props:
//   level : "Safe" | "Moderate" | "High"  (string from backend)
//   size  : "sm" | "md" (default "md")
// ─────────────────────────────────────────────────────────────────────────────

const CONFIG = {
  Safe:     { color: "#38a169", bg: "#e6ffed", border: "#9ae6b4" },
  Moderate: { color: "#d69e2e", bg: "#fffff0", border: "#faf089" },
  High:     { color: "#e53e3e", bg: "#fff5f5", border: "#fed7d7" },
};

export default function RiskBadge({ level = "Moderate", size = "md" }) {
  const cfg      = CONFIG[level] ?? CONFIG.Moderate;
  const fontSize = size === "sm" ? 11 : 13;
  const padding  = size === "sm" ? "3px 10px" : "4px 14px";

  return (
    <span
      style={{
        display: "inline-block",
        borderRadius: 99,
        padding,
        fontSize,
        fontWeight: 700,
        color:      cfg.color,
        background: cfg.bg,
        border:     `1px solid ${cfg.border}`,
        lineHeight: 1.4,
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}
    >
      {level}
    </span>
  );
}