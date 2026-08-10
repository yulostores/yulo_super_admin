import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/api/admin.api";

const customerKeys = {
  all: ["admin", "customers"],
  list: (params) => ["admin", "customers", "list", params],
  detail: (id) => ["admin", "customers", "detail", id],
};

export function useCustomers(params = {}) {
  return useQuery({
    queryKey: customerKeys.list(params),
    queryFn: () => adminApi.listCustomers(params).then((r) => r.data.data),
    keepPreviousData: true,
  });
}

export function useCustomer(id) {
  return useQuery({
    queryKey: customerKeys.detail(id),
    queryFn: () => adminApi.getCustomer(id).then((r) => r.data.data.customer),
    enabled: !!id,
  });
}

export function useSetCustomerStatus(id) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (isActive) => adminApi.setCustomerStatus(id, isActive),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customerKeys.detail(id) });
      qc.invalidateQueries({ queryKey: customerKeys.all });
    },
  });
}
