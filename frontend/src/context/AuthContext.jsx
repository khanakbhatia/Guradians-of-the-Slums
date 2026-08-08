import { createContext, useContext, useEffect, useState } from "react";
import { ROLES } from "@/constants";

const AuthContext = createContext(undefined);
const SESSION_KEY = "gots_session";
const USERS_KEY = "gots_users";

/**
 * DUMMY AUTHENTICATION — no backend, no real security.
 * Users are stored in localStorage purely so the frontend flows
 * (register -> login -> protected routes -> logout) work end to end
 * for the hackathon demo. Replace with real auth wiring later.
 */

const SEED_USERS = [
  { id: "u_authority", name: "Rahul Mehta", email: "authority@demo.io", password: "demo1234", role: ROLES.AUTHORITY },
  { id: "u_volunteer", name: "Ayesha Khan", email: "volunteer@demo.io", password: "demo1234", role: ROLES.VOLUNTEER },
  { id: "u_citizen", name: "Sam Fernandes", email: "citizen@demo.io", password: "demo1234", role: ROLES.CITIZEN },
  { id: "u_admin", name: "Meera Iyer", email: "admin@demo.io", password: "demo1234", role: ROLES.ADMIN },
];

function readUsers() {
  const raw = localStorage.getItem(USERS_KEY);
  if (!raw) {
    localStorage.setItem(USERS_KEY, JSON.stringify(SEED_USERS));
    return SEED_USERS;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return SEED_USERS;
  }
}

function writeUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      try {
        setUser(JSON.parse(raw));
      } catch {
        localStorage.removeItem(SESSION_KEY);
      }
    }
    setLoading(false);
  }, []);

  /** Simulated network delay so loading states are visible in the UI. */
  const fakeLatency = (ms = 500) => new Promise((res) => setTimeout(res, ms));

  async function login({ email, password }) {
    await fakeLatency();
    const users = readUsers();
    const match = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    if (!match) {
      throw new Error("Invalid email or password.");
    }
    const session = { id: match.id, name: match.name, email: match.email, role: match.role };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setUser(session);
    return session;
  }

  async function register({ name, email, password, role }) {
    await fakeLatency();
    const users = readUsers();
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error("An account with this email already exists.");
    }
    const newUser = {
      id: `u_${Date.now()}`,
      name,
      email,
      password,
      role: role || ROLES.CITIZEN,
    };
    writeUsers([...users, newUser]);
    const session = { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setUser(session);
    return session;
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  }

  /** Quick-login helper for demo purposes (used by the "seed" buttons on Login). */
  async function loginAs(role) {
    const seed = SEED_USERS.find((u) => u.role === role);
    return login({ email: seed.email, password: seed.password });
  }

  const value = {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    register,
    logout,
    loginAs,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
