import client from "./client";

// Admin money views that sit beside the analytics in admin.api.js: the per-order / per-bill
// breakdown (Razorpay's fee, Yulo's margin and rider pay — admin only), the refunds queue,
// and the payout-history totals the finance dashboard reuses.
export const financeApi = {
  // { order|bill, charges, financials, projected, riderEarnings?, ledgerEntries } — `financials`
  // is the frozen snapshot; `projected` is a preview from today's settings while there is none.
  getOrderBreakdown: (orderId) =>
    client.get(`/admin/finance/orders/${orderId}/breakdown`),
  getBillBreakdown: (billId) =>
    client.get(`/admin/finance/bills/${billId}/breakdown`),

  // Orders, dine-in bills and stray payments, newest activity first. status: pending |
  // processing | processed | failed. Each row's _id is what the retry takes.
  listRefunds: (params = {}) =>
    client.get("/admin/finance/refunds", { params }),
  retryRefund: (id) => client.post(`/admin/finance/refunds/${id}/retry`),

  // Restaurant payout totals over a date range: { kpis: { paid, scheduled, notYetScheduled } }.
  getPayoutHistory: (params = {}) =>
    client.get("/admin/finance/payouts/history", { params }),
};
