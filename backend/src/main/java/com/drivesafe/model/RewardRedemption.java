package com.drivesafe.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "reward_redemptions",
        indexes = {
                @Index(name = "idx_redemptions_user_id_redeemed_at",columnList = "user_id, redeemed_at DESC"),
                @Index(name = "idx_redemptions_code",columnList = "redemption_code", unique = true)
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RewardRedemption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(
            name = "reward_id",
            nullable = false,
            foreignKey = @ForeignKey(name = "fk_redemption_reward_id")
    )
    private Reward reward;

    @Column(name = "redemption_code", nullable = false, unique = true, length = 30)
    private String redemptionCode;

    @Column(name = "redeemed_at", nullable = false, updatable = false)
    private LocalDateTime redeemedAt;

    @PrePersist
    protected void onCreate() {
        if (redeemedAt == null) {
            redeemedAt = LocalDateTime.now();
        }
    }
        
    @Transient
    public int getPointsSpent() {
        return reward != null ? reward.getPointsCost() : 0;
    }

    @Transient
    public double getValueRedeemed() {
        return reward != null ? reward.getValue() : 0;
    }
}
