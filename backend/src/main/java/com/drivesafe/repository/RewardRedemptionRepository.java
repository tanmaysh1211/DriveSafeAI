package com.drivesafe.repository;

import com.drivesafe.model.RewardRedemption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface RewardRedemptionRepository extends JpaRepository<RewardRedemption, Long> {

    // ── History queries ───────────────────────────────────────────────

    /**
     * All redemptions for a user, newest first.
     * Called by RewardsService.getRedemptionHistory() — powers the
     * "My Redemptions" history modal in Rewards.jsx.
     */
    List<RewardRedemption> findByUserIdOrderByRedeemedAtDesc(Long userId);

    /**
     * Top 10 most recent redemptions for a user.
     * Used for compact history previews.
     */
    List<RewardRedemption> findTop10ByUserIdOrderByRedeemedAtDesc(Long userId);

    // ── Code lookup ───────────────────────────────────────────────────

    /**
     * Find redemption by its unique code (e.g. "DS-5-2-ABC123").
     * Used when a partner outlet verifies a redemption code.
     */
    Optional<RewardRedemption> findByRedemptionCode(String redemptionCode);

    /**
     * Check if a redemption code already exists — ensures uniqueness
     * before generating a new one in RewardsService.
     */
    boolean existsByRedemptionCode(String redemptionCode);

    // ── Reward-specific queries ───────────────────────────────────────

    /**
     * All redemptions for a specific reward across all users.
     * Used for reward popularity analytics.
     *
     * Example: how many times has "Netflix 1 Month" been redeemed?
     */
    List<RewardRedemption> findByRewardIdOrderByRedeemedAtDesc(Long rewardId);

    /**
     * Count how many times a user has redeemed a specific reward.
     * Can be used to limit redemptions per reward per user if needed.
     */
    long countByUserIdAndRewardId(Long userId, Long rewardId);

    // ── Stats queries ─────────────────────────────────────────────────

    /**
     * Total points spent by a user across all redemptions.
     * Used for lifetime spending stats on the profile page.
     */
    @Query("SELECT COALESCE(SUM(r.reward.pointsCost), 0) FROM RewardRedemption r WHERE r.userId = :userId")
    int sumPointsSpentByUser(@Param("userId") Long userId);

    /**
     * Most popular rewards ranked by redemption count.
     * Returns Object[]{rewardId, rewardName, count}
     * Used for admin/insurer analytics.
     */
    @Query("""
            SELECT r.reward.id, r.reward.name, COUNT(r)
            FROM RewardRedemption r
            GROUP BY r.reward.id, r.reward.name
            ORDER BY COUNT(r) DESC
            """)
    List<Object[]> findMostRedeemedRewards();

    /**
     * Redemptions within a date range for a user.
     * Supports "this month" / "this year" filtering in history view.
     */
    @Query("""
            SELECT r FROM RewardRedemption r
            WHERE r.userId = :userId
              AND r.redeemedAt BETWEEN :from AND :to
            ORDER BY r.redeemedAt DESC
            """)
    List<RewardRedemption> findByUserIdAndDateRange(
            @Param("userId") Long userId,
            @Param("from")   LocalDateTime from,
            @Param("to")     LocalDateTime to
    );

    // ── Ownership check ───────────────────────────────────────────────

    /**
     * Verify a redemption belongs to a specific user.
     * Used before exposing redemption details to prevent data leaks.
     */
    boolean existsByIdAndUserId(Long id, Long userId);
}