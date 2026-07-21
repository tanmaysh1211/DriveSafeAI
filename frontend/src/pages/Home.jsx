import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Home() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  return (
    <div style={s.root}>
      <section style={s.hero}>
        <div style={s.heroLeft}>
          <h1 style={s.heroTitle}>
            Welcome to<br />DriveSafeAI
          </h1>
          <p style={s.heroDesc}>
            Revolutionizing road safety with cutting-edge AI technology.
            Our platform provides intelligent risk assessment, real-time
            safety monitoring, and smart insurance management to keep
            you protected on every journey.
          </p>
          <div style={s.heroButtons}>
            <button
              style={s.btnPrimary}
              onClick={() => navigate(isAuthenticated ? "/dashboard" : "/register")}
            >
              Get Started
            </button>
            <button
              style={s.btnSecondary}
              onClick={() =>
                document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })
              }
            >
              Learn More
            </button>
          </div>

          <div style={s.miniCards}>
            <MiniCard emoji="🚗" title="Smart Monitoring"   desc="Real-time driving analysis and safety alerts"        color="#6c63ff" />
            <MiniCard emoji="🧠" title="AI Risk Assessment" desc="Predictive safety scoring and recommendations"       color="#f06292" />
          </div>
          <div style={{ marginTop: 16 }}>
            <MiniCard emoji="🛡️" title="Insurance Integration" desc="Seamless policy management and claims"           color="#29b6f6" />
          </div>
        </div>

        <div style={s.heroRight}>
          <div style={s.robotCard}>
            <div style={s.robotEmoji}>🤖</div>
            <p style={s.robotText}>
              AI-Powered<br />Driving Safety<br />Technology
            </p>
          </div>
        </div>
      </section>

      <section id="features" style={s.featuresSection}>
        <h2 style={s.sectionTitle}>Why DriveSafe AI?</h2>
        <p style={s.sectionSub}>
          Everything you need to drive smarter, safer, and save on insurance.
        </p>
        <div style={s.featureGrid}>
          {FEATURES.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </section>

      <section style={s.statsBar}>
        {STATS.map((s2) => (
          <div key={s2.label} style={s.statItem}>
            <span style={s.statValue}>{s2.value}</span>
            <span style={s.statLabel}>{s2.label}</span>
          </div>
        ))}
      </section>

      <footer style={s.footer}>
        <span style={s.footerLogo}>🚗 DriveSafeAI</span>
        <span style={s.footerText}>
          © {new Date().getFullYear()} DriveSafe AI. Built for Finarva AI Hackathon 2025.
        </span>
      </footer>
    </div>
  );
}

function MiniCard({ emoji, title, desc, color }) {
  return (
    <div style={s.miniCard}>
      <div style={{ ...s.miniCardIcon, background: color + "22" }}>
        <span style={{ fontSize: 22 }}>{emoji}</span>
      </div>
      <div>
        <p style={s.miniCardTitle}>{title}</p>
        <p style={s.miniCardDesc}>{desc}</p>
      </div>
    </div>
  );
}

function FeatureCard({ emoji, title, desc, color }) {
  return (
    <div style={s.featureCard}>
      <div style={{ ...s.featureIcon, background: color + "22" }}>
        <span style={{ fontSize: 32 }}>{emoji}</span>
      </div>
      <h3 style={s.featureTitle}>{title}</h3>
      <p style={s.featureDesc}>{desc}</p>
    </div>
  );
}

const FEATURES = [
  { emoji: "🚗", title: "Smart Monitoring",    desc: "Real-time driving analysis with instant safety alerts for every trip.",                                         color: "#6c63ff" },
  { emoji: "🧠", title: "AI Risk Assessment",  desc: "LightGBM-powered DriveScore with predictive safety scoring and personalised recommendations.",                  color: "#f06292" },
  { emoji: "🛡️", title: "Insurance Integration", desc: "Behaviour-based premium calculation — safe driving directly lowers your policy cost.",                       color: "#29b6f6" },
  { emoji: "📊", title: "DRISC Score",         desc: "Recency-weighted risk score over N trips — the B2B metric insurers actually care about.",                       color: "#66bb6a" },
  { emoji: "🗺️", title: "Risk Heatmaps",       desc: "Folium-powered route maps colour-coded by risk level — see exactly where you drive dangerously.",               color: "#ffa726" },
  { emoji: "🎁", title: "Reward Points",       desc: "Earn points for safe driving. Redeem for Swiggy, Amazon, Netflix, Indian Oil and more.",                        color: "#ec407a" },
];

const STATS = [
  { value: "99.9%",  label: "Uptime"             },
  { value: "< 2s",   label: "Score calculation"  },
  { value: "GPT-4o", label: "AI Engine"           },
  { value: "Free",   label: "OWM Weather"         },
];

