import {
  keepPreviousData,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { adminApi } from "@/api/admin.api";
import { financeApi } from "@/api/finance.api";

const refundKeys = {
  all: ["admin", "refunds"],
  list: (params) => ["admin", "refunds", "list", params],
};

// params: { status, page, limit } → { refunds, total, page, limit }
export function useRefunds(params = {}) {
  return useQuery({
    queryKey: refundKeys.list(params),
    queryFn: () => financeApi.listRefunds(params).then((r) => r.data.data),
    placeholderData: keepPreviousData,
  });
}

// Sends a pending, failed or stuck refund to Razorpay again. Resolves { source, refund }.
export function useRetryRefund() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => financeApi.retryRefund(id).then((r) => r.data.data),
    onSettled: () => qc.invalidateQueries({ queryKey: refundKeys.all }),
  });
}

// Refund rows carry only restaurantId — resolve the names shown in the table (cached, so a
// restaurant appearing on many rows or pages is fetched once).
export function useRestaurantNames(ids = []) {
  const unique = [...new Set(ids.filter(Boolean).map(String))];
  const results = useQueries({
    queries: unique.map((id) => ({
      queryKey: ["admin", "stores", "name", id],
      queryFn: () =>
        adminApi.getStore(id).then((r) => {
          const d = r.data.data;
          return (d.store ?? d.restaurant ?? d)?.name ?? null;
        }),
      staleTime: 5 * 60_000,
      retry: false,
    })),
  });
  return new Map(unique.map((id, i) => [id, results[i]?.data ?? null]));
}
