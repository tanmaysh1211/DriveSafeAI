package com.drivesafe.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.time.LocalDateTime;

// ─────────────────────────────────────────────────────────────────────────────
// TripDetailResponse — returned by GET /api/trips/detail/{tripId}
//
// Loaded when the user clicks "Show Details ▼" on a trip card.
// Superset of TripSummaryResponse — includes avg speed, acceleration,
// AI recommendation, and map URL.
//
// JSON shape:
// {
//   "tripId":           1,
//   "driveScore":       62.0,
//   "riskLevel":        "Moderate",
//   "maxSpeed":         103.0,
//   "avgSpeed":         95.2,
//   "distanceKm":       23.0,
//   "maxAcceleration":  0.42,
//   "hardBrakingCount": 2,
//   "sharpTurnCount":   1,
//   "weatherCondition": "Clear Weather",
//   "isDaytime":        true,
//   "aiRecommendation": "Your max speed of 103 km/h...",
//   "mapUrl":           "http://localhost:5000/view-map/1",
//   "createdAt":        "2024-06-01T10:30:00"
// }
// ─────────────────────────────────────────────────────────────────────────────
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class TripDetailResponse {

    private Long          tripId;
    private double        driveScore;
    private String        riskLevel;

    // Speed & distance
    private double        maxSpeed;
    private double        avgSpeed;
    private double        distanceKm;
    private double        maxAcceleration;   // m/s²

    // Safety events
    private int           hardBrakingCount;
    private int           sharpTurnCount;

    // Conditions
    private String        weatherCondition;
    private boolean       isDaytime;

    // AI output — null if OpenAI was unreachable during processing
    private String        aiRecommendation;

    // Folium map URL — null if Flask map generation failed
    private String        mapUrl;

    private String heatmapUrl;          // ← ADD THIS LINE
    private LocalDateTime createdAt;
}