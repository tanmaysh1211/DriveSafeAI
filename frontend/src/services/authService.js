import api from "./api";

export async function login({ email, password }) {
  const response = await api.post("/auth/login", { email, password });
  return response.data;
}

export async function register({ name, email, password, vehicleNumber }) {
  const response = await api.post("/auth/register", {
    name,
    email,
    password,
    vehicleNumber: vehicleNumber || undefined, // omit if empty string
  });
  return response.data;
}

export async function getCurrentUser() {
  const response = await api.get("/auth/me");
  return response.data;
}

export function logout() {
  localStorage.removeItem("drivesafe_token");
  localStorage.removeItem("drivesafe_user");
}

export function saveAuthToStorage(data) {
  if (data.token) {
    localStorage.setItem("drivesafe_token", data.token);
  }
  const { token, ...user } = data;
  localStorage.setItem("drivesafe_user", JSON.stringify(user));
}

export function loadAuthFromStorage() {
  try {
    const token    = localStorage.getItem("drivesafe_token");
    const userJson = localStorage.getItem("drivesafe_user");
    if (!token || !userJson) return null;
    const user = JSON.parse(userJson);
    return { token, ...user };
  } catch {
    logout();
    return null;
  }
}

export function hasToken() {
  return !!localStorage.getItem("drivesafe_token");
}
