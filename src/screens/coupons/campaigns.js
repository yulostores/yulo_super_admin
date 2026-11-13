// Shared by the campaign list and detail screens.
export const CAMPAIGN_STATUS = {
  draft: { label: "Draft", variant: "muted" },
  queued: { label: "Queued", variant: "warn" },
  sending: { label: "Sending", variant: "info" },
  done: { label: "Done", variant: "ok" },
  failed: { label: "Failed", variant: "danger" },
};
export const LOG_STATUS = {
  queued: { label: "Queued", variant: "warn" },
  sent: { label: "Sent", variant: "ok" },
  failed: { label: "Failed", variant: "danger" },
};

/** Paise → "₹1,234.56". */
export const rupees = (paise) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format((Number(paise) || 0) / 100);

/** The builder's fields as the API's body: blanks left out. */
export function campaignBody(f) {
  const body = {};
  for (const k of ["category", "seller", "expiringFrom", "expiringTo"])
    if (f[k]) body[k] = f[k];
  return body;
}

/** "Salon · Glow Salon · expiring 13 Nov – 16 Nov" from stored filters and the name lookups. */
export function describeFilters(filters = {}, categories = [], sellers = []) {
  const parts = [];
  if (filters.category)
    parts.push(
      categories.find((c) => String(c._id) === String(filters.category))
        ?.name ?? "One category",
    );
  if (filters.seller)
    parts.push(
      sellers.find((s) => String(s._id) === String(filters.seller))
        ?.businessName ?? "One seller",
    );
  if (!parts.length) parts.push("All categories and sellers");
  return parts.join(" · ");
}

const day = (ymd) =>
  ymd
    ? new Date(`${ymd}T00:00:00Z`).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      })
    : "?";
export const expiryWindow = (f = {}) =>
  f.expiringFrom || f.expiringTo
    ? `${day(f.expiringFrom)} – ${day(f.expiringTo)}`
    : "—";
