// VITE_API_BASE — prefix for requests. Blank means the Vite dev proxy
// handles "/api" → http://localhost:3000 (see vite.config.js). Set it to
// the real API origin for production builds.
export const API_BASE = import.meta.env.VITE_API_BASE ?? "";
