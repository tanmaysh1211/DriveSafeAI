package com.drivesafe.service;

import com.drivesafe.dto.TripDetailResponse;
import com.drivesafe.dto.TripSummaryResponse;
import com.drivesafe.dto.TripUploadResponse;
import com.drivesafe.model.Trip;
import com.drivesafe.model.User;
import com.drivesafe.repository.TripRepository;
import com.drivesafe.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TripService {

    private final TripRepository tripRepository;
    private final UserRepository userRepository;
    private final WeatherService weatherService;
    private final AIRecommendationService aiRecommendationService;
    private final RewardsService rewardsService;
    private final RestTemplate restTemplate;
    private final NotificationService notificationService;

    @Value("${flask.ml.url}")
    private String flaskMlUrl; // e.g. http://localhost:5000

    // ─────────────────────────────────────────────────────────────────
    // MAIN ENTRY — called by TripController on CSV upload
    // Full pipeline: parse → stats → weather → ML score → map → persist
    //                → AI recommendation → award points → return response
    // ─────────────────────────────────────────────────────────────────

    private String callFlaskForHeatmap(List<Map<String, String>> rows, Long userId) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("user_id", userId);
        payload.put("rows", rows);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

        ResponseEntity<Map> response = restTemplate.postForEntity(
                flaskMlUrl + "/generate-heatmap", request, Map.class);

        if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
            Object url = response.getBody().get("heatmap_url");
            return url != null ? url.toString() : null;
        }
        return null;
    }

    public TripUploadResponse processTrip(MultipartFile file, String email) throws Exception {

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));

        // 1. Parse CSV rows
        List<Map<String, String>> rows = parseCsv(file);
        if (rows.isEmpty()) {
            throw new IllegalArgumentException("CSV file has no data rows");
        }

        // 2. Extract aggregated stats from all rows
        TelemetryStats stats = extractStats(rows);

        // 3. Fetch weather at trip start coordinates
        String weather = "Clear";
        boolean isDaytime = true;
        if (stats.startLat != 0 && stats.startLng != 0) {
            WeatherService.WeatherInfo info =
                    weatherService.getWeatherAtLocation(stats.startLat, stats.startLng);
            weather = info.getCondition();
            isDaytime = info.isDaytime();
        }

        // 4. Call Flask ML for DriveScore
        double driveScore = callFlaskForScore(stats, weather, isDaytime);

        // 5. Generate Folium map via Flask (best-effort — won't block response)
