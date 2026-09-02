import client from "./client";

// All admin routes are scoped under /admin, role: admin

export const adminApi = {
  // ── Dashboard & Reports ──────────────────────────────────────────────
  getDashboard: () => client.get("/admin/dashboard"),
  getRevenueOverview: (range = "month") =>
    client.get("/admin/dashboard/revenue-overview", { params: { range } }),
  getTopStores: (limit = 10) =>
    client.get("/admin/reports/top-stores", { params: { limit } }),
  getTopDeliveryPartners: (limit = 10) =>
    client.get("/admin/reports/top-delivery-partners", { params: { limit } }),
  getLiveActivity: () => client.get("/admin/dashboard/live-activity"),
  getHourlyActivity: () => client.get("/admin/dashboard/hourly-activity"),

  // ── Finance ──────────────────────────────────────────────────────────
  getFinanceOverview: (params = {}) =>
    client.get("/admin/finance/overview", { params }),
  getRevenueTrend: (months = 12) =>
    client.get("/admin/finance/revenue-trend", { params: { months } }),
  getEarningsVsSpending: (months = 12) =>
    client.get("/admin/finance/earnings-vs-spending", { params: { months } }),
  getFinanceRestaurants: (params = {}) =>
    client.get("/admin/finance/restaurants", { params }),

  // ── Stores ───────────────────────────────────────────────────────────
  listStores: (params = {}) => client.get("/admin/stores", { params }),
  createStore: (body) => client.post("/admin/stores", body),
  getStore: (id) => client.get(`/admin/stores/${id}`),
  approveStore: (id) => client.patch(`/admin/stores/${id}/approve`),
  rejectStore: (id, reason) =>
    client.patch(`/admin/stores/${id}/reject`, { reason }),
  suspendStore: (id) => client.patch(`/admin/stores/${id}/suspend`),
  reactivateStore: (id) => client.patch(`/admin/stores/${id}/reactivate`),
  updateStore: (id, body) => client.patch(`/admin/stores/${id}`, body),
  addStoreNote: (id, note) =>
    client.post(`/admin/stores/${id}/notes`, { note }),
  verifyDocument: (id, docId, status) =>
    client.patch(`/admin/stores/${id}/documents/${docId}`, { status }),
  removeStore: (id) => client.delete(`/admin/stores/${id}`),

  // ── Customers ────────────────────────────────────────────────────────
  listCustomers: (params = {}) => client.get("/admin/customers", { params }),
  getCustomer: (id) => client.get(`/admin/customers/${id}`),
  setCustomerStatus: (id, isActive) =>
    client.patch(`/admin/customers/${id}/status`, { isActive }),

  // ── Delivery Partners ────────────────────────────────────────────────
  listDeliveryPartners: (params = {}) =>
    client.get("/admin/delivery-partners", { params }),
  getDeliveryPartner: (id) => client.get(`/admin/delivery-partners/${id}`),
  createDeliveryPartner: (formData) =>
    client.post("/admin/delivery-partners", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  updateDeliveryPartner: (id, body) =>
    client.patch(`/admin/delivery-partners/${id}`, body),
  removeDeliveryPartner: (id) =>
    client.delete(`/admin/delivery-partners/${id}`),
  getPartnerOrders: (id, params = {}) =>
    client.get(`/admin/delivery-partners/${id}/orders`, { params }),
  getPartnerPayouts: (id, params = {}) =>
    client.get(`/admin/delivery-partners/${id}/payouts`, { params }),
  adjustPayout: (partnerId, payoutId, body) =>
    client.patch(
      `/admin/delivery-partners/${partnerId}/payouts/${payoutId}`,
      body,
    ),
  markPayoutsPaid: (payoutIds) =>
    client.post("/admin/delivery-partners/payouts/mark-paid", { payoutIds }),
  getPayoutSummary: (period = "weekly") =>
    client.get("/admin/delivery-partners/payouts/summary", {
      params: { period },
    }),
  reassignOrderPartner: (orderId, partnerId, reason) =>
    client.patch(`/admin/orders/${orderId}/delivery-partner`, {
      partnerId,
      reason,
    }),

  // ── Delivery Partner KYC ─────────────────────────────────────────────
  // `decision` is one of approve | reject | request_resubmission; `notes` is
  // required by the server for the latter two.
  verifyDeliveryPartner: (id, decision, notes) =>
    client.patch(`/admin/delivery-partners/${id}/verify`, { decision, notes }),
  // Partner documents are addressed by `type` (aadhar_card, driving_license,
  // …), not by _id — their subschema is { _id: false } and re-uploads replace
  // by type, so type is the stable identifier. Stores differ: those use docId.
  verifyPartnerDocument: (id, docType, status) =>
    client.patch(`/admin/delivery-partners/${id}/documents/${docType}/verify`, {
      status,
    }),

  // ── Fleet Change Requests ────────────────────────────────────────────
  listFleetChangeRequests: (params = {}) =>
    client.get("/admin/delivery-partners/fleet-change-requests", { params }),
  resolveFleetChangeRequest: (requestId, decision, notes) =>
    client.patch(
      `/admin/delivery-partners/fleet-change-requests/${requestId}`,
      { decision, notes },
    ),

  // ── Support Tickets ──────────────────────────────────────────────────
  listTickets: (params = {}) => client.get("/admin/tickets", { params }),
  getTicket: (id) => client.get(`/admin/tickets/${id}`),
  updateTicket: (id, body) => client.patch(`/admin/tickets/${id}`, body),
  addTicketMessage: (id, text) =>
    client.post(`/admin/tickets/${id}/messages`, { text }),
};
