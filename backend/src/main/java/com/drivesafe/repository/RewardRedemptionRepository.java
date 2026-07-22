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

    List<RewardRedemption> findByUserIdOrderByRedeemedAtDesc(Long userId);

    List<RewardRedemption> findTop10ByUserIdOrderByRedeemedAtDesc(Long userId);

    Optional<RewardRedemption> findByRedemptionCode(String redemptionCode);

    boolean existsByRedemptionCode(String redemptionCode);

    List<RewardRedemption> findByRewardIdOrderByRedeemedAtDesc(Long rewardId);

    long countByUserIdAndRewardId(Long userId, Long rewardId);

    @Query("SELECT COALESCE(SUM(r.reward.pointsCost), 0) FROM RewardRedemption r WHERE r.userId = :userId")
    int sumPointsSpentByUser(@Param("userId") Long userId);

    @Query("""
            SELECT r.reward.id, r.reward.name, COUNT(r)
            FROM RewardRedemption r
            GROUP BY r.reward.id, r.reward.name
            ORDER BY COUNT(r) DESC
            """)
    List<Object[]> findMostRedeemedRewards();

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

    boolean existsByIdAndUserId(Long id, Long userId);
}
