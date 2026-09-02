import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { adminApi } from "@/api/admin.api";

const partnerKeys = {
  all: ["admin", "delivery-partners"],
  list: (params) => ["admin", "delivery-partners", "list", params],
  detail: (id) => ["admin", "delivery-partners", "detail", id],
};

export function useDeliveryPartners(params = {}) {
  return useQuery({
    queryKey: partnerKeys.list(params),
    queryFn: () =>
      adminApi.listDeliveryPartners(params).then((r) => r.data.data),
    placeholderData: keepPreviousData,
  });
}

export function useDeliveryPartner(id) {
  return useQuery({
    queryKey: partnerKeys.detail(id),
    queryFn: () =>
      adminApi.getDeliveryPartner(id).then((r) => r.data.data.partner),
    enabled: !!id,
  });
}

export function useCreateDeliveryPartner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData) => adminApi.createDeliveryPartner(formData),
    onSuccess: () => qc.invalidateQueries({ queryKey: partnerKeys.all }),
  });
}

export function useUpdateDeliveryPartner(id) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => adminApi.updateDeliveryPartner(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: partnerKeys.detail(id) });
      qc.invalidateQueries({ queryKey: partnerKeys.all });
    },
  });
}

export function useRemoveDeliveryPartner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => adminApi.removeDeliveryPartner(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: partnerKeys.all }),
  });
}

export function usePartnerOrders(id, params = {}) {
  return useQuery({
    queryKey: ["admin", "delivery-partners", "orders", id, params],
    queryFn: () =>
      adminApi.getPartnerOrders(id, params).then((r) => r.data.data),
    enabled: !!id,
  });
}

export function usePayouts(id, params = {}) {
  return useQuery({
    queryKey: ["admin", "delivery-partners", "payouts", id, params],
    queryFn: () =>
      adminApi.getPartnerPayouts(id, params).then((r) => r.data.data),
    enabled: !!id,
  });
}

export function useAdjustPayout(partnerId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ payoutId, body }) =>
      adminApi.adjustPayout(partnerId, payoutId, body),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: ["admin", "delivery-partners", "payouts", partnerId],
      }),
  });
}

export function useMarkPayoutsPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payoutIds) => adminApi.markPayoutsPaid(payoutIds),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: ["admin", "delivery-partners", "payouts"],
      }),
  });
}

export function usePayoutSummary(period = "weekly") {
  return useQuery({
    queryKey: ["admin", "delivery-partners", "payout-summary", period],
    queryFn: () => adminApi.getPayoutSummary(period).then((r) => r.data.data),
  });
}

export function useReassignOrderPartner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, partnerId, reason }) =>
      adminApi.reassignOrderPartner(orderId, partnerId, reason),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: ["admin", "delivery-partners", "orders"],
      }),
  });
}

export function useVerifyDeliveryPartner(id) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ decision, notes }) =>
      adminApi.verifyDeliveryPartner(id, decision, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: partnerKeys.detail(id) });
      qc.invalidateQueries({ queryKey: partnerKeys.all });
    },
  });
}

export function useVerifyPartnerDocument(id) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ docType, status }) =>
      adminApi.verifyPartnerDocument(id, docType, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: partnerKeys.detail(id) }),
  });
}

const fleetKeys = {
  all: ["admin", "fleet-change-requests"],
  list: (params) => ["admin", "fleet-change-requests", "list", params],
};

export function useFleetChangeRequests(params = {}) {
  return useQuery({
    queryKey: fleetKeys.list(params),
    queryFn: () =>
      adminApi.listFleetChangeRequests(params).then((r) => r.data.data),
    placeholderData: keepPreviousData,
  });
}

export function useResolveFleetChangeRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, decision, notes }) =>
      adminApi.resolveFleetChangeRequest(requestId, decision, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: fleetKeys.all });
      qc.invalidateQueries({ queryKey: partnerKeys.all });
    },
  });
}
