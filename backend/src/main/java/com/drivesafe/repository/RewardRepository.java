package com.drivesafe.repository;

import com.drivesafe.model.Reward;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RewardRepository extends JpaRepository<Reward, Long> {

    // ── Store catalog queries ─────────────────────────────────────────

    /**
     * All active rewards sorted by points cost ascending.
     * Called by RewardsService.getAllRewards() — powers the full store page.
     * Only returns active=true rewards (hides disabled/seasonal items).
     */
    List<Reward> findAllByOrderByPointsCostAsc();

    /**
     * Active rewards only, sorted by cost.
     * Use this instead of findAll when you want to hide inactive rewards.
     */
    List<Reward> findByActiveTrueOrderByPointsCostAsc();

    /**
     * Filter rewards by category, case-insensitive.
     * Called by RewardsService.getRewardsByCategory().
     * Categories: food, fuel, shopping, entertainment
     *
     * Example: findByCategoryIgnoreCase("food")
     * Returns: Burger King, Swiggy, Zomato cards
     */
    List<Reward> findByCategoryIgnoreCase(String category);

    /**
     * Active rewards in a specific category.
     * Combines category filter + active filter.
     */
    List<Reward> findByCategoryIgnoreCaseAndActiveTrue(String category);

    // ── Points-based queries ──────────────────────────────────────────

    /**
     * Rewards the user can afford given their points balance.
     * Shown with active "Redeem Now" button (not greyed out).
     *
     * Example: findAffordableRewards(90) returns rewards costing ≤ 90 pts
     */
    @Query("SELECT r FROM Reward r WHERE r.pointsCost <= :points AND r.active = true ORDER BY r.pointsCost DESC")
    List<Reward> findAffordableRewards(@Param("points") int points);

    /**
     * Rewards the user cannot yet afford.
     * Shown with greyed "Insufficient Points" button — motivates earning more.
     */
    @Query("SELECT r FROM Reward r WHERE r.pointsCost > :points AND r.active = true ORDER BY r.pointsCost ASC")
    List<Reward> findUnaffordableRewards(@Param("points") int points);

    // ── Admin queries ─────────────────────────────────────────────────

    /**
     * All distinct categories in the catalog.
     * Used to build the category filter tabs in Rewards.jsx dynamically.
     */
    @Query("SELECT DISTINCT r.category FROM Reward r WHERE r.active = true ORDER BY r.category")
    List<String> findDistinctCategories();

    /**
     * Count rewards per category — for analytics.
     * Returns Object[]{category, count}
     */
    @Query("SELECT r.category, COUNT(r) FROM Reward r WHERE r.active = true GROUP BY r.category")
    List<Object[]> countByCategory();
}