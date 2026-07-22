package com.drivesafe.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class InsuranceResponse {

    private Long   policyId;
    private String policyNumber;   
    private String coverageType;   
    private double coverageAmount;  
    private double basePremium;     
    private double finalPremium;    
    private double discountPercent; 
    private LocalDate startDate;    
    private LocalDate endDate;      
    private long   daysRemaining;
    private String policyStatus;
    private double driscScore;
    private String riskLabel;
}