//        String mapUrl = null;
//        try {
//            mapUrl = callFlaskForMap(rows, user.getId());
//        } catch (Exception e) {
//            log.warn("Map generation skipped for user {}: {}", user.getId(), e.getMessage());
//        }

        // 5. Generate Folium map via Flask
        String mapUrl = null;
        String heatmapUrl = null;     // ← ADD THIS LINE
        try {
            mapUrl = callFlaskForMap(rows, user.getId());
            heatmapUrl = callFlaskForHeatmap(rows, user.getId());  // ← ADD THIS LINE
            System.out.println("HEATMAP URL = " + heatmapUrl);
        } catch (Exception e) {
            log.warn("Map generation skipped for user {}: {}", user.getId(), e.getMessage());
        }

        // 6. Persist trip entity
        Trip trip = new Trip();
        trip.setUser(user);
        trip.setDriveScore(driveScore);
        trip.setMaxSpeed(stats.maxSpeed);
        trip.setAvgSpeed(stats.avgSpeed);
        trip.setDistance(stats.distanceKm);
        trip.setMaxAcceleration(stats.maxAcceleration);
        trip.setHardBrakingCount(stats.hardBrakingCount);
        trip.setSharpTurnCount(stats.sharpTurnCount);
        trip.setWeatherCondition(weather);
        trip.setDaytime(isDaytime);
        trip.setMapUrl(mapUrl);
        trip.setHeatmapUrl(heatmapUrl);   // ← ADD THIS LINE
        trip.setCreatedAt(LocalDateTime.now());
        Trip saved = tripRepository.save(trip);

        // 7. Generate OpenAI recommendation and store back on trip
        String recommendation = "";
        try {
            recommendation = aiRecommendationService.generateRecommendation(saved);
            saved.setAiRecommendation(recommendation);
            tripRepository.save(saved);
        } catch (Exception e) {
            log.warn("AI recommendation skipped for trip {}: {}", saved.getId(), e.getMessage());
        }

        // 8. Award gamification points based on DriveScore
        int pointsEarned = rewardsService.awardPointsForTrip(user.getId(), driveScore);

        // 9. Send notifications
        String riskLevel = getRiskLevel(driveScore);
        int newTotal = rewardsService.getUserPoints(user.getId());

        notificationService.notifyTripScored(user.getId(), driveScore, riskLevel, pointsEarned);
        notificationService.notifyPointsEarned(user.getId(), pointsEarned, newTotal);

        if (driveScore > 65) {
            notificationService.notifyRiskAlert(user.getId(), driveScore);
        }


        return TripUploadResponse.builder()
                .tripId(saved.getId())
                .driveScore(driveScore)
                .riskLevel(getRiskLevel(driveScore))
                .maxSpeed(stats.maxSpeed)
                .avgSpeed(stats.avgSpeed)
                .distanceKm(stats.distanceKm)
                .hardBrakingCount(stats.hardBrakingCount)
                .sharpTurnCount(stats.sharpTurnCount)
                .weatherCondition(weather)
                .isDaytime(isDaytime)
                .aiRecommendation(recommendation)
                .mapUrl(mapUrl)
                .heatmapUrl(heatmapUrl)        // ← ADD THIS LINE
                .pointsEarned(pointsEarned)
                .message("Trip processed successfully")
                .build();
    }


    // ─────────────────────────────────────────────────────────────────
    // GET TRIPS LIST — paginated summary cards for TripHistory page
    // ─────────────────────────────────────────────────────────────────
