import api from "./api";

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

export async function getUserTrips(userId, limit = 10) {
  const response = await api.get(`/trips/${userId}`, { params: { limit } });
  return response.data;
}

export async function getTripDetails(tripId) {
  const response = await api.get(`/trips/detail/${tripId}`);
  return response.data;
}

export async function getAIAnalysis(tripId) {
  const response = await api.get(`/trips/${tripId}/ai-analysis`);
  return response.data;
}

export async function getMapUrl(tripId) {
  const response = await api.get(`/trips/${tripId}/map-url`);
  return response.data;
}

export async function deleteTrip(tripId) {
  const response = await api.delete(`/trips/${tripId}`);
  return response.data;
}
