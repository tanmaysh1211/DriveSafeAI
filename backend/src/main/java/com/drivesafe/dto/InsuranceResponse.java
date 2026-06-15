package com.drivesafe.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.time.LocalDate;

// ─────────────────────────────────────────────────────────────────────────────
// InsuranceResponse — returned by GET /api/insurance/{userId}
//
// Powers the entire Insurance page in one call:
//   - Green/yellow/red status banner  : policyStatus + daysRemaining
//   - Policy Information card         : policyNumber, policyId, coverageType
//   - Financial Details card          : coverageAmount, basePremium, finalPremium,
//                                       discountPercent
//   - Policy Period card              : startDate, endDate, daysRemaining
//   - Risk Assessment gauge           : driscScore, riskLabel
//   - Premium Breakdown grid          : all four financial fields
//
// JSON shape:
// {
//   "policyId":        4,
//   "policyNumber":    "INS123456789",
//   "coverageType":    "Comprehensive",
//   "coverageAmount":  500000.0,
//   "basePremium":     8000.0,
//   "finalPremium":    7711.60,
//   "discountPercent": 3.61,
//   "startDate":       "2024-06-01",
//   "endDate":         "2025-07-10",
//   "daysRemaining":   38,
//   "policyStatus":    "ACTIVE",
//   "driscScore":      57.68,
//   "riskLabel":       "Needs Attention"
// }
// ─────────────────────────────────────────────────────────────────────────────

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class InsuranceResponse {

    // ── Policy identity ───────────────────────────────────────────────
    private Long   policyId;
    private String policyNumber;    // e.g. "INS123456789"
    private String coverageType;    // "Comprehensive" | "Third Party" | "Own Damage"

    // ── Financial details ─────────────────────────────────────────────
    private double coverageAmount;  // max claim payout in INR e.g. 500000.00
    private double basePremium;     // annual base premium e.g. 8000.00
    private double finalPremium;    // after DRISC discount  e.g. 7711.60
    private double discountPercent; // % saved               e.g. 3.61

    // ── Policy period ─────────────────────────────────────────────────
    private LocalDate startDate;    // e.g. "2024-06-01"
    private LocalDate endDate;      // e.g. "2025-07-10"

    /**
     * Days until policy expires.
     * Drives the green/yellow/red status banner colour in Insurance.jsx:
     *   > 30 days  → ACTIVE        → green
     *   1–30 days  → EXPIRING_SOON → yellow
     *   0 or less  → EXPIRED       → red
     */
    private long   daysRemaining;

    /**
     * Policy status string — drives banner colour.
     * Values: "ACTIVE" | "EXPIRING_SOON" | "EXPIRED"
     */
    private String policyStatus;

    // ── Risk assessment ───────────────────────────────────────────────
    /**
     * Latest DRISC score for this user — shown in the circular gauge.
     * Recalculated live on every Insurance page load.
     */
    private double driscScore;

    /**
     * Human-readable risk label shown below the gauge.
     * Values: "Excellent" | "Needs Attention" | "High Risk"
     */
    private String riskLabel;
}