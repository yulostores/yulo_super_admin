import client from "./client";

export const authApi = {
  login: (body) => client.post("/auth/login", body),
  logout: () => client.post("/auth/logout"),
  refresh: () => client.post("/auth/refresh"),
};
