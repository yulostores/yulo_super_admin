import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { authApi } from "@/api/auth.api";
import { setAccessToken, getAccessToken, onSessionExpired } from "@/api/client";

// Only the display profile is cached, so a refresh can render the shell before
// the silent token refresh resolves. The access token itself stays in memory.
const PROFILE_KEY = "yulo_admin_profile";

function readProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [user, setUser] = useState(readProfile);
  const [loading, setLoading] = useState(() => Boolean(readProfile()));

  useEffect(() => {
    if (user) localStorage.setItem(PROFILE_KEY, JSON.stringify(user));
    else localStorage.removeItem(PROFILE_KEY);
  }, [user]);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
  }, []);

  // A rejected refresh means the 7-day cookie is gone — drop the cached
  // profile rather than leaving the UI signed in with no usable token.
  useEffect(() => {
    onSessionExpired(clearSession);
    return () => onSessionExpired(null);
  }, [clearSession]);

  // On mount: profile cached but no token in memory (page reload) — try to
  // mint a fresh access token from the refreshToken cookie.
  useEffect(() => {
    if (!user || getAccessToken()) {
      setLoading(false);
      return;
    }
    authApi
      .refresh()
      .then(({ data }) => setAccessToken(data.data.accessToken))
      .catch(clearSession)
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async ({ email, password }) => {
    const { data } = await authApi.login({ email, password });
    const { user: u, accessToken } = data.data;
    setAccessToken(accessToken);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Already invalid server-side — clear locally regardless.
    }
    clearSession();
  }, [clearSession]);

  return (
    <AdminAuthContext.Provider
      value={{ user, loading, login, logout, isAuthenticated: !!user }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be inside AdminAuthProvider");
  return ctx;
}
