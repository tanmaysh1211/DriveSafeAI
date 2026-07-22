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

    @Query("""
            SELECT d FROM DriscScore d
            WHERE d.userId = :userId
            ORDER BY d.calculatedAt DESC
            LIMIT 1
            """)
    Optional<DriscScore> findTopByUserIdOrderByCalculatedAtDesc(@Param("userId") Long userId);

    @Query("""
            SELECT d FROM DriscScore d
            WHERE d.userId = :userId
            ORDER BY d.calculatedAt DESC
            LIMIT :n
            """)
    List<DriscScore> findTopNByUserIdOrderByCalculatedAtDesc(
            @Param("userId") Long userId,
            @Param("n") int n);

    List<DriscScore> findByUserIdOrderByCalculatedAtDesc(Long userId);

    boolean existsByUserId(Long userId);

    long countByUserId(Long userId);

    @Query("""
            SELECT d.riskLevel, COUNT(d)
            FROM DriscScore d
            WHERE d.userId = :userId
            GROUP BY d.riskLevel
            """)
    List<Object[]> countByRiskLevelForUser(@Param("userId") Long userId);

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

    @Query("SELECT AVG(d.score) FROM DriscScore d " +
            "WHERE d.calculatedAt = (" +
            "  SELECT MAX(d2.calculatedAt) FROM DriscScore d2 WHERE d2.userId = d.userId" +
            ")")
    Optional<Double> findAverageLatestDriscAcrossAllUsers();

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
