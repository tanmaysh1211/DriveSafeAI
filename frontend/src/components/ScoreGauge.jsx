export default function ScoreGauge({ score = 0, size = 130, label = "DRISC Score" }) {
  const radius = size * 0.415;                    
  const circ = 2 * Math.PI * radius;            
  const pct = Math.min(Math.max(score, 0), 100) / 100;
  const offset = circ * (1 - pct);                 

  const strokeColor =
   score <= 40 ? "#38a169" : score <= 65 ? "#d69e2e" :"#e53e3e";
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={cx} cy={cy} r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={size * 0.077}
        />
        <circle
          cx={cx} cy={cy} r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={size * 0.077}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: "stroke-dashoffset 0.8s ease, stroke 0.4s ease" }}
        />
        <text
          x={cx} y={cy - size * 0.04}
          textAnchor="middle"
          fontSize={size * 0.17}
          fontWeight={800}
          fill="#1a202c"
          fontFamily="'Segoe UI', system-ui, sans-serif"
        >
          {score?.toFixed(2) ?? "—"}
        </text>
        <text
          x={cx} y={cy + size * 0.11}
          textAnchor="middle"
          fontSize={size * 0.085}
          fill="#a0aec0"
          fontFamily="'Segoe UI', system-ui, sans-serif"
        >
          / 100
        </text>
      </svg>
      {label && (
        <p style={{
          fontSize: 13, color: "#718096",
          margin: 0, fontFamily: "'Segoe UI', system-ui, sans-serif",
        }}>
          {label}
        </p>
      )}
    </div>
  );
}
