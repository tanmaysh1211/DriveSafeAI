package com.drivesafe.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class TripSummaryResponse {

    private Long          tripId;
    private double        driveScore;
    private String        riskLevel;      
    private double        maxSpeed;       
    private double        distanceKm;
    private String        weatherCondition;
    private boolean       isDaytime;
    private LocalDateTime createdAt;
    private String mapUrl;
    private String aiRecommendation;
    private String heatmapUrl;         
}
