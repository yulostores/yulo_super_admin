import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/api/admin.api";

export function useDashboardOverview() {
  return useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: () => adminApi.getDashboard().then((r) => r.data.data),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useRevenueOverview(range = "month") {
  return useQuery({
    queryKey: ["admin", "dashboard", "revenue-overview", range],
    queryFn: () => adminApi.getRevenueOverview(range).then((r) => r.data.data),
    staleTime: 60_000,
  });
}

export function useTopStores(limit = 5) {
  return useQuery({
    queryKey: ["admin", "reports", "top-stores", limit],
    queryFn: () => adminApi.getTopStores(limit).then((r) => r.data.data.stores),
    staleTime: 60_000,
  });
}

export function useTopDeliveryPartners(limit = 5) {
  return useQuery({
    queryKey: ["admin", "reports", "top-delivery-partners", limit],
    queryFn: () =>
      adminApi.getTopDeliveryPartners(limit).then((r) => r.data.data.partners),
    staleTime: 60_000,
  });
}

export function useLiveActivity() {
  return useQuery({
    queryKey: ["admin", "dashboard", "live-activity"],
    queryFn: () => adminApi.getLiveActivity().then((r) => r.data.data),
    refetchInterval: 20_000,
    staleTime: 15_000,
  });
}

export function useHourlyActivity() {
  return useQuery({
    queryKey: ["admin", "dashboard", "hourly-activity"],
    queryFn: () => adminApi.getHourlyActivity().then((r) => r.data.data),
    staleTime: 5 * 60_000,
  });
}
