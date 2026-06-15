// import { useNavigate } from "react-router-dom";
// import { useAuth } from "../context/AuthContext";
// import { useEffect, useRef } from "react";

// // ─────────────────────────────────────────────────────────────────────────────
// // Home.jsx — Landing page matching the DriveSafe AI hackathon screenshots
// //
// // Sections:
// //   1. Navbar  (logo, nav links, notifications, points, user, logout)
// //   2. Hero    (headline, description, CTA buttons, feature cards, robot card)
// //   3. Features section (full width below fold)
// // ─────────────────────────────────────────────────────────────────────────────

// export default function Home() {
//   const { user, logout, isAuthenticated } = useAuth();
//   const navigate = useNavigate();

//   return (
//     <div style={styles.root}>
//       {/* ── Navbar ─────────────────────────────────────────────────── */}
//       <Navbar
//         user={user}
//         isAuthenticated={isAuthenticated}
//         onLogout={() => { logout(); navigate("/login"); }}
//         onLogin={() => navigate("/login")}
//         onRegister={() => navigate("/register")}
//         navigate={navigate}
//       />

//       {/* ── Hero ───────────────────────────────────────────────────── */}
//       <section style={styles.hero}>
//         <div style={styles.heroLeft}>
//           <h1 style={styles.heroTitle}>
//             Welcome to<br />DriveSafeAI
//           </h1>
//           <p style={styles.heroDesc}>
//             Revolutionizing road safety with cutting-edge AI technology.
//             Our platform provides intelligent risk assessment, real-time
//             safety monitoring, and smart insurance management to keep
//             you protected on every journey.
//           </p>
//           <div style={styles.heroButtons}>
//             <button
//               style={styles.btnPrimary}
//               onClick={() => navigate(isAuthenticated ? "/dashboard" : "/register")}
//             >
//               Get Started
//             </button>
//             <button
//               style={styles.btnSecondary}
//               onClick={() => document.getElementById("features").scrollIntoView({ behavior: "smooth" })}
//             >
//               Learn More
//             </button>
//           </div>

//           {/* Feature mini-cards */}
//           <div style={styles.miniCards}>
//             <MiniCard
//               emoji="🚗"
//               title="Smart Monitoring"
//               desc="Real-time driving analysis and safety alerts"
//               color="#6c63ff"
//             />
//             <MiniCard
//               emoji="🧠"
//               title="AI Risk Assessment"
//               desc="Predictive safety scoring and recommendations"
//               color="#f06292"
//             />
//           </div>
//           <div style={{ marginTop: 16 }}>
//             <MiniCard
//               emoji="🛡️"
//               title="Insurance Integration"
//               desc="Seamless policy management and claims"
//               color="#29b6f6"
//             />
//           </div>
//         </div>

//         {/* Robot card */}
//         <div style={styles.heroRight}>
//           <div style={styles.robotCard}>
//             <div style={styles.robotEmoji}>🤖</div>
//             <p style={styles.robotText}>
//               AI-Powered<br />Driving Safety<br />Technology
//             </p>
//           </div>
//         </div>
//       </section>

//       {/* ── Features section ───────────────────────────────────────── */}
//       <section id="features" style={styles.featuresSection}>
//         <h2 style={styles.sectionTitle}>Why DriveSafe AI?</h2>
//         <p style={styles.sectionSub}>
//           Everything you need to drive smarter, safer, and save on insurance.
//         </p>
//         <div style={styles.featureGrid}>
//           {FEATURES.map((f) => (
//             <FeatureCard key={f.title} {...f} />
//           ))}
//         </div>
//       </section>

//       {/* ── Stats bar ──────────────────────────────────────────────── */}
//       <section style={styles.statsBar}>
//         {STATS.map((s) => (
//           <div key={s.label} style={styles.statItem}>
//             <span style={styles.statValue}>{s.value}</span>
//             <span style={styles.statLabel}>{s.label}</span>
//           </div>
//         ))}
//       </section>

//       {/* ── Footer ─────────────────────────────────────────────────── */}
//       <footer style={styles.footer}>
//         <span style={styles.footerLogo}>🚗 DriveSafeAI</span>
//         <span style={styles.footerText}>
//           © {new Date().getFullYear()} DriveSafe AI. Built for Finarva AI Hackathon 2025.
//         </span>
//       </footer>
//     </div>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // NAVBAR
// // ─────────────────────────────────────────────────────────────────────────────
// function Navbar({ user, isAuthenticated, onLogout, onLogin, onRegister, navigate }) {
//   return (
//     <nav style={styles.navbar}>
//       {/* Logo */}
//       <div style={styles.navLogo} onClick={() => navigate("/")}>
//         <span style={styles.navLogoIcon}>🚗</span>
//         <span style={styles.navLogoText}>DriveSafeAI</span>
//       </div>

