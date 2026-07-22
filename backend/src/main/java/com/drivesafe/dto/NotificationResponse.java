package com.drivesafe.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class NotificationResponse {

    private Long   id;
    private Long   userId;
    private String type;
    private String title;
    private String message;
    private boolean read;
    private String linkUrl;
    private LocalDateTime createdAt;
}