const s = {
  root: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #4a5568 0%, #553c9a 40%, #b83280 100%)",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    color: "#fff",
  },

  hero: {
    display: "flex",
    alignItems: "flex-start",
    gap: 48,
    padding: "60px 64px 48px",
    maxWidth: 1200,
    margin: "0 auto",
  },
  heroLeft:  { flex: 1, minWidth: 0 },
  heroTitle: {
    fontSize: 52, fontWeight: 800,
    lineHeight: 1.15, margin: "0 0 20px",
    letterSpacing: "-1px",
  },
  heroDesc: {
    fontSize: 16, lineHeight: 1.7,
    color: "rgba(255,255,255,0.85)",
    maxWidth: 520, margin: "0 0 32px",
  },
  heroButtons: { display: "flex", gap: 16, marginBottom: 36 },
  btnPrimary: {
    background: "#f6793a", border: "none",
    color: "#fff", borderRadius: 10,
    padding: "13px 32px", fontSize: 16,
    fontWeight: 700, cursor: "pointer",
    boxShadow: "0 4px 20px rgba(246,121,58,0.4)",
  },
  btnSecondary: {
    background: "transparent",
    border: "2px solid rgba(255,255,255,0.5)",
    color: "#fff", borderRadius: 10,
    padding: "13px 32px", fontSize: 16,
    fontWeight: 600, cursor: "pointer",
  },
  miniCards: { display: "flex", gap: 16 },
  miniCard: {
    background: "rgba(255,255,255,0.1)",
    backdropFilter: "blur(8px)",
    borderRadius: 12, padding: "14px 18px",
    display: "flex", alignItems: "center",
    gap: 14, flex: 1,
    border: "1px solid rgba(255,255,255,0.12)",
  },
  miniCardIcon: {
    width: 44, height: 44, borderRadius: 12,
    display: "flex", alignItems: "center",
    justifyContent: "center", flexShrink: 0,
  },
  miniCardTitle: { fontWeight: 600, fontSize: 14, margin: "0 0 3px" },
  miniCardDesc:  { fontSize: 12, color: "rgba(255,255,255,0.7)", margin: 0, lineHeight: 1.4 },

  heroRight: { flexShrink: 0, width: 360 },
  robotCard: {
    background: "rgba(255,255,255,0.08)",
    backdropFilter: "blur(12px)",
    borderRadius: 20, padding: "60px 40px",
    display: "flex", flexDirection: "column",
    alignItems: "center", gap: 20,
    border: "1px solid rgba(255,255,255,0.12)",
    minHeight: 280, justifyContent: "center",
  },
  robotEmoji: { fontSize: 64 },
  robotText:  { textAlign: "center", fontSize: 18, fontWeight: 600, lineHeight: 1.5, color: "rgba(255,255,255,0.9)", margin: 0 },

  featuresSection: { background: "rgba(0,0,0,0.2)", padding: "64px", textAlign: "center" },
  sectionTitle: { fontSize: 36, fontWeight: 800, margin: "0 0 12px", letterSpacing: "-0.5px" },
  sectionSub:   { fontSize: 16, color: "rgba(255,255,255,0.7)", margin: "0 0 48px" },
  featureGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 24, maxWidth: 1000, margin: "0 auto",
  },
  featureCard: {
    background: "rgba(255,255,255,0.08)",
    backdropFilter: "blur(8px)",
    borderRadius: 16, padding: "28px 24px",
    textAlign: "center",
    border: "1px solid rgba(255,255,255,0.1)",
  },
  featureIcon: {
    width: 64, height: 64, borderRadius: 16,
    display: "flex", alignItems: "center",
    justifyContent: "center", margin: "0 auto 16px",
  },
  featureTitle: { fontSize: 16, fontWeight: 700, margin: "0 0 10px" },
  featureDesc:  { fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.6, margin: 0 },

  statsBar: {
    display: "flex", justifyContent: "center",
    gap: 64, padding: "40px 64px",
    background: "rgba(0,0,0,0.3)",
  },
  statItem:  { display: "flex", flexDirection: "column", alignItems: "center", gap: 6 },
  statValue: { fontSize: 32, fontWeight: 800, color: "#63b3ed" },
  statLabel: { fontSize: 13, color: "rgba(255,255,255,0.65)", textTransform: "uppercase", letterSpacing: "0.5px" },

  footer: {
    display: "flex", alignItems: "center",
    justifyContent: "space-between",
    padding: "20px 64px",
    background: "rgba(0,0,0,0.4)",
    borderTop: "1px solid rgba(255,255,255,0.08)",
  },
  footerLogo: { fontWeight: 700, fontSize: 16, color: "#63b3ed" },
  footerText: { fontSize: 13, color: "rgba(255,255,255,0.45)" },
};
