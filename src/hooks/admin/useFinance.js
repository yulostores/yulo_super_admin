import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/api/admin.api";
import { financeApi } from "@/api/finance.api";

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

const financeSettingsKey = ["admin", "finance", "settings"];

// { active, upcoming, history, units } — the rules in force, scheduled versions, every version.
export function useFinanceSettings() {
  return useQuery({
    queryKey: financeSettingsKey,
    queryFn: () => adminApi.getFinanceSettings().then((r) => r.data.data),
  });
}

// Resolves with { version, changes, reappliedTo } — the screen shows all three.
export function useSaveFinanceSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) =>
      adminApi.saveFinanceSettings(body).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: financeSettingsKey });
      // The analytics read the settlement-charge rate from the active version.
      qc.invalidateQueries({ queryKey: ["admin", "finance", "overview"] });
    },
  });
}

// The money picture of one bill: a delivery / takeaway bill's money lives on its order
// (orderId), a dine-in bill's on the bill itself.
export function useBillMoney(bill) {
  const byOrder = Boolean(bill?.orderId) && bill?.type !== "dine_in";
  const id = byOrder ? bill?.orderId : bill?._id;
  return useQuery({
    queryKey: ["admin", "finance", "breakdown", byOrder ? "order" : "bill", id],
    queryFn: () =>
      (byOrder
        ? financeApi.getOrderBreakdown(id)
        : financeApi.getBillBreakdown(id)
      ).then((r) => r.data.data),
    enabled: Boolean(id),
  });
}

// Restaurant payout totals for the dashboard's range (paid / scheduled / not yet scheduled).
export function usePayoutTotals(params = {}) {
  return useQuery({
    queryKey: ["admin", "finance", "payout-totals", params],
    queryFn: () =>
      financeApi
        .getPayoutHistory({ ...params, page: 1, limit: 1 })
        .then((r) => r.data.data.kpis),
    staleTime: 60_000,
  });
}

// Every restaurant row for the range — the export covers the whole table, not the page shown.
export async function fetchAllFinanceRestaurants(params = {}) {
  const limit = 200;
  const first = (
    await adminApi.getFinanceRestaurants({ ...params, page: 1, limit })
  ).data.data;
  const rows = [...first.rows];
  for (let page = 2; page <= (first.pages ?? 1); page += 1) {
    const next = (
      await adminApi.getFinanceRestaurants({ ...params, page, limit })
    ).data.data;
    rows.push(...next.rows);
  }
  return rows;
}
