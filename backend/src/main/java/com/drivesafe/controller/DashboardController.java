package com.drivesafe.controller;

import com.drivesafe.dto.DashboardResponse;
import com.drivesafe.service.DriscScoringService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DriscScoringService driscScoringService;

    // GET /api/dashboard/{userId}
    // Returns full dashboard: DRISC score, risk level, premium impact,
    // trips analyzed, risk factors, recommendations
    @GetMapping("/{userId}")
    public ResponseEntity<?> getDashboard(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "1") int n,
            Authentication authentication) {

        // Only allow users to access their own dashboard
        String email = authentication.getName();
        boolean authorized = driscScoringService.isOwner(userId, email);
        if (!authorized) {
            return ResponseEntity
                    .status(403)
                    .body(Map.of("message", "Access denied"));
        }

        DashboardResponse dashboard = driscScoringService.buildDashboard(userId, n);
        return ResponseEntity.ok(dashboard);
    }

    // POST /api/dashboard/{userId}/recalculate
    // Forces a fresh DRISC score recalculation over last N trips
    // Called automatically after each new trip upload, but can be triggered manually
    @PostMapping("/{userId}/recalculate")
    public ResponseEntity<?> recalculate(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "5") int n,
            Authentication authentication) {

        String email = authentication.getName();
        boolean authorized = driscScoringService.isOwner(userId, email);
        if (!authorized) {
            return ResponseEntity
                    .status(403)
                    .body(Map.of("message", "Access denied"));
        }

        DashboardResponse updated = driscScoringService.recalculate(userId, n);
        return ResponseEntity.ok(updated);
    }

    // GET /api/dashboard/{userId}/score-history
    // Returns list of DRISC scores over time for trend chart on dashboard
    @GetMapping("/{userId}/score-history")
    public ResponseEntity<?> getScoreHistory(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "10") int limit,
            Authentication authentication) {

        String email = authentication.getName();
        boolean authorized = driscScoringService.isOwner(userId, email);
        if (!authorized) {
            return ResponseEntity
                    .status(403)
                    .body(Map.of("message", "Access denied"));
        }

        return ResponseEntity.ok(driscScoringService.getScoreHistory(userId, limit));
    }
}