//       {/* Nav links — only when logged in */}
//       {isAuthenticated && (
//         <div style={styles.navLinks}>
//           {NAV_LINKS.map((l) => (
//             <button key={l.label} style={styles.navLink} onClick={() => navigate(l.path)}>
//               <span>{l.icon}</span> {l.label}
//             </button>
//           ))}
//         </div>
//       )}

//       {/* Right side */}
//       <div style={styles.navRight}>
//         {isAuthenticated ? (
//           <>
//             {/* Notifications */}
//             <button style={styles.navIconBtn}>
//               🔔 <span style={styles.badge}>{user?.notificationCount ?? 0}</span>
//             </button>

//             {/* Points */}
//             <div style={styles.pointsPill}>
//               ⭐ {user?.totalPoints ?? 0}
//             </div>

//             {/* Welcome */}
//             <div style={styles.welcomePill}>
//               👋 Welcome, {user?.name?.split(" ")[0] ?? "User"}
//             </div>

//             {/* Logout */}
//             <button style={styles.logoutBtn} onClick={onLogout}>
//               Logout
//             </button>
//           </>
//         ) : (
//           <>
//             <button style={styles.loginBtn} onClick={onLogin}>Login</button>
//             <button style={styles.registerBtn} onClick={onRegister}>Register</button>
//           </>
//         )}
//       </div>
//     </nav>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // MINI FEATURE CARD (hero section)
// // ─────────────────────────────────────────────────────────────────────────────
// function MiniCard({ emoji, title, desc, color }) {
//   return (
//     <div style={styles.miniCard}>
//       <div style={{ ...styles.miniCardIcon, background: color + "22" }}>
//         <span style={{ fontSize: 22 }}>{emoji}</span>
//       </div>
//       <div>
//         <p style={styles.miniCardTitle}>{title}</p>
//         <p style={styles.miniCardDesc}>{desc}</p>
//       </div>
//     </div>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // FULL FEATURE CARD (features section)
// // ─────────────────────────────────────────────────────────────────────────────
// function FeatureCard({ emoji, title, desc, color }) {
//   return (
//     <div style={styles.featureCard}>
//       <div style={{ ...styles.featureIcon, background: color + "22" }}>
//         <span style={{ fontSize: 32 }}>{emoji}</span>
//       </div>
//       <h3 style={styles.featureTitle}>{title}</h3>
//       <p style={styles.featureDesc}>{desc}</p>
//     </div>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // DATA
// // ─────────────────────────────────────────────────────────────────────────────
// const NAV_LINKS = [
//   { label: "Home",         path: "/",          icon: "🏠" },
//   { label: "Dashboard",    path: "/dashboard", icon: "📊" },
//   { label: "Trip History", path: "/trips",     icon: "🗺️" },
//   { label: "Insurance",    path: "/insurance", icon: "🛡️" },
// ];

// const FEATURES = [
//   {
//     emoji: "🚗",
//     title: "Smart Monitoring",
//     desc:  "Real-time driving analysis with instant safety alerts for every trip.",
//     color: "#6c63ff",
//   },
//   {
//     emoji: "🧠",
//     title: "AI Risk Assessment",
//     desc:  "LightGBM-powered DriveScore with predictive safety scoring and personalised recommendations.",
//     color: "#f06292",
//   },
//   {
//     emoji: "🛡️",
//     title: "Insurance Integration",
//     desc:  "Behaviour-based premium calculation — safe driving directly lowers your policy cost.",
//     color: "#29b6f6",
//   },
//   {
//     emoji: "📊",
//     title: "DRISC Score",
//     desc:  "Recency-weighted risk score over N trips — the B2B metric insurers actually care about.",
//     color: "#66bb6a",
//   },
//   {
//     emoji: "🗺️",
//     title: "Risk Heatmaps",
//     desc:  "Folium-powered route maps colour-coded by risk level — see exactly where you drive dangerously.",
//     color: "#ffa726",
//   },
//   {
//     emoji: "🎁",
//     title: "Reward Points",
//     desc:  "Earn points for safe driving. Redeem for Swiggy, Amazon, Netflix, Indian Oil and more.",
//     color: "#ec407a",
//   },
// ];

