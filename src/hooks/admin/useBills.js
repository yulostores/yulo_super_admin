import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { adminApi } from "@/api/admin.api";

const billKeys = {
  all: ["admin", "bills"],
  list: (params) => ["admin", "bills", "list", params],
  detail: (id) => ["admin", "bills", "detail", id],
};

// params: { restaurantId, status, type, tableNumber, from, to, q, page, limit }
export function useBills(params = {}) {
  return useQuery({
    queryKey: billKeys.list(params),
    queryFn: () => adminApi.listBills(params).then((r) => r.data.data),
    placeholderData: keepPreviousData,
  });
}

export function useBill(id) {
  return useQuery({
    queryKey: billKeys.detail(id),
    queryFn: () => adminApi.getBill(id).then((r) => r.data.data.bill),
    enabled: !!id,
  });
}
