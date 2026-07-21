package com.drivesafe.service;

import com.drivesafe.dto.NotificationResponse;
import com.drivesafe.model.Notification;
import com.drivesafe.repository.NotificationRepository;
import com.drivesafe.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public List<NotificationResponse> getNotifications(Long userId, int limit) {
        List<Notification> notifications = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);

        return notifications.stream()
                .limit(limit)
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public int getUnreadCount(Long userId) {
        return notificationRepository.countByUserIdAndReadFalse(userId);
    }

    @Transactional
    public void markAsRead(Long notificationId, String email) {
        Notification notification = notificationRepository.findById(notificationId).orElseThrow(() -> new RuntimeException("Notification not found: " + notificationId));

        Long callerId = userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found")).getId();

        if (!notification.getUserId().equals(callerId)) {
            throw new SecurityException("Not authorized to read this notification");
        }

        notification.setRead(true);
        notificationRepository.save(notification);
    }

    @Transactional
    public int markAllAsRead(Long userId) {
        return notificationRepository.markAllAsReadByUserId(userId);
    }

    @Transactional
    public void deleteNotification(Long notificationId, String email) {
        Notification notification = notificationRepository.findById(notificationId).orElseThrow(() -> new RuntimeException("Notification not found: " + notificationId));
        Long callerId = userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found")).getId();

        if (!notification.getUserId().equals(callerId)) {
            throw new SecurityException("Not authorized to delete this notification");
        }
        notificationRepository.delete(notification);
        log.debug("Deleted notification {} for user {}", notificationId, userId(email));
    }

    @Transactional
    public Notification save(Notification notification) {
        Notification saved = notificationRepository.save(notification);
        log.debug("Saved notification type={} for userId={}",
                saved.getType(), saved.getUserId());
        return saved;
    }

    @Transactional
    public void notifyTripScored(Long userId, double score, String riskLevel, int pointsEarned) {
        try {
            notificationRepository.save(
                    Notification.tripScored(userId, score, riskLevel, pointsEarned));
        } catch (Exception e) {
            log.warn("Failed to create TRIP_SCORED notification for user {}: {}",
                    userId, e.getMessage());
        }
    }

    @Transactional
    public void notifyRiskAlert(Long userId, double score) {
        try {
            notificationRepository.save(Notification.riskAlert(userId, score));
        } catch (Exception e) {
            log.warn("Failed to create RISK_ALERT notification for user {}: {}",
                    userId, e.getMessage());
        }
    }

    @Transactional
    public void notifyPointsEarned(Long userId, int points, int newTotal) {
        try {
            notificationRepository.save(
                    Notification.pointsEarned(userId, points, newTotal));
        } catch (Exception e) {
            log.warn("Failed to create POINTS_EARNED notification for user {}: {}",
                    userId, e.getMessage());
        }
    }

    @Transactional
    public void notifyRewardRedeemed(Long userId, String rewardName, int pointsSpent) {
        try {
            notificationRepository.save(
                    Notification.rewardRedeemed(userId, rewardName, pointsSpent));
        } catch (Exception e) {
            log.warn("Failed to create REWARD_REDEEMED notification for user {}: {}",
                    userId, e.getMessage());
        }
    }

    @Transactional
    public void notifyPolicyExpiring(Long userId, long daysLeft) {
        try {
            notificationRepository.save(
                    Notification.policyExpiring(userId, daysLeft));
        } catch (Exception e) {
            log.warn("Failed to create POLICY_EXPIRING notification for user {}: {}",
                    userId, e.getMessage());
        }
    }

    public boolean isOwner(Long userId, String email) {
        return userRepository.findByEmail(email)
                .map(u -> u.getId().equals(userId))
                .orElse(false);
    }

    private NotificationResponse toResponse(Notification n) {
        return NotificationResponse.builder()
                .id(n.getId())
                .userId(n.getUserId())
                .type(n.getType())
                .title(n.getTitle())
                .message(n.getMessage())
                .read(n.isRead())
                .linkUrl(n.getLinkUrl())
                .createdAt(n.getCreatedAt())
                .build();
    }

    private Long userId(String email) {
        return userRepository.findByEmail(email)
                .map(u -> u.getId())
                .orElse(-1L);
    }
}
