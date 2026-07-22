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

    Optional<Insurance> findByUserId(Long userId);

    boolean existsByUserId(Long userId);

    Optional<Insurance> findByPolicyNumber(String policyNumber);
    
    boolean existsByPolicyNumber(String policyNumber);

    @Query("SELECT i FROM Insurance i WHERE i.endDate < :date")
    List<Insurance> findPoliciesExpiringBefore(@Param("date") LocalDate date);

    @Query("SELECT i FROM Insurance i WHERE i.endDate >= :today")
    List<Insurance> findActivePolicies(@Param("today") LocalDate today);

    List<Insurance> findByCoverageType(String coverageType);

    @Query("SELECT i.coverageType, COUNT(i) FROM Insurance i GROUP BY i.coverageType")
    List<Object[]> countByCoverageType();

    @Query("SELECT AVG(i.finalPremium) FROM Insurance i WHERE i.endDate >= :today")
    Optional<Double> findAverageActivePremium(@Param("today") LocalDate today);
}
