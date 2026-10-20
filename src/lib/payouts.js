// Restaurant payouts (B12, Figma S1–S5 / D1–D6 / M1–M5 / I1–I3) — labels, badge tones and
// date helpers shared by the Payouts screens. Every amount on these screens is integer paise
// from the server, rendered with `rupees`; nothing here adds money up.

export { rupees } from "@/lib/financeSettings";

// Two axes (the flow map's "Eligibility and transfer are separate").
export const ELIGIBILITY = {
  pending: { label: "Pending", variant: "info" },
  eligible: { label: "Eligible", variant: "ok" },
  on_hold: { label: "On hold", variant: "danger" },
};

export const TRANSFER = {
  not_scheduled: { label: "Not scheduled", variant: "muted" },
  scheduled: { label: "Scheduled", variant: "info" },
  processing: { label: "Processing", variant: "warn" },
  paid: { label: "Paid", variant: "ok" },
  failed: { label: "Failed", variant: "danger" },
  carried_forward: { label: "Carried forward", variant: "muted" },
};

// A record inside a statement (order / bill / refund row).
export const RECORD_STATUS = {
  pending: { label: "Pending", variant: "info" },
  eligible: { label: "Eligible", variant: "ok" },
  on_hold: { label: "On hold", variant: "danger" },
  settled: { label: "Settled", variant: "ok" },
  refunded: { label: "Refunded", variant: "muted" },
};

// "What the owner sees" — the badge tone for the owner-facing status word the server sends.
export const OWNER_STATUS_VARIANT = {
  "Not scheduled": "muted",
  Scheduled: "info",
  Processing: "warn",
  Paid: "ok",
  Failed: "danger",
  "On hold": "danger",
  "Carried forward": "muted",
  // Ticket words (payment issues' "What the owner sees").
  Open: "info",
  "In review": "warn",
  "Awaiting restaurant": "danger",
  Resolved: "ok",
};

// Payment-issue tickets (SupportTicket, kind=payment).
export const ISSUE_STATUS = {
  open: { label: "Open", variant: "info" },
  in_review: { label: "In review", variant: "warn" },
  awaiting_restaurant: { label: "Awaiting restaurant", variant: "danger" },
  resolved: { label: "Resolved", variant: "ok" },
};

export const ISSUE_TYPE_LABEL = {
  payout_not_received: "Payout not received",
  wrong_deduction: "Wrong deduction",
  missing_order: "Missing order",
};

export const BANK_REQUEST_STATUS = {
  in_review: { label: "In review", variant: "warn" },
  awaiting_restaurant: { label: "Awaiting restaurant", variant: "info" },
  rejected: { label: "Rejected", variant: "danger" },
};

const ZONE = "Asia/Kolkata";

// en-GB writes September as "Sept"; the frames (and the owner portal) say "Sep".
const fmt = (opts) => {
  const f = new Intl.DateTimeFormat("en-GB", { timeZone: ZONE, ...opts });
  return {
    format: (d) => f.format(d).replace("Sept", "Sep"),
    formatToParts: (d) =>
      f
        .formatToParts(d)
        .map((p) =>
          p.type === "month"
            ? { ...p, value: p.value.replace("Sept", "Sep") }
            : p,
        ),
  };
};
const DAY_MONTH = fmt({ day: "numeric", month: "short" });
const DAY_MONTH_YEAR = fmt({ day: "numeric", month: "short", year: "numeric" });
const WEEKDAY_DATE = fmt({
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});
const WEEKDAY_SHORT = fmt({ weekday: "short", day: "numeric", month: "short" });

const parts = (d) =>
  fmt({ year: "numeric", month: "short", day: "numeric" })
    .formatToParts(new Date(d))
    .reduce((acc, p) => ({ ...acc, [p.type]: p.value }), {});

/** "21–27 Sep", "28 Sep–4 Oct" (+ " 2026" with `withYear`); both years when they differ. */
export function periodLabel(start, end, { withYear = false } = {}) {
  if (!start || !end) return "—";
  const a = parts(start);
  const b = parts(end);
  if (a.year !== b.year) {
    return `${DAY_MONTH_YEAR.format(new Date(start))}–${DAY_MONTH_YEAR.format(new Date(end))}`;
  }
  const left = a.month === b.month ? a.day : `${a.day} ${a.month}`;
  return `${left}–${b.day} ${b.month}${withYear ? ` ${b.year}` : ""}`;
}

/** "Mon 12 Oct 2026" — the payout-date style the frames use. */
export const payoutDate = (d) =>
  d ? WEEKDAY_DATE.format(new Date(d)).replace(/,/g, "") : "—";
/** "Mon 12 Oct". */
export const payoutDay = (d) =>
  d ? WEEKDAY_SHORT.format(new Date(d)).replace(/,/g, "") : "—";
/** "12 Oct 2026". */
export const dayMonthYear = (d) =>
  d ? DAY_MONTH_YEAR.format(new Date(d)) : "—";
/** "28 Sep". */
export const dayMonth = (d) => (d ? DAY_MONTH.format(new Date(d)) : "—");

/** The IST calendar date of `d` as "YYYY-MM-DD" (a date input's value). */
export function isoDay(d) {
  if (!d) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(d));
}

/** Today in IST as "YYYY-MM-DD" — the earliest release date the server accepts. */
export const todayIso = () => isoDay(new Date());

/** A "YYYY-MM-DD" from a date input, shown the payout way. */
export const payoutDateOfIso = (iso) =>
  iso ? payoutDate(`${iso}T12:00:00+05:30`) : "—";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
/** The week before / after the one starting at `periodStart` (for the week chip). */
export const shiftWeek = (periodStart, weeks) =>
  new Date(new Date(periodStart).getTime() + weeks * WEEK_MS).toISOString();
