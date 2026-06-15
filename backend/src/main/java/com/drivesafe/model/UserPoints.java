package com.drivesafe.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "user_points",
        indexes = {
                // Primary lookup: get points balance for a user
                @Index(name = "idx_user_points_user_id", columnList = "user_id", unique = true)
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserPoints {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ── Ownership ─────────────────────────────────────────────────────
    // One row per user — unique index enforced above
    // Plain FK (not @OneToOne) to keep this lightweight for frequent reads
    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    // ── Balance ───────────────────────────────────────────────────────
    /**
     * Current points balance — the number shown in the navbar pill (e.g. "🌟 90").
     *
     * Points are awarded by RewardsService.awardPointsForTrip():
     *   DriveScore ≤ 40 (Safe)     → +50 pts
     *   DriveScore ≤ 65 (Moderate) → +25 pts
     *   DriveScore  > 65 (High)    → +10 pts
     *
     * Points are deducted by RewardsService.redeemReward() atomically
     * inside a @Transactional block to prevent double-spend.
     *
     * Cannot go below 0 — enforced by RewardsService before deduction.
     */
    @Column(name = "total_points", nullable = false)
    @Builder.Default
    private int totalPoints = 0;

    // ── Lifetime stats ────────────────────────────────────────────────
    // Total points ever earned — never decremented, used for leaderboard / stats
    @Column(name = "lifetime_points", nullable = false)
    @Builder.Default
    private int lifetimePoints = 0;

    // Total points ever spent on redemptions
    @Column(name = "total_redeemed", nullable = false)
    @Builder.Default
    private int totalRedeemed = 0;

    // ── Timestamps ────────────────────────────────────────────────────
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // Updated every time points are awarded or redeemed
    @Column(name = "last_updated")
    private LocalDateTime lastUpdated;

    // ── Lifecycle ─────────────────────────────────────────────────────
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        lastUpdated = LocalDateTime.now();
    }

    // ── Convenience methods ───────────────────────────────────────────
    /**
     * Add points after a trip. Updates both current balance and lifetime total.
     * Called by RewardsService.awardPointsForTrip().
     */
    public void addPoints(int points) {
        if (points <= 0) return;
        this.totalPoints    += points;
        this.lifetimePoints += points;
        this.lastUpdated    = LocalDateTime.now();
    }

    /**
     * Deduct points on reward redemption.
     * Throws IllegalStateException if balance is insufficient —
     * callers must check before calling or catch the exception.
     */
    public void deductPoints(int points) {
        if (points <= 0) return;
        if (this.totalPoints < points) {
            throw new IllegalStateException(
                    String.format("Insufficient points: have %d, need %d",
                            this.totalPoints, points));
        }
        this.totalPoints   -= points;
        this.totalRedeemed += points;
        this.lastUpdated    = LocalDateTime.now();
    }

    /**
     * Whether the user can afford a reward costing the given points.
     * Use this in RewardsService before calling deductPoints().
     */
    @Transient
    public boolean canAfford(int cost) {
        return this.totalPoints >= cost;
    }
}