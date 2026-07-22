package com.drivesafe.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class RewardItemResponse {

    private Long id;
    private String name;
    private String description;
    private String category;
    private int pointsCost;
    private double value;
    private String emoji;
}
