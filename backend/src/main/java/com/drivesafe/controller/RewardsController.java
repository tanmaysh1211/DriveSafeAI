package com.drivesafe.controller;

import com.drivesafe.dto.RewardItemResponse;
import com.drivesafe.service.RewardsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/rewards")
@RequiredArgsConstructor
public class RewardsController {

    private final RewardsService rewardsService;

    // GET /api/rewards/store
    // Returns full catalog of redeemable rewards
    // (Burger King, Indian Oil, Swiggy, Amazon, Netflix, Spotify, Zomato)
    @GetMapping("/store")
    public ResponseEntity<List<RewardItemResponse>> getStore() {
        return ResponseEntity.ok(rewardsService.getAllRewards());
    }

    // GET /api/rewards/store/{category}
    // Filter rewards by category: food, fuel, shopping, entertainment
    @GetMapping("/store/{category}")
    public ResponseEntity<List<RewardItemResponse>> getByCategory(
            @PathVariable String category) {
        return ResponseEntity.ok(rewardsService.getRewardsByCategory(category));
    }

    // GET /api/rewards/points/{userId}
    // Returns user's current points balance
    @GetMapping("/points/{userId}")
    public ResponseEntity<?> getPoints(
            @PathVariable Long userId,
            Authentication authentication) {

        if (!rewardsService.isOwner(userId, authentication.getName())) {
            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Access denied"));
        }

        int points = rewardsService.getUserPoints(userId);
        return ResponseEntity.ok(Map.of(
                "userId", userId,
                "points", points
        ));
    }

    // POST /api/rewards/redeem
    // Body: { "userId": 5, "rewardId": 2 }
    // Deducts points and marks reward as redeemed — returns redemption code
    @PostMapping("/redeem")
    public ResponseEntity<?> redeemReward(
            @RequestBody Map<String, Long> body,
            Authentication authentication) {

        Long userId = body.get("userId");
        Long rewardId = body.get("rewardId");

        if (userId == null || rewardId == null) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("message", "userId and rewardId are required"));
        }

        if (!rewardsService.isOwner(userId, authentication.getName())) {
            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Access denied"));
        }

        try {
            Map<String, Object> result = rewardsService.redeemReward(userId, rewardId);
            return ResponseEntity.ok(result);
        } catch (IllegalStateException e) {
            // Thrown when user has insufficient points
            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Redemption failed: " + e.getMessage()));
        }
    }

    // GET /api/rewards/history/{userId}
    // Returns list of past redemptions for the user
    @GetMapping("/history/{userId}")
    public ResponseEntity<?> getRedemptionHistory(
            @PathVariable Long userId,
            Authentication authentication) {

        if (!rewardsService.isOwner(userId, authentication.getName())) {
            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Access denied"));
        }

        return ResponseEntity.ok(rewardsService.getRedemptionHistory(userId));
    }
}