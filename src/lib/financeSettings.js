// How each Finance Settings field is labelled, shown in plain words and edited.
//
// The server stores money in integer paise and serves `units` alongside the values; the form
// works in rupees (what an admin thinks in) and converts back on save. Every field the server
// validates is listed here — a field missing from this list is shown read-only, never dropped.

export const DAY_OPTIONS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
].map((d) => ({ value: d, label: d[0].toUpperCase() + d.slice(1) }));

const BEARER_OPTIONS = [
  { value: "restaurant", label: "Restaurant" },
  { value: "platform", label: "Yulo (platform)" },
];

export function rupees(paise) {
  if (paise === null || paise === undefined || Number.isNaN(Number(paise)))
    return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(paise) / 100);
}

const pct = (v) => `${Number(v ?? 0)}%`;
const km = (v) => `${Number(v ?? 0)} km`;
const yesNo = (v) => (v ? "On" : "Off");
const labelOf = (options, v) =>
  options.find((o) => o.value === v)?.label ?? v ?? "—";

// kind → how the value is edited:
//   paise   rupee input (2 decimals), stored ×100
//   percent / number   plain number input
//   enum    select from `options`
//   boolean switch
//   fixed   read-only (the server accepts one value only)
export const FINANCE_FIELD_GROUPS = [
  {
    title: "What the customer pays",
    fields: [
      {
        key: "foodGstPercent",
        label: "Food GST",
        kind: "percent",
        describe: (s) =>
          `Food GST charged to customers: ${pct(s.foodGstPercent)} — GST-registered restaurants only.`,
      },
      {
        key: "serviceGstPercent",
        label: "GST on Yulo's services",
        kind: "percent",
        describe: (s) =>
          `GST on Yulo's services (delivery charge, platform fee): ${pct(s.serviceGstPercent)}.`,
      },
      {
        key: "customerPlatformFee",
        label: "Customer platform fee (incl. GST)",
        kind: "paise",
        describe: (s) =>
          `Platform fee charged to customer: ${rupees(s.customerPlatformFee)} incl. ${pct(s.serviceGstPercent)} GST.`,
      },
      {
        key: "dineInPlatformFeeUnit",
        label: "Dine-in platform fee charged",
        kind: "enum",
        options: [
          { value: "bill", label: "Once per bill" },
          { value: "order", label: "Once per order round" },
        ],
        describe: (s) =>
          `Dine-in platform fee is charged ${s.dineInPlatformFeeUnit === "order" ? "once per order round" : "once per bill"}.`,
      },
    ],
  },
  {
    title: "Delivery charge",
    fields: [
      {
        key: "deliveryPerKmRate",
        label: "Per km (excl. GST)",
        kind: "paise",
        describe: (s) =>
          `Delivery charge: ${rupees(s.deliveryPerKmRate)} per km + ${pct(s.serviceGstPercent)} GST.`,
      },
      {
        key: "deliveryMinCharge",
        label: "Minimum charge (excl. GST)",
        kind: "paise",
        describe: (s) =>
          `Minimum delivery charge: ${rupees(s.deliveryMinCharge)} + GST.`,
      },
      {
        key: "deliveryDistanceRounding",
        label: "Round distance up to (km)",
        kind: "number",
        step: "0.1",
        describe: (s) =>
          `Distance is rounded up to the next ${km(s.deliveryDistanceRounding)}.`,
      },
    ],
  },
  {
    title: "Restaurant settlement",
    fields: [
      {
        key: "settlementChargePercent",
        label: "Settlement charge (incl. GST)",
        kind: "percent",
        step: "0.01",
        describe: (s) =>
          `Settlement charge to restaurants: ${pct(s.settlementChargePercent)} incl. GST, ${
            s.settlementChargeBase === "restaurant_share"
              ? "on the restaurant's share"
              : "on the total the customer paid"
          }.`,
      },
      {
        key: "settlementChargeBase",
        label: "Settlement charge is taken on",
        kind: "enum",
        options: [
          { value: "customer_total", label: "The total the customer paid" },
          { value: "restaurant_share", label: "The restaurant's share" },
        ],
        describe: () => null, // said by the line above
      },
      {
        key: "carryForwardNegative",
        label: "Carry a negative week forward",
        kind: "boolean",
        describe: (s) =>
          s.carryForwardNegative
            ? "A week that ends negative is carried forward to the next week."
            : "A week that ends negative is held for review (not carried forward).",
      },
    ],
  },
  {
    title: "Payouts",
    fields: [
      {
        key: "payoutDayOfWeek",
        label: "Default payout day",
        kind: "enum",
        options: DAY_OPTIONS,
        describe: (s) =>
          `Payouts are scheduled for ${labelOf(DAY_OPTIONS, s.payoutDayOfWeek)}s by default (the admin picks each date).`,
      },
      {
        key: "payoutProvider",
        label: "How payouts are sent",
        kind: "enum",
        // RazorpayX / Route aren't activated — the server answers 501 for them.
        options: [
          { value: "manual", label: "Released manually (net banking)" },
          { value: "bank_file", label: "Bank bulk-payment file" },
        ],
        describe: (s) =>
          `Payouts are sent: ${s.payoutProvider === "bank_file" ? "by bank bulk-payment file" : "manually by net banking, one restaurant at a time"}.`,
      },
      {
        key: "payoutBankFileFormat",
        label: "Bank file format",
        kind: "fixed",
        describe: (s) =>
          s.payoutProvider === "bank_file"
            ? `Bank file format: ${s.payoutBankFileFormat === "generic_csv" ? "Generic CSV" : s.payoutBankFileFormat}.`
            : null,
        display: (v) => (v === "generic_csv" ? "Generic CSV" : v),
      },
      {
        key: "settlementCycle.weekStartsOn",
        label: "Settlement week starts on",
        kind: "enum",
        options: DAY_OPTIONS,
        describe: (s) =>
          `Settlement weeks start on ${labelOf(DAY_OPTIONS, s.settlementCycle?.weekStartsOn)} 00:00 (${s.settlementCycle?.timezone ?? "Asia/Kolkata"}).`,
      },
      {
        key: "settlementCycle.timezone",
        label: "Settlement time zone",
        kind: "text",
        describe: () => null,
      },
    ],
  },
  {
    title: "Rider pay",
    fields: [
      {
        key: "riderBasePay",
        label: "Base pay",
        kind: "paise",
        describe: (s) =>
          `Rider base pay: ${rupees(s.riderBasePay)} for the first ${km(s.riderBaseKm)}.`,
      },
      {
        key: "riderBaseKm",
        label: "Base pay covers (km)",
        kind: "number",
        step: "0.1",
        describe: () => null,
      },
      {
        key: "riderPerKmRate",
        label: "Per km beyond that",
        kind: "paise",
        describe: (s) =>
          `Beyond that: ${rupees(s.riderPerKmRate)} per km. Tips go 100% to the rider.`,
      },
    ],
  },
  {
    title: "Refunds — who bears Razorpay's fee",
    fields: [
      {
        key: "refundFeeBorneBy.restaurant_reject",
        label: "Restaurant rejects the order",
        kind: "enum",
        options: BEARER_OPTIONS,
      },
      {
        key: "refundFeeBorneBy.approval_timeout",
        label: "Restaurant doesn't answer in time",
        kind: "enum",
        options: BEARER_OPTIONS,
      },
      {
        key: "refundFeeBorneBy.customer_cancel_before_accept",
        label: "Customer cancels before cooking starts",
        kind: "enum",
        options: BEARER_OPTIONS,
      },
      {
        key: "refundFeeBorneBy.restaurant_cancel_after_accept",
        label: "Restaurant / admin cancels after accepting",
        kind: "enum",
        options: BEARER_OPTIONS,
      },
      {
        key: "customerCancelAfterPreparationRefundPercent",
        label: "Refund when the customer cancels after cooking started",
        kind: "fixed",
        describe: (s) =>
          `A customer who cancels after cooking started gets ${pct(s.customerCancelAfterPreparationRefundPercent)} back; the restaurant is paid in full.`,
        display: pct,
      },
    ],
  },
  {
    title: "Switches",
    fields: [
      {
        key: "codEnabled",
        label: "Cash on delivery",
        kind: "boolean",
        describe: (s) => `Cash on delivery: ${yesNo(s.codEnabled)}.`,
      },
    ],
  },
];