//    public List<TripSummaryResponse> getTripsByUser(Long userId, int limit) {
//        return tripRepository
//                .findTopNByUserIdOrderByCreatedAtDesc(userId, limit)
//                .stream()
//                .map(trip -> TripSummaryResponse.builder()
//                        .tripId(trip.getId())
//                        .driveScore(trip.getDriveScore())
//                        .maxSpeed(trip.getMaxSpeed())
//                        .distanceKm(trip.getDistance())
//                        .riskLevel(getRiskLevel(trip.getDriveScore()))
//                        .isDaytime(trip.isDaytime())
//                        .weatherCondition(trip.getWeatherCondition())
//                        .createdAt(trip.getCreatedAt())
//                        .build())
//                .collect(Collectors.toList());
//    }


    public List<TripSummaryResponse> getTripsByUser(Long userId, int limit) {
        return tripRepository
                .findTopNByUserIdOrderByCreatedAtDesc(userId, limit)
                .stream()
                .map(trip -> TripSummaryResponse.builder()
                        .tripId(trip.getId())
                        .driveScore(trip.getDriveScore())
                        .maxSpeed(trip.getMaxSpeed())
                        .distanceKm(trip.getDistance())
                        .riskLevel(getRiskLevel(trip.getDriveScore()))
                        .isDaytime(trip.isDaytime())
                        .weatherCondition(trip.getWeatherCondition())
                        .mapUrl(trip.getMapUrl())                      // ← ADD THIS
                        .aiRecommendation(trip.getAiRecommendation())  // ← ADD THIS
                        .heatmapUrl(trip.getHeatmapUrl())   // ← ADD THIS LINE
                        .createdAt(trip.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────────────────────────
    // GET FULL TRIP DETAILS — shown when user expands a trip card
    // ─────────────────────────────────────────────────────────────────
    public TripDetailResponse getTripDetails(Long tripId) {
        return tripRepository.findById(tripId)
                .map(trip -> TripDetailResponse.builder()
                        .tripId(trip.getId())
                        .driveScore(trip.getDriveScore())
                        .maxSpeed(trip.getMaxSpeed())
                        .avgSpeed(trip.getAvgSpeed())
                        .distanceKm(trip.getDistance())
                        .maxAcceleration(trip.getMaxAcceleration())
                        .hardBrakingCount(trip.getHardBrakingCount())
                        .sharpTurnCount(trip.getSharpTurnCount())
                        .weatherCondition(trip.getWeatherCondition())
                        .isDaytime(trip.isDaytime())
                        .riskLevel(getRiskLevel(trip.getDriveScore()))
                        .aiRecommendation(trip.getAiRecommendation())
                        .mapUrl(trip.getMapUrl())
                        .heatmapUrl(trip.getHeatmapUrl())   // ← ADD THIS LINE
                        .createdAt(trip.getCreatedAt())
                        .build())
                .orElse(null);
    }

    public String getAIAnalysis(Long tripId) {
        return tripRepository.findById(tripId)
                .map(Trip::getAiRecommendation)
                .orElse(null);
    }

    public String getMapUrl(Long tripId) {
        return tripRepository.findById(tripId)
                .map(Trip::getMapUrl)
                .orElse(null);
    }

    public boolean deleteTrip(Long tripId, String email) {
        return tripRepository.findById(tripId).map(trip -> {
            if (!trip.getUser().getEmail().equals(email)) return false;
            tripRepository.delete(trip);
            return true;
        }).orElse(false);
    }

    // ─────────────────────────────────────────────────────────────────
    // CSV PARSER
    // Expected columns: timestamp, latitude, longitude,
    //                   speed, acceleration, rpm, engine_temperature
    // ─────────────────────────────────────────────────────────────────
    private List<Map<String, String>> parseCsv(MultipartFile file) throws Exception {
        List<Map<String, String>> rows = new ArrayList<>();
        try (BufferedReader reader =
                     new BufferedReader(new InputStreamReader(file.getInputStream()))) {

            String headerLine = reader.readLine();
            if (headerLine == null) return rows;

            // Strip BOM and normalise header names
            String[] headers = headerLine.split(",");
            for (int i = 0; i < headers.length; i++) {
                headers[i] = headers[i].trim()
                        .replace("\uFEFF", "")
                        .toLowerCase();
            }

            String line;
            while ((line = reader.readLine()) != null) {
                if (line.isBlank()) continue;
                String[] values = line.split(",");
                Map<String, String> row = new LinkedHashMap<>();
                for (int i = 0; i < headers.length && i < values.length; i++) {
                    row.put(headers[i], values[i].trim());
                }
                rows.add(row);
            }
        }
        return rows;
    }

    // ─────────────────────────────────────────────────────────────────
    // TELEMETRY STATS EXTRACTION
    // Computes aggregated features from raw CSV rows
    // ─────────────────────────────────────────────────────────────────
    private TelemetryStats extractStats(List<Map<String, String>> rows) {
        TelemetryStats stats = new TelemetryStats();
        List<Double> speeds = new ArrayList<>();
        List<Double> absAccels = new ArrayList<>();
        double prevLat = 0, prevLng = 0;
        double totalDistance = 0;
        int hardBraking = 0;
        int sharpTurns = 0;

        for (int i = 0; i < rows.size(); i++) {
            Map<String, String> row = rows.get(i);

            double speed = parseDouble(row.getOrDefault("speed", "0"));
            double accel = parseDouble(row.getOrDefault("acceleration", "0"));
            double lat   = parseDouble(row.getOrDefault("latitude",  "0"));
            double lng   = parseDouble(row.getOrDefault("longitude", "0"));

            speeds.add(speed);
            absAccels.add(Math.abs(accel));

            // Hard braking threshold: deceleration > ~0.3 g
            if (accel < -2.94) hardBraking++;

            // Sharp turn proxy: high lateral force at speed
            if (Math.abs(accel) > 1.5 && speed > 20) sharpTurns++;

            // Haversine distance accumulation
            if (i > 0 && prevLat != 0 && prevLng != 0 && lat != 0 && lng != 0) {
                totalDistance += haversineKm(prevLat, prevLng, lat, lng);
            }

            // Capture trip start coordinates for weather lookup
            if (i == 0) {
                stats.startLat = lat;
                stats.startLng = lng;
            }

            prevLat = lat;
            prevLng = lng;
        }

        stats.maxSpeed        = speeds.stream().mapToDouble(d -> d).max().orElse(0);
        stats.avgSpeed        = speeds.stream().mapToDouble(d -> d).average().orElse(0);
        stats.maxAcceleration = absAccels.stream().mapToDouble(d -> d).max().orElse(0);
        stats.distanceKm      = totalDistance;
        stats.hardBrakingCount = hardBraking;
        stats.sharpTurnCount   = sharpTurns;

        return stats;
    }

    // ─────────────────────────────────────────────────────────────────
    // FLASK ML CALL → DriveScore (0–100, higher = riskier)
    // POST {flaskMlUrl}/predict
    // ─────────────────────────────────────────────────────────────────
    private double callFlaskForScore(TelemetryStats stats, String weather, boolean isDaytime) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("max_speed",           stats.maxSpeed);
            payload.put("avg_speed",           stats.avgSpeed);
            payload.put("max_acceleration",    stats.maxAcceleration);
            payload.put("hard_braking_count",  stats.hardBrakingCount);
            payload.put("sharp_turn_count",    stats.sharpTurnCount);
            payload.put("distance_km",         stats.distanceKm);
            payload.put("is_daytime",          isDaytime ? 1 : 0);
            payload.put("weather",             weather);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(
                    flaskMlUrl + "/predict", request, Map.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                Object score = response.getBody().get("drive_score");
                if (score != null) return Double.parseDouble(score.toString());
            }
        } catch (Exception e) {
            log.error("Flask ML scoring failed — using fallback: {}", e.getMessage());
        }
        return computeFallbackScore(stats);
    }

    // ─────────────────────────────────────────────────────────────────
    // FLASK MAP CALL → Folium HTML map URL
    // POST {flaskMlUrl}/generate-map
    // ─────────────────────────────────────────────────────────────────
    private String callFlaskForMap(List<Map<String, String>> rows, Long userId) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("user_id", userId);
        payload.put("rows", rows);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

        ResponseEntity<Map> response = restTemplate.postForEntity(
                flaskMlUrl + "/generate-map", request, Map.class);

        if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
            Object url = response.getBody().get("map_url");
            return url != null ? url.toString() : null;
        }
        return null;
    }

    // ─────────────────────────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────────────────────────
    public String getRiskLevel(double score) {
        if (score <= 40) return "Safe";
        if (score <= 65) return "Moderate";
        return "High";
    }

    private double computeFallbackScore(TelemetryStats s) {
        double score = 30.0;
        if (s.maxSpeed > 100) score += 15;
        if (s.maxSpeed > 120) score += 15;
        if (s.hardBrakingCount > 3) score += 10;
        if (s.sharpTurnCount > 5) score += 10;
        return Math.min(score, 100.0);
    }

    private double parseDouble(String val) {
        try { return Double.parseDouble(val); }
        catch (NumberFormatException e) { return 0.0; }
    }

    // Haversine: straight-line km between two GPS coordinates
    private double haversineKm(double lat1, double lng1, double lat2, double lng2) {
        final double R = 6371.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    // ─────────────────────────────────────────────────────────────────
    // INNER — holds extracted stats from a CSV upload
    // ─────────────────────────────────────────────────────────────────
    private static class TelemetryStats {
        double maxSpeed, avgSpeed, maxAcceleration, distanceKm;
        int hardBrakingCount, sharpTurnCount;
        double startLat, startLng;
    }
}