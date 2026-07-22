package com.drivesafe.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class DashboardResponse {

    private Long   userId;
    private String userName;
    private String userEmail;
    private String vehicleNumber;
    private double driscScore;
    private String riskLevel;
    private int tripsAnalyzed;
    private int nTrips;
    private double premiumImpact;
    private Map<String, String> riskFactors;
    private List<Map<String, String>> recommendations;
    private LocalDateTime calculatedAt;
}
