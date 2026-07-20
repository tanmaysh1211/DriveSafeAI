import axios from "axios";

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api";

console.log("VITE_API_BASE_URL =", import.meta.env.VITE_API_BASE_URL);
console.log("BASE_URL =", BASE_URL);

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,             
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("drivesafe_token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,

  (error) => {
    const status  = error.response?.status;
    const message = error.response?.data?.message;

    if (status === 401) {
      const path = window.location.pathname;
      if (path !== "/login" && path !== "/register") {
        localStorage.removeItem("drivesafe_token");
        localStorage.removeItem("drivesafe_user");
        window.location.href = "/login";
      }
    }

    if (status === 403) {
      console.warn("[api] 403 Forbidden:", error.config?.url);
    }

    if (status >= 500) {
      console.error("[api] Server error:", status, message ?? error.message);
    }

    if (!error.response) {
      console.error("[api] No response from server. Is Spring Boot running on :8080?");
      error.message = "Cannot reach the server. Please check your connection.";
    }

    return Promise.reject(error);
  }
);

export default api;
