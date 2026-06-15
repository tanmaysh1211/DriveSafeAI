package com.drivesafe.repository;

import com.drivesafe.model.UserPoints;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserPointsRepository extends JpaRepository<UserPoints, Long> {

    // ── Core lookup ───────────────────────────────────────────────────

    /**
     * Find points record by userId.
     * Called by RewardsService on every:
     *   - Trip upload  (awardPointsForTrip)
     *   - Redemption   (redeemReward)
     *   - Points check (getUserPoints)
     *
     * One row per user — enforced by unique index on user_id column.
     */
    Optional<UserPoints> findByUserId(Long userId);

    /**
     * Check if a points record exists for a user.
     * Used before creating a new row in awardPointsForTrip.
     */
    boolean existsByUserId(Long userId);

    // ── Direct balance updates ────────────────────────────────────────

    /**
     * Add points directly in DB — more efficient than fetch → mutate → save
     * for a single numeric field update.
     *
     * Updates both totalPoints (spendable) and lifetimePoints (never decremented).
     * Called by RewardsService.awardPointsForTrip() as an alternative to
     * the entity-based approach.
     */
    @Modifying
    @Transactional
    @Query("""
            UPDATE UserPoints u
            SET u.totalPoints    = u.totalPoints    + :points,
                u.lifetimePoints = u.lifetimePoints + :points,
                u.lastUpdated    = CURRENT_TIMESTAMP
            WHERE u.userId = :userId
            """)
    int addPoints(@Param("userId") Long userId, @Param("points") int points);

    /**
     * Deduct points on redemption.
     * The WHERE clause guards against going negative — returns 0 rows
     * if balance is insufficient (should be caught in service layer first).
     */
    @Modifying
    @Transactional
    @Query("""
            UPDATE UserPoints u
            SET u.totalPoints  = u.totalPoints  - :points,
                u.totalRedeemed = u.totalRedeemed + :points,
                u.lastUpdated   = CURRENT_TIMESTAMP
            WHERE u.userId = :userId
              AND u.totalPoints >= :points
            """)
    int deductPoints(@Param("userId") Long userId, @Param("points") int points);

    // ── Balance query ─────────────────────────────────────────────────

    /**
     * Get only the current spendable balance — avoids fetching
     * the full entity just for the navbar points pill.
     */
    @Query("SELECT u.totalPoints FROM UserPoints u WHERE u.userId = :userId")
    Optional<Integer> findTotalPointsByUserId(@Param("userId") Long userId);

    /**
     * Get lifetime points earned — shown in user profile stats.
     */
    @Query("SELECT u.lifetimePoints FROM UserPoints u WHERE u.userId = :userId")
    Optional<Integer> findLifetimePointsByUserId(@Param("userId") Long userId);

    // ── Leaderboard / analytics ───────────────────────────────────────

    /**
     * Top N users by current points balance — leaderboard.
     * Returns Object[]{userId, totalPoints} pairs.
     */
    @Query("""
            SELECT u.userId, u.totalPoints
            FROM UserPoints u
            ORDER BY u.totalPoints DESC
            LIMIT :n
            """)
    List<Object[]> findTopNByPoints(@Param("n") int n);

    /**
     * Top N users by lifetime points — all-time leaderboard.
     */
    @Query("""
            SELECT u.userId, u.lifetimePoints
            FROM UserPoints u
            ORDER BY u.lifetimePoints DESC
            LIMIT :n
            """)
    List<Object[]> findTopNByLifetimePoints(@Param("n") int n);

    /**
     * Average points balance across all users — portfolio analytics.
     */
    @Query("SELECT AVG(u.totalPoints) FROM UserPoints u")
    Optional<Double> findAveragePoints();

    /**
     * Total points outstanding (sum of all user balances).
     * Used by insurer to understand reward liability.
     */
    @Query("SELECT SUM(u.totalPoints) FROM UserPoints u")
    Optional<Long> findTotalOutstandingPoints();
}