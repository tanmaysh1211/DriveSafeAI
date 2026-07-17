package com.drivesafe.controller;

import com.drivesafe.dto.TripDetailResponse;
import com.drivesafe.dto.TripSummaryResponse;
import com.drivesafe.dto.TripUploadResponse;
import com.drivesafe.service.TripService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.Objects;

@RestController
@RequestMapping("/api/trips")
@RequiredArgsConstructor
public class TripController {

    private final TripService tripService;

    // POST /api/trips/upload
    // Accepts a CSV file (DF2.csv from OBD device/simulator)
    // Returns driveScore, riskLevel, AI recommendation, weather context
    @PostMapping("/upload")
    public ResponseEntity<?> uploadTrip(
            @RequestParam("file") MultipartFile file,
            Authentication authentication) {

        if (file.isEmpty()) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("message", "CSV file is empty"));
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.contains("csv")) {
            if (!Objects.requireNonNull(file.getOriginalFilename()).endsWith(".csv")) {
                return ResponseEntity
                        .badRequest()
                        .body(Map.of("message", "Only CSV files are accepted"));
            }
        }

        try {
            String email = authentication.getName();
            TripUploadResponse response = tripService.processTrip(file, email);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to process trip: " + e.getMessage()));
        }
    }

    @PostMapping("/simulate")
    public ResponseEntity<?> simulateTrip(
            @RequestBody Map<String, String> body,
            Authentication auth) {
        try {
            String profile = body.getOrDefault("profile", "average");
            String route   = body.getOrDefault("route", "bangalore_electronic_city");
            TripUploadResponse result = tripService.processSimulatedTrip(
                    auth.getName(), profile, route);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(500)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    // GET /api/trips/{userId}?limit=10
    // Returns paginated list of trip summaries for the user
    @GetMapping("/{userId}")
    public ResponseEntity<List<TripSummaryResponse>> getUserTrips(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "10") int limit) {

        List<TripSummaryResponse> trips = tripService.getTripsByUser(userId, limit);
        return ResponseEntity.ok(trips);
    }

    // GET /api/trips/detail/{tripId}
    // Returns full trip details: speed stats, conditions, braking, turns
    @GetMapping("/detail/{tripId}")
    public ResponseEntity<?> getTripDetails(@PathVariable Long tripId) {
        TripDetailResponse detail = tripService.getTripDetails(tripId);
        if (detail == null) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Trip not found"));
        }
        return ResponseEntity.ok(detail);
    }

    // GET /api/trips/{tripId}/ai-analysis
    // Returns stored AI recommendation text for the trip
    @GetMapping("/{tripId}/ai-analysis")
    public ResponseEntity<?> getAIAnalysis(@PathVariable Long tripId) {
        String analysis = tripService.getAIAnalysis(tripId);
        if (analysis == null || analysis.isBlank()) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "AI analysis not available for this trip"));
        }
        return ResponseEntity.ok(Map.of("tripId", tripId, "analysis", analysis));
    }

    // GET /api/trips/{tripId}/map-url
    // Returns URL of the Folium-generated HTML map for this trip
    @GetMapping("/{tripId}/map-url")
    public ResponseEntity<?> getMapUrl(@PathVariable Long tripId) {
        String mapUrl = tripService.getMapUrl(tripId);
        if (mapUrl == null) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Map not generated for this trip"));
        }
        return ResponseEntity.ok(Map.of("tripId", tripId, "mapUrl", mapUrl));
    }

    // DELETE /api/trips/{tripId}
    @DeleteMapping("/{tripId}")
    public ResponseEntity<?> deleteTrip(
            @PathVariable Long tripId,
            Authentication authentication) {

        boolean deleted = tripService.deleteTrip(tripId, authentication.getName());
        if (!deleted) {
            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Trip not found or not authorized"));
        }
        return ResponseEntity.ok(Map.of("message", "Trip deleted successfully"));
    }
}