package com.drivesafe.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

// ─────────────────────────────────────────────────────────────────────────────
// DashboardResponse — returned by GET /api/dashboard/{userId}
//
// Powers the entire Risk Scoring Dashboard page in one call:
//   - Top stat cards  : DRISC score, risk level, trips analyzed, premium impact
//   - User profile    : name, email, vehicle
//   - Risk Analysis   : overall score bar + per-factor badges
//   - Recommendations : 3 cards (Getting Started, Data Analysis, Premium Benefits)
//
// JSON shape:
// {
//   "userId":        5,
//   "userName":      "Nishant",
//   "userEmail":     "nishant12@example.com",
//   "vehicleNumber": "KA01AB12345",
//
//   "driscScore":    57.7,
//   "riskLevel":     "Moderate",          // "Safe" | "Moderate" | "High"
//   "tripsAnalyzed": 1,
//   "nTrips":        1,                   // the N window requested
//   "premiumImpact": 5.29,               // discount % → "5.29% Saved"
//
//   "riskFactors": {
//     "Speeding Events": "Low",
//     "Hard Braking":    "Moderate",
//     "Sharp Turns":     "Low",
//     "Night Driving":   "Normal"
//   },
//
//   "recommendations": [
//     { "type": "Getting Started", "icon": "info",    "title": "...", "body": "..." },
//     { "type": "Data Analysis",   "icon": "warning", "title": "...", "body": "..." },
//     { "type": "Premium Benefits","icon": "money",   "title": "...", "body": "..." }
//   ],
//
//   "calculatedAt": "2024-06-01T10:30:00"
// }
// ─────────────────────────────────────────────────────────────────────────────
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class DashboardResponse {

    // ── User identity ─────────────────────────────────────────────────
    // Shown in the profile card on the left of the dashboard
    private Long   userId;
    private String userName;
    private String userEmail;
    private String vehicleNumber;

    // ── DRISC Score ───────────────────────────────────────────────────
    // The weighted average DriveScore over last N trips
    // Displayed as "57.7" in the DRISC SCORE stat card
    private double driscScore;

    // "Safe" | "Moderate" | "High" — drives the Risk Level stat card colour
    private String riskLevel;

    // Number of trips that actually exist (may be < nTrips if user is new)
    // Shown as "Based on X trip(s)" under the score bar
    private int tripsAnalyzed;

    // The N window the caller requested via ?n= param
    private int nTrips;

    // ── Premium Impact ────────────────────────────────────────────────
    // Discount % this DRISC score qualifies for
    // Displayed as "5.29% Saved" in the PREMIUM IMPACT stat card
    //
    // Discount table (from InsuranceService.discountFromDrisc):
    //   DRISC 0–30  → 15%
    //   DRISC 31–50 → 10%
    //   DRISC 51–65 →  5%
    //   DRISC 66–80 →  2%
    //   DRISC 81+   →  0%
    private double premiumImpact;

    // ── Risk Factors ──────────────────────────────────────────────────
    // Key = factor name, Value = "Low" | "Moderate" | "High" | "Normal"
    // Rendered as the colored badge pills on the Risk Analysis card:
    //   "Speeding Events" → Low (green)
    //   "Hard Braking"    → Moderate (orange)
    //   "Sharp Turns"     → Low (green)
    //   "Night Driving"   → Normal (blue)
    private Map<String, String> riskFactors;

    // ── Recommendations ───────────────────────────────────────────────
    // 3 cards shown below Risk Analysis.
    // Each map has keys: type, icon, title, body
    // Built by DriscScoringService.buildRecommendations()
    private List<Map<String, String>> recommendations;

    // ── Metadata ──────────────────────────────────────────────────────
    // When this DRISC score was last calculated
    private LocalDateTime calculatedAt;
}