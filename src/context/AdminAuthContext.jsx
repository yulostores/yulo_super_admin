import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { authApi } from "@/api/auth.api";
import { setAccessToken, getAccessToken } from "@/api/client";

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
  const [user, setUser] = useState(() => readProfile());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) localStorage.setItem(PROFILE_KEY, JSON.stringify(user));
    else localStorage.removeItem(PROFILE_KEY);
  }, [user]);

  // On mount: if profile exists but token is gone (page refresh), silently refresh
  useEffect(() => {
    if (user && !getAccessToken()) {
      authApi
        .refresh()
        .then(({ data }) => setAccessToken(data.data.accessToken))
        .catch(() => {
          setUser(null);
          localStorage.removeItem(PROFILE_KEY);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async ({ email, password }) => {
    const { data } = await authApi.login({ email, password });
    const { user: u, accessToken } = data.data;

    if (u.role !== "admin") {
      throw new Error("This account does not have platform admin access.");
    }

    setAccessToken(accessToken);
    setUser(u);
    return u;
  }, []);

  // DEV-ONLY: lets you preview the UI shell without a running backend.
  // Sets no access token, so every API call will fail/empty-state — that's
  // expected, this is for layout review only. Remove once real login works.
  const previewLogin = useCallback(() => {
    setUser({ _id: "preview", name: "Preview Admin", email: "preview@yulostores.com", role: "admin" });
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      /* silent */
    }
    setAccessToken(null);
    setUser(null);
  }, []);

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        previewLogin,
        isAuthenticated: !!user,
      }}
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