// const STATS = [
//   { value: "99.9%",   label: "Uptime" },
//   { value: "< 2s",    label: "Score calculation" },
//   { value: "GPT-4o",  label: "AI Engine" },
//   { value: "Free",    label: "OWM Weather" },
// ];

// // ─────────────────────────────────────────────────────────────────────────────
// // STYLES — matches the purple/blue gradient aesthetic from screenshots
// // ─────────────────────────────────────────────────────────────────────────────
// const styles = {
//   root: {
//     minHeight: "100vh",
//     background: "linear-gradient(135deg, #4a5568 0%, #553c9a 40%, #b83280 100%)",
//     fontFamily: "'Segoe UI', system-ui, sans-serif",
//     color: "#fff",
//   },

//   // ── Navbar ────────────────────────────────────────────────────────
//   navbar: {
//     display: "flex",
//     alignItems: "center",
//     padding: "0 32px",
//     height: 60,
//     background: "rgba(20, 20, 40, 0.85)",
//     backdropFilter: "blur(12px)",
//     position: "sticky",
//     top: 0,
//     zIndex: 100,
//     gap: 24,
//     borderBottom: "1px solid rgba(255,255,255,0.08)",
//   },
//   navLogo: {
//     display: "flex",
//     alignItems: "center",
//     gap: 8,
//     cursor: "pointer",
//     textDecoration: "none",
//   },
//   navLogoIcon: { fontSize: 22 },
//   navLogoText: {
//     fontWeight: 700,
//     fontSize: 18,
//     color: "#63b3ed",
//     letterSpacing: "-0.3px",
//   },
//   navLinks: {
//     display: "flex",
//     gap: 4,
//     flex: 1,
//   },
//   navLink: {
//     background: "none",
//     border: "none",
//     color: "#e2e8f0",
//     fontSize: 14,
//     cursor: "pointer",
//     padding: "6px 12px",
//     borderRadius: 6,
//     display: "flex",
//     alignItems: "center",
//     gap: 6,
//     transition: "background 0.15s",
//   },
//   navRight: {
//     display: "flex",
//     alignItems: "center",
//     gap: 10,
//     marginLeft: "auto",
//   },
//   navIconBtn: {
//     background: "rgba(255,255,255,0.1)",
//     border: "none",
//     color: "#fff",
//     borderRadius: 8,
//     padding: "6px 12px",
//     cursor: "pointer",
//     fontSize: 14,
//     position: "relative",
//   },
//   badge: {
//     background: "#f6ad55",
//     color: "#1a202c",
//     borderRadius: 99,
//     padding: "1px 6px",
//     fontSize: 11,
//     fontWeight: 700,
//     marginLeft: 4,
//   },
//   pointsPill: {
//     background: "#f6ad55",
//     color: "#1a202c",
//     borderRadius: 99,
//     padding: "5px 14px",
//     fontWeight: 700,
//     fontSize: 14,
//   },
//   welcomePill: {
//     background: "rgba(255,255,255,0.12)",
//     borderRadius: 8,
//     padding: "5px 14px",
//     fontSize: 14,
//     fontWeight: 500,
//   },
//   logoutBtn: {
//     background: "transparent",
//     border: "1.5px solid rgba(255,255,255,0.3)",
//     color: "#fff",
//     borderRadius: 8,
//     padding: "5px 16px",
//     fontSize: 14,
//     cursor: "pointer",
//     fontWeight: 500,
//   },
//   loginBtn: {
//     background: "rgba(255,255,255,0.12)",
//     border: "none",
//     color: "#fff",
//     borderRadius: 8,
//     padding: "6px 18px",
//     fontSize: 14,
//     cursor: "pointer",
//     fontWeight: 500,
//   },
//   registerBtn: {
//     background: "#38a169",
//     border: "none",
//     color: "#fff",
//     borderRadius: 8,
//     padding: "6px 18px",
//     fontSize: 14,
//     cursor: "pointer",
//     fontWeight: 600,
//   },

