package com.drivesafe.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "user_points",
        indexes = {
                @Index(name = "idx_user_points_user_id", columnList = "user_id", unique = true)
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserPoints {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    @Column(name = "total_points", nullable = false)
    @Builder.Default
    private int totalPoints = 0;

    @Column(name = "lifetime_points", nullable = false)
    @Builder.Default
    private int lifetimePoints = 0;

    @Column(name = "total_redeemed", nullable = false)
    @Builder.Default
    private int totalRedeemed = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "last_updated")
    private LocalDateTime lastUpdated;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        lastUpdated = LocalDateTime.now();
    }

    public void addPoints(int points) {
        if (points <= 0) return;
        this.totalPoints    += points;
        this.lifetimePoints += points;
        this.lastUpdated    = LocalDateTime.now();
    }

    public void deductPoints(int points) {
        if (points <= 0) return;
        if (this.totalPoints < points) {
            throw new IllegalStateException(String.format("Insufficient points: have %d, need %d",this.totalPoints, points));
        }
        this.totalPoints   -= points;
        this.totalRedeemed += points;
        this.lastUpdated = LocalDateTime.now();
    }

    @Transient
    public boolean canAfford(int cost) {
        return this.totalPoints >= cost;
    }
}
