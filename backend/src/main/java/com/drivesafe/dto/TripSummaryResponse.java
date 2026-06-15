package com.drivesafe.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.time.LocalDateTime;

// ─────────────────────────────────────────────────────────────────────────────
// TripSummaryResponse — one item in the list returned by GET /api/trips/{userId}
//
// Lightweight — only the fields shown on a collapsed trip card.
// Full details (avgSpeed, acceleration, AI text) are loaded separately
// when the user clicks "Show Details" via GET /api/trips/detail/{tripId}.
//
// JSON shape:
// {
//   "tripId":           1,
//   "driveScore":       62.0,
//   "riskLevel":        "Moderate",
//   "maxSpeed":         103.0,
//   "distanceKm":       23.0,
//   "weatherCondition": "Clear Weather",
//   "isDaytime":        true,
//   "createdAt":        "2024-06-01T10:30:00"
// }
// ─────────────────────────────────────────────────────────────────────────────
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class TripSummaryResponse {

    private Long          tripId;
    private double        driveScore;
    private String        riskLevel;       // "Safe" | "Moderate" | "High"
    private double        maxSpeed;        // km/h
    private double        distanceKm;
    private String        weatherCondition;
    private boolean       isDaytime;
    private LocalDateTime createdAt;
    private String mapUrl;
    private String aiRecommendation;
    private String heatmapUrl;          // ← ADD THIS LINE
}