//   // ── Hero ──────────────────────────────────────────────────────────
//   hero: {
//     display: "flex",
//     alignItems: "flex-start",
//     gap: 48,
//     padding: "60px 64px 48px",
//     maxWidth: 1200,
//     margin: "0 auto",
//   },
//   heroLeft: {
//     flex: 1,
//     minWidth: 0,
//   },
//   heroTitle: {
//     fontSize: 52,
//     fontWeight: 800,
//     lineHeight: 1.15,
//     margin: "0 0 20px",
//     letterSpacing: "-1px",
//   },
//   heroDesc: {
//     fontSize: 16,
//     lineHeight: 1.7,
//     color: "rgba(255,255,255,0.85)",
//     maxWidth: 520,
//     margin: "0 0 32px",
//   },
//   heroButtons: {
//     display: "flex",
//     gap: 16,
//     marginBottom: 36,
//   },
//   btnPrimary: {
//     background: "#f6793a",
//     border: "none",
//     color: "#fff",
//     borderRadius: 10,
//     padding: "13px 32px",
//     fontSize: 16,
//     fontWeight: 700,
//     cursor: "pointer",
//     boxShadow: "0 4px 20px rgba(246,121,58,0.4)",
//     transition: "transform 0.15s, box-shadow 0.15s",
//   },
//   btnSecondary: {
//     background: "transparent",
//     border: "2px solid rgba(255,255,255,0.5)",
//     color: "#fff",
//     borderRadius: 10,
//     padding: "13px 32px",
//     fontSize: 16,
//     fontWeight: 600,
//     cursor: "pointer",
//     transition: "border-color 0.15s",
//   },
//   miniCards: {
//     display: "flex",
//     gap: 16,
//   },
//   miniCard: {
//     background: "rgba(255,255,255,0.1)",
//     backdropFilter: "blur(8px)",
//     borderRadius: 12,
//     padding: "14px 18px",
//     display: "flex",
//     alignItems: "center",
//     gap: 14,
//     flex: 1,
//     border: "1px solid rgba(255,255,255,0.12)",
//   },
//   miniCardIcon: {
//     width: 44,
//     height: 44,
//     borderRadius: 12,
//     display: "flex",
//     alignItems: "center",
//     justifyContent: "center",
//     flexShrink: 0,
//   },
//   miniCardTitle: {
//     fontWeight: 600,
//     fontSize: 14,
//     margin: "0 0 3px",
//   },
//   miniCardDesc: {
//     fontSize: 12,
//     color: "rgba(255,255,255,0.7)",
//     margin: 0,
//     lineHeight: 1.4,
//   },

//   // Robot card
//   heroRight: {
//     flexShrink: 0,
//     width: 360,
//   },
//   robotCard: {
//     background: "rgba(255,255,255,0.08)",
//     backdropFilter: "blur(12px)",
//     borderRadius: 20,
//     padding: "60px 40px",
//     display: "flex",
//     flexDirection: "column",
//     alignItems: "center",
//     gap: 20,
//     border: "1px solid rgba(255,255,255,0.12)",
//     minHeight: 280,
//     justifyContent: "center",
//   },
//   robotEmoji: { fontSize: 64 },
//   robotText: {
//     textAlign: "center",
//     fontSize: 18,
//     fontWeight: 600,
//     lineHeight: 1.5,
//     color: "rgba(255,255,255,0.9)",
//     margin: 0,
//   },

//   // ── Features section ──────────────────────────────────────────────
//   featuresSection: {
//     background: "rgba(0,0,0,0.2)",
//     padding: "64px",
//     textAlign: "center",
//   },
//   sectionTitle: {
//     fontSize: 36,
//     fontWeight: 800,
//     margin: "0 0 12px",
//     letterSpacing: "-0.5px",
//   },
//   sectionSub: {
//     fontSize: 16,
//     color: "rgba(255,255,255,0.7)",
//     margin: "0 0 48px",
//   },
//   featureGrid: {
//     display: "grid",
//     gridTemplateColumns: "repeat(3, 1fr)",
//     gap: 24,
//     maxWidth: 1000,
//     margin: "0 auto",
//   },
//   featureCard: {
//     background: "rgba(255,255,255,0.08)",
//     backdropFilter: "blur(8px)",
//     borderRadius: 16,
//     padding: "28px 24px",
//     textAlign: "center",
//     border: "1px solid rgba(255,255,255,0.1)",
//     transition: "transform 0.2s, box-shadow 0.2s",
//   },
//   featureIcon: {
//     width: 64,
//     height: 64,
//     borderRadius: 16,
//     display: "flex",
//     alignItems: "center",
//     justifyContent: "center",
//     margin: "0 auto 16px",
//   },
//   featureTitle: {
//     fontSize: 16,
//     fontWeight: 700,
//     margin: "0 0 10px",
//   },
//   featureDesc: {
//     fontSize: 13,
//     color: "rgba(255,255,255,0.7)",
//     lineHeight: 1.6,
//     margin: 0,
//   },

