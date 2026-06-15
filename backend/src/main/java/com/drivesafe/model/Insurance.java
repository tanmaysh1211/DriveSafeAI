package com.drivesafe.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

@Entity
@Table(
        name = "insurance_policies",
        indexes = {
                // InsuranceService.findByUserId() is the hot path — index it
                @Index(name = "idx_insurance_user_id", columnList = "user_id"),
                @Index(name = "idx_insurance_policy_number", columnList = "policy_number")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"user"})
public class Insurance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ── Relationship ──────────────────────────────────────────────────
    // One policy per user — enforced by @OneToOne
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "user_id",
            nullable = false,
            unique = true,
            foreignKey = @ForeignKey(name = "fk_insurance_user_id")
    )
    private User user;

    // ── Policy Identity ───────────────────────────────────────────────
    // Human-readable policy reference shown on Insurance page e.g. INS123456789
    @NotBlank
    @Column(name = "policy_number", nullable = false, unique = true, length = 30)
    private String policyNumber;

    // ── Coverage ──────────────────────────────────────────────────────
    // "Comprehensive", "Third Party", "Own Damage"
    @NotBlank
    @Column(name = "coverage_type", nullable = false, length = 50)
    private String coverageType;

    // Max claim payout in INR — e.g. 500000.00 (₹5 lakh)
    @Positive
    @Column(name = "coverage_amount", nullable = false)
    private double coverageAmount;

    // ── Premium ───────────────────────────────────────────────────────
    // Base annual premium set at policy creation — does NOT change
    @Positive
    @Column(name = "base_premium", nullable = false)
    private double basePremium;

    // Final premium after DRISC discount is applied
    // Recalculated live by InsuranceService each time the page loads
    @Positive
    @Column(name = "final_premium", nullable = false)
    private double finalPremium;

    // ── Policy Period ─────────────────────────────────────────────────
    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    // Typically startDate + 1 year; extended on renewal
    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    // ── Timestamps ────────────────────────────────────────────────────
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // ── Lifecycle hooks ───────────────────────────────────────────────
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        // Auto-generate policy number if not supplied
        if (policyNumber == null || policyNumber.isBlank()) {
            policyNumber = "INS" + System.currentTimeMillis();
        }
        // Default final premium to base premium if not yet calculated
        if (finalPremium == 0) {
            finalPremium = basePremium;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // ── Transient helpers ─────────────────────────────────────────────
    /**
     * Days until policy expires — used by the green/yellow/red status banner.
     * Negative value means already expired.
     */
    @Transient
    public long getDaysRemaining() {
        return ChronoUnit.DAYS.between(LocalDate.now(), endDate);
    }

    /**
     * Policy status string — drives banner colour on the Insurance page.
     *   ACTIVE        : > 30 days remaining  → green
     *   EXPIRING_SOON : 1–30 days remaining  → yellow
     *   EXPIRED       : 0 or negative        → red
     */
    @Transient
    public String getPolicyStatus() {
        long days = getDaysRemaining();
        if (days > 30)  return "ACTIVE";
        if (days > 0)   return "EXPIRING_SOON";
        return "EXPIRED";
    }

    /**
     * Rupee savings vs base premium — shown in Financial Details card.
     * e.g. base=8000, final=7711.60 → savings=288.40
     */
    @Transient
    public double getSavings() {
        return Math.max(0, basePremium - finalPremium);
    }

    /**
     * Discount % actually applied to this policy.
     * e.g. base=8000, final=7711.60 → 3.61%
     */
    @Transient
    public double getAppliedDiscountPercent() {
        if (basePremium == 0) return 0;
        return ((basePremium - finalPremium) / basePremium) * 100.0;
    }
}