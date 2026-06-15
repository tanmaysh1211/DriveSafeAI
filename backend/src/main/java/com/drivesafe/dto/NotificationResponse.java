package com.drivesafe.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.time.LocalDateTime;

// ─────────────────────────────────────────────────────────────────────────────
// NotificationResponse — one item in the bell dropdown list
//
// Returned by:
//   GET /api/notifications/{userId}             → list of these
//   GET /api/notifications/{userId}/unread-count → just the count (separate DTO)
//
// Powers the Navbar.jsx notification dropdown:
//   - typeIcon  : looked up from NOTIF_ICONS map using `type` field
//   - title     : bold header text (optional)
//   - message   : body text — 1-2 lines
//   - read      : drives background colour (unread = blue tint)
//   - createdAt : formatted as "5m ago", "2h ago", "3d ago" by formatTimeAgo()
//   - linkUrl   : optional click-through route e.g. "/trips/42"
//
// JSON shape:
// {
//   "id":        1,
//   "userId":    5,
//   "type":      "TRIP_SCORED",
//   "title":     "Trip Scored",
//   "message":   "Your trip scored 62.0 — Moderate risk. +25 points earned!",
//   "read":      false,
//   "linkUrl":   "/trips",
//   "createdAt": "2026-06-11T14:02:00"
// }
// ─────────────────────────────────────────────────────────────────────────────

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class NotificationResponse {

    private Long   id;
    private Long   userId;

    /**
     * Notification type — maps to emoji icon in Navbar.jsx NOTIF_ICONS:
     *   TRIP_SCORED     → 🚗
     *   RISK_ALERT      → ⚠️
     *   POINTS_EARNED   → ⭐
     *   POLICY_EXPIRING → 🛡️
     *   REWARD_REDEEMED → 🎁
     *   SYSTEM          → 🔔
     */
    private String type;

    /**
     * Short bold header shown above the message.
     * e.g. "Trip Scored", "High Risk Trip Detected"
     * Optional — null if no title needed.
     */
    private String title;

    /**
     * Notification body text — shown in the dropdown item.
     * Keep under 120 chars for clean display.
     * e.g. "Your trip scored 62.0 — Moderate risk. +25 points earned!"
     */
    private String message;

    /**
     * Whether the user has seen this notification.
     * false = unread → blue background tint + blue dot indicator
     * true  = read   → transparent background
     */
    private boolean read;

    /**
     * Optional deep-link URL for when user clicks the notification.
     * e.g. "/trips" | "/insurance" | "/rewards"
     * Null if notification has no specific action.
     */
    private String linkUrl;

    /**
     * When the notification was created.
     * Formatted by Navbar.jsx's formatTimeAgo() as:
     *   < 1 min  → "just now"
     *   < 60 min → "5m ago"
     *   < 24 hr  → "2h ago"
     *   else     → "3d ago"
     */
    private LocalDateTime createdAt;
}