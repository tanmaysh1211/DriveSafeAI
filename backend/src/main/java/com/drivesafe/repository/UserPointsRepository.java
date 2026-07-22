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

    Optional<UserPoints> findByUserId(Long userId);

    boolean existsByUserId(Long userId);

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

    @Query("SELECT u.totalPoints FROM UserPoints u WHERE u.userId = :userId")
    Optional<Integer> findTotalPointsByUserId(@Param("userId") Long userId);

    @Query("SELECT u.lifetimePoints FROM UserPoints u WHERE u.userId = :userId")
    Optional<Integer> findLifetimePointsByUserId(@Param("userId") Long userId);

    @Query("""
            SELECT u.userId, u.totalPoints
            FROM UserPoints u
            ORDER BY u.totalPoints DESC
            LIMIT :n
            """)
    List<Object[]> findTopNByPoints(@Param("n") int n);

    @Query("""
            SELECT u.userId, u.lifetimePoints
            FROM UserPoints u
            ORDER BY u.lifetimePoints DESC
            LIMIT :n
            """)
    List<Object[]> findTopNByLifetimePoints(@Param("n") int n);

    @Query("SELECT AVG(u.totalPoints) FROM UserPoints u")
    Optional<Double> findAveragePoints();

    @Query("SELECT SUM(u.totalPoints) FROM UserPoints u")
    Optional<Long> findTotalOutstandingPoints();
}
