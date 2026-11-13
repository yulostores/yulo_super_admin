import client from "./client";

// Coupon partners (sellers), their plans and offers — /api/admin/sellers, /coupon-plans,
// /coupon-categories, /coupon-offers, /coupon-settings (yulo_backend/API.md § Coupons). Every
// call resolves to the response's `data`; failures reject with the client's Error (code / status
// / details).
const data = (p) => p.then((r) => r.data.data);

export const couponsApi = {
  // ── Sellers ─────────────────────────────────────────────────────────────
  /** { sellers, total, page, pages, statusCounts } */
  listSellers: (params = {}) => data(client.get("/admin/sellers", { params })),
  getSeller: (id) =>
    data(client.get(`/admin/sellers/${id}`)).then((d) => d.seller),
  /** The full PAN, once — audit-logged on the server. { field, value } */
  revealIdentity: (id, field) =>
    data(client.post(`/admin/sellers/${id}/reveal`, { field })),
  approveSeller: (id) =>
    data(client.patch(`/admin/sellers/${id}/approve`)).then((d) => d.seller),
  rejectSeller: (id, reason) =>
    data(client.patch(`/admin/sellers/${id}/reject`, { reason })).then(
      (d) => d.seller,
    ),
  suspendSeller: (id, reason) =>
    data(
      client.patch(`/admin/sellers/${id}/suspend`, reason ? { reason } : {}),
    ).then((d) => d.seller),
  reactivateSeller: (id) =>
    data(client.patch(`/admin/sellers/${id}/reactivate`)).then((d) => d.seller),
  getSellerDocumentFile: (id, docId) =>
    client
      .get(`/admin/sellers/${id}/documents/${docId}/file`, {
        responseType: "blob",
      })
      .then((r) => r.data),
  /** With complimentary counts. */
  listSellerSubscriptions: (id) =>
    data(client.get(`/admin/sellers/${id}/subscriptions`)).then(
      (d) => d.subscriptions,
    ),
  /** "Amount Received" for a plan: { planKey, amountRupees, mode, reference, receivedOn, note?, overrideReason? } */
  recordPlanPayment: (id, body) =>
    data(client.post(`/admin/sellers/${id}/subscriptions/manual`, body)).then(
      (d) => d.subscription,
    ),
  /** "Amount Received" for SMS credits: { credits, amountRupees, mode, reference, receivedOn, note?, overrideReason? } */
  recordCreditsPayment: (id, body) =>
    data(client.post(`/admin/sellers/${id}/sms-credits/manual`, body)),

  // ── Plans, categories, settings ─────────────────────────────────────────
  listPlans: () => data(client.get("/admin/coupon-plans")).then((d) => d.plans),
  updatePlan: (key, body) =>
    data(client.put(`/admin/coupon-plans/${key}`, body)).then((d) => d.plan),
  listCategories: () =>
    data(client.get("/admin/coupon-categories")).then((d) => d.categories),
  getCouponSettings: () => data(client.get("/admin/coupon-settings")),
  /** A new settings version, in force at once: { ...changed fields, note? } → { version, changes } */
  saveCouponSettings: (body) =>
    data(client.put("/admin/coupon-settings", body)),
  createCategory: (body) =>
    data(client.post("/admin/coupon-categories", body)).then((d) => d.category),
  /** Any of { name, icon, sortOrder, enabled }. */
  updateCategory: (id, body) =>
    data(client.patch(`/admin/coupon-categories/${id}`, body)).then(
      (d) => d.category,
    ),

  // ── Coupons ─────────────────────────────────────────────────────────────
  /** Every coupon, filtered: { coupons, total, page, limit, sort, filters } */
  listCoupons: (params = {}) => data(client.get("/admin/coupons", { params })),
  /** The same filters as a CSV (Blob) — fetched with the session, never a bare link. */
  exportCoupons: (params = {}) =>
    client
      .get("/admin/coupons/export.csv", { params, responseType: "blob" })
      .then((r) => r.data),
  /** { groups: [{ subscriptionId, seller, plan, activatedAt, coupons }], total } */
  listComplimentary: (params = {}) =>
    data(client.get("/admin/coupons/complimentary", { params })),
  assignComplimentary: (id, body) =>
    data(client.patch(`/admin/coupons/complimentary/${id}/assign`, body)).then(
      (d) => d.coupon,
    ),
  markComplimentaryUsed: (id) =>
    data(client.patch(`/admin/coupons/complimentary/${id}/mark-used`)).then(
      (d) => d.coupon,
    ),
  /** { phone, sellerId, offerId?, note?, requestId } → { coupon, duplicate } */
  issueCoupon: (body) => data(client.post("/admin/coupons/issue", body)),

  // ── Reports ─────────────────────────────────────────────────────────────
  /**
   * GET /admin/coupon-reports/:report — summary, by-category, by-seller, demographics, trends,
   * employees, sellers. Every report takes from / to (IST dates), category, seller.
   */
  couponReport: (report, params = {}) =>
    data(client.get(`/admin/coupon-reports/${report}`, { params })),

  // ── Reminder campaigns ──────────────────────────────────────────────────
  /** { category?, seller?, expiringFrom?, expiringTo? } → { filters, recipientCount, perSms, cost } */
  previewCampaign: (body) =>
    data(client.post("/admin/reminder-campaigns/preview", body)),
  /** Queued for the next 10:00 IST run; paid by Yulo. → campaign */
  createCampaign: (body) =>
    data(client.post("/admin/reminder-campaigns", body)).then(
      (d) => d.campaign,
    ),
  /** { campaigns, total, page, limit } — type admin | seller */
  listCampaigns: (params = {}) =>
    data(client.get("/admin/reminder-campaigns", { params })),
  /** { campaign, logCounts, log (phones masked), total, page, limit } */
  getCampaign: (id, params = {}) =>
    data(client.get(`/admin/reminder-campaigns/${id}`, { params })),

  // ── Offers ──────────────────────────────────────────────────────────────
  /** { offers, total, page, pages, statusCounts } */
  listOffers: (params = {}) =>
    data(client.get("/admin/coupon-offers", { params })),
  /** `updatedAt` = the offer as the admin saw it; a newer edit answers 409 OFFER_CHANGED. */
  approveOffer: (id, updatedAt) =>
    data(
      client.patch(`/admin/coupon-offers/${id}/approve`, { updatedAt }),
    ).then((d) => d.offer),
  rejectOffer: (id, reason, updatedAt) =>
    data(
      client.patch(`/admin/coupon-offers/${id}/reject`, { reason, updatedAt }),
    ).then((d) => d.offer),
};
