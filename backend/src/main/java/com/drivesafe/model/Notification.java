package com.drivesafe.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "notifications",
        indexes = {
                @Index(name = "idx_notifications_user_id_read",columnList = "user_id, read"),
                @Index(name = "idx_notifications_user_id_created_at",columnList = "user_id, created_at DESC")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false, length = 30)
    private String type;

    @Column(nullable = false, length = 300)
    private String message;

    @Column(length = 100)
    private String title;
        
    @Column(name = "read", nullable = false)
    @Builder.Default
    private boolean read = false;

    @Column(name = "link_url", length = 200)
    private String linkUrl;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    public static Notification tripScored(Long userId, double score,String riskLevel, int pointsEarned) {
        return Notification.builder()
                .userId(userId)
                .type("TRIP_SCORED")
                .title("Trip Scored")
                .message(String.format("Your trip scored %.1f — %s risk. +%d points earned!",score, riskLevel, pointsEarned))
                .linkUrl("/trips")
                .read(false)
                .build();
    }

    public static Notification riskAlert(Long userId, double score) {
        return Notification.builder()
                .userId(userId)
                .type("RISK_ALERT")
                .title("High Risk Trip Detected")
                .message(String.format("Your last trip scored %.1f (High Risk). Check AI recommendations to improve.",score))
                .linkUrl("/trips")
                .read(false)
                .build();
    }

    public static Notification pointsEarned(Long userId, int points, int newTotal) {
        return Notification.builder()
                .userId(userId)
                .type("POINTS_EARNED")
                .title("Points Earned!")
                .message(String.format("You earned %d points for your last trip. Total balance: %d pts.",points, newTotal))
                .linkUrl("/rewards")
                .read(false)
                .build();
    }

    public static Notification policyExpiring(Long userId, long daysLeft) {
        return Notification.builder()
                .userId(userId)
                .type("POLICY_EXPIRING")
                .title("Policy Expiring Soon")
                .message(String.format("Your insurance policy expires in %d days. Renew now to stay covered.",daysLeft))
                .linkUrl("/insurance")
                .read(false)
                .build();
    }

    public static Notification rewardRedeemed(Long userId, String rewardName,int pointsSpent) {
        return Notification.builder()
                .userId(userId)
                .type("REWARD_REDEEMED")
                .title("Reward Redeemed!")
                .message(String.format("You successfully redeemed '%s' for %d points. Check your email for the code.",rewardName, pointsSpent))
                .linkUrl("/rewards")
                .read(false)
                .build();
    }
}
