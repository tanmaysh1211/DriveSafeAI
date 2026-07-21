package com.drivesafe.service;

import com.drivesafe.dto.DashboardResponse;
import com.drivesafe.model.DriscScore;
import com.drivesafe.model.Trip;
import com.drivesafe.model.User;
import com.drivesafe.repository.DriscScoreRepository;
import com.drivesafe.repository.TripRepository;
import com.drivesafe.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
public class DriscScoringService {

    private final DriscScoreRepository driscScoreRepository;
    private final TripRepository tripRepository;
    private final UserRepository userRepository;
    private final InsuranceService insuranceService;

    @Autowired
    public DriscScoringService(
            DriscScoreRepository driscScoreRepository,
            TripRepository tripRepository,
            UserRepository userRepository,
            @Lazy InsuranceService insuranceService
    ) {
        this.driscScoreRepository = driscScoreRepository;
        this.tripRepository = tripRepository;
        this.userRepository = userRepository;
        this.insuranceService = insuranceService;
    }

    public DashboardResponse buildDashboard(Long userId, int n) {

        User user = userRepository.findById(userId).orElseThrow(() -> new NoSuchElementException("User not found: " + userId));
        DriscScore driscScore = calculateAndPersist(userId, n);
        Map<String, String> riskFactors = computeRiskFactors(userId, n);
        double discountPct = insuranceService.discountFromDrisc(driscScore.getScore());
        List<Map<String, String>> recommendations = buildRecommendations(driscScore, riskFactors, n);

        return DashboardResponse.builder()
                .userId(userId)
                .userName(user.getName())
                .userEmail(user.getEmail())
                .vehicleNumber(user.getVehicleNumber())
                .driscScore(driscScore.getScore())
                .riskLevel(driscScore.getRiskLevel())
                .tripsAnalyzed(driscScore.getTripsAnalyzed())
                .nTrips(n)
                .premiumImpact(discountPct)
                .riskFactors(riskFactors)
                .recommendations(recommendations)
                .calculatedAt(driscScore.getCalculatedAt())
                .build();
    }

    public DashboardResponse recalculate(Long userId, int n) {
        return buildDashboard(userId, n);
    }

    public double getLatestDriscScore(Long userId) {
        return driscScoreRepository.findTopByUserIdOrderByCalculatedAtDesc(userId).map(DriscScore::getScore).orElse(50.0); 
    }

    public List<Map<String, Object>> getScoreHistory(Long userId, int limit) {
        return driscScoreRepository
                .findTopNByUserIdOrderByCalculatedAtDesc(userId, limit)
                .stream()
                .map(ds -> {
                    Map<String, Object> entry = new LinkedHashMap<>();
                    entry.put("score",       ds.getScore());
                    entry.put("riskLevel",   ds.getRiskLevel());
                    entry.put("nTrips",      ds.getTripsAnalyzed());
                    entry.put("calculatedAt", ds.getCalculatedAt());
                    return entry;
                })
                .collect(Collectors.toList());
    }

    public boolean isOwner(Long userId, String email) {
        return userRepository.findByEmail(email)
                .map(u -> u.getId().equals(userId))
                .orElse(false);
    }

    @Transactional
    public DriscScore calculateAndPersist(Long userId, int n) {

        List<Trip> trips = tripRepository.findTopNByUserIdOrderByCreatedAtDesc(userId, n);

        double driscValue;
        int tripsUsed = trips.size();

        if (trips.isEmpty()) {
            driscValue = 50.0; // neutral default
        } else if (trips.size() == 1) {
            driscValue = trips.get(0).getDriveScore();
        } else {
            int totalWeight = tripsUsed * (tripsUsed + 1) / 2; // sum(1..N)
            double weightedSum = 0;
            for (int i = 0; i < trips.size(); i++) {
                int weight = tripsUsed - i; // most recent = highest weight
                weightedSum += trips.get(i).getDriveScore() * weight;
            }
            driscValue = weightedSum / totalWeight;
        }

        driscValue = Math.round(driscValue * 100.0) / 100.0;
        String riskLevel = riskLevel(driscValue);

        DriscScore driscScore = new DriscScore();
        driscScore.setUserId(userId);
        driscScore.setScore(driscValue);
        driscScore.setRiskLevel(riskLevel);
        driscScore.setTripsAnalyzed(tripsUsed);
        driscScore.setCalculatedAt(LocalDateTime.now());
        driscScoreRepository.save(driscScore);

        log.info("DRISC recalculated for user {} → {:.2f} ({}) over {} trips", userId, driscValue, riskLevel, tripsUsed);

        return driscScore;
    }

