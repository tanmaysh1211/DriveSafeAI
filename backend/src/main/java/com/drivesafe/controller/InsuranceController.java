package com.drivesafe.controller;

import com.drivesafe.dto.InsuranceResponse;
import com.drivesafe.service.InsuranceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/insurance")
@RequiredArgsConstructor
public class InsuranceController {

    private final InsuranceService insuranceService;

    @GetMapping("/{userId}")
    public ResponseEntity<?> getInsurance( @PathVariable Long userId,Authentication authentication) {

        String email = authentication.getName();
        boolean authorized = insuranceService.isOwner(userId, email);
        if (!authorized) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Access denied"));
        }

        InsuranceResponse insurance = insuranceService.getInsuranceForUser(userId);
        if (insurance == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "No insurance policy found for this user"));
        }
        return ResponseEntity.ok(insurance);
    }

    @GetMapping("/{userId}/premium-breakdown")
    public ResponseEntity<?> getPremiumBreakdown(
            @PathVariable Long userId,
            Authentication authentication) {

        String email = authentication.getName();
        if (!insuranceService.isOwner(userId, email)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Access denied"));
        }
        return ResponseEntity.ok(insuranceService.getPremiumBreakdown(userId));
    }

    @GetMapping("/{userId}/days-remaining")
    public ResponseEntity<?> getDaysRemaining(
            @PathVariable Long userId,
            Authentication authentication) {

        String email = authentication.getName();
        if (!insuranceService.isOwner(userId, email)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Access denied"));
        }

        long days = insuranceService.getDaysRemaining(userId);
        String status = days > 30 ? "ACTIVE" : days > 0 ? "EXPIRING_SOON" : "EXPIRED";

        return ResponseEntity.ok(Map.of("daysRemaining", days,"status", status));
    }

    @PutMapping("/{policyId}/renew")
    public ResponseEntity<?> renewPolicy(
            @PathVariable Long policyId,
            Authentication authentication) {

        try {
            InsuranceResponse renewed = insuranceService.renewPolicy(policyId, authentication.getName());
            return ResponseEntity.ok(renewed);
        } catch (SecurityException e) {
            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "Renewal failed: " + e.getMessage()));
        }
    }
}
