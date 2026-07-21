package com.drivesafe.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "drisc_scores",
        indexes = {
                @Index(name = "idx_drisc_user_id_calculated_at",columnList = "user_id, calculated_at DESC"),
                @Index(name = "idx_drisc_user_id", columnList = "user_id")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DriscScore {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false)
    private double score;

    @Column(name = "risk_level", nullable = false, length = 20)
    private String riskLevel;

    @Column(name = "trips_analyzed", nullable = false)
    private int tripsAnalyzed;

    @Column(name = "calculated_at", nullable = false, updatable = false)
    private LocalDateTime calculatedAt;

    @PrePersist
    protected void onCreate() {
        if (calculatedAt == null) {
            calculatedAt = LocalDateTime.now();
        }
    }

    @Transient
    public double getPremiumDiscount() {
        if (score <= 30) return 15.0;
        if (score <= 50) return 10.0;
        if (score <= 65) return 5.0;
        if (score <= 80) return 2.0;
        return 0.0;
    }

    @Transient
    public String getRiskLabel() {
        if (score <= 40) return "Excellent";
        if (score <= 60) return "Needs Attention";
        return "High Risk";
    }
}
