package com.drivesafe.repository;

import com.drivesafe.model.Reward;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface RewardRepository extends JpaRepository<Reward, Long> {

    List<Reward> findAllByOrderByPointsCostAsc();

    List<Reward> findByActiveTrueOrderByPointsCostAsc();

    List<Reward> findByCategoryIgnoreCase(String category);

    List<Reward> findByCategoryIgnoreCaseAndActiveTrue(String category);

    @Query("SELECT r FROM Reward r WHERE r.pointsCost <= :points AND r.active = true ORDER BY r.pointsCost DESC")
    List<Reward> findAffordableRewards(@Param("points") int points);

    @Query("SELECT r FROM Reward r WHERE r.pointsCost > :points AND r.active = true ORDER BY r.pointsCost ASC")
    List<Reward> findUnaffordableRewards(@Param("points") int points);

    @Query("SELECT DISTINCT r.category FROM Reward r WHERE r.active = true ORDER BY r.category")
    List<String> findDistinctCategories();

    @Query("SELECT r.category, COUNT(r) FROM Reward r WHERE r.active = true GROUP BY r.category")
    List<Object[]> countByCategory();
}
