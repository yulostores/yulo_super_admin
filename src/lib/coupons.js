// Labels and helpers for the coupon-partner screens.

export const SELLER_STATUS = {
  pending: { label: "Pending review", variant: "warn" },
  active: { label: "Active", variant: "ok" },
  suspended: { label: "Suspended", variant: "danger" },
  rejected: { label: "Rejected", variant: "muted" },
};
export const SELLER_STATUS_TABS = [
  "pending",
  "active",
  "suspended",
  "rejected",
];

export const SELLER_ROLE_LABEL = {
  owner: "Owner",
  manager: "Manager",
  employee: "Employee",
};

export const SUBSCRIPTION_STATUS = {
  pending_payment: { label: "Awaiting payment", variant: "muted" },
  active: { label: "Active", variant: "ok" },
  exhausted: { label: "Used up", variant: "info" },
  cancelled: { label: "Cancelled", variant: "danger" },
};

export const OFFER_STATUS = {
  draft: { label: "Draft", variant: "muted" },
  pending_review: { label: "Awaiting review", variant: "warn" },
  approved: { label: "Live", variant: "ok" },
  paused: { label: "Paused", variant: "info" },
  rejected: { label: "Rejected", variant: "danger" },
};

export const PAYMENT_MODES = [
  { value: "neft", label: "Bank transfer (NEFT / RTGS / IMPS)" },
  { value: "upi", label: "UPI" },
  { value: "cash", label: "Cash" },
  { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" },
];

export const DOCUMENT_LABEL = {
  pan_card: "PAN card",
  aadhaar_card: "Aadhaar card",
  gst_certificate: "GST certificate",
  shop_photo: "Shop photo",
  business_registration: "Business registration",
  other: "Other document",
};

export const paiseToRupees = (paise) => Math.round(paise) / 100;

/** GST added on a GST-exclusive price, rounded half-up to the paisa (as the server does). */
export function withGst(basePaise, gstPercent) {
  const gstPaise = Math.round((basePaise * gstPercent) / 100);
  return { basePaise, gstPaise, totalPaise: basePaise + gstPaise };
}

export const todayYmd = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * Seller choices for a filter / picker: the business name, and — only where two sellers share a
 * name (chains, re-registrations) — their city and the end of their id, so they can be told apart.
 */
export function sellerOptions(sellers = []) {
  const count = new Map();
  for (const s of sellers)
    count.set(s.businessName, (count.get(s.businessName) ?? 0) + 1);
  return sellers.map((s) => ({
    value: s._id,
    label:
      count.get(s.businessName) > 1
        ? `${s.businessName} (${[s.city, `#${String(s._id).slice(-4)}`].filter(Boolean).join(", ")})`
        : s.businessName,
  }));
}
