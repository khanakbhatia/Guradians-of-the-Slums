import axios from "axios";

/**
 * Centralized Axios instance.
 * Backend base URL is read from the environment so it can point at
 * the IBM-hosted / teammate-built backend without code changes.
 *
 * No request logic beyond generic interceptors lives here — this file
 * is pure frontend plumbing, not business/AI logic.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api",
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach auth token (if present) to every outgoing request.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("gots_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Normalize error responses so callers get a consistent shape.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error?.response?.data?.message || error?.message || "Something went wrong";
    return Promise.reject({ ...error, message });
  }
);

export default api;
