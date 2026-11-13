import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { couponsApi } from "@/api/coupons.api";

export const couponKeys = {
  sellers: ["admin", "sellers"],
  sellerList: (params) => ["admin", "sellers", "list", params],
  seller: (id) => ["admin", "sellers", "detail", id],
  subscriptions: (id) => ["admin", "sellers", "subscriptions", id],
  plans: ["admin", "coupon-plans"],
  categories: ["admin", "coupon-categories"],
  settings: ["admin", "coupon-settings"],
  offers: ["admin", "coupon-offers"],
  offerList: (params) => ["admin", "coupon-offers", "list", params],
  coupons: ["admin", "coupons"],
  couponList: (params) => ["admin", "coupons", "list", params],
  complimentary: (params) => ["admin", "coupons", "complimentary", params],
  reports: ["admin", "coupon-reports"],
  report: (name, params) => ["admin", "coupon-reports", name, params],
  campaigns: ["admin", "reminder-campaigns"],
  campaignList: (params) => ["admin", "reminder-campaigns", "list", params],
  campaign: (id, params) => [
    "admin",
    "reminder-campaigns",
    "detail",
    id,
    params,
  ],
  sellerBills: (params) => ["admin", "seller-bills", "list", params],
  sellerBill: (id) => ["admin", "seller-bills", "detail", id],
};

export function useSellers(params) {
  return useQuery({
    queryKey: couponKeys.sellerList(params),
    queryFn: () => couponsApi.listSellers(params),
    placeholderData: keepPreviousData,
  });
}

export function useSeller(id) {
  return useQuery({
    queryKey: couponKeys.seller(id),
    queryFn: () => couponsApi.getSeller(id),
    enabled: Boolean(id),
  });
}

export function useSellerSubscriptions(id) {
  return useQuery({
    queryKey: couponKeys.subscriptions(id),
    queryFn: () => couponsApi.listSellerSubscriptions(id),
    enabled: Boolean(id),
  });
}

export function useCouponPlans() {
  return useQuery({
    queryKey: couponKeys.plans,
    queryFn: couponsApi.listPlans,
  });
}

export function useCouponCategories() {
  return useQuery({
    queryKey: couponKeys.categories,
    queryFn: couponsApi.listCategories,
    staleTime: 5 * 60_000,
  });
}

export function useCouponSettings() {
  return useQuery({
    queryKey: couponKeys.settings,
    queryFn: couponsApi.getCouponSettings,
  });
}

/** A seller action that changes its status / team / stock: refresh the seller and every list. */
export function useSellerAction(id, mutationFn) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: couponKeys.seller(id) });
      qc.invalidateQueries({ queryKey: couponKeys.subscriptions(id) });
      qc.invalidateQueries({ queryKey: couponKeys.sellers });
    },
  });
}

export function useUpdatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, body }) => couponsApi.updatePlan(key, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: couponKeys.plans }),
  });
}

export function useOffers(params) {
  return useQuery({
    queryKey: couponKeys.offerList(params),
    queryFn: () => couponsApi.listOffers(params),
    placeholderData: keepPreviousData,
  });
}

export function useOfferDecision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision, reason, updatedAt }) =>
      decision === "approve"
        ? couponsApi.approveOffer(id, updatedAt)
        : couponsApi.rejectOffer(id, reason, updatedAt),
    onSettled: () => qc.invalidateQueries({ queryKey: couponKeys.offers }),
  });
}

/**
 * Switch a category on / off. The switch moves at once (optimistic); if the server refuses, it
 * moves back and the caller's onError reports why. The list is re-read either way.
 */
export function useToggleCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, enabled }) => couponsApi.updateCategory(id, { enabled }),
    onMutate: async ({ id, enabled }) => {
      await qc.cancelQueries({ queryKey: couponKeys.categories });
      const previous = qc.getQueryData(couponKeys.categories);
      qc.setQueryData(couponKeys.categories, (list = []) =>
        list.map((c) => (c._id === id ? { ...c, enabled } : c)),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(couponKeys.categories, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: couponKeys.categories }),
  });
}

export function useSaveCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }) =>
      id
        ? couponsApi.updateCategory(id, body)
        : couponsApi.createCategory(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: couponKeys.categories }),
  });
}

export function useCoupons(params) {
  return useQuery({
    queryKey: couponKeys.couponList(params),
    queryFn: () => couponsApi.listCoupons(params),
    placeholderData: keepPreviousData,
  });
}

export function useComplimentary(params) {
  return useQuery({
    queryKey: couponKeys.complimentary(params),
    queryFn: () => couponsApi.listComplimentary(params),
  });
}

/** Assign / mark used: re-read the complimentary pools (and the coupons list). */
export function useComplimentaryAction(mutationFn) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => qc.invalidateQueries({ queryKey: couponKeys.coupons }),
  });
}

export function useSaveCouponSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => couponsApi.saveCouponSettings(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: couponKeys.settings }),
  });
}

/** Every seller (for filters and the manual-issue picker). */
export function useAllSellers(params = {}) {
  return useQuery({
    queryKey: couponKeys.sellerList({
      ...params,
      page: 1,
      limit: 100,
      picker: true,
    }),
    queryFn: () => couponsApi.listSellers({ ...params, page: 1, limit: 100 }),
    staleTime: 60_000,
  });
}

/** One coupon report; the previous answer stays on screen while new filters load. */
export function useCouponReport(name, params) {
  return useQuery({
    queryKey: couponKeys.report(name, params),
    queryFn: () => couponsApi.couponReport(name, params),
    placeholderData: keepPreviousData,
  });
}

export function useCampaigns(params) {
  return useQuery({
    queryKey: couponKeys.campaignList(params),
    queryFn: () => couponsApi.listCampaigns(params),
    placeholderData: keepPreviousData,
  });
}

export function useCampaign(id, params) {
  return useQuery({
    queryKey: couponKeys.campaign(id, params),
    queryFn: () => couponsApi.getCampaign(id, params),
    placeholderData: keepPreviousData,
  });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => couponsApi.createCampaign(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: couponKeys.campaigns }),
  });
}

export function useSellerBills(params) {
  return useQuery({
    queryKey: couponKeys.sellerBills(params),
    queryFn: () => couponsApi.listSellerBills(params),
    placeholderData: keepPreviousData,
  });
}

export function useSellerBill(id) {
  return useQuery({
    queryKey: couponKeys.sellerBill(id),
    queryFn: () => couponsApi.getSellerBill(id),
    enabled: Boolean(id),
  });
}
