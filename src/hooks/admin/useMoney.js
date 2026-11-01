import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/api/admin.api";

// Orders & Money and the Weekly Report. Always fetched fresh on opening (staleTime 0): these are
// the screens the admin pays people from, so they must never show a cached "owed" figure.
const keys = {
  money: (params) => ["admin", "money", params],
  weekly: (weekStart) => ["admin", "weekly-report", weekStart ?? "last"],
};

export function useMoney(params = {}) {
  return useQuery({
    queryKey: keys.money(params),
    queryFn: () => adminApi.getMoney(params).then((r) => r.data.data),
    placeholderData: keepPreviousData,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}

export function useWeeklyReport(weekStart) {
  return useQuery({
    queryKey: keys.weekly(weekStart),
    queryFn: () => adminApi.getWeeklyReport(weekStart).then((r) => r.data.data),
    placeholderData: keepPreviousData,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}

// After a payment is recorded, everything that shows who is owed what is refreshed.
const refreshAll = (qc) => {
  for (const key of [["admin", "weekly-report"], ["admin", "money"], ["admin", "payouts"], ["admin", "delivery-partners"]]) {
    qc.invalidateQueries({ queryKey: key });
  }
};

export function usePayRestaurant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ settlementId, ...body }) => adminApi.payRestaurantFromReport(settlementId, body),
    onSuccess: () => refreshAll(qc),
  });
}

export function usePayRider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ payoutId, ...body }) => adminApi.payRiderFromReport(payoutId, body),
    onSuccess: () => refreshAll(qc),
  });
}
