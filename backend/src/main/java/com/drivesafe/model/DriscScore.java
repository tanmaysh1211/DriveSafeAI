package com.drivesafe.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "drisc_scores",
        indexes = {
                // Most common query: fetch the latest score for a user
                @Index(name = "idx_drisc_user_id_calculated_at",
                        columnList = "user_id, calculated_at DESC"),
                @Index(name = "idx_drisc_user_id", columnList = "user_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DriscScore {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ── Ownership ─────────────────────────────────────────────────────
    // Stored as plain FK (not @ManyToOne) to keep this entity lightweight —
    // DriscScore is read far more than written and doesn't need User navigation
    @Column(name = "user_id", nullable = false)
    private Long userId;

    // ── Score ─────────────────────────────────────────────────────────
    /**
     * DRISC Score — Driving Risk Intelligence Score for the Customer.
     *
     * Range   : 0.00 – 100.00   (higher = riskier)
     * Formula : recency-weighted average of last N DriveScores
     *
     *   weight(i) = (N - i) / sum(1..N)   where i=0 is most recent trip
     *
     * Example (N=3, scores=[62, 58, 70]):
     *   weights = 3/6, 2/6, 1/6
     *   DRISC   = (62×3 + 58×2 + 70×1) / 6 = 61.67
     *
     * Stored to 2 decimal places matching the displayed "57.7" in the UI.
     */
//    @Column(nullable = false, precision = 5, scale = 2)
//    private double score;

    @Column(nullable = false)
    private double score;

    // ── Risk Classification ───────────────────────────────────────────
    // Derived from score at calculation time — stored for quick retrieval
    //   Safe     : score ≤ 40
    //   Moderate : 40 < score ≤ 65
    //   High     : score > 65
    @Column(name = "risk_level", nullable = false, length = 20)
    private String riskLevel;

    // ── Window ────────────────────────────────────────────────────────
    // How many trips were actually used in this calculation.
    // May be less than requested N if the user has fewer trips.
    // Shown in UI as "Based on X trip(s)"
    @Column(name = "trips_analyzed", nullable = false)
    private int tripsAnalyzed;

    // ── Timestamp ─────────────────────────────────────────────────────
    // Each recalculation creates a NEW row — never update in place.
    // This lets DriscScoringService.getScoreHistory() return a trend over time.
    @Column(name = "calculated_at", nullable = false, updatable = false)
    private LocalDateTime calculatedAt;

    // ── Lifecycle ─────────────────────────────────────────────────────
    @PrePersist
    protected void onCreate() {
        if (calculatedAt == null) {
            calculatedAt = LocalDateTime.now();
        }
    }

    // ── Convenience ───────────────────────────────────────────────────
    /**
     * Premium discount % this DRISC score qualifies for.
     * Mirrors InsuranceService.discountFromDrisc() — kept here as a
     * quick read without injecting the service.
     *
     *   0 – 30  → 15%
     *  31 – 50  → 10%
     *  51 – 65  →  5%
     *  66 – 80  →  2%
     *  81 – 100 →  0%
     */
    @Transient
    public double getPremiumDiscount() {
        if (score <= 30) return 15.0;
        if (score <= 50) return 10.0;
        if (score <= 65) return 5.0;
        if (score <= 80) return 2.0;
        return 0.0;
    }

    /**
     * Human-readable risk label used on the Insurance page
     * ("Excellent", "Needs Attention", "High Risk").
     */
    @Transient
    public String getRiskLabel() {
        if (score <= 40) return "Excellent";
        if (score <= 60) return "Needs Attention";
        return "High Risk";
    }
}