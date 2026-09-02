// Shared display formatters. Previously these lived in AdminLayout.jsx (a
// component module) and `initials`/`hhmm` were re-declared in seven screens.

export function formatPrice(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

export function formatNumber(value) {
  return new Intl.NumberFormat("en-IN").format(value ?? 0);
}

export function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function initials(name) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  return parts
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

// Operating hours are stored as HHMM integers (900 → "09:00").
export function hhmm(value) {
  if (value === undefined || value === null) return "";
  const s = String(value).padStart(4, "0");
  return `${s.slice(0, 2)}:${s.slice(2)}`;
}

// "09:00" → 900, for writing back to the HHMM integer field.
export function toHHMM(timeString) {
  const [hh, mm] = (timeString ?? "").split(":");
  if (hh === undefined || mm === undefined) return null;
  return Number(hh) * 100 + Number(mm);
}

export function formatHour(hour) {
  if (hour === undefined || hour === null) return "—";
  const period = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:00 ${period}`;
}

export function timeAgo(date) {
  if (!date) return "—";
  const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

// Neither Restaurant nor DeliveryPartner has a human-facing sequential code
// field, so these derive a stable display-only label from the Mongo _id.
export function storeCode(id) {
  return `#STORE-${
    String(id ?? "")
      .slice(-4)
      .toUpperCase() || "0000"
  }`;
}

export function partnerCode(id) {
  return `DP${
    String(id ?? "")
      .slice(-4)
      .toUpperCase() || "0000"
  }`;
}

// Last path segment of a Cloudinary URL, for showing an uploaded file's name.
export function fileNameOf(url) {
  if (!url) return null;
  const last = url.split("/").pop()?.split("?")[0] ?? url;
  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
}
