package com.drivesafe.repository;

import com.drivesafe.model.Trip;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface TripRepository extends JpaRepository<Trip, Long> {

    // ── Core listings ─────────────────────────────────────────────────

    /**
     * Top-N most recent trips for a user — the single most-called
     * query in the app. Powers:
     *   - TripHistory page card grid
     *   - DriscScoringService.calculateAndPersist() window
     *   - DashboardController risk factor aggregation
     *
     * Uses the composite index: idx_trips_user_id_created_at
     * LIMIT via Pageable keeps this O(N) not O(all trips).
     */
    @Query("""
            SELECT t FROM Trip t
            WHERE t.user.id = :userId
            ORDER BY t.createdAt DESC
            LIMIT :n
            """)
    List<Trip> findTopNByUserIdOrderByCreatedAtDesc(
            @Param("userId") Long userId,
            @Param("n") int n);

    /**
     * All trips for a user, newest first — used when exporting
     * or when the caller manages its own limit/pagination.
     */
    List<Trip> findByUserIdOrderByCreatedAtDesc(Long userId);

    // ── Single trip lookups ───────────────────────────────────────────

    /**
     * Fetch the single most recent trip — used after a CSV upload
     * to confirm the trip was persisted correctly.
     */
    @Query("""
            SELECT t FROM Trip t
            WHERE t.user.id = :userId
            ORDER BY t.createdAt DESC
            LIMIT 1
            """)
    Optional<Trip> findLatestByUserId(@Param("userId") Long userId);

    /**
     * Ownership check — verify a trip belongs to the given user
     * before allowing view / delete. Cheaper than fetching the full entity.
     */
    boolean existsByIdAndUserId(Long tripId, Long userId);

    // ── Aggregates ────────────────────────────────────────────────────

    /**
     * Count total trips for a user — shown in the "Trips Analyzed" card
     * on the dashboard.
     */
    long countByUserId(Long userId);

    /**
     * Average DriveScore across all trips for a user.
     * Alternative to DRISC (unweighted) — useful for quick stats display.
     */
    @Query("SELECT AVG(t.driveScore) FROM Trip t WHERE t.user.id = :userId")
    Optional<Double> findAverageDriveScoreByUserId(@Param("userId") Long userId);

    /**
     * Best (lowest) DriveScore ever achieved by a user.
     * Lower = safer in DriveSafe scoring.
     */
    @Query("SELECT MIN(t.driveScore) FROM Trip t WHERE t.user.id = :userId")
    Optional<Double> findBestDriveScoreByUserId(@Param("userId") Long userId);

    // ── Risk-based filters ────────────────────────────────────────────

    /**
     * Count high-risk trips (driveScore > 65) for a user.
     * Used by DriscScoringService to flag repeat risky behaviour.
     */
    @Query("""
            SELECT COUNT(t) FROM Trip t
            WHERE t.user.id = :userId
              AND t.driveScore > 65
            """)
    long countHighRiskTripsByUserId(@Param("userId") Long userId);

    /**
     * Trips within a date range — supports trip history filtering
     * by week / month on the TripHistory page.
     */
    @Query("""
            SELECT t FROM Trip t
            WHERE t.user.id = :userId
              AND t.createdAt BETWEEN :from AND :to
            ORDER BY t.createdAt DESC
            """)
    List<Trip> findByUserIdAndDateRange(
            @Param("userId") Long userId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);

    /**
     * Night trips only — used by DashboardController risk factor:
     * nightRatio = nightTrips / totalTrips
     */
    @Query("""
            SELECT COUNT(t) FROM Trip t
            WHERE t.user.id = :userId
              AND t.daytime = false
            """)
    long countNightTripsByUserId(@Param("userId") Long userId);

    /**
     * Trips with hard braking above threshold — used for the
     * Hard Braking risk factor card on the dashboard.
     */
    @Query("""
            SELECT t FROM Trip t
            WHERE t.user.id = :userId
              AND t.hardBrakingCount > :threshold
            ORDER BY t.createdAt DESC
            """)
    List<Trip> findTripsWithHardBraking(
            @Param("userId") Long userId,
            @Param("threshold") int threshold);

    // ── User ID alias ─────────────────────────────────────────────────
    // Spring Data derived query — maps to t.user.id via JPA navigation
    // Keeps TripService code readable: tripRepository.findByUserId(...)
    List<Trip> findByUserId(Long userId);
}