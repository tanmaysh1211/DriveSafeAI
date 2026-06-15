package com.drivesafe.repository;

import com.drivesafe.model.DriscScore;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface DriscScoreRepository extends JpaRepository<DriscScore, Long> {

    // ── Latest score ──────────────────────────────────────────────────

    /**
     * Single most recent DRISC score for a user — the most-called
     * query in this repository. Powers:
     *   - InsuranceService.getInsuranceForUser()  : premium calculation
     *   - InsuranceService.getPremiumBreakdown()  : discount breakdown card
     *   - DriscScoringService.getLatestDriscScore(): raw double for services
     *
     * Uses index: idx_drisc_user_id_calculated_at
     */
    @Query("""
            SELECT d FROM DriscScore d
            WHERE d.userId = :userId
            ORDER BY d.calculatedAt DESC
            LIMIT 1
            """)
    Optional<DriscScore> findTopByUserIdOrderByCalculatedAtDesc(@Param("userId") Long userId);

    // ── Score history ─────────────────────────────────────────────────

    /**
     * Last N DRISC snapshots for a user — powers the score trend chart
     * on the dashboard (DashboardController.getScoreHistory).
     *
     * Returns newest first so the frontend chart can reverse if needed.
     */
    @Query("""
            SELECT d FROM DriscScore d
            WHERE d.userId = :userId
            ORDER BY d.calculatedAt DESC
            LIMIT :n
            """)
    List<DriscScore> findTopNByUserIdOrderByCalculatedAtDesc(
            @Param("userId") Long userId,
            @Param("n") int n);

    /**
     * Full history without a cap — used for CSV export or
     * detailed analytics views.
     */
    List<DriscScore> findByUserIdOrderByCalculatedAtDesc(Long userId);

    // ── Existence / count ─────────────────────────────────────────────

    /**
     * True if the user has at least one DRISC score calculated.
     * Used to decide whether to show "No trips yet" state on dashboard.
     */
    boolean existsByUserId(Long userId);

    /**
     * Total number of DRISC recalculations for a user — useful for
     * understanding how active a driver is.
     */
    long countByUserId(Long userId);

    // ── Risk-level queries ────────────────────────────────────────────

    /**
     * Count how many historical DRISC calculations landed in each risk band.
     * Returned as Object[]{riskLevel, count} pairs.
     *
     * Example result: [["Safe", 3], ["Moderate", 5], ["High", 2]]
     * Used by admin dashboards or insurer B2B analytics.
     */
    @Query("""
            SELECT d.riskLevel, COUNT(d)
            FROM DriscScore d
            WHERE d.userId = :userId
            GROUP BY d.riskLevel
            """)
    List<Object[]> countByRiskLevelForUser(@Param("userId") Long userId);

    /**
     * DRISC score trend: scores grouped by date for charting.
     * Returns Object[]{date, avgScore} — one point per day.
     */
    @Query("""
            SELECT CAST(d.calculatedAt AS date), AVG(d.score)
            FROM DriscScore d
            WHERE d.userId = :userId
              AND d.calculatedAt >= :since
            GROUP BY CAST(d.calculatedAt AS date)
            ORDER BY CAST(d.calculatedAt AS date) ASC
            """)
    List<Object[]> findDailyAverageScores(
            @Param("userId") Long userId,
            @Param("since") LocalDateTime since);

    // ── Score in a date window ────────────────────────────────────────

    /**
     * All DRISC scores between two timestamps — supports
     * "show me my scores this month" type filtering.
     */
    @Query("""
            SELECT d FROM DriscScore d
            WHERE d.userId = :userId
              AND d.calculatedAt BETWEEN :from AND :to
            ORDER BY d.calculatedAt DESC
            """)
    List<DriscScore> findByUserIdAndDateRange(
            @Param("userId") Long userId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);

    // ── Cross-user (B2B insurer analytics) ───────────────────────────

    /**
     * Average DRISC score across ALL users — insurer portfolio view.
     * Only expose this on admin/insurer-facing endpoints, never to end users.
     */
    @Query("SELECT AVG(d.score) FROM DriscScore d " +
            "WHERE d.calculatedAt = (" +
            "  SELECT MAX(d2.calculatedAt) FROM DriscScore d2 WHERE d2.userId = d.userId" +
            ")")
    Optional<Double> findAverageLatestDriscAcrossAllUsers();

    /**
     * Count of users currently in each risk band (based on latest score).
     * Returns Object[]{riskLevel, userCount} — insurer portfolio breakdown.
     */
    @Query("""
            SELECT d.riskLevel, COUNT(DISTINCT d.userId)
            FROM DriscScore d
            WHERE d.calculatedAt = (
                SELECT MAX(d2.calculatedAt)
                FROM DriscScore d2
                WHERE d2.userId = d.userId
            )
            GROUP BY d.riskLevel
            """)
    List<Object[]> countUsersByCurrentRiskLevel();
}