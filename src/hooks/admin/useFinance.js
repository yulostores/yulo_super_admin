import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/api/admin.api";

export function useFinanceOverview(params = {}) {
  return useQuery({
    queryKey: ["admin", "finance", "overview", params],
    queryFn: () => adminApi.getFinanceOverview(params).then((r) => r.data.data),
    staleTime: 60_000,
  });
}

export function useRevenueTrend(months = 12) {
  return useQuery({
    queryKey: ["admin", "finance", "revenue-trend", months],
    queryFn: () =>
      adminApi.getRevenueTrend(months).then((r) => r.data.data.points),
    staleTime: 60_000,
  });
}

export function useEarningsVsSpending(months = 12) {
  return useQuery({
    queryKey: ["admin", "finance", "earnings-vs-spending", months],
    queryFn: () =>
      adminApi.getEarningsVsSpending(months).then((r) => r.data.data.points),
    staleTime: 60_000,
  });
}

export function useFinanceRestaurants(params = {}) {
  return useQuery({
    queryKey: ["admin", "finance", "restaurants", params],
    queryFn: () =>
      adminApi.getFinanceRestaurants(params).then((r) => r.data.data),
    staleTime: 60_000,
  });
}
