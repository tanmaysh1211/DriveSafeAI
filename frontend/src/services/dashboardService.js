import api from "./api";

// ─────────────────────────────────────────────────────────────────────────────
// dashboardService.js — Dashboard API calls
// ─────────────────────────────────────────────────────────────────────────────


/**
 * GET /api/dashboard/{userId}?n={n}
 * Returns full DashboardResponse: DRISC score, risk level, risk factors,
 * premium impact, recommendations, user profile.
 *
 * @param {number} userId
 * @param {number} n       — number of trips to include in DRISC calculation
 * @returns {Promise<DashboardResponse>}
 */
export async function getDashboard(userId, n = 1) {
  const response = await api.get(`/dashboard/${userId}`, { params: { n } });
  return response.data;
}


/**
 * POST /api/dashboard/{userId}/recalculate?n={n}
 * Forces a fresh DRISC recalculation over the last N trips.
 *
 * @param {number} userId
 * @param {number} n
 * @returns {Promise<DashboardResponse>}
 */
export async function recalculateDrisc(userId, n = 5) {
  const response = await api.post(
    `/dashboard/${userId}/recalculate`,
    {},
    { params: { n } }
  );
  return response.data;
}


/**
 * GET /api/dashboard/{userId}/score-history?limit={limit}
 * Returns list of past DRISC scores for the trend chart.
 *
 * @param {number} userId
 * @param {number} limit
 * @returns {Promise<Array<{ score, riskLevel, nTrips, calculatedAt }>>}
 */
export async function getScoreHistory(userId, limit = 10) {
  const response = await api.get(
    `/dashboard/${userId}/score-history`,
    { params: { limit } }
  );
  return response.data;
}