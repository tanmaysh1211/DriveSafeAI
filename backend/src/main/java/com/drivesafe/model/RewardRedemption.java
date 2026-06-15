package com.drivesafe.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "reward_redemptions",
        indexes = {
                // RewardsService.getRedemptionHistory() — newest first per user
                @Index(name = "idx_redemptions_user_id_redeemed_at",
                        columnList = "user_id, redeemed_at DESC"),
                // Partner outlet code verification
                @Index(name = "idx_redemptions_code",
                        columnList = "redemption_code", unique = true)
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RewardRedemption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ── Ownership ─────────────────────────────────────────────────────
    // Plain Long userId — not @ManyToOne — keeps this entity lightweight.
    // Redemption history is read-only after creation, never navigates to User.
    @Column(name = "user_id", nullable = false)
    private Long userId;

    // ── Reward reference ──────────────────────────────────────────────
    /**
     * Which reward was redeemed.
     * EAGER loaded — every time we fetch a redemption, we need the reward
     * name and value to display in the history modal.
     */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(
            name = "reward_id",
            nullable = false,
            foreignKey = @ForeignKey(name = "fk_redemption_reward_id")
    )
    private Reward reward;

    // ── Redemption code ───────────────────────────────────────────────
    /**
     * Unique redemption code shown to the user after successful redemption.
     * Format: DS-{userId}-{rewardId}-{6 random uppercase chars}
     * Example: DS-5-2-ABC123
     *
     * Used by partner outlets to verify the redemption is genuine.
     * Unique index ensures no two redemptions share the same code.
     */
    @Column(name = "redemption_code", nullable = false, unique = true, length = 30)
    private String redemptionCode;

    // ── Timestamp ─────────────────────────────────────────────────────
    /**
     * When the redemption happened.
     * Shown in the history modal as "12 Jun 2026".
     * Never updated — redemptions are immutable once created.
     */
    @Column(name = "redeemed_at", nullable = false, updatable = false)
    private LocalDateTime redeemedAt;

    // ── Lifecycle ─────────────────────────────────────────────────────
    @PrePersist
    protected void onCreate() {
        if (redeemedAt == null) {
            redeemedAt = LocalDateTime.now();
        }
    }

    // ── Convenience ───────────────────────────────────────────────────

    /**
     * How many points this redemption cost.
     * Delegates to the associated Reward — keeps the history item self-contained.
     */
    @Transient
    public int getPointsSpent() {
        return reward != null ? reward.getPointsCost() : 0;
    }

    /**
     * The monetary value redeemed (in INR).
     * e.g. ₹50 for Burger King Whopper
     */
    @Transient
    public double getValueRedeemed() {
        return reward != null ? reward.getValue() : 0;
    }
}