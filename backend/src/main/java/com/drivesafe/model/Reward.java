package com.drivesafe.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "rewards",
        indexes = {
                @Index(name = "idx_rewards_category", columnList = "category"),
                @Index(name = "idx_rewards_points_cost", columnList = "points_cost")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Reward {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false, length = 100)
    private String name;

    @NotBlank
    @Column(nullable = false, length = 200)
    private String description;
        
    @NotBlank
    @Column(nullable = false, length = 30)
    private String category;

    @Positive
    @Column(name = "points_cost", nullable = false)
    private int pointsCost;

    @Positive
    @Column(nullable = false)
    private double value;

    @Column(length = 10)
    private String emoji;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
