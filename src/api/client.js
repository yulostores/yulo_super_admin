import axios from "axios";
import { API_BASE } from "./config";

// Access token lives in memory only — never localStorage.
let _accessToken = null;

export function setAccessToken(token) {
  _accessToken = token;
}
export function getAccessToken() {
  return _accessToken;
}

// Notified when the refresh token is gone/rejected, so AdminAuthContext can
// drop the cached profile instead of leaving the app "logged in" with no token
// and every request failing 401.
let _onSessionExpired = null;
export function onSessionExpired(handler) {
  _onSessionExpired = handler;
}

// Single Axios instance for all API calls.
const client = axios.create({
  baseURL: `${API_BASE}/api`,
  withCredentials: true, // sends refresh-token cookie automatically
  headers: { "Content-Type": "application/json" },
});

// ── Request interceptor ─────────────────────────────────────────────────────
client.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response interceptor — auto-refresh on TOKEN_EXPIRED ────────────────────
let _refreshing = false;
let _queue = [];

function normalizeError(err) {
  const apiError = new Error(
    err.response?.data?.message ?? err.message ?? "Request failed",
  );
  apiError.code = err.response?.data?.code;
  apiError.status = err.response?.status;
  apiError.details = err.response?.data?.details;
  return apiError;
}

// A failed request made with `responseType: "blob"` (document previews) hands back an
// error body that is a Blob, not the parsed envelope — so `data.code` and `data.message`
// are both undefined. That silently costs more than a vague message: the TOKEN_EXPIRED
// refresh below keys off `code`, so without this a document fetch on an expired token
// would fail outright instead of healing like every other call. Read the blob back into
// the envelope the rest of this interceptor expects.
async function unpackBlobError(err) {
  const data = err.response?.data;
  if (typeof Blob === "undefined" || !(data instanceof Blob)) return;
  if (data.type && !data.type.includes("json")) return;
  try {
    err.response.data = JSON.parse(await data.text());
  } catch {
    // Not JSON after all — leave it alone.
  }
}

client.interceptors.response.use(
  (res) => res,
  async (err) => {
    await unpackBlobError(err);
    const original = err.config;
    const code = err.response?.data?.code;

    if (code === "TOKEN_EXPIRED" && original && !original._retried) {
      original._retried = true;

      if (_refreshing) {
        return new Promise((resolve, reject) =>
          _queue.push({ resolve, reject }),
        ).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return client(original);
        });
      }

      _refreshing = true;
      try {
        // Raw axios, not `client` — going through the instance would re-enter
        // this interceptor and recurse if the refresh itself 401s.
        // ?portal=admin picks this portal's refresh cookie — see auth.api.js.
        const { data } = await axios.post(
          `${API_BASE}/api/auth/refresh?portal=admin`,
          {},
          { withCredentials: true },
        );
        const newToken = data.data.accessToken;
        setAccessToken(newToken);
        _queue.forEach(({ resolve }) => resolve(newToken));
        _queue = [];
        original.headers.Authorization = `Bearer ${newToken}`;
        return client(original);
      } catch (refreshErr) {
        setAccessToken(null);
        _queue.forEach(({ reject }) => reject(refreshErr));
        _queue = [];
        _onSessionExpired?.();
        return Promise.reject(normalizeError(refreshErr));
      } finally {
        _refreshing = false;
      }
    }

    return Promise.reject(normalizeError(err));
  },
);

export default client;
