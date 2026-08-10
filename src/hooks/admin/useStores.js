import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/api/admin.api";

const storeKeys = {
  all: ["admin", "stores"],
  list: (params) => ["admin", "stores", "list", params],
  detail: (id) => ["admin", "stores", "detail", id],
};

export function useStores(params = {}) {
  return useQuery({
    queryKey: storeKeys.list(params),
    queryFn: () => adminApi.listStores(params).then((r) => r.data.data),
    keepPreviousData: true,
  });
}

export function useCreateStore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => adminApi.createStore(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: storeKeys.all }),
  });
}

export function useStore(id) {
  return useQuery({
    queryKey: storeKeys.detail(id),
    queryFn: () => adminApi.getStore(id).then((r) => r.data.data.store),
    enabled: !!id,
  });
}

function useStoreAction(id, mutationFn) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: storeKeys.detail(id) });
      qc.invalidateQueries({ queryKey: storeKeys.all });
    },
  });
}

export function useApproveStore(id) {
  return useStoreAction(id, () => adminApi.approveStore(id));
}

export function useRejectStore(id) {
  return useStoreAction(id, (reason) => adminApi.rejectStore(id, reason));
}

export function useSuspendStore(id) {
  return useStoreAction(id, () => adminApi.suspendStore(id));
}

export function useReactivateStore(id) {
  return useStoreAction(id, () => adminApi.reactivateStore(id));
}

export function useUpdateStore(id) {
  return useStoreAction(id, (body) => adminApi.updateStore(id, body));
}

export function useAddStoreNote(id) {
  return useStoreAction(id, (note) => adminApi.addStoreNote(id, note));
}

export function useVerifyDocument(id) {
  return useStoreAction(id, ({ docId, status }) =>
    adminApi.verifyDocument(id, docId, status),
  );
}

export function useRemoveStore(id) {
  return useStoreAction(id, () => adminApi.removeStore(id));
}
