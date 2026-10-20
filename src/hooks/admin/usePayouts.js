import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { adminApi } from "@/api/admin.api";

// Restaurant payouts (B12). Reads are per tab; every action invalidates all of them, because
// one step (schedule, release, hold…) moves numbers on every tab at once.

export const payoutKeys = {
  all: ["admin", "payouts"],
  weekly: (weekStart) => ["admin", "payouts", "weekly", weekStart ?? "last"],
  clearance: (params) => ["admin", "payouts", "clearance", params],
  history: (params) => ["admin", "payouts", "history", params],
  bankRequests: (params) => ["admin", "payouts", "bank-requests", params],
  options: ["admin", "payouts", "options"],
  detail: (id) => ["admin", "payouts", "detail", id],
};

export function usePayoutsWeekly(weekStart) {
  return useQuery({
    queryKey: payoutKeys.weekly(weekStart),
    queryFn: () =>
      adminApi.getPayoutsWeekly(weekStart).then((r) => r.data.data),
    placeholderData: keepPreviousData,
  });
}

export function usePayoutsClearance(params = {}) {
  return useQuery({
    queryKey: payoutKeys.clearance(params),
    queryFn: () =>
      adminApi.getPayoutsClearance(params).then((r) => r.data.data),
    placeholderData: keepPreviousData,
  });
}

export function usePayoutsHistory(params = {}) {
  return useQuery({
    queryKey: payoutKeys.history(params),
    queryFn: () => adminApi.getPayoutsHistory(params).then((r) => r.data.data),
    placeholderData: keepPreviousData,
  });
}

export function useBankRequests(params = {}) {
  return useQuery({
    queryKey: payoutKeys.bankRequests(params),
    queryFn: () => adminApi.listBankRequests(params).then((r) => r.data.data),
    placeholderData: keepPreviousData,
  });
}

// Hold / failure reason codes for the modals, and the default release date (next payout day).
export function usePayoutOptions() {
  return useQuery({
    queryKey: payoutKeys.options,
    queryFn: () => adminApi.getPayoutOptions().then((r) => r.data.data),
    staleTime: 5 * 60_000,
  });
}

export function usePayout(id) {
  return useQuery({
    queryKey: payoutKeys.detail(id),
    queryFn: () => adminApi.getPayout(id).then((r) => r.data.data),
    enabled: !!id,
  });
}

function usePayoutAction(mutationFn) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    // Settled either way: a 409 means the payout moved under us — show it as it is now.
    onSettled: () => qc.invalidateQueries({ queryKey: payoutKeys.all }),
  });
}

export const useSchedulePayout = (id) =>
  usePayoutAction((scheduledFor) => adminApi.schedulePayout(id, scheduledFor));
export const useChangePayoutDate = (id) =>
  usePayoutAction((scheduledFor) =>
    adminApi.changePayoutDate(id, scheduledFor),
  );
export const useReschedulePayout = (id) =>
  usePayoutAction((scheduledFor) =>
    adminApi.reschedulePayout(id, scheduledFor),
  );
export const useReleasePayout = (id) =>
  usePayoutAction((expectedNetPaise) =>
    adminApi.releasePayout(id, expectedNetPaise),
  );
export const useMarkPayoutPaid = (id) =>
  usePayoutAction((body) => adminApi.markPayoutPaid(id, body));
export const useMarkPayoutFailed = (id) =>
  usePayoutAction((body) => adminApi.markPayoutFailed(id, body));
export const useHoldPayout = (id) =>
  usePayoutAction((body) => adminApi.holdPayout(id, body));
export const useUpdatePayoutHoldReason = (id) =>
  usePayoutAction((body) => adminApi.updatePayoutHoldReason(id, body));
export const useReleasePayoutHold = (id) =>
  usePayoutAction(() => adminApi.releasePayoutHold(id));

export const useGenerateSettlements = () =>
  usePayoutAction((weekStart) =>
    adminApi.generateSettlements(weekStart).then((r) => r.data.data),
  );
export const useAddSettlementAdjustment = () =>
  usePayoutAction((body) =>
    adminApi.addSettlementAdjustment(body).then((r) => r.data.data),
  );