//   // ── Stats bar ─────────────────────────────────────────────────────
//   statsBar: {
//     display: "flex",
//     justifyContent: "center",
//     gap: 64,
//     padding: "40px 64px",
//     background: "rgba(0,0,0,0.3)",
//   },
//   statItem: {
//     display: "flex",
//     flexDirection: "column",
//     alignItems: "center",
//     gap: 6,
//   },
//   statValue: {
//     fontSize: 32,
//     fontWeight: 800,
//     color: "#63b3ed",
//   },
//   statLabel: {
//     fontSize: 13,
//     color: "rgba(255,255,255,0.65)",
//     textTransform: "uppercase",
//     letterSpacing: "0.5px",
//   },

//   // ── Footer ────────────────────────────────────────────────────────
//   footer: {
//     display: "flex",
//     alignItems: "center",
//     justifyContent: "space-between",
//     padding: "20px 64px",
//     background: "rgba(0,0,0,0.4)",
//     borderTop: "1px solid rgba(255,255,255,0.08)",
//   },
//   footerLogo: {
//     fontWeight: 700,
//     fontSize: 16,
//     color: "#63b3ed",
//   },
//   footerText: {
//     fontSize: 13,
//     color: "rgba(255,255,255,0.45)",
//   },
// };






import { useNavigate } from "react-router-dom";
import { useAuth }     from "../context/AuthContext";

// ─────────────────────────────────────────────────────────────────────────────
// Home.jsx — Landing page
//
// FIX: Removed the inline Navbar component that was causing the double navbar.
// The global <Navbar /> in App.jsx already renders on this page.
// This file only renders the hero section and page content.
// ─────────────────────────────────────────────────────────────────────────────

export default function Home() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  return (
    <div style={s.root}>
      {/* ── Hero ───────────────────────────────────────────────── */}
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

          {/* Mini feature cards */}
          <div style={s.miniCards}>
            <MiniCard emoji="🚗" title="Smart Monitoring"   desc="Real-time driving analysis and safety alerts"        color="#6c63ff" />
            <MiniCard emoji="🧠" title="AI Risk Assessment" desc="Predictive safety scoring and recommendations"       color="#f06292" />
          </div>
          <div style={{ marginTop: 16 }}>
            <MiniCard emoji="🛡️" title="Insurance Integration" desc="Seamless policy management and claims"           color="#29b6f6" />
          </div>
        </div>

        {/* Robot card */}
        <div style={s.heroRight}>
          <div style={s.robotCard}>
            <div style={s.robotEmoji}>🤖</div>
            <p style={s.robotText}>
              AI-Powered<br />Driving Safety<br />Technology
            </p>
          </div>
        </div>
      </section>

      {/* ── Features section ───────────────────────────────────── */}
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

      {/* ── Stats bar ──────────────────────────────────────────── */}
      <section style={s.statsBar}>
        {STATS.map((s2) => (
          <div key={s2.label} style={s.statItem}>
            <span style={s.statValue}>{s2.value}</span>
            <span style={s.statLabel}>{s2.label}</span>
          </div>
        ))}
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer style={s.footer}>
        <span style={s.footerLogo}>🚗 DriveSafeAI</span>
        <span style={s.footerText}>
          © {new Date().getFullYear()} DriveSafe AI. Built for Finarva AI Hackathon 2025.
        </span>
      </footer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MINI FEATURE CARD
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// FULL FEATURE CARD
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const s = {
  root: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #4a5568 0%, #553c9a 40%, #b83280 100%)",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    color: "#fff",
  },

  // Hero
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

  // Robot card
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

  // Features section
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

  // Stats bar
  statsBar: {
    display: "flex", justifyContent: "center",
    gap: 64, padding: "40px 64px",
    background: "rgba(0,0,0,0.3)",
  },
  statItem:  { display: "flex", flexDirection: "column", alignItems: "center", gap: 6 },
  statValue: { fontSize: 32, fontWeight: 800, color: "#63b3ed" },
  statLabel: { fontSize: 13, color: "rgba(255,255,255,0.65)", textTransform: "uppercase", letterSpacing: "0.5px" },

  // Footer
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