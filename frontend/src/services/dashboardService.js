import api from "./api";

export async function getDashboard(userId, n = 1) {
  const response = await api.get(`/dashboard/${userId}`, { params: { n } });
  return response.data;
}

export async function recalculateDrisc(userId, n = 5) {
  const response = await api.post(
    `/dashboard/${userId}/recalculate`,
    {},
    { params: { n } }
  );
  return response.data;
}

export async function getScoreHistory(userId, limit = 10) {
  const response = await api.get(
    `/dashboard/${userId}/score-history`,
    { params: { limit } }
  );
  return response.data;
}
