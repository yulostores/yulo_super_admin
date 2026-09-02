// Colour values that must be plain strings rather than Tailwind classes:
// Recharts takes `stroke`/`fill` props, not className. Kept beside the
// tailwind.config.js `brand`/`status` tokens so the two stay in step.

export const CHART = {
  revenue: "#D9480F", // brand-orange
  orders: "#1565C0", // brand-blue
  online: "#1565C0",
  dineIn: "#2E7D32", // brand-green
  commission: "#2E7D32",
  spend: "#D9480F",
  profit: "#1565C0",
  peak: "#D9480F",
  low: "#B11226", // brand-maroon
  neutral: "#2E7D32",
  grid: "#F6EFE9", // brand-line
  axis: "#8A7566", // brand-muted
  fallback: "#9CA3AF", // brand-neutral
};

// Store approval status -> donut slice colour.
export const STORE_STATUS_COLOR = {
  pending: "#D9480F",
  active: "#2E7D32",
  suspended: "#B11226",
  rejected: "#8A7566",
  expired: "#9CA3AF",
};

// Purely decorative row/avatar chips — no backend field drives these, they
// cycle so adjacent rows are visually distinguishable.
export const STORE_SWATCHES = [
  "bg-[#FDECE1] text-brand-orange",
  "bg-[#FBE4ED] text-[#C2185B]",
  "bg-[#F1E7FB] text-[#7B1FA2]",
  "bg-status-ok-bg text-brand-green",
  "bg-status-info-bg text-brand-blue",
];

export const AVATAR_COLORS = [
  "bg-brand-orange",
  "bg-brand-blue",
  "bg-brand-green",
  "bg-[#7C3AED]",
  "bg-brand-saffron",
];

export const RANK_BADGE_CLASS = {
  1: "bg-brand-saffron text-white",
  2: "bg-[#B0B0B8] text-white",
  3: "bg-[#C58940] text-white",
};

export function swatchFor(index) {
  return STORE_SWATCHES[index % STORE_SWATCHES.length];
}

export function avatarColorFor(index) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}
