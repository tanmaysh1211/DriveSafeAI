package com.drivesafe.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

// ─────────────────────────────────────────────────────────────────────────────
// RewardItemResponse — one card in the Rewards Store grid
//
// Returned by:
//   GET /api/rewards/store              → List<RewardItemResponse>  (full catalog)
//   GET /api/rewards/store/{category}   → List<RewardItemResponse>  (filtered)
//
// Powers each reward card in Rewards.jsx:
//   - emoji       : 🍔 🛢️ 🍽️ 📦 🎬 🎵 🍕  (shown as card icon)
//   - name        : "Burger King", "Netflix", "Amazon" etc.
//   - description : "Whopper Burger Combo", "1 Month Subscription" etc.
//   - value       : ₹50, ₹150, ₹125 — monetary value of the voucher
//   - pointsCost  : 1000, 3000, 2500 — points needed to redeem
//   - category    : food | fuel | shopping | entertainment
//                   (used by category filter tabs)
//
// The "Insufficient Points" / "Redeem Now" button state is decided
// client-side in Rewards.jsx by comparing userPoints >= pointsCost.
//
// JSON shape:
// {
//   "id":          1,
//   "name":        "Burger King",
//   "description": "Whopper Burger Combo",
//   "category":    "food",
//   "pointsCost":  1000,
//   "value":       50.0,
//   "emoji":       "🍔"
// }
// ─────────────────────────────────────────────────────────────────────────────

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class RewardItemResponse {

    // ── Identity ──────────────────────────────────────────────────────
    /**
     * DB primary key — sent to POST /api/rewards/redeem as rewardId.
     */
    private Long id;

    // ── Display ───────────────────────────────────────────────────────
    /**
     * Brand / reward name shown as card title.
     * e.g. "Burger King", "Indian Oil", "Swiggy", "Amazon",
     *      "Netflix", "Spotify", "Zomato"
     */
    private String name;

    /**
     * Subtitle shown below the name.
     * e.g. "Whopper Burger Combo", "Fuel Voucher",
     *      "Food Delivery Discount", "Shopping Voucher",
     *      "1 Month Subscription", "Premium Music Access",
     *      "Food Order Discount"
     */
    private String description;

    /**
     * Category for the filter tabs in Rewards.jsx.
     * Values: food | fuel | shopping | entertainment
     * Matched case-insensitively by RewardRepository.findByCategoryIgnoreCase()
     */
    private String category;

    // ── Points ────────────────────────────────────────────────────────
    /**
     * Points required to redeem this reward.
     * Shown as "⭐ 1,000 points" on the card.
     *
     * Typical values from the hackathon screenshots:
     *   Burger King  → 1,000
     *   Indian Oil   → 2,000
     *   Swiggy       → 1,500
     *   Amazon       → 2,500
     *   Netflix      → 3,000
     *   Spotify      → 1,800
     *   Zomato       → 1,200
     */
    private int pointsCost;

    // ── Monetary value ────────────────────────────────────────────────
    /**
     * Rupee value of the reward voucher.
     * Shown as "₹50 value", "₹150 value" etc. on the card.
     *
     * Typical values:
     *   Burger King  → ₹50
     *   Indian Oil   → ₹100
     *   Swiggy       → ₹75
     *   Amazon       → ₹125
     *   Netflix      → ₹150
     *   Spotify      → ₹90
     *   Zomato       → ₹60
     */
    private double value;

    // ── Emoji ─────────────────────────────────────────────────────────
    /**
     * Emoji icon displayed at the top of each reward card.
     * Stored in DB; falls back to BRAND_EMOJIS map in Rewards.jsx if null.
     *
     *   Burger King  → 🍔
     *   Indian Oil   → ⛽
     *   Swiggy       → 🍽️
     *   Amazon       → 📦
     *   Netflix      → 🎬
     *   Spotify      → 🎵
     *   Zomato       → 🍕
     */
    private String emoji;
}