package com.drivesafe.repository;

import com.drivesafe.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    boolean existsByVehicleNumber(String vehicleNumber);

    @Modifying
    @Transactional
    @Query("UPDATE User u SET u.totalPoints = u.totalPoints + :points WHERE u.id = :userId")
    int incrementPoints(@Param("userId") Long userId, @Param("points") int points);

    @Modifying
    @Transactional
    @Query("""
            UPDATE User u
            SET u.totalPoints = u.totalPoints - :points
            WHERE u.id = :userId
              AND u.totalPoints >= :points
            """)
    int decrementPoints(@Param("userId") Long userId, @Param("points") int points);

    @Query("SELECT COUNT(u) FROM User u WHERE u.createdAt >= :since")
    long countNewUsers(@Param("since") java.time.LocalDateTime since);

    Optional<User> findByVehicleNumber(String vehicleNumber);
}
