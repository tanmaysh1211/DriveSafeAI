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

    // ── Core lookups ──────────────────────────────────────────────────

    /**
     * Find user by email — used by:
     *   - AuthController.login()         : fetch user after JWT auth
     *   - AuthController.getCurrentUser(): resolve /me endpoint
     *   - JwtUserDetailsService          : load principal for Spring Security
     *   - Every isOwner() check in services
     */
    Optional<User> findByEmail(String email);

    /**
     * Fast existence check at registration — avoids fetching the full
     * entity just to detect a duplicate email.
     */
    boolean existsByEmail(String email);

    /**
     * Check if a vehicle number is already registered.
     * Prevents two users from registering the same plate.
     */
    boolean existsByVehicleNumber(String vehicleNumber);

    // ── Points ────────────────────────────────────────────────────────

    /**
     * Increment the denormalised points total directly in DB.
     * More efficient than fetch → mutate → save for a single field update.
     * Called alongside UserPointsRepository.save() in RewardsService.
     */
    @Modifying
    @Transactional
    @Query("UPDATE User u SET u.totalPoints = u.totalPoints + :points WHERE u.id = :userId")
    int incrementPoints(@Param("userId") Long userId, @Param("points") int points);

    /**
     * Decrement points — used on reward redemption.
     * @Query guards against going negative at DB level.
     */
    @Modifying
    @Transactional
    @Query("""
            UPDATE User u
            SET u.totalPoints = u.totalPoints - :points
            WHERE u.id = :userId
              AND u.totalPoints >= :points
            """)
    int decrementPoints(@Param("userId") Long userId, @Param("points") int points);

    // ── Admin / stats ─────────────────────────────────────────────────

    /**
     * Count users registered after a given date — useful for growth metrics.
     * Example: userRepository.countByCreatedAtAfter(LocalDateTime.now().minusDays(30))
     */
    @Query("SELECT COUNT(u) FROM User u WHERE u.createdAt >= :since")
    long countNewUsers(@Param("since") java.time.LocalDateTime since);

    /**
     * Find user by vehicle number — used for OBD device pairing flows
     * where the vehicle plate is the entry point rather than email.
     */
    Optional<User> findByVehicleNumber(String vehicleNumber);
}