    private Map<String, String> computeRiskFactors(Long userId, int n) {
        List<Trip> trips = tripRepository.findTopNByUserIdOrderByCreatedAtDesc(userId, n);

        if (trips.isEmpty()) {
            return Map.of(
                    "Speeding Events", "Low",
                    "Hard Braking", "Low",
                    "Sharp Turns", "Low",
                    "Night Driving", "Normal"
            );
        }

        double avgMaxSpeed   = trips.stream().mapToDouble(Trip::getMaxSpeed).average().orElse(0);
        double avgHardBraking = trips.stream().mapToDouble(Trip::getHardBrakingCount).average().orElse(0);
        double avgSharpTurns  = trips.stream().mapToDouble(Trip::getSharpTurnCount).average().orElse(0);
        long nightTrips       = trips.stream().filter(t -> !t.isDaytime()).count();
        double nightRatio     = (double) nightTrips / trips.size();

        Map<String, String> factors = new LinkedHashMap<>();

        factors.put("Speeding Events", avgMaxSpeed > 120 ? "High" : avgMaxSpeed > 90 ? "Moderate" : "Low");
        factors.put("Hard Braking", avgHardBraking > 5 ? "High" : avgHardBraking > 2 ? "Moderate" : "Low");
        factors.put("Sharp Turns", avgSharpTurns > 8 ? "High" : avgSharpTurns > 3 ? "Moderate" : "Low");
        factors.put("Night Driving", nightRatio > 0.5 ? "High" : nightRatio > 0.25 ? "Moderate" : "Normal");

        return factors;
    }

    private List<Map<String, String>> buildRecommendations( DriscScore ds, Map<String, String> factors, int n) {
        
        List<Map<String, String>> recs = new ArrayList<>();
        Map<String, String> r1 = new LinkedHashMap<>();
        r1.put("type",  "Getting Started");
        r1.put("icon",  "info");
        r1.put("title", "Getting Started");
        if (n < 3) {
            r1.put("body", "Try increasing N to 3 for more comprehensive scoring.");
        } else if (n < 10) {
            r1.put("body", "Increasing N to 10 gives a more stable DRISC score over time.");
        } else {
            r1.put("body", "Your score is based on a solid " + n + "-trip window. Keep driving safely!");
        }
        recs.add(r1);

        Map<String, String> r2 = new LinkedHashMap<>();
        r2.put("type",  "Data Analysis");
        r2.put("icon",  "warning");
        r2.put("title", "Data Analysis");
        String worstFactor = getWorstFactor(factors);
        r2.put("body", worstFactor != null ? "Your " + worstFactor + " score needs attention." + "Analyze more trips to track improvement." : "Consider analyzing more trips for better accuracy.");
        recs.add(r2);

        Map<String, String> r3 = new LinkedHashMap<>();
        r3.put("type",  "Premium Benefits");
        r3.put("icon",  "money");
        r3.put("title", "Premium Benefits");
        double discount = insuranceService.discountFromDrisc(ds.getScore());
        if (discount >= 10) {
            r3.put("body", String.format(
                    "Great driving! You qualify for a %.0f%% premium discount.", discount));
        } else if (discount > 0) {
            r3.put("body", String.format(
                    "You have a %.0f%% discount. Improve your score to unlock up to 15%%.", discount));
        } else {
            r3.put("body", "Analyze more trips and improve your score to unlock premium discounts.");
        }
        recs.add(r3);

        return recs;
    }

    private String riskLevel(double score) {
        if (score <= 40) return "Safe";
        if (score <= 65) return "Moderate";
        return "High";
    }

    private String getWorstFactor(Map<String, String> factors) {
        for (Map.Entry<String, String> e : factors.entrySet()) {
            if ("High".equalsIgnoreCase(e.getValue())) return e.getKey();
        }
        for (Map.Entry<String, String> e : factors.entrySet()) {
            if ("Moderate".equalsIgnoreCase(e.getValue())) return e.getKey();
        }
        return null;
    }
}
