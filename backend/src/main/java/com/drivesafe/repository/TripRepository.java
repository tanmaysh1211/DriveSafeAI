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

    @Query("""
            SELECT t FROM Trip t
            WHERE t.user.id = :userId
            ORDER BY t.createdAt DESC
            LIMIT :n
            """)
    List<Trip> findTopNByUserIdOrderByCreatedAtDesc(
            @Param("userId") Long userId,
            @Param("n") int n);

    List<Trip> findByUserIdOrderByCreatedAtDesc(Long userId);

    @Query("""
            SELECT t FROM Trip t
            WHERE t.user.id = :userId
            ORDER BY t.createdAt DESC
            LIMIT 1
            """)
    Optional<Trip> findLatestByUserId(@Param("userId") Long userId);

    boolean existsByIdAndUserId(Long tripId, Long userId);

    long countByUserId(Long userId);

    @Query("SELECT AVG(t.driveScore) FROM Trip t WHERE t.user.id = :userId")
    Optional<Double> findAverageDriveScoreByUserId(@Param("userId") Long userId);

    @Query("SELECT MIN(t.driveScore) FROM Trip t WHERE t.user.id = :userId")
    Optional<Double> findBestDriveScoreByUserId(@Param("userId") Long userId);

    @Query("""
            SELECT COUNT(t) FROM Trip t
            WHERE t.user.id = :userId
              AND t.driveScore > 65
            """)
    long countHighRiskTripsByUserId(@Param("userId") Long userId);

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

    @Query("""
            SELECT COUNT(t) FROM Trip t
            WHERE t.user.id = :userId
              AND t.daytime = false
            """)
    long countNightTripsByUserId(@Param("userId") Long userId);

    @Query("""
            SELECT t FROM Trip t
            WHERE t.user.id = :userId
              AND t.hardBrakingCount > :threshold
            ORDER BY t.createdAt DESC
            """)
    List<Trip> findTripsWithHardBraking(
            @Param("userId") Long userId,
            @Param("threshold") int threshold);
    
    List<Trip> findByUserId(Long userId);
}
