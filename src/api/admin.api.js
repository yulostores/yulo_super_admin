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
  // Finance Settings are versioned: a save creates a new version (never edits one), from now
  // or from a future effectiveFrom. body: { settings: { <changed fields> }, effectiveFrom?, note? }
  getFinanceSettings: () => client.get("/admin/finance/settings"),
  saveFinanceSettings: (body) => client.post("/admin/finance/settings", body),

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
  // The map point on its own. With no body the server re-geocodes the stored address and
  // 400s if it can't place it — unlike the address-edit path, which is best-effort.
  updateStoreLocation: (id, coordinates) =>
    client.patch(`/admin/stores/${id}/location`, coordinates ? { coordinates } : {}),
  addStoreNote: (id, note) =>
    client.post(`/admin/stores/${id}/notes`, { note }),
  verifyDocument: (id, docId, status) =>
    client.patch(`/admin/stores/${id}/documents/${docId}`, { status }),
  // The document's bytes, streamed through the API with their real content type.
  // Never linked to storage directly: the Cloudinary URL is public to anyone holding it
  // and refuses to serve PDFs outright, so the file is fetched here as a Blob and shown
  // from an object URL.
  getStoreDocumentFile: (id, docId) =>
    client
      .get(`/admin/stores/${id}/documents/${docId}/file`, { responseType: "blob" })
      .then((r) => r.data),
  removeStore: (id) => client.delete(`/admin/stores/${id}`),

  // ── Store bank account (payouts go here) ─────────────────────────────
  // Masked everywhere: only the last four digits ever come back, except from reveal, which
  // is audit-logged and served no-store. Decisions carry the timestamp the admin was looking
  // at (submittedAt for the account, requestedAt for a change request) so a change made by
  // the owner meanwhile is refused (409 ACCOUNT_CHANGED) instead of approved unseen.
  getStorePayoutAccount: (id) => client.get(`/admin/stores/${id}/payout-account`),
  revealStorePayoutAccount: (id, which = "current") =>
    client.post(`/admin/stores/${id}/payout-account/reveal`, { which }),
  verifyStorePayoutAccount: (id, submittedAt) =>
    client.patch(`/admin/stores/${id}/payout-account/verify`, { submittedAt }),
  rejectStorePayoutAccount: (id, reason, submittedAt) =>
    client.patch(`/admin/stores/${id}/payout-account/reject`, { reason, submittedAt }),
  verifyStorePayoutChange: (id, requestedAt) =>
    client.patch(`/admin/stores/${id}/payout-account/change/verify`, { requestedAt }),
  rejectStorePayoutChange: (id, reason, requestedAt) =>
    client.patch(`/admin/stores/${id}/payout-account/change/reject`, { reason, requestedAt }),
  requestStorePayoutChangeInfo: (id, message, requestedAt) =>
    client.patch(`/admin/stores/${id}/payout-account/change/request-info`, { message, requestedAt }),

  // ── Bills ────────────────────────────────────────────────────────────
  // Platform-wide receipts, filterable by store, status, type, table and date.
  // params: { restaurantId, status, type, tableNumber, from, to, q, page, limit }
  listBills: (params = {}) => client.get("/admin/bills", { params }),
  getBill: (billId) => client.get(`/admin/bills/${billId}`),

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

  // ── Restaurant payouts (B12 — manual release, two status axes) ───────
  // Every action is a conditional server-side step: a stale screen gets 409 and refetches.
  getPayoutsWeekly: (weekStart) =>
    client.get("/admin/finance/payouts/weekly", {
      params: weekStart ? { weekStart } : {},
    }),
  getPayoutsClearance: (params = {}) =>
    client.get("/admin/finance/payouts/clearance", { params }),
  getPayoutsHistory: (params = {}) =>
    client.get("/admin/finance/payouts/history", { params }),
  // The filtered history (every page) as CSV — fetched as a Blob and saved by the screen.
  exportPayoutsHistory: (params = {}) =>
    client
      .get("/admin/finance/payouts/history/export", {
        params,
        responseType: "blob",
      })
      .then((r) => r.data),
  getPayoutOptions: () => client.get("/admin/finance/payouts/options"),
  // One statement's rows (admin columns) as CSV — the D-frames' download until PDFs exist.
  exportSettlement: (id) =>
    client
      .get(`/admin/finance/settlements/${id}/export`, { responseType: "blob" })
      .then((r) => r.data),
  // PDF statement / payment receipt of one payout → { blob, filename } (the server names it).
  downloadPayoutPdf: (id, kind = "statement") =>
    client
      .get(
        `/admin/finance/payouts/${id}/${kind === "receipt" ? "receipt.pdf" : "pdf"}`,
        { responseType: "blob" },
      )
      .then((r) => ({
        blob: r.data,
        filename:
          /filename="?([^";]+)"?/i.exec(
            r.headers?.["content-disposition"] ?? "",
          )?.[1] ?? null,
      })),
  getPayout: (id) => client.get(`/admin/finance/payouts/${id}`),
  schedulePayout: (id, scheduledFor) =>
    client.patch(`/admin/finance/payouts/${id}/schedule`, { scheduledFor }),
  changePayoutDate: (id, scheduledFor) =>
    client.patch(`/admin/finance/payouts/${id}/schedule-date`, {
      scheduledFor,
    }),
  reschedulePayout: (id, scheduledFor) =>
    client.patch(`/admin/finance/payouts/${id}/reschedule`, { scheduledFor }),
  // expectedNetPaise: the amount the admin confirmed in M2 — refused (409 AMOUNT_CHANGED) if
  // the statement changed since.
  releasePayout: (id, expectedNetPaise) =>
    client.patch(`/admin/finance/payouts/${id}/release`, { expectedNetPaise }),
  markPayoutPaid: (id, body) =>
    client.patch(`/admin/finance/payouts/${id}/mark-paid`, body),
  markPayoutFailed: (id, body) =>
    client.patch(`/admin/finance/payouts/${id}/mark-failed`, body),
  holdPayout: (id, body) =>
    client.patch(`/admin/finance/payouts/${id}/hold`, body),
  updatePayoutHoldReason: (id, body) =>
    client.patch(`/admin/finance/payouts/${id}/hold-reason`, body),
  releasePayoutHold: (id) =>
    client.patch(`/admin/finance/payouts/${id}/release-hold`),
  // Maintenance (the Monday scheduler normally generates statements).
  generateSettlements: (weekStart) =>
    client.post("/admin/finance/settlements/generate", { weekStart }),
  // body: { restaurantId, amountPaise, direction: credit|debit, kind: correction|penalty, note }
  addSettlementAdjustment: (body) =>
    client.post("/admin/finance/settlements/adjustments", body),

  // Bank account change requests across restaurants (Payouts → Bank requests).
  listBankRequests: (params = {}) =>
    client.get("/admin/bank-requests", { params }),

  // ── Payment issues (SupportTicket, kind=payment) ─────────────────────
  getTicketCounts: (kind) =>
    client.get("/admin/tickets/counts", { params: kind ? { kind } : {} }),
  // A reply or a request for information, with an optional attachment (multipart).
  replyToTicket: (id, { text, file, requestsInformation = false }) => {
    const path = `/admin/tickets/${id}/${requestsInformation ? "request-information" : "messages"}`;
    if (!file) return client.post(path, { text });
    const form = new FormData();
    form.append("text", text);
    form.append("attachment", file);
    return client.post(path, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  // Streamed through the API (never the storage URL), as a Blob for an object URL.
  getTicketAttachment: (id, attachmentId) =>
    client
      .get(`/admin/tickets/${id}/attachments/${attachmentId}`, {
        responseType: "blob",
      })
      .then((r) => r.data),
};
