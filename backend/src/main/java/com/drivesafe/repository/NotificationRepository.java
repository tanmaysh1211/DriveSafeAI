package com.drivesafe.repository;

import com.drivesafe.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    // ── Fetch notifications ───────────────────────────────────────────
    /**
     * All notifications for a user, newest first.
     * Called by NotificationService.getNotifications() for the bell dropdown.
     * Limited by the caller — this returns the full list.
     */
    List<Notification> findByUserIdOrderByCreatedAtDesc(Long userId);

    /**
     * Top N notifications for a user — used when a limit is needed.
     * Example: findTop10ByUserIdOrderByCreatedAtDesc(userId)
     */
    List<Notification> findTop10ByUserIdOrderByCreatedAtDesc(Long userId);

    /**
     * Top 20 notifications — default limit for the bell dropdown.
     */
    List<Notification> findTop20ByUserIdOrderByCreatedAtDesc(Long userId);

    // ── Unread count ──────────────────────────────────────────────────
    /**
     * Count unread notifications for a user.
     * Called every 60 seconds by Navbar.jsx to update the badge number.
     * Must be fast — uses idx_notifications_user_id_read index.
     */
    int countByUserIdAndReadFalse(Long userId);

    /**
     * All unread notifications for a user.
     */
    List<Notification> findByUserIdAndReadFalseOrderByCreatedAtDesc(Long userId);

    // ── Mark as read ──────────────────────────────────────────────────
    /**
     * Mark ALL notifications for a user as read in one SQL UPDATE.
     * Called when user opens the notification dropdown (mark-all-read).
     * Returns number of rows updated.
     */
    @Modifying
    @Transactional
    @Query("UPDATE Notification n SET n.read = true WHERE n.userId = :userId AND n.read = false")
    int markAllAsReadByUserId(@Param("userId") Long userId);

    /**
     * Mark a single notification as read.
     */
    @Modifying
    @Transactional
    @Query("UPDATE Notification n SET n.read = true WHERE n.id = :id")
    int markAsReadById(@Param("id") Long id);

    // ── Delete ────────────────────────────────────────────────────────
    /**
     * Delete all notifications for a user — called when user deletes account.
     */
    @Modifying
    @Transactional
    void deleteByUserId(Long userId);

    // ── Ownership check ───────────────────────────────────────────────
    /**
     * Check if a notification belongs to a specific user.
     * Used before marking read or deleting to prevent unauthorized access.
     */
    boolean existsByIdAndUserId(Long id, Long userId);

    // ── Type filter ───────────────────────────────────────────────────
    /**
     * Find notifications by type for a user.
     * Types: TRIP_SCORED, RISK_ALERT, POINTS_EARNED, POLICY_EXPIRING,
     *        REWARD_REDEEMED, SYSTEM
     */
    List<Notification> findByUserIdAndTypeOrderByCreatedAtDesc(Long userId, String type);
}