import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation }     from "react-router-dom";
import { useAuth }                      from "../context/AuthContext";
import api                              from "../services/api";

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  const [notifications,  setNotifications]  = useState([]);
  const [unreadCount,    setUnreadCount]    = useState(0);
  const [notifOpen,      setNotifOpen]      = useState(false);
  const [notifLoading,   setNotifLoading]   = useState(false);
  const notifRef = useRef(null);
  
  const HIDE_ON = ["/login", "/register"];

useEffect(() => {
  const handler = (e) => {
    if (notifRef.current && !notifRef.current.contains(e.target)) {
      setNotifOpen(false);
    }
  };

  document.addEventListener("mousedown", handler);
  return () => document.removeEventListener("mousedown", handler);
}, []);

useEffect(() => {
  if (isAuthenticated && user?.userId) {
    fetchUnreadCount();

    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }
}, [isAuthenticated, user?.userId]);

if (HIDE_ON.includes(location.pathname)) {
  return null;
}

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get(`/notifications/${user.userId}/unread-count`);
      setUnreadCount(res.data.unreadCount ?? 0);
    } catch {
    }
  };

  const fetchNotifications = async () => {
    setNotifLoading(true);
    try {
      const res = await api.get(`/notifications/${user.userId}?limit=10`);
      setNotifications(res.data ?? []);
      await api.put(`/notifications/${user.userId}/read-all`);
      setUnreadCount(0);
    } catch {
      setNotifications([]);
    } finally {
      setNotifLoading(false);
    }
  };

  const handleBellClick = () => {
    setNotifOpen((v) => !v);
    if (!notifOpen) fetchNotifications();
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path
    || (path !== "/" && location.pathname.startsWith(path));

  return (
    <nav style={s.navbar}>
      <div style={s.logo} onClick={() => navigate("/")}>
        <span style={s.logoIcon}>🚗</span>
        <span style={s.logoText}>DriveSafeAI</span>
      </div>

      {isAuthenticated && (
        <div style={s.navLinks}>
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.path}
              link={link}
              active={isActive(link.path)}
              onClick={() => navigate(link.path)}
            />
          ))}
        </div>
      )}

      <div style={s.navRight}>
        {isAuthenticated ? (
          <>
            {/* Notification bell with badge */}
            <div ref={notifRef} style={s.notifWrap}>
              <button style={s.bellBtn} onClick={handleBellClick}>
                <span style={s.bellIcon}>🔔</span>
                <span style={s.bellLabel}>Notifications</span>
                {unreadCount > 0 && (
                  <span style={s.badge}>{unreadCount > 99 ? "99+" : unreadCount}</span>
                )}
                <span style={s.bellChevron}>▾</span>
              </button>

              {notifOpen && (
                <NotificationDropdown
                  notifications={notifications}
                  loading={notifLoading}
                  onClose={() => setNotifOpen(false)}
                  onMarkRead={async (id) => {
                    await api.put(`/notifications/${id}/read`);
                    setNotifications((prev) =>
                      prev.map((n) => n.id === id ? { ...n, read: true } : n)
                    );
                  }}
                />
              )}
            </div>

            <div
              style={s.pointsPill}
              onClick={() => navigate("/rewards")}
              title="View Rewards Store"
            >
              <span style={s.pointsStar}>🌟</span>
              <span style={s.pointsNum}>{user?.totalPoints ?? 0}</span>
            </div>

            <div style={s.welcomeChip}>
              <span style={s.welcomeEmoji}>👋</span>
              <span style={s.welcomeText}>
                Welcome, {user?.name?.split(" ")[0] ?? "User"}
              </span>
            </div>

            <button style={s.logoutBtn} onClick={handleLogout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <button style={s.loginBtn}    onClick={() => navigate("/login")}>Login</button>
            <button style={s.registerBtn} onClick={() => navigate("/register")}>Register</button>
          </>
        )}
      </div>
    </nav>
  );
}

