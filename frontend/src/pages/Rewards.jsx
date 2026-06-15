import { useState, useEffect } from "react";
import { useAuth }             from "../context/AuthContext";
import api                     from "../services/api";

// ─────────────────────────────────────────────────────────────────────────────
// Rewards.jsx — Rewards Store
//
// Matches screenshots exactly:
//   Header : "Rewards Store" + subtitle + "90 Points" pill top-right
//   Title  : "Popular Rewards" + subtitle
//   Grid   : 3-column cards — emoji, name, description, value, points cost
//   Card   : "Insufficient Points" grey button or active "Redeem" button
//   Brands : Burger King, Indian Oil, Swiggy, Amazon, Netflix, Spotify, Zomato
//   Filter : category tabs (All / Food / Fuel / Shopping / Entertainment)
// ─────────────────────────────────────────────────────────────────────────────

export default function Rewards() {
  const { user, updatePoints } = useAuth();

  const [rewards,    setRewards]    = useState([]);
  const [points,     setPoints]     = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [category,   setCategory]   = useState("All");
  const [redeeming,  setRedeeming]  = useState(null);  // rewardId being redeemed
  const [redeemResult, setRedeemResult] = useState(null); // modal data
  const [history,    setHistory]    = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    fetchAll();
  }, [user]);

  const fetchAll = async () => {
    setLoading(true);
    setError("");
    try {
      const [rewardsRes, pointsRes] = await Promise.all([
        api.get("/rewards/store"),
        user?.userId ? api.get(`/rewards/points/${user.userId}`) : Promise.resolve({ data: { points: 0 } }),
      ]);
      setRewards(rewardsRes.data);
      setPoints(pointsRes.data.points ?? 0);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load rewards");
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await api.get(`/rewards/history/${user.userId}`);
      setHistory(res.data);
      setShowHistory(true);
    } catch {
      setHistory([]);
      setShowHistory(true);
    }
  };

  const handleRedeem = async (reward) => {
    if (points < reward.pointsCost) return;
    setRedeeming(reward.id);
    try {
      const res = await api.post("/rewards/redeem", {
        userId:   user.userId,
        rewardId: reward.id,
      });
      setPoints(res.data.remainingPoints);
      if (updatePoints) updatePoints(res.data.remainingPoints);
      setRedeemResult(res.data);
    } catch (e) {
      setRedeemResult({
        error: e?.response?.data?.message || "Redemption failed. Please try again.",
      });
    } finally {
      setRedeeming(null);
    }
  };

  // Filter rewards by selected category
  const categories   = ["All", ...new Set(rewards.map((r) => r.category))];
  const filteredList = category === "All"
    ? rewards
    : rewards.filter((r) => r.category?.toLowerCase() === category.toLowerCase());

  return (
    <div style={s.root}>
      {/* ── Rewards Store header — matches screenshot ────────────── */}
      <div style={s.storeHeader}>
        <div style={s.storeHeaderLeft}>
          <span style={s.storeHeaderIcon}>🎁</span>
          <div>
            <h2 style={s.storeHeaderTitle}>Rewards Store</h2>
            <p style={s.storeHeaderSub}>Redeem your points for amazing offers</p>
          </div>
        </div>
        <div style={s.pointsPill}>
          ⭐ {points} Points
        </div>
      </div>

      {/* ── Category tabs ─────────────────────────────────────────── */}
      <div style={s.tabs}>
        {categories.map((cat) => (
          <button
            key={cat}
            style={cat === category ? s.tabActive : s.tab}
            onClick={() => setCategory(cat)}
          >
            {CAT_ICONS[cat] ?? "🏷️"} {cat}
          </button>
        ))}
        <button style={s.historyBtn} onClick={fetchHistory}>
          📜 My Redemptions
        </button>
      </div>

      {/* ── Page title ────────────────────────────────────────────── */}
      <div style={s.storeBody}>
        <h1 style={s.storeTitle}>Popular Rewards</h1>
        <p style={s.storeSub}>
          Choose from our selection of premium rewards and offers
        </p>

        {/* ── States ──────────────────────────────────────────────── */}
        {loading && <Spinner />}
        {error   && <ErrorBanner msg={error} />}

        {/* ── Reward grid ───────────────────────────────────────────── */}
        {!loading && !error && (
          filteredList.length === 0 ? (
            <EmptyCategory category={category} />
          ) : (
            <div style={s.grid}>
              {filteredList.map((reward) => (
                <RewardCard
                  key={reward.id}
                  reward={reward}
                  userPoints={points}
                  isRedeeming={redeeming === reward.id}
                  onRedeem={() => handleRedeem(reward)}
                />
              ))}
            </div>
          )
        )}

        {/* ── Points earning guide ──────────────────────────────────── */}
        <div style={s.earningGuide}>
          <h3 style={s.guideTitle}>💡 How to earn more points</h3>
          <div style={s.guideGrid}>
            {EARNING_GUIDE.map((g) => (
              <div key={g.label} style={s.guideCard}>
                <span style={s.guideEmoji}>{g.emoji}</span>
                <div>
                  <p style={s.guideLabel}>{g.label}</p>
                  <p style={s.guidePoints}>{g.points}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Redemption success / error modal ─────────────────────── */}
      {redeemResult && (
        <RedeemModal
          result={redeemResult}
          onClose={() => setRedeemResult(null)}
        />
      )}

      {/* ── Redemption history modal ──────────────────────────────── */}
      {showHistory && (
        <HistoryModal
          history={history}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REWARD CARD — matches screenshots exactly
// ─────────────────────────────────────────────────────────────────────────────
function RewardCard({ reward, userPoints, isRedeeming, onRedeem }) {
  const canAfford  = userPoints >= reward.pointsCost;
  const isDisabled = !canAfford || isRedeeming;

  return (
    <div style={{
      ...s.rewardCard,
      opacity: canAfford ? 1 : 0.75,
    }}>
      {/* Brand emoji */}
      <div style={s.rewardEmoji}>
        {reward.emoji ?? BRAND_EMOJIS[reward.name] ?? "🎁"}
      </div>

      {/* Name + description */}
      <h3 style={s.rewardName}>{reward.name}</h3>
      <p style={s.rewardDesc}>{reward.description}</p>

      {/* Value */}
      <p style={s.rewardValue}>
        ₹{reward.value?.toLocaleString("en-IN") ?? "—"}
        <span style={s.rewardValueLabel}> value</span>
      </p>

      {/* Points cost */}
      <p style={s.rewardPoints}>
        ⭐ {reward.pointsCost?.toLocaleString("en-IN") ?? "—"} points
      </p>

      {/* CTA button */}
      <button
        style={isDisabled ? s.insufficientBtn : s.redeemBtn}
        onClick={isDisabled ? undefined : onRedeem}
        disabled={isDisabled}
      >
        {isRedeeming
          ? "Redeeming…"
          : canAfford
            ? "✓ Redeem Now"
            : "+ Insufficient Points"}
      </button>

      {/* Progress bar showing how close user is */}
      {!canAfford && (
        <div style={s.progressWrap}>
          <div style={s.progressBar}>
            <div
              style={{
                ...s.progressFill,
                width: `${Math.min(100, (userPoints / reward.pointsCost) * 100)}%`,
              }}
            />
          </div>
          <p style={s.progressHint}>
            {userPoints} / {reward.pointsCost} pts
          </p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REDEEM SUCCESS/ERROR MODAL
// ─────────────────────────────────────────────────────────────────────────────
function RedeemModal({ result, onClose }) {
  const isError = !!result.error;
  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        <div style={s.modalHeader}>
          <h3 style={s.modalTitle}>
            {isError ? "❌ Redemption Failed" : "✅ Redeemed!"}
          </h3>
          <button style={s.modalClose} onClick={onClose}>✕</button>
        </div>

        {isError ? (
          <p style={{ color: "#e53e3e", fontSize: 14 }}>{result.error}</p>
        ) : (
          <div style={s.redeemSuccess}>
            <p style={s.redeemSuccessReward}>{result.rewardName}</p>
            <div style={s.redeemCodeBox}>
              <p style={s.redeemCodeLabel}>Your Redemption Code</p>
              <p style={s.redeemCode}>{result.redemptionCode}</p>
              <p style={s.redeemCodeHint}>
                Show this code at the partner outlet or enter it in the app.
              </p>
            </div>
            <div style={s.redeemStats}>
              <div style={s.redeemStat}>
                <span style={s.redeemStatLabel}>Points Deducted</span>
                <span style={{ ...s.redeemStatValue, color: "#e53e3e" }}>
                  -{result.pointsDeducted}
                </span>
              </div>
              <div style={s.redeemStat}>
                <span style={s.redeemStatLabel}>Remaining Balance</span>
                <span style={{ ...s.redeemStatValue, color: "#38a169" }}>
                  {result.remainingPoints} pts
                </span>
              </div>
              <div style={s.redeemStat}>
                <span style={s.redeemStatLabel}>Voucher Value</span>
                <span style={{ ...s.redeemStatValue, color: "#553c9a" }}>
                  ₹{result.rewardValue}
                </span>
              </div>
            </div>
          </div>
        )}

        <button style={s.modalDoneBtn} onClick={onClose}>Done</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HISTORY MODAL
// ─────────────────────────────────────────────────────────────────────────────
function HistoryModal({ history, onClose }) {
  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={{ ...s.modal, maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <div style={s.modalHeader}>
          <h3 style={s.modalTitle}>📜 Redemption History</h3>
          <button style={s.modalClose} onClick={onClose}>✕</button>
        </div>
        {history.length === 0 ? (
          <p style={{ color: "#718096", textAlign: "center", padding: "24px 0" }}>
            No redemptions yet. Start redeeming your points!
          </p>
        ) : (
          <div style={s.historyList}>
            {history.map((h) => (
              <div key={h.redemptionId} style={s.historyItem}>
                <div style={s.historyLeft}>
                  <p style={s.historyName}>{h.rewardName}</p>
                  <p style={s.historyDate}>
                    {new Date(h.redeemedAt).toLocaleDateString("en-IN", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </p>
                </div>
                <div style={s.historyRight}>
                  <p style={s.historyCode}>{h.redemptionCode}</p>
                  <p style={s.historyPoints}>-{h.pointsSpent} pts</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SMALL COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div style={s.center}>
      <div style={s.spinner} />
      <p style={{ color: "rgba(255,255,255,0.7)", marginTop: 16 }}>Loading rewards…</p>
    </div>
  );
}

function ErrorBanner({ msg }) {
  return (
    <div style={s.errorBanner}>⚠️ {msg}</div>
  );
}

function EmptyCategory({ category }) {
  return (
    <div style={{ ...s.center, minHeight: 200 }}>
      <p style={{ fontSize: 40, marginBottom: 12 }}>
        {CAT_ICONS[category] ?? "🏷️"}
      </p>
      <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 15 }}>
        No rewards in the "{category}" category yet.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────────────────────

const CAT_ICONS = {
  All:           "🏷️",
  food:          "🍽️",
  fuel:          "⛽",
  shopping:      "🛍️",
  entertainment: "🎬",
};

// Fallback emojis if the backend doesn't supply them
const BRAND_EMOJIS = {
  "Burger King": "🍔",
  "Indian Oil":  "⛽",
  "Swiggy":      "🍽️",
  "Amazon":      "📦",
  "Netflix":     "🎬",
  "Spotify":     "🎵",
  "Zomato":      "🍕",
};

const EARNING_GUIDE = [
  { emoji: "🟢", label: "Safe trip (score ≤ 40)",     points: "+50 points" },
  { emoji: "🟡", label: "Moderate trip (score ≤ 65)", points: "+25 points" },
  { emoji: "🔴", label: "High-risk trip (score > 65)", points: "+10 points" },
];

// ─────────────────────────────────────────────────────────────────────────────
// STYLES — matches the purple/blue gradient from screenshots
// ─────────────────────────────────────────────────────────────────────────────
const s = {
  root: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #4a5568 0%, #553c9a 40%, #b83280 100%)",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },

  // Store header — top strip matching screenshot
  storeHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 32px",
    background: "rgba(255,255,255,0.08)",
    backdropFilter: "blur(8px)",
    borderBottom: "1px solid rgba(255,255,255,0.12)",
  },
  storeHeaderLeft: {
    display: "flex",
    alignItems: "center",
    gap: 14,
  },
  storeHeaderIcon:  { fontSize: 32 },
  storeHeaderTitle: { fontSize: 20, fontWeight: 800, color: "#fff", margin: 0 },
  storeHeaderSub:   { fontSize: 13, color: "rgba(255,255,255,0.65)", margin: "3px 0 0" },
  pointsPill: {
    background: "rgba(255,255,255,0.15)",
    border: "1.5px solid rgba(255,255,255,0.3)",
    borderRadius: 99,
    padding: "8px 20px",
    color: "#fff",
    fontSize: 15,
    fontWeight: 700,
  },

  // Category tabs
  tabs: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "14px 32px",
    flexWrap: "wrap",
  },
  tab: {
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: 99, padding: "7px 18px",
    color: "rgba(255,255,255,0.8)", fontSize: 13,
    cursor: "pointer", fontWeight: 500,
  },
  tabActive: {
    background: "#fff",
    border: "1px solid #fff",
    borderRadius: 99, padding: "7px 18px",
    color: "#553c9a", fontSize: 13,
    cursor: "pointer", fontWeight: 700,
  },
  historyBtn: {
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: 99, padding: "7px 18px",
    color: "rgba(255,255,255,0.7)", fontSize: 13,
    cursor: "pointer", marginLeft: "auto",
  },

  // Store body
  storeBody: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "0 24px 48px",
  },
  storeTitle: {
    fontSize: 32, fontWeight: 800, color: "#fff",
    textAlign: "center", margin: "24px 0 8px",
  },
  storeSub: {
    fontSize: 15, color: "rgba(255,255,255,0.7)",
    textAlign: "center", margin: "0 0 32px",
  },

  // Reward grid — 3 columns matching screenshots
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 20,
  },

  // Reward card — matches screenshots exactly
  rewardCard: {
    background: "rgba(255,255,255,0.12)",
    backdropFilter: "blur(8px)",
    borderRadius: 16,
    padding: "24px",
    border: "1px solid rgba(255,255,255,0.15)",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    transition: "transform 0.15s, box-shadow 0.15s",
  },
  rewardEmoji: { fontSize: 36, marginBottom: 4 },
  rewardName:  { fontSize: 18, fontWeight: 700, color: "#fff", margin: 0 },
  rewardDesc:  { fontSize: 13, color: "rgba(255,255,255,0.65)", margin: 0 },
  rewardValue: {
    fontSize: 22, fontWeight: 800, color: "#f6ad55", margin: "4px 0 0",
  },
  rewardValueLabel: { fontSize: 14, fontWeight: 400, color: "rgba(255,255,255,0.6)" },
  rewardPoints: {
    fontSize: 14, color: "rgba(255,255,255,0.75)",
    fontWeight: 600, margin: 0,
  },

  // Insufficient points button — grey, matches screenshot
  insufficientBtn: {
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 8, padding: "10px",
    color: "rgba(255,255,255,0.45)", fontSize: 13,
    cursor: "not-allowed", width: "100%", fontWeight: 500,
    marginTop: 4,
  },

  // Redeem button — active, purple
  redeemBtn: {
    background: "linear-gradient(135deg, #553c9a, #b83280)",
    border: "none", borderRadius: 8, padding: "10px",
    color: "#fff", fontSize: 13, fontWeight: 700,
    cursor: "pointer", width: "100%", marginTop: 4,
    boxShadow: "0 4px 12px rgba(85,60,154,0.35)",
  },

  // Progress bar for partially affordable rewards
  progressWrap: { marginTop: 4 },
  progressBar: {
    height: 4, background: "rgba(255,255,255,0.15)",
    borderRadius: 99, overflow: "hidden", marginBottom: 4,
  },
  progressFill: {
    height: "100%", borderRadius: 99,
    background: "#f6ad55",
    transition: "width 0.5s ease",
  },
  progressHint: {
    fontSize: 11, color: "rgba(255,255,255,0.5)", margin: 0,
  },

  // Earning guide
  earningGuide: {
    background: "rgba(255,255,255,0.08)",
    borderRadius: 16, padding: "24px",
    marginTop: 40,
    border: "1px solid rgba(255,255,255,0.12)",
  },
  guideTitle: {
    fontSize: 16, fontWeight: 700, color: "#fff", margin: "0 0 18px",
  },
  guideGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 14,
  },
  guideCard: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "rgba(255,255,255,0.08)",
    borderRadius: 10,
    padding: "12px 16px",
  },
  guideEmoji:  { fontSize: 24 },
  guideLabel:  { fontSize: 13, color: "rgba(255,255,255,0.8)", margin: "0 0 3px" },
  guidePoints: { fontSize: 15, fontWeight: 700, color: "#f6ad55", margin: 0 },

  // Redeem success modal
  overlay: {
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,0.65)",
    display: "flex", alignItems: "center",
    justifyContent: "center",
    zIndex: 1000, padding: 24,
  },
  modal: {
    background: "#fff",
    borderRadius: 20, padding: "28px 32px",
    width: "100%", maxWidth: 440,
    boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: 800, color: "#1a202c", margin: 0 },
  modalClose: {
    background: "#f7fafc", border: "none",
    borderRadius: 8, width: 32, height: 32,
    cursor: "pointer", fontSize: 15, color: "#4a5568",
  },
  redeemSuccess: { display: "flex", flexDirection: "column", gap: 16 },
  redeemSuccessReward: {
    fontSize: 20, fontWeight: 800, color: "#553c9a",
    textAlign: "center", margin: 0,
  },
  redeemCodeBox: {
    background: "#f7fafc",
    border: "2px dashed #553c9a",
    borderRadius: 12, padding: "16px",
    textAlign: "center",
  },
  redeemCodeLabel: { fontSize: 12, color: "#a0aec0", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.5px" },
  redeemCode: {
    fontSize: 22, fontWeight: 800,
    color: "#553c9a", letterSpacing: "2px", margin: "0 0 6px",
    fontFamily: "monospace",
  },
  redeemCodeHint: { fontSize: 12, color: "#718096", margin: 0 },
  redeemStats: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 12,
  },
  redeemStat: {
    display: "flex", flexDirection: "column",
    alignItems: "center", gap: 4,
    background: "#f7fafc", borderRadius: 10, padding: "12px 8px",
  },
  redeemStatLabel: { fontSize: 11, color: "#a0aec0", textTransform: "uppercase", letterSpacing: "0.4px" },
  redeemStatValue: { fontSize: 18, fontWeight: 800 },
  modalDoneBtn: {
    background: "linear-gradient(135deg, #553c9a, #b83280)",
    border: "none", color: "#fff",
    borderRadius: 10, padding: "12px",
    fontSize: 15, fontWeight: 700,
    cursor: "pointer", width: "100%",
    marginTop: 20,
  },

  // History modal
  historyList:  { display: "flex", flexDirection: "column", gap: 10, maxHeight: 400, overflowY: "auto" },
  historyItem: {
    display: "flex", justifyContent: "space-between",
    alignItems: "center",
    background: "#f7fafc", borderRadius: 10, padding: "12px 16px",
  },
  historyLeft:  { display: "flex", flexDirection: "column", gap: 3 },
  historyName:  { fontSize: 14, fontWeight: 600, color: "#2d3748", margin: 0 },
  historyDate:  { fontSize: 12, color: "#a0aec0", margin: 0 },
  historyRight: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 },
  historyCode:  { fontSize: 12, fontWeight: 700, color: "#553c9a", fontFamily: "monospace", margin: 0 },
  historyPoints:{ fontSize: 13, fontWeight: 700, color: "#e53e3e", margin: 0 },

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
    margin: "0 auto 24px",
  },
};