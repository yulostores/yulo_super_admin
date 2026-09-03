import client from "./client";

// The admin portal has its own login/logout pair (server/routes/admin/auth.routes.js).
// /api/auth/login is customer-only — it looks up `{ email, role: 'customer' }`, so an
// admin account gets 401 INVALID_CREDENTIALS there no matter how correct the password.
// /api/auth/refresh is shared across all three portals, but each portal now has
// its own httpOnly cookie (server/utils/refreshCookie.js) because cookies ignore
// the port and the three dev servers share one jar. `?portal=admin` names which
// cookie to read — without it the server falls back to the pre-split shared
// cookie, finds nothing, and answers 401 INVALID_TOKEN "No refresh token".
export const authApi = {
  login: (body) => client.post("/admin/auth/login", body),
  logout: () => client.post("/admin/auth/logout"),
  refresh: () => client.post("/auth/refresh?portal=admin"),
};
