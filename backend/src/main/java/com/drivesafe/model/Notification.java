package com.drivesafe.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "notifications",
        indexes = {
                // Hot path: fetch unread count + list for navbar bell — needs to be fast
                @Index(name = "idx_notifications_user_id_read",
                        columnList = "user_id, read"),
                // Fetch newest notifications for a user
                @Index(name = "idx_notifications_user_id_created_at",
                        columnList = "user_id, created_at DESC")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ── Ownership ─────────────────────────────────────────────────────
    // Plain FK — not @ManyToOne because Notification is read-heavy
    // and never needs to navigate to the User object
    @Column(name = "user_id", nullable = false)
    private Long userId;

    // ── Content ───────────────────────────────────────────────────────

    /**
     * Notification type — drives the icon shown in the bell dropdown.
     *
     * Values (match NOTIF_ICONS in Navbar.jsx):
     *   TRIP_SCORED       — 🚗  new trip score available
     *   RISK_ALERT        — ⚠️  high risk trip detected
     *   POINTS_EARNED     — ⭐  points awarded after trip
     *   POLICY_EXPIRING   — 🛡️  insurance policy expiring soon
     *   REWARD_REDEEMED   — 🎁  reward redemption confirmed
     *   SYSTEM            — 🔔  general system message
     */
    @Column(nullable = false, length = 30)
    private String type;

    /**
     * Short notification message shown in the dropdown item.
     * E.g. "Your trip scored 62 — Moderate risk. +25 points earned!"
     * Keep under 120 chars for clean display.
     */
    @Column(nullable = false, length = 300)
    private String message;

    /**
     * Optional title — used as bold header above the message.
     * Can be null; the dropdown shows message only if title is absent.
     */
    @Column(length = 100)
    private String title;

    // ── Status ────────────────────────────────────────────────────────

    /**
     * Whether the user has seen / opened this notification.
     * false = unread (contributes to badge count)
     * true  = read   (shown with lighter background)
     *
     * Flipped to true by:
     *   - User clicking the bell (mark-all-read)
     *   - User clicking ✓ on individual item (mark-one-read)
     */
    @Column(name = "read", nullable = false)
    @Builder.Default
    private boolean read = false;

    // ── Optional deep-link ────────────────────────────────────────────

    /**
     * Optional URL the notification links to when clicked.
     * E.g. "/trips/42" → opens the specific trip card
     *      "/insurance" → opens insurance page
     * Null if the notification has no specific action.
     */
    @Column(name = "link_url", length = 200)
    private String linkUrl;

    // ── Timestamp ─────────────────────────────────────────────────────

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // ── Lifecycle ─────────────────────────────────────────────────────
    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    // ── Factory methods — convenient constructors for each type ───────

    /**
     * Create a TRIP_SCORED notification.
     * Called by TripService after processing a trip upload.
     */
    public static Notification tripScored(Long userId, double score,
                                          String riskLevel, int pointsEarned) {
        return Notification.builder()
                .userId(userId)
                .type("TRIP_SCORED")
                .title("Trip Scored")
                .message(String.format(
                        "Your trip scored %.1f — %s risk. +%d points earned!",
                        score, riskLevel, pointsEarned))
                .linkUrl("/trips")
                .read(false)
                .build();
    }

    /**
     * Create a RISK_ALERT notification for high-risk trips.
     */
    public static Notification riskAlert(Long userId, double score) {
        return Notification.builder()
                .userId(userId)
                .type("RISK_ALERT")
                .title("High Risk Trip Detected")
                .message(String.format(
                        "Your last trip scored %.1f (High Risk). Check AI recommendations to improve.",
                        score))
                .linkUrl("/trips")
                .read(false)
                .build();
    }

    /**
     * Create a POINTS_EARNED notification.
     */
    public static Notification pointsEarned(Long userId, int points, int newTotal) {
        return Notification.builder()
                .userId(userId)
                .type("POINTS_EARNED")
                .title("Points Earned!")
                .message(String.format(
                        "You earned %d points for your last trip. Total balance: %d pts.",
                        points, newTotal))
                .linkUrl("/rewards")
                .read(false)
                .build();
    }

    /**
     * Create a POLICY_EXPIRING notification.
     * Called by a scheduled task when policy has < 30 days left.
     */
    public static Notification policyExpiring(Long userId, long daysLeft) {
        return Notification.builder()
                .userId(userId)
                .type("POLICY_EXPIRING")
                .title("Policy Expiring Soon")
                .message(String.format(
                        "Your insurance policy expires in %d days. Renew now to stay covered.",
                        daysLeft))
                .linkUrl("/insurance")
                .read(false)
                .build();
    }

    /**
     * Create a REWARD_REDEEMED notification.
     */
    public static Notification rewardRedeemed(Long userId, String rewardName,
                                              int pointsSpent) {
        return Notification.builder()
                .userId(userId)
                .type("REWARD_REDEEMED")
                .title("Reward Redeemed!")
                .message(String.format(
                        "You successfully redeemed '%s' for %d points. Check your email for the code.",
                        rewardName, pointsSpent))
                .linkUrl("/rewards")
                .read(false)
                .build();
    }
}