package com.drivesafe.service;

import com.drivesafe.dto.RewardItemResponse;
import com.drivesafe.model.Reward;
import com.drivesafe.model.RewardRedemption;
import com.drivesafe.model.UserPoints;
import com.drivesafe.model.User;
import com.drivesafe.repository.RewardRepository;
import com.drivesafe.repository.RewardRedemptionRepository;
import com.drivesafe.repository.UserPointsRepository;
import com.drivesafe.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RewardsService {

    private final UserPointsRepository userPointsRepository;
    private final RewardRepository rewardRepository;
    private final RewardRedemptionRepository redemptionRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @Transactional
    public int awardPointsForTrip(Long userId, double driveScore) {
        int points = pointsForScore(driveScore);

        UserPoints userPoints = userPointsRepository.findByUserId(userId)
                .orElseGet(() -> {
                    UserPoints fresh = new UserPoints();
                    fresh.setUserId(userId);
                    fresh.setTotalPoints(0);
                    return fresh;
                });

        userPoints.setTotalPoints(userPoints.getTotalPoints() + points);
        userPoints.setLastUpdated(LocalDateTime.now());
        userPointsRepository.save(userPoints);

        log.info("Awarded {} points to user {} (driveScore={})", points, userId, String.format("%.1f", driveScore));
        return points;
    }

    public int getUserPoints(Long userId) {
        return userPointsRepository.findByUserId(userId).map(UserPoints::getTotalPoints).orElse(0);
    }

    public List<RewardItemResponse> getAllRewards() {
        return rewardRepository.findAllByOrderByPointsCostAsc().stream().map(this::toResponse).collect(Collectors.toList());
    }

    public List<RewardItemResponse> getRewardsByCategory(String category) {
        return rewardRepository.findByCategoryIgnoreCase(category).stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional
    public Map<String, Object> redeemReward(Long userId, Long rewardId) {

        Reward reward = rewardRepository.findById(rewardId).orElseThrow(() -> new NoSuchElementException("Reward not found: " + rewardId));

        UserPoints userPoints = userPointsRepository.findByUserId(userId)
                .orElseGet(() -> {
                    UserPoints up = new UserPoints();
                    up.setUserId(userId);
                    up.setTotalPoints(0);
                    return up;
                });

        if (userPoints.getTotalPoints() < reward.getPointsCost()) {
            throw new IllegalStateException(String.format("Insufficient points. You have %d but need %d.", userPoints.getTotalPoints(), reward.getPointsCost()));
        }

        userPoints.setTotalPoints(userPoints.getTotalPoints() - reward.getPointsCost());
        userPoints.setLastUpdated(LocalDateTime.now());
        userPointsRepository.save(userPoints);

        String code = generateRedemptionCode(userId, rewardId);
        RewardRedemption redemption = new RewardRedemption();
        redemption.setUserId(userId);
        redemption.setReward(reward);
        redemption.setRedemptionCode(code);
        redemption.setRedeemedAt(LocalDateTime.now());
        redemptionRepository.save(redemption);

        log.info("User {} redeemed reward {} for {} points — code: {}", userId, reward.getName(), reward.getPointsCost(), code);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("redemptionId", redemption.getId());
        result.put("rewardName", reward.getName());
        result.put("rewardValue", reward.getValue());
        result.put("redemptionCode", code);
        result.put("pointsDeducted", reward.getPointsCost());
        result.put("remainingPoints", userPoints.getTotalPoints());
        result.put("message", "Reward redeemed successfully!");

        notificationService.notifyRewardRedeemed(userId, reward.getName(), reward.getPointsCost());
        return result;
    }

    public List<Map<String, Object>> getRedemptionHistory(Long userId) {
        return redemptionRepository.findByUserIdOrderByRedeemedAtDesc(userId)
                .stream()
                .map(r -> {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("redemptionId", r.getId());
                    item.put("rewardName", r.getReward().getName());
                    item.put("rewardCategory", r.getReward().getCategory());
                    item.put("redemptionCode", r.getRedemptionCode());
                    item.put("pointsSpent", r.getReward().getPointsCost());
                    item.put("redeemedAt", r.getRedeemedAt());
                    return item;
                })
                .collect(Collectors.toList());
    }

    public boolean isOwner(Long userId, String email) {
        return userRepository.findByEmail(email)
                .map(u -> u.getId().equals(userId))
                .orElse(false);
    }

    private int pointsForScore(double driveScore) {
        if (driveScore <= 40) return 50;  // Safe driving — most points
        if (driveScore <= 65) return 25;  // Moderate
        return 10;                         // High risk — still reward participation
    }

    private String generateRedemptionCode(Long userId, Long rewardId) {
        String random = UUID.randomUUID().toString()
                .replace("-", "")
                .substring(0, 6)
                .toUpperCase();
        return String.format("DS-%d-%d-%s", userId, rewardId, random);
    }

    private RewardItemResponse toResponse(Reward r) {
        return RewardItemResponse.builder()
                .id(r.getId())
                .name(r.getName())
                .description(r.getDescription())
                .category(r.getCategory())
                .pointsCost(r.getPointsCost())
                .value(r.getValue())
                .emoji(r.getEmoji())
                .build();
    }
}
