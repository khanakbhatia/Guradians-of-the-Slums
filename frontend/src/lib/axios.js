import axios from "axios";

/**
 * Centralized Axios instance.
 * Base URL points at the backend's versioned API root — every endpoint
 * path used elsewhere in the app (see src/api/endpoints.js) is relative
 * to this, e.g. "/citizen-reports", "/auth/login".
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1",
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Auth endpoints that legitimately return 401 as part of normal use
// (wrong password, expired/invalid refresh token) rather than "your
// session died mid-request" — the 401 handler below skips redirecting
// for these so a failed login attempt doesn't bounce the page.
const AUTH_ENDPOINTS_EXEMPT_FROM_REDIRECT = ["/auth/login", "/auth/register", "/auth/refresh-token"];

// Attach the JWT (if present) to every outgoing request.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// The backend serializes Mongoose documents with their raw `_id`, while
// nearly every component in this app reads `.id` (list keys, `item.id
// === x` comparisons, etc.). Mirror `_id` -> `id` here, once, for
// anything that comes back from the API, rather than touching every
// component.
function normalizeIds(value, depth = 0) {
  if (depth > 6 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    for (const item of value) normalizeIds(item, depth + 1);
    return value;
  }
  if (typeof value._id === "string" && value.id === undefined) {
    value.id = value._id;
  }
  for (const key of Object.keys(value)) {
    if (key === "_id") continue;
    normalizeIds(value[key], depth + 1);
  }
  return value;
}

// Every backend response is wrapped as { success, message, data, meta? }.
// Unwrap it here so every call site can keep doing `(await api.get(...)).data`
// and get the actual payload — not the envelope. `meta` (pagination info
// on list endpoints) is preserved alongside it as `response.meta`.
api.interceptors.response.use(
  (response) => {
    if (response.data && typeof response.data === "object" && "data" in response.data) {
      const { data, meta } = response.data;
      response.meta = meta;
      response.data = normalizeIds(data);
    }
    return response;
  },
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || "";
    const isExemptAuthCall = AUTH_ENDPOINTS_EXEMPT_FROM_REDIRECT.some((p) => url.includes(p));

    // Session expired/invalid on a protected request — clear the stale
    // token and send the user back to log in, unless we're already
    // there or this 401 came from the login/register call itself (that's
    // just "wrong password", not "your session died").
    if (status === 401 && !isExemptAuthCall) {
      localStorage.removeItem("accessToken");
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    const message =
      error?.response?.data?.message || error?.message || "Something went wrong";
    return Promise.reject({ ...error, message });
  }
);

export default api;
