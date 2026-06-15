package com.drivesafe.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "rewards",
        indexes = {
                // RewardsService.getRewardsByCategory() filter
                @Index(name = "idx_rewards_category", columnList = "category"),
                // Default sort order in store listing
                @Index(name = "idx_rewards_points_cost", columnList = "points_cost")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Reward {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ── Identity ──────────────────────────────────────────────────────
    // Brand / reward name shown as card title e.g. "Burger King", "Netflix"
    @NotBlank
    @Column(nullable = false, length = 100)
    private String name;

    // Subtitle shown below name e.g. "Whopper Burger Combo"
    @NotBlank
    @Column(nullable = false, length = 200)
    private String description;

    // ── Category ──────────────────────────────────────────────────────
    // Used for filter tabs in the Rewards Store
    // Values: food | fuel | shopping | entertainment
    @NotBlank
    @Column(nullable = false, length = 30)
    private String category;

    // ── Points ────────────────────────────────────────────────────────
    // Points a user must spend to redeem this reward
    // Matches values shown in UI: 1000, 1200, 1500, 1800, 2000, 2500, 3000
    @Positive
    @Column(name = "points_cost", nullable = false)
    private int pointsCost;

    // ── Value ─────────────────────────────────────────────────────────
    // Monetary value of the reward in INR — shown as "₹50 value", "₹150 value"
    @Positive
    @Column(nullable = false)
    private double value;

    // ── Display ───────────────────────────────────────────────────────
    // Emoji icon shown on reward card e.g. 🍔 🛢️ 🍽️ 📦 🎬 🎵 🍕
    @Column(length = 10)
    private String emoji;

    // Whether this reward is currently available for redemption
    // Allows admins to temporarily hide rewards without deleting them
    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean active = true;

    // ── Timestamps ────────────────────────────────────────────────────
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // ── Lifecycle ─────────────────────────────────────────────────────
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}