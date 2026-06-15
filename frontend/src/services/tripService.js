import api from "./api";

// ─────────────────────────────────────────────────────────────────────────────
// tripService.js — Trip-related API calls
//
// All calls route through the Axios instance in api.js so JWT is
// automatically attached and 401s redirect to /login.
// ─────────────────────────────────────────────────────────────────────────────


/**
 * POST /api/trips/upload
 * Upload an OBD CSV file. Returns full TripUploadResponse including
 * driveScore, riskLevel, aiRecommendation, mapUrl, pointsEarned.
 *
 * @param {File} csvFile   — the File object from <input type="file">
 * @returns {Promise<TripUploadResponse>}
 */
export async function uploadTrip(csvFile) {
  const formData = new FormData();
  formData.append("file", csvFile);

  const response = await api.post("/trips/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    // Longer timeout for ML processing + OpenAI call
    timeout: 60_000,
  });
  return response.data;
}


/**
 * GET /api/trips/{userId}?limit={limit}
 * Returns paginated list of TripSummaryResponse objects, newest first.
 *
 * @param {number} userId
 * @param {number} limit   — default 10, max 100
 * @returns {Promise<TripSummaryResponse[]>}
 */
export async function getUserTrips(userId, limit = 10) {
  const response = await api.get(`/trips/${userId}`, { params: { limit } });
  return response.data;
}


/**
 * GET /api/trips/detail/{tripId}
 * Returns full TripDetailResponse including avgSpeed, acceleration,
 * hard braking count, AI recommendation, map URL.
 *
 * @param {number} tripId
 * @returns {Promise<TripDetailResponse>}
 */
export async function getTripDetails(tripId) {
  const response = await api.get(`/trips/detail/${tripId}`);
  return response.data;
}


/**
 * GET /api/trips/{tripId}/ai-analysis
 * Returns the stored AI recommendation text for a trip.
 *
 * @param {number} tripId
 * @returns {Promise<{ tripId: number, analysis: string }>}
 */
export async function getAIAnalysis(tripId) {
  const response = await api.get(`/trips/${tripId}/ai-analysis`);
  return response.data;
}


/**
 * GET /api/trips/{tripId}/map-url
 * Returns the Folium map URL for embedding in an iframe.
 *
 * @param {number} tripId
 * @returns {Promise<{ tripId: number, mapUrl: string }>}
 */
export async function getMapUrl(tripId) {
  const response = await api.get(`/trips/${tripId}/map-url`);
  return response.data;
}


/**
 * DELETE /api/trips/{tripId}
 * Deletes a trip (ownership-checked on the backend).
 *
 * @param {number} tripId
 * @returns {Promise<{ message: string }>}
 */
export async function deleteTrip(tripId) {
  const response = await api.delete(`/trips/${tripId}`);
  return response.data;
}