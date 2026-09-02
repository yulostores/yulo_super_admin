import client from "./client";

// The admin portal has its own login/logout pair (server/routes/admin/auth.routes.js).
// /api/auth/login is customer-only — it looks up `{ email, role: 'customer' }`, so an
// admin account gets 401 INVALID_CREDENTIALS there no matter how correct the password.
// /api/auth/refresh is shared across all three portals: it keys off the refreshToken
// cookie, not off which login endpoint minted it.
export const authApi = {
  login: (body) => client.post("/admin/auth/login", body),
  logout: () => client.post("/admin/auth/logout"),
  refresh: () => client.post("/auth/refresh"),
};
