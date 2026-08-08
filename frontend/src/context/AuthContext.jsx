import { createContext, useContext, useEffect, useState } from "react";

import api from "@/lib/axios";
import { ENDPOINTS } from "@/api/endpoints";

const AuthContext = createContext(undefined);
const TOKEN_KEY = "accessToken";

/**
 * Real authentication, wired to the backend's /auth endpoints.
 * - Access token lives in localStorage (see src/lib/axios.js's request
 *   interceptor, which reads the same key).
 * - Session is restored on load by calling GET /auth/me with whatever
 *   token is stored — if it's missing/expired that just resolves to
 *   "logged out" rather than throwing.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount.
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get(ENDPOINTS.ME)
      .then(({ data }) => setUser(data.user))
      .catch(() => {
        // Invalid/expired token — the axios 401 interceptor already
        // clears it and would redirect, but guard here too in case this
        // resolves before that runs.
        localStorage.removeItem(TOKEN_KEY);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login({ email, password }) {
    const { data } = await api.post(ENDPOINTS.LOGIN, { email, password });
    localStorage.setItem(TOKEN_KEY, data.accessToken);
    setUser(data.user);
    return data.user;
  }

  /**
   * Register, then log in immediately with the same credentials.
   * POST /auth/register only returns the created user (no token — it
   * triggers a verification email), but the backend's login doesn't
   * require a verified email to succeed, so chaining the two real
   * endpoints reproduces the "register -> land in your dashboard" flow
   * without inventing a combined endpoint.
   */
  async function register({ name, email, password, role, phone }) {
    await api.post(ENDPOINTS.REGISTER, { name, email, password, role, phone });
    return login({ email, password });
  }

  async function logout() {
    try {
      await api.post(ENDPOINTS.LOGOUT);
    } catch {
      // Even if the server call fails (e.g. token already expired),
      // still clear the local session below.
    }
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }

  const value = {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
