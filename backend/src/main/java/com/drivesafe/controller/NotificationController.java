package com.drivesafe.controller;

import com.drivesafe.dto.NotificationResponse;
import com.drivesafe.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping("/{userId}")
    public ResponseEntity<?> getNotifications( @PathVariable Long userId, @RequestParam(defaultValue = "20") int limit, Authentication authentication) {

        if (!notificationService.isOwner(userId, authentication.getName())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Access denied"));
        }

        List<NotificationResponse> notifications = notificationService.getNotifications(userId, limit);
        return ResponseEntity.ok(notifications);
    }
    
    @GetMapping("/{userId}/unread-count")
    public ResponseEntity<?> getUnreadCount( @PathVariable Long userId, Authentication authentication) {

        if (!notificationService.isOwner(userId, authentication.getName())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Access denied"));
        }

        int count = notificationService.getUnreadCount(userId);
        return ResponseEntity.ok(Map.of("userId", userId, "unreadCount", count));
    }

    @PutMapping("/{notificationId}/read")
    public ResponseEntity<?> markAsRead( @PathVariable Long notificationId, Authentication authentication) {

        try {
            notificationService.markAsRead(notificationId, authentication.getName());
            return ResponseEntity.ok(Map.of("message", "Notification marked as read"));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Notification not found"));
        }
    }

    @PutMapping("/{userId}/read-all")
    public ResponseEntity<?> markAllAsRead( @PathVariable Long userId, Authentication authentication) {

        if (!notificationService.isOwner(userId, authentication.getName())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Access denied"));
        }

        int updated = notificationService.markAllAsRead(userId);
        return ResponseEntity.ok(Map.of( "message", "All notifications marked as read", "updatedCount", updated
        ));
    }

    @DeleteMapping("/{notificationId}")
    public ResponseEntity<?> deleteNotification(
            @PathVariable Long notificationId,
            Authentication authentication) {

        try {
            notificationService.deleteNotification(notificationId, authentication.getName());
            return ResponseEntity.ok(Map.of("message", "Notification deleted"));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Notification not found"));
        }
    }
}
