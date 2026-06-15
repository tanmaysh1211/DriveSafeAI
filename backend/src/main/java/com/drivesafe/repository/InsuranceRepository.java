package com.drivesafe.repository;

import com.drivesafe.model.Insurance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface InsuranceRepository extends JpaRepository<Insurance, Long> {

    // ── Core lookup ───────────────────────────────────────────────────
    /**
     * Find insurance policy by user ID.
     * Called by InsuranceService.getInsuranceForUser() on every Insurance page load.
     * Uses idx_insurance_user_id index for fast lookup.
     */
    Optional<Insurance> findByUserId(Long userId);

    /**
     * Check if a policy exists for a user — avoids fetching full entity
     * just to do an existence check.
     */
    boolean existsByUserId(Long userId);

    // ── Policy number lookup ──────────────────────────────────────────
    /**
     * Find by policy number (e.g. "INS123456789").
     * Used for policy search in admin views.
     */
    Optional<Insurance> findByPolicyNumber(String policyNumber);

    /**
     * Check uniqueness of policy number before creation.
     */
    boolean existsByPolicyNumber(String policyNumber);

    // ── Expiry queries ────────────────────────────────────────────────
    /**
     * Find all policies expiring before a given date.
     * Used to send renewal reminders / create notifications.
     *
     * Example: findPoliciesExpiringBefore(LocalDate.now().plusDays(30))
     */
    @Query("SELECT i FROM Insurance i WHERE i.endDate < :date")
    List<Insurance> findPoliciesExpiringBefore(@Param("date") LocalDate date);

    /**
     * Find all active policies (end date >= today).
     */
    @Query("SELECT i FROM Insurance i WHERE i.endDate >= :today")
    List<Insurance> findActivePolicies(@Param("today") LocalDate today);

    // ── Coverage type filter ──────────────────────────────────────────
    /**
     * Filter by coverage type ("Comprehensive", "Third Party", etc.).
     * Useful for B2B insurer analytics dashboards.
     */
    List<Insurance> findByCoverageType(String coverageType);

    // ── Stats ─────────────────────────────────────────────────────────
    /**
     * Count policies by coverage type — insurer portfolio breakdown.
     * Returns Object[]{coverageType, count}
     */
    @Query("SELECT i.coverageType, COUNT(i) FROM Insurance i GROUP BY i.coverageType")
    List<Object[]> countByCoverageType();

    /**
     * Average final premium across all active policies.
     * Used for portfolio analytics.
     */
    @Query("SELECT AVG(i.finalPremium) FROM Insurance i WHERE i.endDate >= :today")
    Optional<Double> findAverageActivePremium(@Param("today") LocalDate today);
}