function NavLink({ link, active, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      style={{
        ...s.navLink,
        ...(active  ? s.navLinkActive  : {}),
        ...(hovered ? s.navLinkHovered : {}),
      }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span>{link.icon}</span>
      <span>{link.label}</span>
      {active && <div style={s.activeBar} />}
    </button>
  );
}

function NotificationDropdown({ notifications, loading, onClose, onMarkRead }) {
  return (
    <div style={s.dropdown}>
      {/* Header */}
      <div style={s.dropdownHeader}>
        <span style={s.dropdownTitle}>Notifications</span>
        <button style={s.dropdownClose} onClick={onClose}>✕</button>
      </div>

      {/* Content */}
      <div style={s.dropdownBody}>
        {loading ? (
          <div style={s.dropdownLoading}>
            <div style={s.dropdownSpinner} />
            <p style={s.dropdownLoadingText}>Loading…</p>
          </div>
        ) : notifications.length === 0 ? (
          <div style={s.dropdownEmpty}>
            <p style={s.dropdownEmptyIcon}>🔔</p>
            <p style={s.dropdownEmptyText}>No notifications yet</p>
          </div>
        ) : (
          notifications.map((n) => (
            <NotifItem key={n.id} notif={n} onMarkRead={onMarkRead} />
          ))
        )}
      </div>
    </div>
  );
}

function NotifItem({ notif, onMarkRead }) {
  const [hovered, setHovered] = useState(false);
  const typeIcon = NOTIF_ICONS[notif.type] ?? "🔔";

  return (
    <div
      style={{
        ...s.notifItem,
        background: notif.read
          ? "transparent"
          : "rgba(99,179,237,0.08)",
        ...(hovered ? { background: "#f7fafc" } : {}),
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={s.notifIconWrap}>
        <span style={s.notifTypeIcon}>{typeIcon}</span>
        {!notif.read && <span style={s.notifDot} />}
      </div>
      <div style={s.notifContent}>
        <p style={s.notifMessage}>{notif.message ?? notif.title ?? "Notification"}</p>
        <p style={s.notifTime}>{formatTimeAgo(notif.createdAt)}</p>
      </div>
      {!notif.read && (
        <button
          style={s.markReadBtn}
          onClick={() => onMarkRead(notif.id)}
          title="Mark as read"
        >
          ✓
        </button>
      )}
    </div>
  );
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)  return "just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

const NAV_LINKS = [
  { label: "Home",         path: "/",          icon: "🏠" },
  { label: "Dashboard",    path: "/dashboard", icon: "📊" },
  { label: "Trip History", path: "/trips",     icon: "🗺️" },
  { label: "Insurance",    path: "/insurance", icon: "🛡️" },
];

const NOTIF_ICONS = {
  TRIP_SCORED:       "🚗",
  RISK_ALERT:        "⚠️",
  POINTS_EARNED:     "⭐",
  POLICY_EXPIRING:   "🛡️",
  REWARD_REDEEMED:   "🎁",
  SYSTEM:            "🔔",
};

const s = {
  navbar: {
    display: "flex",
    alignItems: "center",
    padding: "0 28px",
    height: 58,
    background: "rgba(15, 15, 30, 0.92)",
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
    position: "sticky",
    top: 0,
    zIndex: 200,
    gap: 20,
    borderBottom: "1px solid rgba(255,255,255,0.07)",
    boxShadow: "0 2px 20px rgba(0,0,0,0.3)",
  },

  logo: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    cursor: "pointer",
    flexShrink: 0,
    textDecoration: "none",
  },
  logoIcon: { fontSize: 22 },
  logoText: {
    fontWeight: 800,
    fontSize: 18,
    color: "#63b3ed",
    letterSpacing: "-0.3px",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },

  navLinks: {
    display: "flex",
    alignItems: "center",
    gap: 2,
    flex: 1,
  },
  navLink: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "none",
    border: "none",
    color: "rgba(226,232,240,0.85)",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    padding: "6px 14px",
    borderRadius: 8,
    position: "relative",
    transition: "color 0.15s, background 0.15s",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  navLinkActive: {
    color: "#fff",
    fontWeight: 700,
  },
  navLinkHovered: {
    background: "rgba(255,255,255,0.06)",
    color: "#fff",
  },
  activeBar: {
    position: "absolute",
    bottom: -2,
    left: "50%",
    transform: "translateX(-50%)",
    width: "60%",
    height: 2,
    background: "#63b3ed",
    borderRadius: 99,
  },

  navRight: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginLeft: "auto",
    flexShrink: 0,
  },

  notifWrap: { position: "relative" },
  bellBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 8,
    padding: "6px 12px",
    color: "#e2e8f0",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    position: "relative",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    transition: "background 0.15s",
  },
  bellIcon:    { fontSize: 15 },
  bellLabel:   { fontSize: 13 },
  bellChevron: { fontSize: 10, color: "rgba(255,255,255,0.5)" },
  badge: {
    background: "#f6ad55",
    color: "#1a202c",
    borderRadius: 99,
    padding: "1px 7px",
    fontSize: 11,
    fontWeight: 800,
    minWidth: 20,
    textAlign: "center",
    lineHeight: "16px",
  },

  dropdown: {
    position: "absolute",
    top: "calc(100% + 8px)",
    right: 0,
    width: 340,
    background: "#fff",
    borderRadius: 14,
    boxShadow: "0 8px 40px rgba(0,0,0,0.22)",
    border: "1px solid #e2e8f0",
    zIndex: 300,
    overflow: "hidden",
  },
  dropdownHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 16px",
    borderBottom: "1px solid #e2e8f0",
    background: "#f7fafc",
  },
  dropdownTitle: { fontSize: 14, fontWeight: 700, color: "#1a202c" },
  dropdownClose: {
    background: "none", border: "none",
    cursor: "pointer", fontSize: 14,
    color: "#a0aec0", padding: "2px 6px",
    borderRadius: 4,
  },
  dropdownBody: {
    maxHeight: 360,
    overflowY: "auto",
  },
  dropdownLoading: {
    display: "flex", flexDirection: "column",
    alignItems: "center", padding: "24px",
    gap: 8,
  },
  dropdownSpinner: {
    width: 24, height: 24,
    border: "3px solid #e2e8f0",
    borderTopColor: "#553c9a",
    borderRadius: "50%",
    animation: "spin 0.7s linear infinite",
  },
  dropdownLoadingText: { fontSize: 13, color: "#a0aec0", margin: 0 },
  dropdownEmpty: {
    display: "flex", flexDirection: "column",
    alignItems: "center", padding: "28px 16px",
    gap: 8,
  },
  dropdownEmptyIcon: { fontSize: 32, margin: 0 },
  dropdownEmptyText: { fontSize: 13, color: "#a0aec0", margin: 0 },

  notifItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    padding: "12px 16px",
    borderBottom: "1px solid #f0f4f8",
    transition: "background 0.12s",
    cursor: "default",
  },
  notifIconWrap: { position: "relative", flexShrink: 0, marginTop: 2 },
  notifTypeIcon: { fontSize: 18 },
  notifDot: {
    position: "absolute",
    top: -2, right: -2,
    width: 8, height: 8,
    background: "#63b3ed",
    borderRadius: "50%",
    border: "1.5px solid #fff",
  },
  notifContent: { flex: 1, minWidth: 0 },
  notifMessage: {
    fontSize: 13, color: "#2d3748",
    margin: "0 0 3px",
    lineHeight: 1.4,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  notifTime: { fontSize: 11, color: "#a0aec0", margin: 0 },
  markReadBtn: {
    background: "none", border: "none",
    color: "#63b3ed", fontSize: 14,
    cursor: "pointer", padding: "0 4px",
    flexShrink: 0,
  },

  pointsPill: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    background: "#f6ad55",
    borderRadius: 99,
    padding: "5px 14px",
    cursor: "pointer",
    transition: "opacity 0.15s",
  },
  pointsStar: { fontSize: 14 },
  pointsNum: {
    fontWeight: 800,
    fontSize: 14,
    color: "#1a202c",
  },

  welcomeChip: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 8,
    padding: "5px 14px",
  },
  welcomeEmoji: { fontSize: 14 },
  welcomeText: {
    fontSize: 13,
    fontWeight: 600,
    color: "#e2e8f0",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },

  logoutBtn: {
    background: "transparent",
    border: "1.5px solid rgba(255,255,255,0.25)",
    borderRadius: 8,
    padding: "5px 16px",
    color: "#e2e8f0",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    transition: "border-color 0.15s, background 0.15s",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },

  loginBtn: {
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: 8,
    padding: "6px 18px",
    color: "#e2e8f0",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  registerBtn: {
    background: "#38a169",
    border: "none",
    borderRadius: 8,
    padding: "6px 18px",
    color: "#fff",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
};
