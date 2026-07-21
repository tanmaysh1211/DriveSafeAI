package com.drivesafe.service;

import com.drivesafe.dto.InsuranceResponse;
import com.drivesafe.model.Insurance;
import com.drivesafe.repository.InsuranceRepository;
import com.drivesafe.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.NoSuchElementException;

@Service
@RequiredArgsConstructor
@Slf4j
public class InsuranceService {

    private final InsuranceRepository insuranceRepository;
    private final DriscScoringService driscScoringService;
    private final UserRepository userRepository;

    public InsuranceResponse getInsuranceForUser(Long userId) {
        Insurance policy = insuranceRepository.findByUserId(userId).orElse(null);

        if (policy == null) return null;

        double driscScore = driscScoringService.getLatestDriscScore(userId);
        double discountPct = discountFromDrisc(driscScore);
        double finalPremium = policy.getBasePremium() * (1.0 - discountPct / 100.0);

        policy.setFinalPremium(finalPremium);
        insuranceRepository.save(policy);

        long daysRemaining = ChronoUnit.DAYS.between(LocalDate.now(), policy.getEndDate());
        String policyStatus = daysRemaining > 30 ? "ACTIVE" : daysRemaining > 0 ? "EXPIRING_SOON" : "EXPIRED";

        return InsuranceResponse.builder()
                .policyId(policy.getId())
                .policyNumber(policy.getPolicyNumber())
                .coverageType(policy.getCoverageType())
                .coverageAmount(policy.getCoverageAmount())
                .basePremium(policy.getBasePremium())
                .finalPremium(Math.round(finalPremium * 100.0) / 100.0)
                .discountPercent(discountPct)
                .startDate(policy.getStartDate())
                .endDate(policy.getEndDate())
                .daysRemaining(daysRemaining)
                .policyStatus(policyStatus)
                .driscScore(driscScore)
                .riskLabel(riskLabel(driscScore))
                .build();
    }

    public Map<String, Object> getPremiumBreakdown(Long userId) {
        Insurance policy = insuranceRepository.findByUserId(userId).orElseThrow(() -> new NoSuchElementException("No policy found"));

        double driscScore   = driscScoringService.getLatestDriscScore(userId);
        double discountPct  = discountFromDrisc(driscScore);
        double savings      = policy.getBasePremium() * (discountPct / 100.0);
        double finalPremium = policy.getBasePremium() - savings;

        Map<String, Object> breakdown = new LinkedHashMap<>();
        breakdown.put("basePremium",     policy.getBasePremium());
        breakdown.put("discountPercent", discountPct);
        breakdown.put("savingsAmount",   Math.round(savings * 100.0) / 100.0);
        breakdown.put("finalPremium",    Math.round(finalPremium * 100.0) / 100.0);
        breakdown.put("driscScore",      driscScore);
        breakdown.put("riskLabel",       riskLabel(driscScore));
        return breakdown;
    }

    public long getDaysRemaining(Long userId) {
        return insuranceRepository.findByUserId(userId).map(p -> ChronoUnit.DAYS.between(LocalDate.now(), p.getEndDate())).orElse(0L);
    }

    @Transactional
    public InsuranceResponse renewPolicy(Long policyId, String email) {
        Insurance policy = insuranceRepository.findById(policyId).orElseThrow(() -> new NoSuchElementException("Policy not found: " + policyId));

        if (!policy.getUser().getEmail().equals(email)) {
            throw new SecurityException("Not authorized to renew this policy");
        }

        LocalDate newStart = LocalDate.now().isAfter(policy.getEndDate()) ? LocalDate.now() : policy.getEndDate();
        policy.setStartDate(newStart);
        policy.setEndDate(newStart.plusYears(1));
        double driscScore = driscScoringService.getLatestDriscScore(policy.getUser().getId());
        double discountPct = discountFromDrisc(driscScore);
        policy.setFinalPremium(policy.getBasePremium() * (1.0 - discountPct / 100.0));
        insuranceRepository.save(policy);
        log.info("Policy {} renewed for user {} until {}", policyId, email, policy.getEndDate());

        return getInsuranceForUser(policy.getUser().getId());
    }

    public boolean isOwner(Long userId, String email) {
        return userRepository.findByEmail(email).map(u -> u.getId().equals(userId)).orElse(false);
    }

    public double discountFromDrisc(double driscScore) {
        if (driscScore <= 30) return 15.0;
        if (driscScore <= 50) return 10.0;
        if (driscScore <= 65) return 5.0;
        if (driscScore <= 80) return 2.0;
        return 0.0;
    }

    private String riskLabel(double score) {
        if (score <= 40) return "Excellent";
        if (score <= 60) return "Needs Attention";
        return "High Risk";
    }
}