export const FINANCE_FIELDS = FINANCE_FIELD_GROUPS.flatMap((g) => g.fields);

export function getPath(obj, path) {
  return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

// A stored value as an admin reads it: "₹12.00", "3.5%", "Once per bill", "On".
export function displayValue(field, value) {
  if (!field) return value === undefined ? "—" : String(value);
  if (field.display) return field.display(value);
  switch (field.kind) {
    case "paise":
      return rupees(value);
    case "percent":
      return pct(value);
    case "boolean":
      return yesNo(value);
    case "enum":
      return labelOf(field.options, value);
    default:
      return value === undefined || value === null || value === ""
        ? "—"
        : String(value);
  }
}

export const fieldByKey = (key) => FINANCE_FIELDS.find((f) => f.key === key);

// Stored settings → form state (rupees as strings, so a half-typed "12." isn't lost).
export function toForm(settings) {
  const form = {};
  for (const f of FINANCE_FIELDS) {
    const v = getPath(settings, f.key);
    if (f.kind === "paise")
      form[f.key] = v == null ? "" : (Number(v) / 100).toFixed(2);
    else if (f.kind === "percent" || f.kind === "number")
      form[f.key] = v == null ? "" : String(v);
    else form[f.key] = v;
  }
  return form;
}

// Form value → stored value, or { error } when it can't be one.
function parseField(field, raw) {
  if (field.kind === "paise") {
    const n = Number(raw);
    if (raw === "" || !Number.isFinite(n) || n < 0)
      return { error: "Enter an amount in rupees" };
    return { value: Math.round(n * 100) };
  }
  if (field.kind === "percent" || field.kind === "number") {
    const n = Number(raw);
    if (raw === "" || !Number.isFinite(n) || n < 0)
      return { error: "Enter a number" };
    return { value: n };
  }
  if (field.kind === "text") {
    const t = String(raw ?? "").trim();
    if (!t) return { error: "Required" };
    return { value: t };
  }
  return { value: raw };
}

/**
 * The fields the admin actually changed, as the patch the server takes plus a list of
 * { key, label, from, to } in display form for the confirm dialog. Nested fields
 * (settlementCycle.*, refundFeeBorneBy.*) go out as partial objects. `errors` is keyed by
 * field key.
 */
export function buildPatch(active, form) {
  const patch = {};
  const changes = [];
  const errors = {};
  for (const f of FINANCE_FIELDS) {
    if (f.kind === "fixed") continue;
    const parsed = parseField(f, form[f.key]);
    if (parsed.error) {
      errors[f.key] = parsed.error;
      continue;
    }
    const before = getPath(active, f.key);
    if (parsed.value === before) continue;
    const [top, sub] = f.key.split(".");
    if (sub) patch[top] = { ...(patch[top] ?? {}), [sub]: parsed.value };
    else patch[top] = parsed.value;
    changes.push({
      key: f.key,
      label: f.label,
      from: displayValue(f, before),
      to: displayValue(f, parsed.value),
    });
  }
  return { patch, changes, errors };
}

// The server's change paths ("refundFeeBorneBy.approval_timeout") → readable lines.
export function describeChange({ field, from, to }) {
  const f = fieldByKey(field);
  return {
    key: field,
    label: f?.label ?? field,
    from: displayValue(f, from),
    to: displayValue(f, to),
  };
}

// Which fields one version changed relative to another (for the history table).
export function diffVersions(prev, next) {
  if (!prev) return [];
  return FINANCE_FIELDS.filter(
    (f) =>
      JSON.stringify(getPath(prev, f.key)) !==
      JSON.stringify(getPath(next, f.key)),
  ).map((f) => ({
    key: f.key,
    label: f.label,
    from: displayValue(f, getPath(prev, f.key)),
    to: displayValue(f, getPath(next, f.key)),
  }));
}

// zod flatten() puts errors under the top-level key; nested fields share their parent's.
export function serverFieldErrors(err) {
  const fieldErrors = err?.details?.fieldErrors ?? {};
  const out = {};
  for (const f of FINANCE_FIELDS) {
    const msgs = fieldErrors[f.key] ?? fieldErrors[f.key.split(".")[0]];
    if (msgs?.length) out[f.key] = Array.isArray(msgs) ? msgs[0] : String(msgs);
  }
  return out;
}

// The version a given version was built on: the newest earlier-saved version already in
// force at its effectiveFrom — what the server merged it onto. Comparing with the previous
// version *number* instead misreads a change saved today next to one scheduled for next week.
export function baseVersionOf(versions, v) {
  const at = new Date(v.effectiveFrom).getTime();
  return versions
    .filter(
      (o) => o.version < v.version && new Date(o.effectiveFrom).getTime() <= at,
    )
    .sort(
      (a, b) =>
        new Date(b.effectiveFrom) - new Date(a.effectiveFrom) ||
        b.version - a.version,
    )[0];
}

// Among versions sharing an effectiveFrom, the highest version number is the one in force.
export function isSuperseded(versions, v) {
  const at = new Date(v.effectiveFrom).getTime();
  return versions.some(
    (o) => o.version > v.version && new Date(o.effectiveFrom).getTime() === at,
  );
}

// The version in force just before a date — what a scheduled version actually changes on its day.
export function inForceBefore(versions, date) {
  const at = new Date(date).getTime();
  return versions
    .filter((o) => new Date(o.effectiveFrom).getTime() < at)
    .sort(
      (a, b) =>
        new Date(b.effectiveFrom) - new Date(a.effectiveFrom) ||
        b.version - a.version,
    )[0];
}
