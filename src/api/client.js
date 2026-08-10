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

client.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    const code = err.response?.data?.code;

    if (code === "TOKEN_EXPIRED" && !original._retried) {
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
        const { data } = await axios.post(
          `${API_BASE}/api/auth/refresh`,
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
        return Promise.reject(refreshErr);
      } finally {
        _refreshing = false;
      }
    }

    const message =
      err.response?.data?.message ?? err.message ?? "Request failed";
    const apiError = new Error(message);
    apiError.code = code;
    apiError.status = err.response?.status;
    apiError.details = err.response?.data?.details;
    return Promise.reject(apiError);
  },
);

export default client;
