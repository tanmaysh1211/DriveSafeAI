package com.drivesafe.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

@Entity
@Table(
        name = "insurance_policies",
        indexes = {
                @Index(name = "idx_insurance_user_id", columnList = "user_id"),
                @Index(name = "idx_insurance_policy_number", columnList = "policy_number")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"user"})
public class Insurance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "user_id",
            nullable = false,
            unique = true,
            foreignKey = @ForeignKey(name = "fk_insurance_user_id")
    )
    private User user;

    @NotBlank
    @Column(name = "policy_number", nullable = false, unique = true, length = 30)
    private String policyNumber;

    @NotBlank
    @Column(name = "coverage_type", nullable = false, length = 50)
    private String coverageType;

    @Positive
    @Column(name = "coverage_amount", nullable = false)
    private double coverageAmount;

    @Positive
    @Column(name = "base_premium", nullable = false)
    private double basePremium;

    @Positive
    @Column(name = "final_premium", nullable = false)
    private double finalPremium;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (policyNumber == null || policyNumber.isBlank()) {
            policyNumber = "INS" + System.currentTimeMillis();
        }
        if (finalPremium == 0) {
            finalPremium = basePremium;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    @Transient
    public long getDaysRemaining() {
        return ChronoUnit.DAYS.between(LocalDate.now(), endDate);
    }

    @Transient
    public String getPolicyStatus() {
        long days = getDaysRemaining();
        if (days > 30)  return "ACTIVE";
        if (days > 0)   return "EXPIRING_SOON";
        return "EXPIRED";
    }

    @Transient
    public double getSavings() {
        return Math.max(0, basePremium - finalPremium);
    }

    @Transient
    public double getAppliedDiscountPercent() {
        if (basePremium == 0) return 0;
        return ((basePremium - finalPremium) / basePremium) * 100.0;
    }
}
