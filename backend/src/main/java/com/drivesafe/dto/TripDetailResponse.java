package com.drivesafe.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class TripDetailResponse {

    private Long          tripId;
    private double        driveScore;
    private String        riskLevel;
    private double        maxSpeed;
    private double        avgSpeed;
    private double        distanceKm;
    private double        maxAcceleration; 
    private int           hardBrakingCount;
    private int           sharpTurnCount;s
    private String        weatherCondition;
    private boolean       isDaytime;
    private String        aiRecommendation;
    private String        mapUrl;
    private String heatmapUrl;       
    private LocalDateTime createdAt;
}
