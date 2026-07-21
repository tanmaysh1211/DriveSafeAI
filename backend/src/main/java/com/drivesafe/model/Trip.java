package com.drivesafe.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "trips",
        indexes = {
                @Index(name = "idx_trips_user_id_created_at", columnList = "user_id, created_at DESC"),
                @Index(name = "idx_trips_user_id", columnList = "user_id")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"user"}) 
public class Trip {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false,foreignKey = @ForeignKey(name = "fk_trips_user_id"))
    private User user;

    @Column(name = "drive_score", nullable = false)
    private double driveScore;

    @Column(name = "max_speed")
    private double maxSpeed;          

    @Column(name = "avg_speed")
    private double avgSpeed;           

    @Column(name = "distance")
    private double distance;           

    @Column(name = "max_acceleration")
    private double maxAcceleration;   

    @Column(name = "hard_braking_count")
    private int hardBrakingCount;      

    @Column(name = "sharp_turn_count")
    private int sharpTurnCount;        

    @Column(name = "weather_condition", length = 50)
    private String weatherCondition;   // "Clear Weather", "Rainy", "Foggy" etc.

    @Column(name = "is_daytime", nullable = false)
    @Builder.Default
    private boolean daytime = true;    
        
    @Column(name = "ai_recommendation", columnDefinition = "TEXT")
    private String aiRecommendation;

    @Column(name = "map_url", length = 500)
    private String mapUrl;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "heatmap_url", length = 500)
    private String heatmapUrl;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    @Transient
    public String getRiskLevel() {
        if (driveScore <= 40) return "Safe";
        if (driveScore <= 65) return "Moderate";
        return "High";
    }
}
